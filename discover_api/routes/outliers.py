import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

# Import from the youtube package
from youtube.fetch_outliers import calculate_outliers, calculate_all_cached_outliers
from youtube.search_live_videos import search_live_videos

logger = logging.getLogger("discover_api.routes.outliers")

router = APIRouter(prefix="/api/youtube", tags=["YouTube"])


@router.get("/fetch-outliers")
def get_outliers(
    channel: str = Query(
        ..., 
        description="YouTube channel ID, handle (starts with @), or name."
    ),
    days: Optional[float] = Query(
        None, 
        description="Optional: number of days to apply a 10% recency boost multiplier to scores."
    ),
    limit: Optional[int] = Query(
        None, 
        ge=1, 
        description="Optional: limit the number of outliers returned."
    ),
    exclude_shorts: bool = Query(
        False,
        description="Optional: whether to exclude YouTube Shorts from results."
    )
):
    """
    Identify outlier videos on a YouTube channel.
    Calculates view and like ratio averages to determine which videos overperformed.
    """
    try:
        if days is not None and days <= 0:
            raise HTTPException(status_code=400, detail="The days boost parameter must be greater than zero.")
        if limit is not None and limit <= 0:
            raise HTTPException(status_code=400, detail="The limit parameter must be a positive integer.")

        outliers_report = calculate_outliers(channel_input=channel, days=days, limit=limit, exclude_shorts=exclude_shorts)
        return outliers_report
    except ValueError as e:
        logger.error(f"Validation error in fetch-outliers: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in fetch-outliers: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all-outliers")
def get_all_outliers(
    page: int = Query(1, ge=1, description="Page number for pagination"),
    limit: int = Query(12, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for video title or channel name"),
    min_outlier: Optional[float] = Query(None, description="Minimum outlier score threshold"),
    days: Optional[float] = Query(None, description="Recency boost days multiplier"),
    time_range: Optional[str] = Query(None, description="Publish time range cutoff"),
    sort_by: str = Query("outlierScore", description="Sort criteria: outlierScore, views, newest"),
    exclude_shorts: bool = Query(False, description="Whether to exclude YouTube Shorts from results"),
    list_id: Optional[str] = Query(None, alias="list", description="Channel list ID or name to filter by")
):
    """
    Retrieve aggregated outliers from all cached creators completely offline,
    applying sorting, filtering, and pagination.
    """
    try:
        all_outliers = calculate_all_cached_outliers(
            days=days,
            search=search,
            min_outlier=min_outlier,
            time_range=time_range,
            sort_by=sort_by,
            exclude_shorts=exclude_shorts,
            list_id=list_id
        )

        total = len(all_outliers)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit

        paginated_outliers = all_outliers[start_idx:end_idx]
        has_more = end_idx < total

        return {
            "videos": paginated_outliers,
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": has_more
        }
    except Exception as e:
        logger.error(f"Unexpected error in get_all_outliers: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch all outliers: {e}")


@router.get("/search-live")
def get_live_search(
    search: Optional[str] = Query("trending", description="Search term for YouTube videos"),
    page_token: Optional[str] = Query(None, description="Page token for YouTube search pagination"),
    limit: int = Query(12, ge=1, le=50, description="Items per page"),
    order: str = Query("relevance", description="Sort order: viewCount, relevance, date, rating, title"),
    exclude_shorts: bool = Query(False, description="Filter out YouTube Shorts"),
    video_duration: Optional[str] = Query(None, description="YouTube duration filter: any, short, medium, long"),
    relevance_language: Optional[str] = Query("en", description="Relevance language ISO code (e.g. en)"),
    region_code: Optional[str] = Query(None, description="Region ISO country code (e.g. US)")
):
    """
    Directly query YouTube Data API v3 for live search results.
    """
    try:
        result = search_live_videos(
            query=search or "trending",
            page_token=page_token,
            limit=limit,
            order=order,
            exclude_shorts=exclude_shorts,
            video_duration=video_duration,
            relevance_language=relevance_language,
            region_code=region_code
        )
        return result
    except ValueError as e:
        logger.error(f"Validation error in search-live: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in search-live: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to search live videos: {e}")

