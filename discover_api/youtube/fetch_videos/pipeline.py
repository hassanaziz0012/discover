"""
Fetch Channel Videos Pipeline Orchestrator
==========================================
Coordinates channel video retrieval: database lookup, concurrent YouTube API fetching,
incremental database upserting, Shorts classification, and outlier score recalculation.
"""

import os
import logging
import threading
from datetime import datetime, timezone
from typing import Optional, Union, Tuple, List, Set
from concurrent.futures import ThreadPoolExecutor, as_completed

from googleapiclient.errors import HttpError
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from db.session import SessionLocal
from db.models import Creator as CreatorModel, Video as VideoModel

from ..models import Video
from ..utils import (
    get_youtube_client,
    mark_api_key_exhausted,
    parse_iso8601_duration,
)
from .client import _get_thread_youtube_client, _thread_local
from .serializers import (
    _parse_dt,
    _best_thumbnail,
    video_to_dict,
    db_to_video,
)
from .shorts import ensure_shorts_classification
from .api import get_uploads_playlist_id
from .db import recalculate_creator_outlier_scores
from .locks import _get_channel_lock

logger = logging.getLogger("discover_api.youtube.fetch_videos.pipeline")

# Incremental save threshold: commit to DB every N videos so quota errors don't lose work
INCREMENTAL_SAVE_THRESHOLD = 500


def _load_cached_channel_data(
    db: Session,
    channel_id: str,
    fresh: bool
) -> Tuple[List[Video], Set[str], Optional[CreatorModel], str, bool]:
    """
    Query existing cached videos and creator record from PostgreSQL.
    Returns (cached_videos, cached_ids, creator_record, channel_title, backfill_completed).
    """
    db_videos = db.query(VideoModel).filter(VideoModel.channel_id == channel_id).order_by(VideoModel.published_at.desc()).all()
    creator_record = db.query(CreatorModel).filter(CreatorModel.channel_id == channel_id).first()
    channel_title = creator_record.name if creator_record else ""
    backfill_completed = (
        (creator_record.backfill_completed if (creator_record and creator_record.backfill_completed is not None) else False)
        if not fresh else False
    )

    cached_videos = [db_to_video(v, channel_title) for v in db_videos] if not fresh else []
    cached_ids = {v.video_id for v in cached_videos}

    if cached_videos:
        logger.info(f"      Fetched {len(cached_videos)} videos from PostgreSQL database (backfill_completed={backfill_completed})")

    return cached_videos, cached_ids, creator_record, channel_title, backfill_completed


def _fetch_batch_ids(api_key: str, batch_ids: List[str]) -> List[Video]:
    """
    Fetch video details (snippet, statistics, contentDetails) for a batch of video IDs using thread-local client.
    """
    client = _get_thread_youtube_client(api_key)
    response = client.videos().list(
        part="snippet,statistics,contentDetails",
        id=",".join(batch_ids),
    ).execute()

    batch_videos = []
    for item in response.get("items", []):
        snippet    = item.get("snippet", {})
        stats      = item.get("statistics", {})
        content    = item.get("contentDetails", {})
        thumbnails = snippet.get("thumbnails", {})

        video = Video(
            video_id       = item["id"],
            title          = snippet.get("title", ""),
            description    = snippet.get("description", ""),
            published_at   = _parse_dt(snippet.get("publishedAt", "1970-01-01T00:00:00Z")),
            thumbnail_url  = _best_thumbnail(thumbnails),
            channel_id     = snippet.get("channelId", ""),
            channel_title  = snippet.get("channelTitle", ""),
            tags           = snippet.get("tags", []),
            category_id    = snippet.get("categoryId"),
            live_broadcast = snippet.get("liveBroadcastContent"),
            view_count     = int(stats["viewCount"])    if "viewCount"    in stats else None,
            like_count     = int(stats["likeCount"])    if "likeCount"    in stats else None,
            comment_count  = int(stats["commentCount"]) if "commentCount" in stats else None,
            duration       = content.get("duration"),
        )
        batch_videos.append(video)
    return batch_videos


