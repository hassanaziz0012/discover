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
from .utils import resolve_channel_id, get_youtube_client

logger = logging.getLogger("discover_api.youtube.fetch_outliers")


def calculate_outliers(
    channel_input: str,
    days: Optional[float] = None,
    limit: Optional[int] = None,
    api_key: Optional[str] = None,
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

    # 5. Filter for outliers: higher-than-average views OR likes
    outlier_candidates = []
    now = datetime.now(timezone.utc)

    for v in videos:
        # Determine if either metric exceeds average
        has_higher_views = v.view_count is not None and v.view_count > avg_views
        has_higher_likes = v.like_count is not None and v.like_count > avg_likes

        if has_higher_views or has_higher_likes:
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
                "duration": v.duration,
                "url": v.url,
                "score": round(score, 4),
                "base_score": round(base_score, 4),
                "view_ratio": round(view_ratio, 4),
                "like_ratio": round(like_ratio, 4),
                "view_diff": int(v.view_count - avg_views) if v.view_count is not None else 0,
                "like_diff": int(v.like_count - avg_likes) if v.like_count is not None else 0,
                "age_in_days": round(age_in_days, 2),
                "is_boosted": is_boosted
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


def calculate_all_cached_outliers(
    days: Optional[float] = None,
    search: Optional[str] = None,
    min_outlier: Optional[float] = None,
    time_range: Optional[str] = None,
    sort_by: str = "outlierScore",
) -> list:
    """
    Scans the cached creators, calculates outlier scores for all of them completely offline,
    aggregates, filters by query params (search query, min outlier score, publication timeframe cutoff),
    and sorts based on views, date, or outlier score.
    """
    import json
    from pathlib import Path
    from .cached_creators import get_cached_creators, cache_dir
    from .fetch_videos import dict_to_video

    creators = get_cached_creators()
    all_outliers = []
    now = datetime.now(timezone.utc)

    for creator in creators:
        channel_id = creator.get("channel_id")
        channel_name = creator.get("name", "Unknown Creator")
        channel_avatar = creator.get("thumbnail_url")

        if not channel_id:
            continue

        # Resolve path safely to prevent directory traversal
        safe_channel_id = Path(channel_id).name
        cache_file = (cache_dir / f"{safe_channel_id}.json").resolve()

        # Strict boundary confinement check
        if not str(cache_file).startswith(str(cache_dir.resolve()) + os.sep):
            logger.warning(f"Warning: Directory traversal blocked for channel ID: {channel_id}")
            continue

        if not cache_file.exists():
            continue

        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                videos_data = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read cache file {cache_file.name}: {e}")
            continue

        if not videos_data or not isinstance(videos_data, list):
            continue

        videos = []
        for v_dict in videos_data:
            try:
                videos.append(dict_to_video(v_dict))
            except Exception as e:
                # Skip individual malformed videos
                continue

        if not videos:
            continue

        valid_views_videos = [v for v in videos if v.view_count is not None]
        valid_likes_videos = [v for v in videos if v.like_count is not None]

        avg_views = sum(v.view_count for v in valid_views_videos) / len(valid_views_videos) if valid_views_videos else 0.0
        avg_likes = sum(v.like_count for v in valid_likes_videos) / len(valid_likes_videos) if valid_likes_videos else 0.0

        for v in videos:
            has_higher_views = v.view_count is not None and v.view_count > avg_views
            has_higher_likes = v.like_count is not None and v.like_count > avg_likes

            if has_higher_views or has_higher_likes:
                # Calculate ratios
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
                    "description": v.description,
                    "published_at": v.published_at.isoformat(),
                    "thumbnail_url": v.thumbnail_url,
                    "view_count": v.view_count,
                    "like_count": v.like_count,
                    "comment_count": v.comment_count,
                    "duration": v.duration,
                    "url": v.url,
                    "score": round(score, 4),
                    "base_score": round(base_score, 4),
                    "view_ratio": round(view_ratio, 4),
                    "like_ratio": round(like_ratio, 4),
                    "view_diff": int(v.view_count - avg_views) if v.view_count is not None else 0,
                    "like_diff": int(v.like_count - avg_likes) if v.like_count is not None else 0,
                    "age_in_days": round(age_in_days, 2),
                    "is_boosted": is_boosted,
                    "channel_id": channel_id,
                    "channel_name": channel_name,
                    "channel_avatar": channel_avatar,
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

