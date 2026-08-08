import logging
import os
import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from db.session import get_db
from db.models import Creator as CreatorModel
from youtube.fetch_videos import fetch_channel_videos, video_to_dict
from youtube.utils import get_youtube_client, resolve_channel_id
from youtube.search_creators import search_youtube_creators
from youtube.creators import get_creators, delete_creator

logger = logging.getLogger("discover_api.routes.creators")

router = APIRouter(prefix="/api/youtube", tags=["YouTube"])


@router.get("/fetch-videos")
def get_videos(
    channel: Optional[str] = Query(
        None, 
        description="YouTube channel ID, handle (starts with @), or name. If empty, falls back to default."
    ),
    fresh: bool = Query(
        False, 
        description="Bypass cached data and force a fresh fetch from the YouTube API."
    ),
    db: Session = Depends(get_db)
):
    """
    Fetch all videos from a YouTube channel.
    Utilizes PostgreSQL database for persistence and retrieval.
    """
    try:
        api_key = os.getenv("YOUTUBE_API_KEY")
        target_channel = channel or os.getenv("YOUTUBE_CHANNEL_ID")
        
        if not api_key:
            raise HTTPException(status_code=500, detail="YOUTUBE_API_KEY environment variable is not set.")
        if not target_channel:
            raise HTTPException(status_code=400, detail="No YouTube channel provided and YOUTUBE_CHANNEL_ID is not configured.")

        # Authenticate and resolve channel ID
        youtube = get_youtube_client(api_key)
        resolved_id = resolve_channel_id(youtube, target_channel)

        # Retrieve videos
        videos = fetch_channel_videos(api_key, resolved_id, fresh=fresh, db=db)
        return {
            "channel_id": resolved_id,
            "count": len(videos),
            "videos": [video_to_dict(v) for v in videos]
        }
    except ValueError as e:
        logger.error(f"Validation error in fetch-videos: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in fetch-videos: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search-creators")
