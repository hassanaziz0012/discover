"""
Fetch YouTube Channel Outliers
==============================
Fetches all videos of a given YouTube channel and calculates outlier scores
based on views and likes ratios compared to the channel averages.
Includes options to boost scores for recently uploaded videos.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional

from .models import Video
from .fetch_videos import fetch_channel_videos
from .utils import resolve_channel_id, get_youtube_client, format_iso8601_duration

logger = logging.getLogger("discover_api.youtube.fetch_outliers")


def calculate_outliers(
    channel_input: str,
    days: Optional[float] = None,
    limit: Optional[int] = None,
    api_key: Optional[str] = None,
    exclude_shorts: bool = False,
) -> dict:
    """
    Main business logic for outlier calculation.
    Resolves the channel, fetches all channel videos (cached or API), computes views/likes
    averages, filters and scores outliers, applies optional recency boost, sorts the list,
    and returns a structured dictionary matching premium API specs.
    """
    target_api_key = api_key or os.getenv("YOUTUBE_API_KEY")

    # 1. Authenticate and Build API Client
    youtube = get_youtube_client(target_api_key)

    # 2. Resolve Channel ID using robust utility
    channel_id = resolve_channel_id(youtube, channel_input)

    # Fetch channel avatar profile pic and description
    channel_avatar = None
    channel_description = ""
    try:
        channel_response = youtube.channels().list(
            part="snippet",
            id=channel_id
        ).execute()
        items = channel_response.get("items", [])
        if items:
            snippet = items[0]["snippet"]
            channel_description = snippet.get("description", "")
            thumbnails = snippet.get("thumbnails", {})
            for quality in ("high", "medium", "default"):
                if quality in thumbnails:
                    channel_avatar = thumbnails[quality]["url"]
                    break
    except Exception as e:
        logger.warning(f"Failed to fetch channel info for ID {channel_id}: {e}")

    # 3. Fetch all channel videos using fetch_channel_videos
    videos = fetch_channel_videos(target_api_key, channel_id)

    if not videos:
        return {
            "channel_name": "Unknown",
            "channel_id": channel_id,
            "channel_avatar": channel_avatar,
            "channel_description": channel_description,
            "total_videos": 0,
            "average_views": 0.0,
            "average_likes": 0.0,
            "outliers": []
        }

    # 4. Calculate average view count and average like count across all videos
    valid_views_videos = [v for v in videos if v.view_count is not None]
    valid_likes_videos = [v for v in videos if v.like_count is not None]

    avg_views = sum(v.view_count for v in valid_views_videos) / len(valid_views_videos) if valid_views_videos else 0.0
    avg_likes = sum(v.like_count for v in valid_likes_videos) / len(valid_likes_videos) if valid_likes_videos else 0.0

    # 5. Calculate outlier scores for all videos
    outlier_candidates = []
    now = datetime.now(timezone.utc)

    for v in videos:
        if exclude_shorts and v.is_short:
            continue

        # Calculate ratios
        view_ratio = v.view_count / avg_views if (v.view_count is not None and avg_views > 0) else 0.0
        like_ratio = v.like_count / avg_likes if (v.like_count is not None and avg_likes > 0) else 0.0

        # Gather valid ratios to calculate average ratio
        ratios = []
        if v.view_count is not None and avg_views > 0:
            ratios.append(view_ratio)
        if v.like_count is not None and avg_likes > 0:
            ratios.append(like_ratio)

        base_score = sum(ratios) / len(ratios) if ratios else 0.0

        # Boost logic: Check if video was uploaded within X days ago
        is_boosted = False
        age_in_days = (now - v.published_at).total_seconds() / 86400.0

        score = base_score
        if days is not None:
            if age_in_days <= days:
                score = base_score * 1.10
                is_boosted = True

        outlier_candidates.append({
            "video_id": v.video_id,
            "title": v.title,
            "description": v.description,
            "published_at": v.published_at.isoformat(),
            "thumbnail_url": v.thumbnail_url,
            "view_count": v.view_count,
            "like_count": v.like_count,
            "comment_count": v.comment_count,
            "duration": format_iso8601_duration(v.duration),
            "url": v.url,
            "score": round(score, 4),
            "base_score": round(base_score, 4),
            "view_ratio": round(view_ratio, 4),
            "like_ratio": round(like_ratio, 4),
            "view_diff": int(v.view_count - avg_views) if v.view_count is not None else 0,
            "like_diff": int(v.like_count - avg_likes) if v.like_count is not None else 0,
            "age_in_days": round(age_in_days, 2),
            "is_boosted": is_boosted,
            "is_short": v.is_short
        })

    # Sort outliers by final score in descending order
    outlier_candidates.sort(key=lambda item: item["score"], reverse=True)

    # 6. Apply limit if defined
    displayed_candidates = outlier_candidates
    if limit is not None:
        displayed_candidates = outlier_candidates[:limit]

    channel_name = videos[0].channel_title if videos else "Target Channel"

    return {
        "channel_name": channel_name,
        "channel_id": channel_id,
        "channel_avatar": channel_avatar,
        "channel_description": channel_description,
        "total_videos": len(videos),
        "average_views": round(avg_views, 2),
        "average_likes": round(avg_likes, 2),
        "outliers": displayed_candidates
    }


from sqlalchemy.orm import Session

def calculate_all_outliers(
    days: Optional[float] = None,
    search: Optional[str] = None,
    min_outlier: Optional[float] = None,
    time_range: Optional[str] = None,
    sort_by: str = "outlierScore",
    exclude_shorts: bool = False,
    list_id: Optional[str] = None,
    db: Optional[Session] = None,
) -> list:
    """
    Retrieves aggregated outliers from PostgreSQL database,
    applying sorting, filtering, and scoring.
    """
    from db.session import SessionLocal
    from db.models import Creator as CreatorModel, Video as VideoModel, UserList, ListCreator

    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Determine channel filtering if list_id is provided
        target_channel_ids = None
        if list_id:
            user_list = db.query(UserList).filter((UserList.id == list_id) | (UserList.name == list_id)).first()
            if user_list:
                target_channel_ids = {lc.channel_id for lc in user_list.creators}
            else:
                return []

        # Query creators
        creator_query = db.query(CreatorModel)
        if target_channel_ids is not None:
            creator_query = creator_query.filter(CreatorModel.channel_id.in_(target_channel_ids))
        
        creators = creator_query.all()
        all_outliers = []
        now = datetime.now(timezone.utc)

        for creator in creators:
            videos = creator.videos
            if not videos:
                continue

            valid_views_videos = [v for v in videos if v.view_count is not None]
            valid_likes_videos = [v for v in videos if v.like_count is not None]

            avg_views = sum(v.view_count for v in valid_views_videos) / len(valid_views_videos) if valid_views_videos else 0.0
            avg_likes = sum(v.like_count for v in valid_likes_videos) / len(valid_likes_videos) if valid_likes_videos else 0.0

            for v in videos:
                if exclude_shorts and v.is_short:
                    continue

                view_ratio = v.view_count / avg_views if (v.view_count is not None and avg_views > 0) else 0.0
                like_ratio = v.like_count / avg_likes if (v.like_count is not None and avg_likes > 0) else 0.0

                ratios = []
                if v.view_count is not None and avg_views > 0:
                    ratios.append(view_ratio)
                if v.like_count is not None and avg_likes > 0:
                    ratios.append(like_ratio)

                base_score = sum(ratios) / len(ratios) if ratios else 0.0

                is_boosted = False
                age_in_days = (now - v.published_at).total_seconds() / 86400.0

                score = base_score
                if days is not None:
                    if age_in_days <= days:
                        score = base_score * 1.10
                        is_boosted = True

                video_item = {
                    "video_id": v.video_id,
                    "title": v.title,
                    "description": v.description or "",
                    "published_at": v.published_at.isoformat(),
                    "thumbnail_url": v.thumbnail_url or "",
                    "view_count": v.view_count,
                    "like_count": v.like_count,
                    "comment_count": v.comment_count,
                    "duration": format_iso8601_duration(v.duration),
                    "url": v.url or f"https://www.youtube.com/watch?v={v.video_id}",
                    "score": round(score, 4),
                    "base_score": round(base_score, 4),
                    "view_ratio": round(view_ratio, 4),
                    "like_ratio": round(like_ratio, 4),
                    "view_diff": int(v.view_count - avg_views) if v.view_count is not None else 0,
                    "like_diff": int(v.like_count - avg_likes) if v.like_count is not None else 0,
                    "age_in_days": round(age_in_days, 2),
                    "is_boosted": is_boosted,
                    "is_short": v.is_short,
                    "channel_id": creator.channel_id,
                    "channel_name": creator.name,
                    "channel_avatar": creator.avatar_url,
                }
                all_outliers.append(video_item)

        # Apply search filter
        if search:
            s_query = search.lower().strip()
            all_outliers = [
                item for item in all_outliers
                if s_query in item["title"].lower() or s_query in item["channel_name"].lower()
            ]

        # Apply min_outlier filter
        if min_outlier is not None:
            all_outliers = [item for item in all_outliers if item["score"] >= min_outlier]

        # Apply time_range cutoff
        if time_range and time_range != "all":
            days_cutoff = None
            if time_range == "weekly":
                days_cutoff = 7
            elif time_range == "monthly":
                days_cutoff = 30
            elif time_range == "3months":
                days_cutoff = 90
            elif time_range == "6months":
                days_cutoff = 180

            if days_cutoff is not None:
                all_outliers = [item for item in all_outliers if item["age_in_days"] <= days_cutoff]

        # Apply Sort
        if sort_by == "views":
            all_outliers.sort(key=lambda x: x["view_count"] if x["view_count"] is not None else 0, reverse=True)
        elif sort_by == "newest":
            all_outliers.sort(key=lambda x: x["published_at"], reverse=True)
        else:  # default outlierScore / score
            all_outliers.sort(key=lambda x: x["score"], reverse=True)

        return all_outliers
    finally:
        if close_db:
            db.close()


