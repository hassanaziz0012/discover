"""
YouTube Channel Video Fetcher
==============================
Fetches all videos from a YouTube channel using the YouTube Data API v3
and organizes them into a list of structured Video objects. Uses thread-safe
multithreading and producer-consumer pipelining for high throughput.
"""

import os
import sys
import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Union, Tuple, List
from concurrent.futures import ThreadPoolExecutor, as_completed

from googleapiclient.errors import HttpError

from dotenv import load_dotenv

from .models import Video
from .utils import (
    get_api_key,
    get_youtube_client,
    resolve_channel_id,
    format_iso8601_duration,
    mark_api_key_exhausted,
)

# Configure standard logger
logger = logging.getLogger("discover_api.youtube.fetch_videos")

# ── Configuration ─────────────────────────────────────────────────────────────
load_dotenv()

CHANNEL_ID = os.getenv("YOUTUBE_CHANNEL_ID")


# ── Thread-Local API Client ───────────────────────────────────────────────────
_thread_local = threading.local()

def _get_thread_youtube_client(api_key: Optional[str] = None):
    """
    Retrieve or initialize a thread-local YouTube API client resource.
    Guarantees thread-safety when executing API calls in concurrent worker threads.
    """
    key = api_key or get_api_key()
    if not hasattr(_thread_local, "client") or getattr(_thread_local, "api_key", None) != key:
        _thread_local.api_key = key
        _thread_local.client = get_youtube_client(key)
    return _thread_local.client


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_dt(iso_string: str) -> datetime:
    """Parse an ISO 8601 timestamp returned by the API."""
    return datetime.fromisoformat(iso_string.replace("Z", "+00:00"))


def _best_thumbnail(thumbnails: dict) -> str:
    """Return the highest-quality thumbnail URL available."""
    for quality in ("maxres", "standard", "high", "medium", "default"):
        if quality in thumbnails:
            return thumbnails[quality]["url"]
    return ""


def video_to_dict(video: Video) -> dict:
    """Serialize a Video object to a dictionary."""
    return {
        "video_id": video.video_id,
        "title": video.title,
        "description": video.description,
        "published_at": video.published_at.isoformat(),
        "thumbnail_url": video.thumbnail_url,
        "channel_id": video.channel_id,
        "channel_title": video.channel_title,
        "view_count": video.view_count,
        "like_count": video.like_count,
        "comment_count": video.comment_count,
        "duration": video.duration,
        "tags": video.tags,
        "category_id": video.category_id,
        "live_broadcast": video.live_broadcast,
        "is_short": video.is_short,
    }


def dict_to_video(d: dict) -> Video:
    """Deserialize a dictionary to a Video object."""
    return Video(
        video_id=d["video_id"],
        title=d["title"],
        description=d["description"],
        published_at=_parse_dt(d["published_at"]),
        thumbnail_url=d["thumbnail_url"],
        channel_id=d["channel_id"],
        channel_title=d["channel_title"],
        view_count=d.get("view_count"),
        like_count=d.get("like_count"),
        comment_count=d.get("comment_count"),
        duration=d.get("duration"),
        tags=d.get("tags", []),
        category_id=d.get("category_id"),
        live_broadcast=d.get("live_broadcast"),
        is_short=d.get("is_short"),
    )


_YOUTUBE_REACHABLE: Optional[bool] = None

def check_youtube_connectivity() -> bool:
    global _YOUTUBE_REACHABLE
    if _YOUTUBE_REACHABLE is not None:
        return _YOUTUBE_REACHABLE
    
    import requests
    try:
        res = requests.head(
            "https://www.youtube.com", 
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}, 
            timeout=1.5
        )
        _YOUTUBE_REACHABLE = (res.status_code < 400)
    except Exception:
        _YOUTUBE_REACHABLE = False
        logger.warning("YouTube is unreachable. Falling back to offline Shorts classification heuristic (duration <= 60s).")
    return _YOUTUBE_REACHABLE


