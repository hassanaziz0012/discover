"""
YouTube Data API Package (Backend Version)
===========================================
"""

from .models import Video, VideoSeed, RankedVideo
from .fetch_videos import (
    fetch_channel_videos,
    fetch_video_details,
    get_uploads_playlist_id,
)
from .utils import (
    get_api_key,
    get_youtube_client,
    resolve_channel_id,
    supports_color,
    mark_api_key_exhausted,
    is_api_key_exhausted,
    reset_exhausted_keys,
)
from .search_creators import search_youtube_creators

__all__ = [
    "Video",
    "VideoSeed",
    "RankedVideo",
    "fetch_channel_videos",
    "fetch_video_details",
    "get_uploads_playlist_id",
    "get_api_key",
    "get_youtube_client",
    "resolve_channel_id",
    "supports_color",
    "mark_api_key_exhausted",
    "is_api_key_exhausted",
    "reset_exhausted_keys",
    "search_youtube_creators",
]
