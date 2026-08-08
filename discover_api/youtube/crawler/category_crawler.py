"""
Automated Category & Regional Trending Crawler (Strategy 1)
===========================================================
Systematically discovers YouTube creators across content niches and global regions
by scanning the mostPopular video chart, extracting unique channel IDs, batch-fetching
full channel metadata, and upserting into PostgreSQL database.

Includes quota error handling for seamless resuming across runs.
"""

import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Set, Any, Optional, Tuple

from googleapiclient.errors import HttpError
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

from db.session import SessionLocal
from db.models import Creator
from youtube.utils import get_youtube_client

logger = logging.getLogger("discover_api.youtube.crawler.category_crawler")



DEFAULT_REGIONS = ["US", "GB", "CA", "AU", "IN", "DE", "FR", "BR", "JP", "KR"]


def is_quota_exceeded_error(e: Exception) -> bool:
    """Check if an HttpError or Exception is due to YouTube API quota limit being reached."""
    if isinstance(e, HttpError):
        if e.resp.status in (403, 429):
            error_str = str(e).lower()
            if "quota" in error_str or "rate" in error_str or "exceeded" in error_str:
                return True
    return False


def clean_str(val: Optional[str]) -> Optional[str]:
    """Sanitize string by stripping NUL bytes disallowed by PostgreSQL."""
    if val is None:
        return None
    if isinstance(val, str):
        return val.replace("\x00", "").replace("\u0000", "")
    return val


def fetch_categories_for_region(youtube, region_code: str = "US") -> List[Dict[str, str]]:
    """
    Fetch all assignable YouTube video categories for a region.
    Returns list of dicts: [{"id": "27", "title": "Education"}, ...]
    """
    try:
        response = youtube.videoCategories().list(
            part="snippet",
            regionCode=region_code,
        ).execute()

        categories = []
        for item in response.get("items", []):
            snippet = item.get("snippet", {})
            if snippet.get("assignable", False):
                categories.append({
                    "id": item["id"],
                    "title": snippet.get("title", ""),
                })
        return categories
    except Exception as e:
        if is_quota_exceeded_error(e):
            raise
        logger.warning(f"Failed to fetch video categories for region {region_code}: {e}")
        return []


def discover_channels_from_popular_chart(
    youtube,
    region_codes: Optional[List[str]] = None,
    max_videos_per_category: int = 50,
) -> Tuple[Set[str], bool]:
    """
    Scan mostPopular video charts across specified regions and assignable categories.
    Collects unique channel IDs.

    Returns:
        Tuple[Set[str] channel_ids, bool quota_exceeded]
    """
    regions = region_codes or DEFAULT_REGIONS
    discovered_channel_ids: Set[str] = set()
    quota_exceeded = False

    logger.info(f"Starting category & regional crawl across regions: {regions}")

    for region in regions:
        if quota_exceeded:
            break

        try:
            categories = fetch_categories_for_region(youtube, region)
        except Exception as e:
            if is_quota_exceeded_error(e):
                logger.error(f"Quota limit reached while fetching categories for region {region}.")
                quota_exceeded = True
                break
            categories = []

        logger.info(f"Region '{region}': Found {len(categories)} assignable categories.")

        for cat in categories:
            if quota_exceeded:
                break

            cat_id = cat["id"]
            cat_title = cat["title"]

            try:
                response = youtube.videos().list(
                    part="snippet",
                    chart="mostPopular",
                    videoCategoryId=cat_id,
                    regionCode=region,
                    maxResults=min(50, max_videos_per_category),
                ).execute()

                items = response.get("items", [])
                new_count = 0
                for item in items:
                    snippet = item.get("snippet", {})
                    cid = snippet.get("channelId")
                    if cid and cid not in discovered_channel_ids:
                        discovered_channel_ids.add(cid)
                        new_count += 1

                logger.info(f"  [{region}] Category '{cat_title}' (ID {cat_id}): Found {len(items)} videos, +{new_count} unique channels (Total: {len(discovered_channel_ids)})")

            except Exception as e:
                if is_quota_exceeded_error(e):
                    logger.error(f"Quota limit reached during video chart fetch for region {region}, category {cat_id}.")
                    quota_exceeded = True
                    break
                else:
                    logger.warning(f"Error fetching popular videos for region {region}, category {cat_id}: {e}")

    return discovered_channel_ids, quota_exceeded


