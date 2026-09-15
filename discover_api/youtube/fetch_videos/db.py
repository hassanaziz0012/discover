"""
Database Operations & Outlier Metrics
======================================
Handles creator outlier metric recalculation and database analytics sync.
"""

from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session
from db.models import Creator as CreatorModel, Video as VideoModel

# Must match the constant in pipeline.py
VIDEO_HISTORY_DAYS = 365


def recalculate_creator_outlier_scores(db: Session, channel_id: str) -> None:
    """
    Recalculates average views and likes for a creator using only videos
    from the last VIDEO_HISTORY_DAYS (12 months), then updates all
    pre-computed outlier metrics (outlier_score, base_score, view_ratio, like_ratio)
    for every video of the creator in PostgreSQL.
    """
    creator = db.query(CreatorModel).filter(CreatorModel.channel_id == channel_id).first()
    if not creator:
        return

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=VIDEO_HISTORY_DAYS)

    # Use only recent videos (last 12 months) for computing averages
    recent_videos = db.query(VideoModel).filter(
        VideoModel.channel_id == channel_id,
        VideoModel.published_at >= cutoff_date,
    ).all()
    if not recent_videos:
        return

    valid_views = [v.view_count for v in recent_videos if v.view_count is not None]
    valid_likes = [v.like_count for v in recent_videos if v.like_count is not None]

    avg_views = sum(valid_views) / len(valid_views) if valid_views else 0.0
    avg_likes = sum(valid_likes) / len(valid_likes) if valid_likes else 0.0

    creator.avg_views = round(avg_views, 2)
    creator.avg_likes = round(avg_likes, 2)

    # Recalculate outlier scores for all recent videos using 12-month averages
    for v in recent_videos:
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
