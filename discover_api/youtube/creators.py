"""
YouTube Creators Metadata Fetcher & Persistence
================================================
Manages YouTube creator and channel metadata stored in the PostgreSQL database.
Enriches channel metadata using the YouTube Data API and updates database records.
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session
from db.session import SessionLocal
from db.models import Creator, Video

logger = logging.getLogger("discover_api.youtube.creators")


def fetch_channels_metadata_from_api(youtube, channel_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Query YouTube API in batches to get channel snippet and statistics.
    """
    results = {}
    for i in range(0, len(channel_ids), 50):
        batch = channel_ids[i : i + 50]
        try:
            response = youtube.channels().list(
                part="snippet,statistics",
                id=",".join(batch)
            ).execute()
            
            for item in response.get("items", []):
                channel_id = item["id"]
                snippet = item.get("snippet", {})
                stats = item.get("statistics", {})
                
                name = snippet.get("title", "")
                handle = snippet.get("customUrl", "")
                if handle:
                    if not handle.startswith("@"):
                        handle = "@" + handle
                else:
                    handle = f"@{name.lower().replace(' ', '')}"
                    
                description = snippet.get("description", "")
                
                thumbnail_url = ""
                thumbnails = snippet.get("thumbnails", {})
                for quality in ("high", "medium", "default"):
                    if quality in thumbnails:
                        thumbnail_url = thumbnails[quality]["url"]
                        break
                
                try:
                    subscriber_count = int(stats.get("subscriberCount", 0))
                except (ValueError, TypeError):
                    subscriber_count = 0
                    
                try:
                    video_count = int(stats.get("videoCount", 0))
                except (ValueError, TypeError):
                    video_count = 0
                
                results[channel_id] = {
                    "channel_id": channel_id,
                    "name": name,
                    "handle": handle,
                    "thumbnail_url": thumbnail_url,
                    "description": description,
                    "subscriber_count": subscriber_count,
                    "video_count": video_count
                }
        except Exception as e:
            logger.warning(f"Failed to fetch metadata batch {batch} from YouTube API: {e}")
            
    return results


def get_creators(
    db: Optional[Session] = None, 
    page: int = 1, 
    limit: int = 50
) -> Dict[str, Any]:
    """
    Retrieves YouTube channel/creator records from PostgreSQL with pagination,
    sorted by subscriber count descending.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        total_count = db.query(func.count(Creator.channel_id)).scalar() or 0
        offset = (page - 1) * limit
        creators_db = (
            db.query(Creator)
            .order_by(Creator.subscriber_count.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        result_list = []
        for c in creators_db:
            result_list.append({
                "channel_id": c.channel_id,
                "name": c.name,
                "handle": c.handle or f"@{c.name.lower().replace(' ', '')}",
                "thumbnail_url": c.avatar_url or f"https://api.dicebear.com/7.x/pixel-art/svg?seed={c.channel_id}",
                "description": c.description or "",
                "subscriber_count": c.subscriber_count or 0,
                "video_count": c.video_count or len(c.videos)
            })
        return {
            "creators": result_list,
            "total": total_count,
            "page": page,
            "limit": limit,
            "has_more": (offset + len(result_list)) < total_count
        }
    finally:
        if close_db:
            db.close()


def delete_creator(channel_id: str, db: Optional[Session] = None) -> bool:
    """
    Deletes a creator/channel from PostgreSQL database.
    Cascade deletion handles associated videos and list entries.
    """
    if not (len(channel_id) == 24 and channel_id.startswith("UC") and all(c.isalnum() or c in "-_" for c in channel_id)):
        raise ValueError("Invalid channel ID format.")
        
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        creator = db.query(Creator).filter(Creator.channel_id == channel_id).first()
        if not creator:
            return False

        db.delete(creator)
        db.commit()
        logger.info(f"Deleted creator {channel_id} from database.")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete creator {channel_id} from database: {e}")
        raise
    finally:
        if close_db:
            db.close()
