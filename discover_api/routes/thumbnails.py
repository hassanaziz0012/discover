import os
import logging
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from db.session import get_db
from db.models import ActiveChannel
from youtube.utils import get_youtube_client, resolve_channel_id
from agentic.suggest_titles import suggest_titles

logger = logging.getLogger("discover_api.routes.thumbnails")

router = APIRouter(prefix="/api/youtube", tags=["Thumbnails"])


class ChannelMetadata(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="The name of the channel")
    url: str = Field(..., min_length=1, max_length=200, description="The YouTube channel URL or handle")
    profile_picture: str = Field("", max_length=500, description="The URL of the channel's profile picture")

class SuggestTitlesResponse(BaseModel):
    titles: List[str] = Field(..., description="List of suggested search query titles")


def get_or_create_active_channel(db: Session) -> ActiveChannel:
    """Helper to retrieve or initialize the single ActiveChannel record in PostgreSQL."""
    channel = db.query(ActiveChannel).filter(ActiveChannel.id == 1).first()
    if not channel:
        channel = ActiveChannel(
            id=1,
            name="Phantom Creator",
            url="https://youtube.com/@phantomcreator",
            profile_picture=""
        )
        db.add(channel)
        db.commit()
        db.refresh(channel)
    return channel


@router.get("/channel", response_model=ChannelMetadata)
def get_channel(db: Session = Depends(get_db)):
    """Retrieve the stored active YouTube channel details from PostgreSQL."""
    try:
        channel = get_or_create_active_channel(db)
        return ChannelMetadata(
            name=channel.name,
            url=channel.url,
            profile_picture=channel.profile_picture or ""
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving channel data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while loading channel details.")


@router.post("/channel", response_model=ChannelMetadata)
def save_channel(channel_input: ChannelMetadata, db: Session = Depends(get_db)):
    """Update and persist the active YouTube channel details in PostgreSQL."""
    try:
        active_rec = get_or_create_active_channel(db)
        
        active_rec.name = channel_input.name
        active_rec.url = channel_input.url
        active_rec.profile_picture = channel_input.profile_picture or ""
        
        # Automatically fetch the profile picture from YouTube if URL/handle is provided
        if channel_input.url:
            api_key = os.getenv("YOUTUBE_API_KEY")
            if api_key:
                try:
                    youtube = get_youtube_client(api_key)
                    channel_id = resolve_channel_id(youtube, channel_input.url)
                    response = youtube.channels().list(
                        part="snippet",
                        id=channel_id
                    ).execute()
                    
                    items = response.get("items", [])
                    if items:
                        snippet = items[0].get("snippet", {})
                        
                        thumbnails = snippet.get("thumbnails", {})
                        profile_picture_url = ""
                        for quality in ("high", "medium", "default"):
                            if quality in thumbnails:
                                profile_picture_url = thumbnails[quality]["url"]
                                break
                        
                        if profile_picture_url:
                            active_rec.profile_picture = profile_picture_url
                            logger.info(f"Successfully fetched profile picture for channel: {channel_id}")
                        
                        if snippet.get("title") and (not active_rec.name or active_rec.name == "Phantom Creator"):
                            active_rec.name = snippet.get("title")
                except Exception as e:
                    logger.error(f"Failed to fetch profile picture for URL {channel_input.url}: {e}", exc_info=True)
            else:
                logger.warning("YOUTUBE_API_KEY environment variable is not set. Skipping profile picture fetch.")
        
        db.commit()
        db.refresh(active_rec)
            
        return ChannelMetadata(
            name=active_rec.name,
            url=active_rec.url,
            profile_picture=active_rec.profile_picture or ""
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error saving channel data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while saving channel details.")


@router.get("/suggest-titles", response_model=SuggestTitlesResponse)
def get_suggested_titles(
    topic: Optional[str] = Query(None, description="Optional topic or search query context"),
    video_title: Optional[str] = Query(None, description="Optional video title context"),
    channel_name: Optional[str] = Query(None, description="Optional channel name context")
):
    """
    Suggest search queries for YouTube outlier research using Groq GPT OSS 120B model.
    Returns structured JSON with a list of suggested title queries.
    """
    try:
        titles = suggest_titles(
            topic=topic,
            video_title=video_title,
            channel_name=channel_name
        )
        return SuggestTitlesResponse(titles=titles)
    except Exception as e:
        logger.error(f"Error in /suggest-titles endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate title suggestions: {str(e)}"
        )


