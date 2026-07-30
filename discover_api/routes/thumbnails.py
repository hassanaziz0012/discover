import os
import json
import logging
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query

from youtube.utils import get_youtube_client, resolve_channel_id
from agentic.suggest_titles import suggest_titles

logger = logging.getLogger("discover_api.routes.thumbnails")

router = APIRouter(prefix="/api/youtube", tags=["Thumbnails"])

# Static configuration of DB directory and file path to avoid user input in path logic.
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "db")
CHANNEL_FILE = os.path.join(DB_DIR, "channel.json")

class ChannelMetadata(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="The name of the channel")
    url: str = Field(..., min_length=1, max_length=200, description="The YouTube channel URL or handle")
    profile_picture: str = Field("", max_length=500, description="The URL of the channel's profile picture")

class SuggestTitlesResponse(BaseModel):
    titles: List[str] = Field(..., description="List of suggested search query titles")

def ensure_db():
    """Ensure that the database directory and channel.json file exist."""
    try:
        if not os.path.exists(DB_DIR):
            os.makedirs(DB_DIR, exist_ok=True)
        if not os.path.exists(CHANNEL_FILE):
            default_channel = {
                "name": "Phantom Creator",
                "url": "https://youtube.com/@phantomcreator",
                "profile_picture": ""
            }
            with open(CHANNEL_FILE, "w", encoding="utf-8") as f:
                json.dump(default_channel, f, indent=2)
    except Exception as e:
        logger.error(f"Error initializing db directory/file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to initialize database.")

def verify_safe_path(path: str, base_dir: str):
    """
    Validate that the resolved path is strictly within the allowed base directory.
    Protects against directory traversal attempts if path logic ever becomes dynamic.
    """
    resolved_path = os.path.abspath(path)
    resolved_base = os.path.abspath(base_dir)
    # Enforce trailing path separator check for exact boundary protection
    if not resolved_path.startswith(resolved_base + os.path.sep) and resolved_path != resolved_base:
        raise HTTPException(status_code=400, detail="Path traversal attempt detected.")

@router.get("/channel", response_model=ChannelMetadata)
def get_channel():
    """Retrieve the stored active YouTube channel details."""
    try:
        ensure_db()
        verify_safe_path(CHANNEL_FILE, DB_DIR)
        
        with open(CHANNEL_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return ChannelMetadata(**data)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON format in channel.json: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database file is corrupted.")
    except Exception as e:
        logger.error(f"Unexpected error retrieving channel data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while loading channel details.")

@router.post("/channel", response_model=ChannelMetadata)
def save_channel(channel: ChannelMetadata):
    """Update and persist the active YouTube channel details."""
    try:
        ensure_db()
        verify_safe_path(CHANNEL_FILE, DB_DIR)
        
        # Automatically fetch the profile picture from YouTube if URL/handle is provided
        if channel.url:
            api_key = os.getenv("YOUTUBE_API_KEY")
            if api_key:
                try:
                    youtube = get_youtube_client(api_key)
                    channel_id = resolve_channel_id(youtube, channel.url)
                    response = youtube.channels().list(
                        part="snippet",
                        id=channel_id
                    ).execute()
                    
                    items = response.get("items", [])
                    if items:
                        snippet = items[0].get("snippet", {})
                        
                        # Fetch the profile picture URL
                        thumbnails = snippet.get("thumbnails", {})
                        profile_picture_url = ""
                        for quality in ("high", "medium", "default"):
                            if quality in thumbnails:
                                profile_picture_url = thumbnails[quality]["url"]
                                break
                        
                        if profile_picture_url:
                            channel.profile_picture = profile_picture_url
                            logger.info(f"Successfully fetched profile picture for channel: {channel_id}")
                        
                        # Populate or update the channel name if it's default/empty
                        if snippet.get("title") and (not channel.name or channel.name == "Phantom Creator"):
                            channel.name = snippet.get("title")
                except Exception as e:
                    logger.error(f"Failed to fetch profile picture for URL {channel.url}: {e}", exc_info=True)
            else:
                logger.warning("YOUTUBE_API_KEY environment variable is not set. Skipping profile picture fetch.")
        
        # Save validated data to JSON file
        with open(CHANNEL_FILE, "w", encoding="utf-8") as f:
            json.dump(channel.dict(), f, indent=2)
            
        return channel
    except Exception as e:
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

