"""
YouTube Data API Network Functions
===================================
Handles direct low-level API queries to YouTube Data API v3 for channels,
uploads playlists, and video metadata details.
"""

import logging
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

from ..models import Video
from .client import _get_thread_youtube_client
from .serializers import _parse_dt, _best_thumbnail

logger = logging.getLogger("discover_api.youtube.fetch_videos.api")


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