def _upsert_pending_videos(
    db: Session,
    channel_id: str,
    pending: List[Video],
    now: datetime,
    creator_record: Optional[CreatorModel],
) -> Tuple[Optional[CreatorModel], str]:
    """
    Classify Shorts, upsert a batch of Video objects to PostgreSQL, and commit.
    Ensures Creator record exists before inserting videos to satisfy foreign key constraints.
    Returns updated (creator_record, channel_title).
    """
    if not pending:
        channel_title = creator_record.name if creator_record else ""
        return creator_record, channel_title

    # Ensure creator row exists before inserting videos (FK constraint)
    if not creator_record:
        creator_name = pending[0].channel_title or "Unknown Channel"
        creator_stmt = pg_insert(CreatorModel).values({
            "channel_id": channel_id,
            "name": creator_name,
            "subscriber_count": 0,
            "video_count": 0,
            "backfill_completed": False,
            "last_synced_at": now,
            "created_at": now,
            "updated_at": now
        }).on_conflict_do_nothing(index_elements=["channel_id"])
        db.execute(creator_stmt)
        db.flush()
        creator_record = db.query(CreatorModel).filter(CreatorModel.channel_id == channel_id).first()

    channel_title = creator_record.name if creator_record else ""

    serialized = [video_to_dict(v) for v in pending]
    ensure_shorts_classification(serialized)
    for v, sv in zip(pending, serialized):
        v.is_short = sv.get("is_short")

    video_records = []
    for v in pending:
        dur_sec = parse_iso8601_duration(v.duration) or 0
        video_records.append({
            "video_id": v.video_id,
            "channel_id": channel_id,
            "title": v.title,
            "description": v.description,
            "published_at": v.published_at,
            "thumbnail_url": v.thumbnail_url,
            "view_count": v.view_count or 0,
            "like_count": v.like_count or 0,
            "comment_count": v.comment_count or 0,
            "duration": dur_sec,
            "is_short": v.is_short or False,
            "category_id": v.category_id,
            "live_broadcast": v.live_broadcast,
            "tags": v.tags,
            "created_at": now,
            "updated_at": now,
        })

    batch_size = 1000
    for i in range(0, len(video_records), batch_size):
        batch = video_records[i : i + batch_size]
        stmt = pg_insert(VideoModel).values(batch)
        update_cols = {
            col.name: col
            for col in stmt.excluded
            if col.name not in ("video_id", "created_at")
        }
        upsert_stmt = stmt.on_conflict_do_update(
            index_elements=["video_id"],
            set_=update_cols
        )
        db.execute(upsert_stmt)

    db.commit()
    logger.info(f"      Saved {len(pending)} videos to PostgreSQL database")
    return creator_record, channel_title


