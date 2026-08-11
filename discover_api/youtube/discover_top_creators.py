"""
YouTube Top Creator Discovery
===============================
Discovers top YouTube creators by extracting unique channels from trending
(mostPopular) videos. Supports filtering by video category and region.
"""

import os
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

from .utils import get_youtube_client, get_api_key

logger = logging.getLogger("discover_api.youtube.discover_top_creators")

# Cache directory (same as fetch_videos.py for consistency)
cache_dir = Path(__file__).resolve().parent / "cache"


def get_video_categories(
    region_code: str = "US",
    api_key: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch all assignable YouTube video categories for a given region.

    Returns:
        List of dicts with keys: id, title
    """
    target_api_key = api_key or get_api_key()
    youtube = get_youtube_client(target_api_key)

    response = youtube.videoCategories().list(
        part="snippet",
        regionCode=region_code,
    ).execute()

    categories = []
    for item in response.get("items", []):
        snippet = item.get("snippet", {})
        # Only include assignable categories (ones creators can actually use)
        if snippet.get("assignable", False):
            categories.append({
                "id": item["id"],
                "title": snippet.get("title", ""),
            })

    return categories


def discover_top_creators(
    category_id: Optional[str] = None,
    region_code: str = "US",
    max_videos: int = 200,
    api_key: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Discover top YouTube creators by extracting unique channels from the
    mostPopular video chart, optionally filtered by category and region.

    Strategy:
        1. Fetch trending/popular videos (up to max_videos, paginated).
        2. Extract unique channel IDs from those videos.
        3. Batch-fetch full channel metadata (snippet + statistics).
        4. Mark channels that are already in the local cache.
        5. Sort by subscriber count descending and return.

    Args:
        category_id: Optional YouTube video category ID to filter by.
        region_code: ISO 3166-1 alpha-2 country code (default: "US").
        max_videos: Maximum number of trending videos to scan (default: 200).
        api_key: YouTube API key (falls back to env var).

    Returns:
        List of creator dicts, each with:
            channel_id, name, handle, thumbnail_url, description,
            subscriber_count, video_count, trending_video_count, already_cached
    """
    target_api_key = api_key or get_api_key()
    youtube = get_youtube_client(target_api_key)

    # ── Step 1: Fetch trending/popular videos ─────────────────────────────
    channel_video_counts: Dict[str, int] = {}  # channel_id -> count of trending videos
    fetched = 0
    next_page_token = None

    while fetched < max_videos:
        request_params = {
            "part": "snippet",
            "chart": "mostPopular",
            "regionCode": region_code,
            "maxResults": min(50, max_videos - fetched),
        }
        if category_id:
            request_params["videoCategoryId"] = category_id
        if next_page_token:
            request_params["pageToken"] = next_page_token

        response = youtube.videos().list(**request_params).execute()

        items = response.get("items", [])
        if not items:
            break

        for item in items:
            snippet = item.get("snippet", {})
            cid = snippet.get("channelId", "")
            if cid:
                channel_video_counts[cid] = channel_video_counts.get(cid, 0) + 1

        fetched += len(items)

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break

    logger.info(
        f"Discovered {len(channel_video_counts)} unique channels "
        f"from {fetched} trending videos (category={category_id}, region={region_code})"
    )

    if not channel_video_counts:
        return []

    # ── Step 2: Batch-fetch channel metadata ──────────────────────────────
    channel_ids = list(channel_video_counts.keys())
    creators: Dict[str, Dict[str, Any]] = {}

    for i in range(0, len(channel_ids), 50):
        batch = channel_ids[i : i + 50]
        try:
            response = youtube.channels().list(
                part="snippet,statistics",
                id=",".join(batch),
            ).execute()

            for item in response.get("items", []):
                cid = item["id"]
                snippet = item.get("snippet", {})
                stats = item.get("statistics", {})

                name = snippet.get("title", "")
                handle = snippet.get("customUrl", "")
                if handle and not handle.startswith("@"):
                    handle = "@" + handle
                elif not handle:
                    handle = f"@{name.lower().replace(' ', '')}"

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

                creators[cid] = {
                    "channel_id": cid,
                    "name": name,
                    "handle": handle,
                    "thumbnail_url": thumbnail_url,
                    "description": snippet.get("description", ""),
                    "subscriber_count": subscriber_count,
                    "video_count": video_count,
                    "trending_video_count": channel_video_counts.get(cid, 0),
                    "already_cached": False,  # Set below
                }
        except Exception as e:
            logger.warning(f"Failed to fetch channel metadata batch: {e}")

    # ── Step 3: Check which channels are already stored in PostgreSQL DB ──
    from db.session import SessionLocal
    from db.models import Creator as CreatorModel

    db = SessionLocal()
    try:
        db_creator_ids = {c.channel_id for c in db.query(CreatorModel.channel_id).all()}
        for cid in creators:
            if cid in db_creator_ids:
                creators[cid]["already_cached"] = True
    finally:
        db.close()

    # ── Step 4: Sort by subscriber count descending ───────────────────────
    result = sorted(
        creators.values(),
        key=lambda c: c["subscriber_count"],
        reverse=True,
    )

    return result