def batch_fetch_and_upsert_creators(
    youtube,
    channel_ids: List[str],
    db: Optional[Session] = None,
) -> Tuple[int, int, bool]:
    """
    Batch-fetch channel metadata from YouTube API (50 per request) and upsert into PostgreSQL.

    Returns:
        Tuple[inserted_count, updated_count, quota_exceeded]
    """
    if not channel_ids:
        return 0, 0, False

    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    inserted_count = 0
    updated_count = 0
    quota_exceeded = False

    try:
        # Process in batches of 50
        for i in range(0, len(channel_ids), 50):
            if quota_exceeded:
                break

            batch = channel_ids[i : i + 50]
            try:
                response = youtube.channels().list(
                    part="snippet,statistics",
                    id=",".join(batch)
                ).execute()

                items = response.get("items", [])
                if not items:
                    continue

                now = datetime.now(timezone.utc)
                for item in items:
                    cid = item["id"]
                    snippet = item.get("snippet", {})
                    stats = item.get("statistics", {})

                    name = clean_str(snippet.get("title", "Unknown Channel")) or "Unknown Channel"
                    handle = clean_str(snippet.get("customUrl"))
                    if handle and not handle.startswith("@"):
                        handle = "@" + handle
                    elif not handle:
                        handle = f"@{name.lower().replace(' ', '')}"

                    description = clean_str(snippet.get("description", ""))

                    thumbnail_url = ""
                    thumbnails = snippet.get("thumbnails", {})
                    for quality in ("high", "medium", "default"):
                        if quality in thumbnails:
                            thumbnail_url = thumbnails[quality]["url"]
                            break

                    try:
                        subscriber_count = int(stats.get("subscriberCount", 0))
                    except (ValueError, TypeError):
                        subscriber_count = 0

                    try:
                        video_count = int(stats.get("videoCount", 0))
                    except (ValueError, TypeError):
                        video_count = 0

                    existing_creator = db.query(Creator).filter(Creator.channel_id == cid).first()
                    if existing_creator:
                        existing_creator.name = name
                        existing_creator.handle = handle
                        existing_creator.avatar_url = thumbnail_url
                        existing_creator.description = description
                        existing_creator.subscriber_count = subscriber_count
                        existing_creator.video_count = video_count
                        existing_creator.updated_at = now
                        updated_count += 1
                    else:
                        new_creator = Creator(
                            channel_id=cid,
                            name=name,
                            handle=handle,
                            avatar_url=thumbnail_url,
                            description=description,
                            subscriber_count=subscriber_count,
                            video_count=video_count,
                            last_synced_at=now,
                            created_at=now,
                            updated_at=now,
                        )
                        db.add(new_creator)
                        inserted_count += 1

                # Commit batch to database immediately
                db.commit()
                logger.info(f"Upserted batch {i // 50 + 1}: +{len(items)} creators committed to DB.")

            except Exception as e:
                db.rollback()
                if is_quota_exceeded_error(e):
                    logger.error(f"Quota limit reached during channel metadata batch fetch.")
                    quota_exceeded = True
                    break
                else:
                    logger.warning(f"Error fetching channel metadata batch: {e}")

    finally:
        if close_db:
            db.close()

    return inserted_count, updated_count, quota_exceeded


def crawl_categories_and_ingest(
    api_key: Optional[str] = None,
    region_codes: Optional[List[str]] = None,
    max_videos_per_category: int = 50,
) -> Dict[str, Any]:
    """
    Main entry point for Strategy 1: Crawl YouTube categories & regions, extract unique channels,
    batch-fetch channel metadata, and upsert them into PostgreSQL database.
    """
    youtube = get_youtube_client(api_key)

    logger.info("=== Starting Strategy 1: Category & Regional Creator Discovery ===")
    channel_ids, quota_hit_1 = discover_channels_from_popular_chart(
        youtube,
        region_codes=region_codes,
        max_videos_per_category=max_videos_per_category
    )

    logger.info(f"Discovered {len(channel_ids)} unique channel IDs from YouTube trending charts.")

    inserted_count, updated_count, quota_hit_2 = batch_fetch_and_upsert_creators(
        youtube,
        list(channel_ids)
    )

    quota_hit = quota_hit_1 or quota_hit_2
    if quota_hit:
        logger.warning("Crawl stopped early due to YouTube API quota limit (403). All progress saved to database!")

    db = SessionLocal()
    total_db_creators = 0
    try:
        total_db_creators = db.query(Creator).count()
    finally:
        db.close()

    result = {
        "status": "partial_quota_exceeded" if quota_hit else "success",
        "unique_channels_discovered": len(channel_ids),
        "new_creators_added": inserted_count,
        "existing_creators_updated": updated_count,
        "total_creators_in_db": total_db_creators,
        "quota_exceeded": quota_hit,
    }

    logger.info(f"Category crawl summary: {result}")
    return result
