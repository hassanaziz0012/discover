"""
YouTube Subscriptions Fetcher
=============================
Handles retrieving all subscriptions of a given channel using the YouTube Data API v3.
"""

import logging
import re
from typing import List, Dict, Any
from .utils import get_youtube_client

logger = logging.getLogger("discover_api.youtube.subscriptions")

def get_channel_subscriptions(api_key: str, channel_id: str) -> List[Dict[str, Any]]:
    """
    Fetch all subscriptions for a channel.
    
    Args:
        api_key: YouTube API Key
        channel_id: Channel ID to retrieve subscriptions for
        
    Returns:
        List of dictionaries, each containing: channel_id, name, thumbnail_url, description.
    """
    # Strict validation of channel_id format to prevent injection/path traversal
    if not re.fullmatch(r"UC[\w-]{22}", channel_id):
        raise ValueError(f"Invalid channel ID format: {channel_id}")

    try:
        youtube = get_youtube_client(api_key)
        subscriptions = []
        next_page_token = None

        while True:
            response = youtube.subscriptions().list(
                part="snippet",
                channelId=channel_id,
                maxResults=50,
                pageToken=next_page_token
            ).execute()

            for item in response.get("items", []):
                snippet = item.get("snippet", {})
                resource_id = snippet.get("resourceId", {})
                sub_channel_id = resource_id.get("channelId")
                
                # Input validation on the returned channel ID
                if not sub_channel_id or not re.fullmatch(r"UC[\w-]{22}", sub_channel_id):
                    continue

                thumbnails = snippet.get("thumbnails", {})
                thumbnail_url = ""
                for quality in ("high", "medium", "default"):
                    if quality in thumbnails:
                        thumbnail_url = thumbnails[quality]["url"]
                        break

                subscriptions.append({
                    "channel_id": sub_channel_id,
                    "name": snippet.get("title", ""),
                    "thumbnail_url": thumbnail_url,
                    "description": snippet.get("description", ""),
                })

            next_page_token = response.get("nextPageToken")
            if not next_page_token:
                break

        return subscriptions
    except Exception as e:
        logger.error(f"Failed to fetch subscriptions for channel {channel_id}: {e}", exc_info=True)
        raise e