def ensure_shorts_classification(videos_data: list, force_recheck: bool = False) -> bool:
    """
    On-the-fly classification of YouTube Shorts for a list of serialized videos.
    Modifies the dictionaries in place and returns True if any changes were made.

    Rules:
    - Videos longer than 180s are automatically considered long videos (is_short = False).
    - Videos <= 180s (or with missing duration) run an HTTP HEAD check against youtube.com/shorts/{video_id}.
    """
    from .utils import parse_iso8601_duration
    needs_check = []
    modified = False
    
    for i, v in enumerate(videos_data):
        if force_recheck or "is_short" not in v or v["is_short"] is None:
            duration = v.get("duration")
            if isinstance(duration, (int, float)):
                duration_sec = int(duration)
            else:
                duration_sec = parse_iso8601_duration(duration)

            if duration_sec is not None and duration_sec > 180:
                if v.get("is_short") != False:
                    v["is_short"] = False
                    modified = True
            else:
                if not check_youtube_connectivity():
                    is_short_val = (duration_sec is not None and duration_sec <= 60)
                    if v.get("is_short") != is_short_val:
                        v["is_short"] = is_short_val
                        modified = True
                else:
                    needs_check.append((i, v["video_id"]))
    
    if needs_check:
        import requests
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry

        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        retry_strategy = Retry(
            total=1,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=1, pool_maxsize=20)
        session.mount("https://", adapter)
        
        def check_short_http(video_id: str) -> bool:
            url = f"https://www.youtube.com/shorts/{video_id}"
            try:
                res = session.head(url, allow_redirects=False, timeout=5)
                return res.status_code == 200
            except Exception as e:
                logger.warning(f"Error checking YouTube Short status for {video_id}: {e}")
                return False
                
        with ThreadPoolExecutor(max_workers=20) as executor:
            results = list(executor.map(lambda x: check_short_http(x[1]), needs_check))
            
        for (idx, _), is_short in zip(needs_check, results):
            if videos_data[idx].get("is_short") != is_short:
                videos_data[idx]["is_short"] = is_short
                modified = True
            
        return True
    return modified


# ── Core API functions ────────────────────────────────────────────────────────

def get_uploads_playlist_id(youtube, channel_id: str) -> str:
    """
    Retrieve the 'uploads' playlist ID for a channel.
    Every channel has a hidden playlist that contains all its public videos.
    Fast path: Standard YouTube channel IDs starting with 'UC' translate deterministically to 'UU'.
    """
    if channel_id.startswith("UC") and len(channel_id) == 24:
        return "UU" + channel_id[2:]

    response = youtube.channels().list(
        part="contentDetails",
        id=channel_id,
    ).execute()

    items = response.get("items", [])
    if not items:
        raise ValueError(f"Channel not found or no content details for ID: {channel_id!r}")

    return items[0]["contentDetails"]["relatedPlaylists"]["uploads"]


