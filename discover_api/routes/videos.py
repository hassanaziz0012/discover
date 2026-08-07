import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, Body, Depends
from sqlalchemy.orm import Session
from db.session import get_db


# Import from the youtube package
from youtube.fetch_popular_videos import get_popular_videos
from youtube.recommend_related_videos import get_related_recommendations
from youtube.sentiment_analyzer import analyze_video_comments_sentiment, get_sentiment_analyses, extract_video_id
from youtube.summarize_video import summarize_youtube_video

logger = logging.getLogger("discover_api.routes.videos")

router = APIRouter(prefix="/api/youtube", tags=["YouTube"])



# ── Request / Response Models ──────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    video_id: Optional[str] = Field(
        None, 
        description="Search recommendations using an existing video ID as seed.",
        example="dQw4w9WgXcQ"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None, 
        description="Search recommendations for a brand new video upload using its metadata.",
        example={
            "title": "Unboxing the new premium editor!",
            "description": "Today we look at advanced workspace tools...",
            "tags": ["unboxing", "editor", "productivity"],
            "categoryId": "28"
        }
    )
    limit: int = Field(
        5, 
        ge=1, 
        le=50, 
        description="Maximum number of recommendations to return.",
        example=5
    )


class SummarizeRequest(BaseModel):
    video_id: str = Field(
        ...,
        description="YouTube video ID or URL to summarize.",
        example="dQw4w9WgXcQ"
    )
    model: Optional[str] = Field(
        "gemini-3.5-flash",
        description="Gemini model to use for summarization.",
        example="gemini-3.5-flash"
    )


# ── Routes Definitions ─────────────────────────────────────────────────────────

@router.get("/fetch-popular_videos")
async def get_popular(
    channel: str = Query(
        ..., 
        description="YouTube channel ID, handle (starts with @), or name."
    ),
    period: str = Query(
        "monthly", 
        description="Timeframe cutoff filter: weekly, monthly, 3months, 6months, all."
    ),
    sort: str = Query(
        "views", 
        description="Metric sort target: views or likes."
    ),
    limit: int = Query(
        10, 
        ge=1, 
        le=100, 
        description="Maximum number of top performing videos to return."
    )
):
    """
    Get the top performing popular videos of a channel in a specific timeframe.
    """
    valid_periods = {"weekly", "week", "monthly", "month", "3months", "3m", "6months", "6m", "all"}
    if period.lower() not in valid_periods:
        raise HTTPException(status_code=400, detail=f"Invalid period: {period!r}. Must be one of {sorted(list(valid_periods))}")
    
    if sort.lower() not in {"views", "likes"}:
        raise HTTPException(status_code=400, detail=f"Invalid sort metric: {sort!r}. Must be 'views' or 'likes'")

    try:
        popular_list = get_popular_videos(
            channel_input=channel,
            period=period,
            sort=sort,
            limit=limit
        )
        return {
            "channel": channel,
            "period": period,
            "sort_by": sort,
            "count": len(popular_list),
            "videos": popular_list
        }
    except ValueError as e:
        logger.error(f"Validation error in fetch-popular_videos: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in fetch-popular_videos: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend-related-videos")
async def get_recommendations(
    request: RecommendRequest = Body(...)
):
    """
    Recommend related videos from the channel inventory.
    Accepts either an existing `video_id` as the similarity seed,
    or a Pydantic `metadata` object representing a new video upload's snippet.
    """
    if not request.video_id and not request.metadata:
        raise HTTPException(
            status_code=400, 
            detail="Must provide either 'video_id' or 'metadata' in the request body."
        )
    if request.video_id and request.metadata:
        raise HTTPException(
            status_code=400,
            detail="Cannot provide both 'video_id' and 'metadata'. Please choose one as the similarity seed."
        )

    try:
        recommendations = get_related_recommendations(
            video_id=request.video_id,
            metadata=request.metadata,
            limit=request.limit
        )
        return {
            "seed_source": "video_id" if request.video_id else "metadata",
            "limit": request.limit,
            "count": len(recommendations),
            "recommendations": recommendations
        }
    except ValueError as e:
        logger.error(f"Validation error in recommend-related-videos: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except EnvironmentError as e:
        logger.error(f"Environment configuration issue in recommend-related-videos: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in recommend-related-videos: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze-video-sentiment")
def analyze_video_sentiment(
    video_id: str = Query(..., description="YouTube video ID or URL"),
    limit: Optional[int] = Query(100, ge=1, le=2000, description="Max comments to fetch and analyze"),
    model: Optional[str] = Query("gemini-3.5-flash", description="Gemini model to use")
):
    """
    Fetch comments for a YouTube video and perform sentiment analysis using Gemini.
    """
    if model not in {"gemini-3.5-flash", "gemma-4"}:
        raise HTTPException(status_code=400, detail=f"Invalid model selected: {model!r}. Must be 'gemini-3.5-flash' or 'gemma-4'.")

    try:
        report = analyze_video_comments_sentiment(
            video_id_or_url=video_id,
            limit=limit,
            model=model
        )
        return report
    except ValueError as e:
        logger.error(f"Validation/YouTube error in analyze-video-sentiment: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in analyze-video-sentiment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze video sentiment: {str(e)}")


@router.get("/video-sentiment-reports")
def get_video_sentiment_reports(
    video_id: str = Query(..., description="YouTube video ID or URL"),
    db: Session = Depends(get_db)
):
    """
    Get all sentiment analysis reports for a YouTube video from PostgreSQL database.
    """
    try:
        extracted_id = extract_video_id(video_id)
        reports = get_sentiment_analyses(extracted_id, db=db)
        return reports
    except ValueError as e:
        logger.error(f"Validation error in get-video-sentiment-reports: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in get-video-sentiment-reports: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch reports: {str(e)}")



@router.post("/summarize")
def summarize_video_endpoint(
    request: SummarizeRequest = Body(...)
):
    """
    Generate a structured summary, key takeaways, and chapter timestamps for a YouTube video.
    """
    try:
        summary = summarize_youtube_video(
            video_id_or_url=request.video_id,
            model=request.model
        )
        return summary
    except ValueError as e:
        logger.error(f"Validation error in summarize: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in summarize: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
