"""
YouTube Live Video Search Module
================================
Performs live YouTube searches using YouTube Data API v3,
fetching video metadata, view counts, durations, and channel avatars.
"""

import os
import logging
from typing import Optional, Dict, Any, List

from .utils import get_youtube_client, parse_iso8601_duration
from .fetch_videos import _best_thumbnail, _parse_dt, ensure_shorts_classification

logger = logging.getLogger("discover_api.youtube.search_live_videos")


def search_live_videos(
    query: str,
    page_token: Optional[str] = None,
    limit: int = 12,
    order: str = "relevance",
    exclude_shorts: bool = False,
    video_duration: Optional[str] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Search live videos on YouTube via YouTube Data API v3.
    
    :param query: Search terms.
    :param page_token: Token for YouTube search pagination.
    :param limit: Number of items per page (1 to 50).
    :param order: Sorting order ('viewCount', 'relevance', 'date', 'rating', 'title').
    :param exclude_shorts: If True, filters out Shorts from the return list.
    :param video_duration: API filter ('any', 'short', 'medium', 'long').
    :param api_key: YouTube API key.
    """
    target_api_key = api_key or os.getenv("YOUTUBE_API_KEY")
    if not target_api_key:
        raise ValueError("YOUTUBE_API_KEY environment variable is not set.")

    youtube = get_youtube_client(target_api_key)

    search_query = query.strip() if query else "trending"

    search_params: Dict[str, Any] = {
        "part": "snippet",
        "q": search_query,
        "type": "video",
        "order": order,
        "maxResults": min(max(1, limit), 50),
    }

    if video_duration and video_duration != "any":
        search_params["videoDuration"] = video_duration

    if page_token:
        search_params["pageToken"] = page_token

    search_response = youtube.search().list(**search_params).execute()

    items = search_response.get("items", [])
    next_page_token = search_response.get("nextPageToken")

    video_ids = [
        item["id"]["videoId"]
        for item in items
        if item.get("id", {}).get("kind") == "youtube#video" and "videoId" in item.get("id", {})
    ]

    if not video_ids:
        return {
            "videos": [],
            "next_page_token": next_page_token,
            "has_more": bool(next_page_token),
        }

    # Fetch full video details (statistics & contentDetails)
    videos_response = youtube.videos().list(
        part="snippet,statistics,contentDetails",
        id=",".join(video_ids)
    ).execute()

    raw_video_items = videos_response.get("items", [])

    # Collect unique channel IDs to fetch channel avatars
    channel_ids = list({item["snippet"]["channelId"] for item in raw_video_items if "channelId" in item.get("snippet", {})})

    channel_avatars: Dict[str, str] = {}
    if channel_ids:
        try:
            channels_response = youtube.channels().list(
                part="snippet",
                id=",".join(channel_ids)
            ).execute()
            for ch in channels_response.get("items", []):
                ch_id = ch["id"]
                snip = ch.get("snippet", {})
                ch_avatars = snip.get("thumbnails", {})
                channel_avatars[ch_id] = _best_thumbnail(ch_avatars)
        except Exception as ex:
            logger.warning(f"Failed to fetch channel avatars: {ex}")

    video_list: List[Dict[str, Any]] = []

    for item in raw_video_items:
        vid_id = item["id"]
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        content = item.get("contentDetails", {})
        ch_id = snippet.get("channelId", "")

        view_cnt = int(stats["viewCount"]) if "viewCount" in stats else None
        like_cnt = int(stats["likeCount"]) if "likeCount" in stats else None
        comment_cnt = int(stats["commentCount"]) if "commentCount" in stats else None
        duration_str = content.get("duration")

        v_dict = {
            "video_id": vid_id,
            "title": snippet.get("title", ""),
            "description": snippet.get("description", ""),
            "published_at": snippet.get("publishedAt", "1970-01-01T00:00:00Z"),
            "thumbnail_url": _best_thumbnail(snippet.get("thumbnails", {})),
            "view_count": view_cnt,
            "like_count": like_cnt,
            "comment_count": comment_cnt,
            "duration": duration_str,
            "url": f"https://www.youtube.com/watch?v={vid_id}",
            "channel_id": ch_id,
            "channel_name": snippet.get("channelTitle", "YouTube Creator"),
            "channel_avatar": channel_avatars.get(ch_id),
            "score": None,  # No outlier score for live YouTube search results
        }
        video_list.append(v_dict)

    # Classify shorts on the fly if needed
    try:
        ensure_shorts_classification(video_list)
    except Exception as ex:
        logger.warning(f"Error classifying shorts in live search: {ex}")

    if exclude_shorts:
        video_list = [v for v in video_list if not v.get("is_short")]

    return {
        "videos": video_list,
        "next_page_token": next_page_token,
        "has_more": bool(next_page_token),
    }