def fetch_all_video_ids(youtube, uploads_playlist_id: str, cached_ids: Optional[set[str]] = None) -> tuple[list[str], bool]:
    """
    Page through the uploads playlist and collect every video ID sequentially.
    If cached_ids is provided, stop paging when we encounter an ID already in cache.
    Returns a tuple: (list of new video_ids, hit_cache boolean).
    """
    video_ids = []
    next_page_token = None
    hit_cache = False

    while True:
        response = youtube.playlistItems().list(
            part="contentDetails",
            playlistId=uploads_playlist_id,
            maxResults=50,
            pageToken=next_page_token,
        ).execute()

        items = response.get("items", [])
        for item in items:
            vid = item["contentDetails"]["videoId"]
            if cached_ids and vid in cached_ids:
                hit_cache = True
                break
            video_ids.append(vid)

        if hit_cache:
            break

        if len(video_ids) // 500 > (len(video_ids) - len(items)) // 500:
            milestone = (len(video_ids) // 500) * 500
            if milestone > 0:
                logger.info(f"      Fetched {milestone} video IDs")

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break

    return video_ids, hit_cache


def fetch_video_details(
    youtube=None,
    video_ids: list[str] = None,
    max_workers: int = 16,
    api_key: Optional[str] = None
) -> list[Video]:
    """
    Fetch full metadata + statistics for a list of video IDs using multithreading.
    The API accepts up to 50 IDs per request. Batches are processed concurrently across worker threads.
    """
    if not video_ids:
        return []

    batches = [video_ids[i : i + 50] for i in range(0, len(video_ids), 50)]

    def _fetch_batch(batch_ids: list[str]) -> list[Video]:
        client = _get_thread_youtube_client(api_key) if (api_key or not youtube) else youtube
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

    if len(batches) == 1:
        return _fetch_batch(batches[0])

    num_workers = min(max_workers, len(batches))
    videos = []
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = [executor.submit(_fetch_batch, b) for b in batches]
        for f in futures:
            videos.extend(f.result())

    return videos


# ── Database Helpers ──────────────────────────────────────────────────────────

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from db.session import SessionLocal
from db.models import Creator as CreatorModel, Video as VideoModel

def db_to_video(v: VideoModel, channel_title: str = "") -> Video:
    """Convert SQLAlchemy VideoModel record to domain Video object."""
    c_title = channel_title
    if not c_title and v.creator:
        c_title = v.creator.name
    return Video(
        video_id=v.video_id,
        channel_title=c_title,
        title=v.title or "",
        description=v.description or "",
        published_at=v.published_at,
        thumbnail_url=v.thumbnail_url or "",
        channel_id=v.channel_id,
        view_count=v.view_count,
        like_count=v.like_count,
        comment_count=v.comment_count,
        duration=format_iso8601_duration(v.duration),
        tags=v.tags or [],
        category_id=v.category_id,
        live_broadcast=v.live_broadcast,
        is_short=v.is_short or False,
        url=v.url
    )


def recalculate_creator_outlier_scores(db: Session, channel_id: str) -> None:
    """
    Recalculates average views and likes for a creator and updates
    all pre-computed outlier metrics (outlier_score, base_score, view_ratio, like_ratio)
    for every video of the creator in PostgreSQL.
    """
    creator = db.query(CreatorModel).filter(CreatorModel.channel_id == channel_id).first()
    if not creator:
        return

    videos = db.query(VideoModel).filter(VideoModel.channel_id == channel_id).all()
    if not videos:
        return

    valid_views = [v.view_count for v in videos if v.view_count is not None]
    valid_likes = [v.like_count for v in videos if v.like_count is not None]

    avg_views = sum(valid_views) / len(valid_views) if valid_views else 0.0
    avg_likes = sum(valid_likes) / len(valid_likes) if valid_likes else 0.0

    creator.avg_views = round(avg_views, 2)
    creator.avg_likes = round(avg_likes, 2)

    for v in videos:
        view_ratio = v.view_count / avg_views if (v.view_count is not None and avg_views > 0) else 0.0
        like_ratio = v.like_count / avg_likes if (v.like_count is not None and avg_likes > 0) else 0.0

        ratios = []
        if v.view_count is not None and avg_views > 0:
            ratios.append(view_ratio)
        if v.like_count is not None and avg_likes > 0:
            ratios.append(like_ratio)

        base_score = sum(ratios) / len(ratios) if ratios else 0.0

        v.view_ratio = round(view_ratio, 4)
        v.like_ratio = round(like_ratio, 4)
        v.base_score = round(base_score, 4)
        v.outlier_score = round(base_score, 4)

    db.commit()


# ── Synchronization Locks ─────────────────────────────────────────────────────

_channel_locks: dict[str, threading.Lock] = {}
_channel_locks_guard = threading.Lock()

def _get_channel_lock(channel_id: str) -> threading.Lock:
    with _channel_locks_guard:
        if channel_id not in _channel_locks:
            _channel_locks[channel_id] = threading.Lock()
        return _channel_locks[channel_id]


# ── Core Pipeline ─────────────────────────────────────────────────────────────

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
            db_videos = db.query(VideoModel).filter(VideoModel.channel_id == channel_id).order_by(VideoModel.published_at.desc()).all()
            creator_record = db.query(CreatorModel).filter(CreatorModel.channel_id == channel_id).first()
            channel_title = creator_record.name if creator_record else ""
            backfill_completed = (creator_record.backfill_completed if (creator_record and creator_record.backfill_completed is not None) else False) if not fresh else False

            cached_videos = [db_to_video(v, channel_title) for v in db_videos] if not fresh else []
            cached_ids = {v.video_id for v in cached_videos}
            
            if cached_videos:
                logger.info(f"      Fetched {len(cached_videos)} videos from PostgreSQL database (backfill_completed={backfill_completed})")

            youtube = get_youtube_client(api_key)

            logger.info(f"[1/3] Fetching uploads playlist for channel: {channel_id}")
            uploads_playlist_id = get_uploads_playlist_id(youtube, channel_id)

            # 2 & 3. Fetch video IDs & details from API concurrently using producer-consumer pipelining
            logger.info(f"[2/3] Collecting video IDs & enriching metadata concurrently from playlist: {uploads_playlist_id}")
            if fresh:
                logger.info("      Bypassing cached data (--fresh requested)...")
            
            new_video_ids = []
            new_videos = []
            hit_cache = False
            next_page_token = None
            quota_exceeded = False
            now = datetime.now(timezone.utc)

            def _fetch_batch_ids(batch_ids: list[str]) -> list[Video]:
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

            def _save_pending(pending: list[Video]) -> None:
                """
                Classify Shorts, upsert a batch of Video objects to the DB, and commit.
                Called incrementally so videos are persisted even if the API quota is hit mid-fetch.
                """
                nonlocal creator_record, channel_title
                if not pending:
                    return

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
                    if creator_record:
                        channel_title = creator_record.name

                from .utils import parse_iso8601_duration
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

            # Incremental save threshold: commit to DB every N videos so quota errors don't lose work
            INCREMENTAL_SAVE_THRESHOLD = 500

            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures_list = []
                pending_videos = []

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
                        futures_list.append(executor.submit(_fetch_batch_ids, page_vids))

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

                        # Save to DB every INCREMENTAL_SAVE_THRESHOLD videos so a quota
                        # error mid-fetch doesn't lose all the work done so far
                        if len(pending_videos) >= INCREMENTAL_SAVE_THRESHOLD:
                            _save_pending(pending_videos)
                            pending_videos = []

                    # Save any remaining videos that didn't fill a full threshold
                    if pending_videos:
                        _save_pending(pending_videos)

                    logger.info(f"      Fetched {len(new_videos)} detailed video objects from API")

            # Update creator record: if backfill was completed without hitting quota limits or early cache exit, mark backfill_completed = True
            if not creator_record:
                creator_record = db.query(CreatorModel).filter(CreatorModel.channel_id == channel_id).first()

            if not quota_exceeded and not hit_cache and creator_record:
                creator_record.backfill_completed = True
                db.commit()

            # Update creator video count, baseline averages, outlier scores, and sync timestamp after saves
            if (new_videos or fresh or not creator_record or creator_record.avg_views is None) and creator_record:
                creator_record.video_count = db.query(VideoModel).filter(VideoModel.channel_id == channel_id).count()
                creator_record.last_synced_at = now
                db.commit()
                recalculate_creator_outlier_scores(db, channel_id)

            # 5. Query complete list of videos from database for final return
            db_all_videos = db.query(VideoModel).filter(VideoModel.channel_id == channel_id).order_by(VideoModel.published_at.desc()).all()
            all_videos = [db_to_video(v, channel_title) for v in db_all_videos]

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