async def search_creators(
    q: str = Query(..., min_length=1, description="YouTube creator name or search query")
):
    """
    Search YouTube for creators with the given query string.
    Returns: channel ID, profile pic (thumbnail_url), name, description, etc.
    """
    query = q.strip()
    if not query:
        return {
            "query": query,
            "count": 0,
            "results": []
        }

    try:
        api_key = os.getenv("YOUTUBE_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="YOUTUBE_API_KEY environment variable is not set.")

        results = search_youtube_creators(api_key=api_key, query=query, limit=10)
        return {
            "query": query,
            "count": len(results),
            "results": results
        }
    except Exception as e:
        logger.error(f"Unexpected error in search-creators: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while searching for creators.")


@router.get("/creators")
@router.get("/cached-creators")
async def get_creators_endpoint(db: Session = Depends(get_db)):
    """
    Retrieve YouTube channel metadata for all creators currently stored in PostgreSQL.
    """
    try:
        creators = get_creators(db=db)
        return creators
    except Exception as e:
        logger.error(f"Unexpected error in creators endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch creators: {e}")


@router.post("/refresh-creators")
async def refresh_creators(db: Session = Depends(get_db)):
    """
    Refresh all YouTube creators/channels stored in PostgreSQL by fetching
    any new uploads from the YouTube API for each channel.
    """
    try:
        api_key = os.getenv("YOUTUBE_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="YOUTUBE_API_KEY environment variable is not set.")

        # 1. Query all channel IDs from PostgreSQL
        creator_records = db.query(CreatorModel).all()
        channel_ids = [c.channel_id for c in creator_records]
        
        if not channel_ids:
            return {
                "message": "No creators to refresh.",
                "refreshed": [],
                "errors": [],
                "creators": []
            }

        # 2. Define a helper to refresh a single channel asynchronously
        async def refresh_single_channel(cid: str):
            try:
                # fresh=False to skip already existing videos and only retrieve new uploads
                videos, new_count, cached_count = await asyncio.to_thread(
                    fetch_channel_videos, api_key, cid, False, True
                )
                return cid, new_count, cached_count, None
            except Exception as ex:
                logger.error(f"Error refreshing channel {cid}: {ex}", exc_info=True)
                return cid, 0, 0, str(ex)

        # 3. Refresh each channel concurrently using thread pool
        tasks = [refresh_single_channel(cid) for cid in channel_ids]
        results = await asyncio.gather(*tasks)

        # 4. Load updated creators metadata from DB
        updated_creators = get_creators(db=db)
        creators_by_id = {c["channel_id"]: c for c in updated_creators}

        refreshed_list = []
        errors = []
        for cid, new_count, cached_count, err in results:
            if err:
                errors.append({"channel_id": cid, "error": err})
            else:
                creator_meta = creators_by_id.get(cid, {})
                refreshed_list.append({
                    "channel_id": cid,
                    "channel_name": creator_meta.get("name") or "Unknown Channel",
                    "thumbnail_url": creator_meta.get("thumbnail_url") or "",
                    "new_videos_count": new_count,
                    "cached_videos_count": cached_count
                })

        status_msg = f"Successfully refreshed {len(refreshed_list)} channels."
        if errors:
            status_msg += f" {len(errors)} channels failed to refresh."

        return {
            "message": status_msg,
            "refreshed": refreshed_list,
            "errors": errors,
            "creators": updated_creators
        }

    except Exception as e:
        logger.error(f"Unexpected error in refresh-creators: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-subscriptions")
async def sync_subscriptions(
    channel_id: Optional[str] = Query(
        None, 
        description="Optional: YouTube channel ID to retrieve subscriptions for. Defaults to YOUTUBE_CHANNEL_ID."
    ),
    db: Session = Depends(get_db)
):
    """
    Sync all subscriptions of the current channel.
    Retrieves all channels subscribed to, and if they are not already stored in DB,
    fetches their videos and persists them.
    """
    try:
        api_key = os.getenv("YOUTUBE_API_KEY")
        target_channel = channel_id or os.getenv("YOUTUBE_CHANNEL_ID")
        
        if not api_key:
            raise HTTPException(status_code=500, detail="YOUTUBE_API_KEY environment variable is not set.")
        if not target_channel:
            raise HTTPException(status_code=400, detail="No YouTube channel provided and YOUTUBE_CHANNEL_ID is not configured.")

        youtube = get_youtube_client(api_key)
        resolved_id = resolve_channel_id(youtube, target_channel)

        # 1. Fetch channel subscriptions
        from youtube.subscriptions import get_channel_subscriptions
        subscriptions = get_channel_subscriptions(api_key, resolved_id)

        if not subscriptions:
            return {
                "message": "No subscriptions found or subscriptions list is private.",
                "refreshed": [],
                "errors": [],
                "creators": []
            }

        # 2. Query existing channel IDs in database
        existing_ids = {c.channel_id for c in db.query(CreatorModel.channel_id).all()}

        # 3. Identify new and existing channels
        new_channels = []
        already_existing_list = []
        
        for sub in subscriptions:
            cid = sub["channel_id"]
            if cid in existing_ids:
                video_count = db.query(CreatorModel).filter(CreatorModel.channel_id == cid).first()
                v_count = video_count.video_count if video_count else 0
                already_existing_list.append({
                    "channel_id": cid,
                    "channel_name": sub["name"],
                    "thumbnail_url": sub["thumbnail_url"],
                    "new_videos_count": 0,
                    "cached_videos_count": v_count
                })
            else:
                new_channels.append(sub)

        refreshed_list = list(already_existing_list)
        errors = []

        if new_channels:
            sem = asyncio.Semaphore(5)
            
            async def sync_single_channel(sub_channel: dict):
                cid = sub_channel["channel_id"]
                async with sem:
                    try:
                        videos, new_count, cached_count = await asyncio.to_thread(
                            fetch_channel_videos, api_key, cid, False, True
                        )
                        return {
                            "channel_id": cid,
                            "channel_name": sub_channel["name"],
                            "thumbnail_url": sub_channel["thumbnail_url"],
                            "new_videos_count": new_count,
                            "cached_videos_count": cached_count,
                            "error": None
                        }
                    except Exception as ex:
                        logger.error(f"Error fetching subscription channel {cid}: {ex}", exc_info=True)
                        return {
                            "channel_id": cid,
                            "channel_name": sub_channel["name"],
                            "thumbnail_url": sub_channel["thumbnail_url"],
                            "new_videos_count": 0,
                            "cached_videos_count": 0,
                            "error": str(ex)
                        }

            tasks = [sync_single_channel(c) for c in new_channels]
            results = await asyncio.gather(*tasks)

            for res in results:
                if res["error"]:
                    errors.append({"channel_id": res["channel_id"], "error": res["error"]})
                else:
                    refreshed_list.append({
                        "channel_id": res["channel_id"],
                        "channel_name": res["channel_name"],
                        "thumbnail_url": res["thumbnail_url"],
                        "new_videos_count": res["new_videos_count"],
                        "cached_videos_count": res["cached_videos_count"]
                    })

        # Load updated creators
        updated_creators = get_creators(db=db)

        status_msg = f"Successfully synced {len(refreshed_list)} subscribed channels."
        if errors:
            status_msg += f" {len(errors)} channels failed to sync."

        return {
            "message": status_msg,
            "refreshed": refreshed_list,
            "errors": errors,
            "creators": updated_creators
        }

    except Exception as e:
        logger.error(f"Unexpected error in sync-subscriptions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/creators/{channel_id}")
async def delete_creator_endpoint(channel_id: str, db: Session = Depends(get_db)):
    """
    Delete a YouTube channel/creator from PostgreSQL database.
    """
    try:
        deleted = delete_creator(channel_id, db=db)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Channel {channel_id} not found in database.")
        return {
            "message": f"Successfully deleted channel {channel_id} from database.",
            "channel_id": channel_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in delete_creator_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete creator: {e}")