def _fetch_and_enrich_playlist_videos(
    api_key: str,
    channel_id: str,
    uploads_playlist_id: str,
    fresh: bool,
    backfill_completed: bool,
    cached_ids: Set[str],
    db: Session,
    creator_record: Optional[CreatorModel],
    max_workers: int,
    now: datetime,
) -> Tuple[List[Video], bool, bool, Optional[CreatorModel], str]:
    """
    Collects video IDs from uploads playlist and enriches video details concurrently using ThreadPoolExecutor.
    Saves videos incrementally to PostgreSQL.
    Returns (new_videos, hit_cache, quota_exceeded, creator_record, channel_title).
    """
    youtube = get_youtube_client(api_key)
    new_video_ids: List[str] = []
    new_videos: List[Video] = []
    hit_cache = False
    next_page_token = None
    quota_exceeded = False
    channel_title = creator_record.name if creator_record else ""

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures_list = []
        pending_videos: List[Video] = []

        # Producer: page through the uploads playlist and submit detail-fetch batches
        while not quota_exceeded:
            try:
                response = youtube.playlistItems().list(
                    part="contentDetails",
                    playlistId=uploads_playlist_id,
                    maxResults=50,
                    pageToken=next_page_token,
                ).execute()
            except HttpError as e:
                if e.resp.status == 403 and b"quotaExceeded" in e.content:
                    mark_api_key_exhausted(getattr(_thread_local, "api_key", None))
                    logger.warning(
                        "YouTube API daily quota exceeded during playlist fetch. "
                        "Saving all videos fetched so far and stopping."
                    )
                    quota_exceeded = True
                    break
                raise

            items = response.get("items", [])
            page_vids = []
            for item in items:
                vid = item["contentDetails"]["videoId"]
                if not fresh and backfill_completed and cached_ids and vid in cached_ids:
                    hit_cache = True
                    break
                if cached_ids and vid in cached_ids:
                    # Already in DB from a previous partial fetch; skip detail fetch
                    continue
                page_vids.append(vid)
                new_video_ids.append(vid)

            if page_vids:
                futures_list.append(executor.submit(_fetch_batch_ids, api_key, page_vids))

            if hit_cache:
                break

            if len(new_video_ids) // 500 > (len(new_video_ids) - len(items)) // 500:
                milestone = (len(new_video_ids) // 500) * 500
                if milestone > 0:
                    logger.info(f"      Collected {milestone} video IDs (enriching metadata concurrently in background...)")

            next_page_token = response.get("nextPageToken")
            if not next_page_token:
                break

        if hit_cache:
            logger.info("      Found cached video ID in database. Stopping API fetch.")
        if quota_exceeded:
            logger.warning(f"      Stopped at {len(new_video_ids)} video IDs due to API quota limit.")

        logger.info(f"      Collected {len(new_video_ids)} new video IDs across API pages")

        # Consumer: collect futures as they complete and save incrementally
        if futures_list:
            logger.info(f"[3/3] Awaiting concurrent metadata enrichment across {len(futures_list)} batches...")
            for future in as_completed(futures_list):
                try:
                    batch = future.result()
                    new_videos.extend(batch)
                    pending_videos.extend(batch)
                except HttpError as e:
                    if e.resp.status == 403 and b"quotaExceeded" in e.content:
                        mark_api_key_exhausted(getattr(_thread_local, "api_key", None))
                        logger.warning(
                            "YouTube API quota exceeded during metadata fetch. "
                            "Saving partial results and stopping."
                        )
                        quota_exceeded = True
                        continue
                    raise

                # Save to DB every INCREMENTAL_SAVE_THRESHOLD videos
                if len(pending_videos) >= INCREMENTAL_SAVE_THRESHOLD:
                    creator_record, channel_title = _upsert_pending_videos(db, channel_id, pending_videos, now, creator_record)
                    pending_videos = []

            # Save any remaining videos
            if pending_videos:
                creator_record, channel_title = _upsert_pending_videos(db, channel_id, pending_videos, now, creator_record)

            logger.info(f"      Fetched {len(new_videos)} detailed video objects from API")

    return new_videos, hit_cache, quota_exceeded, creator_record, channel_title


def _finalize_creator_and_outliers(
    db: Session,
    channel_id: str,
    creator_record: Optional[CreatorModel],
    now: datetime,
    new_videos: List[Video],
    fresh: bool,
    hit_cache: bool,
    quota_exceeded: bool,
) -> Optional[CreatorModel]:
    """
    Updates Creator record (backfill status, video count, last synced timestamp) and recalculates outlier scores.
    """
    if not creator_record:
        creator_record = db.query(CreatorModel).filter(CreatorModel.channel_id == channel_id).first()

    if not quota_exceeded and not hit_cache and creator_record:
        creator_record.backfill_completed = True
        db.commit()

    if (new_videos or fresh or not creator_record or creator_record.avg_views is None) and creator_record:
        creator_record.video_count = db.query(VideoModel).filter(VideoModel.channel_id == channel_id).count()
        creator_record.last_synced_at = now
        db.commit()
        recalculate_creator_outlier_scores(db, channel_id)

    return creator_record


def _get_final_channel_videos(db: Session, channel_id: str, channel_title: str) -> List[Video]:
    """
    Query complete list of videos from database for final return.
    """
    db_all_videos = db.query(VideoModel).filter(VideoModel.channel_id == channel_id).order_by(VideoModel.published_at.desc()).all()
    return [db_to_video(v, channel_title) for v in db_all_videos]


def fetch_channel_videos(
    api_key: str,
    channel_id: str,
    fresh: bool = False,
    return_detailed: bool = False,
    db: Optional[Session] = None,
    max_workers: int = 16
) -> Union[Tuple[List[Video], int, int], List[Video]]:
    """
    Full high-performance pipeline with database persistence & multithreaded pipelining:
    Query existing videos from PostgreSQL → page uploads playlist from API
    → enrich new video details concurrently using worker threads → bulk upsert to PostgreSQL
    → return Video objects.

    Thread-safe: Concurrent requests for the same channel_id are synchronized
    using per-channel locks so only one request fetches from the YouTube API while
    subsequent requests reuse the newly saved database cache. Thread-local clients prevent
    transport race conditions across worker threads.
    """
    channel_lock = _get_channel_lock(channel_id)
    with channel_lock:
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True
        else:
            db.expire_all()

        try:
            # 1. Query cached videos from PostgreSQL
            cached_videos, cached_ids, creator_record, channel_title, backfill_completed = _load_cached_channel_data(
                db, channel_id, fresh
            )

            # 2. Get uploads playlist ID
            youtube = get_youtube_client(api_key)
            logger.info(f"[1/3] Fetching uploads playlist for channel: {channel_id}")
            uploads_playlist_id = get_uploads_playlist_id(youtube, channel_id)

            # 3. Collect video IDs & enrich metadata concurrently
            logger.info(f"[2/3] Collecting video IDs & enriching metadata concurrently from playlist: {uploads_playlist_id}")
            if fresh:
                logger.info("      Bypassing cached data (--fresh requested)...")

            now = datetime.now(timezone.utc)
            new_videos, hit_cache, quota_exceeded, creator_record, channel_title = _fetch_and_enrich_playlist_videos(
                api_key=api_key,
                channel_id=channel_id,
                uploads_playlist_id=uploads_playlist_id,
                fresh=fresh,
                backfill_completed=backfill_completed,
                cached_ids=cached_ids,
                db=db,
                creator_record=creator_record,
                max_workers=max_workers,
                now=now,
            )

            # 4. Update creator record and recalculate outlier scores
            creator_record = _finalize_creator_and_outliers(
                db=db,
                channel_id=channel_id,
                creator_record=creator_record,
                now=now,
                new_videos=new_videos,
                fresh=fresh,
                hit_cache=hit_cache,
                quota_exceeded=quota_exceeded,
            )

            # 5. Query complete list of videos from database for final return
            all_videos = _get_final_channel_videos(db, channel_id, channel_title)

            logger.info(f"Done! Returning {len(all_videos)} Video objects from PostgreSQL.")
            if return_detailed:
                return all_videos, len(new_videos), len(cached_videos)
            return all_videos

        except Exception as e:
            if db:
                db.rollback()
            logger.error(f"Error in fetch_channel_videos for channel {channel_id}: {e}")
            raise e
        finally:
            if close_db:
                db.close()
