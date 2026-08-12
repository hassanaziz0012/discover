"""
Fetch Videos Package Entry Point
================================
Re-exports public and internal interfaces from sub-modules for backward compatibility.
"""

from .pipeline import fetch_channel_videos
from .api import (
    get_uploads_playlist_id,
    fetch_all_video_ids,
    fetch_video_details,
)
from .serializers import (
    _parse_dt,
    _best_thumbnail,
    video_to_dict,
    dict_to_video,
    db_to_video,
)
from .shorts import (
    check_youtube_connectivity,
    ensure_shorts_classification,
)
from .client import _get_thread_youtube_client
from .db import recalculate_creator_outlier_scores
from .locks import _get_channel_lock

__all__ = [
    "fetch_channel_videos",
    "fetch_video_details",
    "get_uploads_playlist_id",
    "fetch_all_video_ids",
    "ensure_shorts_classification",
    "check_youtube_connectivity",
    "video_to_dict",
    "dict_to_video",
    "db_to_video",
    "recalculate_creator_outlier_scores",
    "_parse_dt",
    "_best_thumbnail",
    "_get_thread_youtube_client",
    "_get_channel_lock",
]
