"""
Video Serializers & Format Mappers
==================================
Handles conversion and serialization between raw API payloads, domain Video dataclasses,
and SQLAlchemy VideoModel database records.
"""

from datetime import datetime
from typing import Optional

from ..models import Video
from ..utils import format_iso8601_duration
from db.models import Video as VideoModel


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
