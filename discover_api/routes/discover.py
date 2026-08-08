import logging
import os
import asyncio
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.session import get_db
from db.models import Creator as CreatorModel
from youtube.discover_top_creators import get_video_categories, discover_top_creators
from youtube.fetch_videos import fetch_channel_videos
from youtube.creators import get_creators

logger = logging.getLogger("discover_api.routes.discover")

router = APIRouter(prefix="/api/youtube", tags=["YouTube"])


@router.get("/video-categories")
def list_video_categories(
    region: str = Query("US", description="ISO 3166-1 alpha-2 region code (e.g. US, GB, IN)")
):
    """
    Return all assignable YouTube video categories for a given region.
    """
    try:
        api_key = os.getenv("YOUTUBE_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="YOUTUBE_API_KEY environment variable is not set.")

        categories = get_video_categories(region_code=region, api_key=api_key)
        return {
            "region": region,
            "count": len(categories),
            "categories": categories,
        }
    except Exception as e:
        logger.error(f"Error fetching video categories: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/discover-creators")
def discover_creators_endpoint(
    category_id: Optional[str] = Query(None, description="YouTube video category ID to filter by"),
    region: str = Query("US", description="ISO 3166-1 alpha-2 region code"),
    max_videos: int = Query(200, ge=10, le=200, description="Max trending videos to scan (10-200)"),
):
    """
    Discover top YouTube creators from trending/popular videos.
    Returns creator metadata with already_cached flags.
    """
    try:
        api_key = os.getenv("YOUTUBE_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="YOUTUBE_API_KEY environment variable is not set.")

        creators = discover_top_creators(
            category_id=category_id,
            region_code=region,
            max_videos=max_videos,
            api_key=api_key,
        )
        return {
            "category_id": category_id,
            "region": region,
            "count": len(creators),
            "creators": creators,
        }
    except Exception as e:
        logger.error(f"Error discovering creators: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class BulkAddRequest(BaseModel):
    channel_ids: List[str]


@router.post("/bulk-add-creators")
async def bulk_add_creators(request: BulkAddRequest, db: Session = Depends(get_db)):
    """
    Bulk-add YouTube creators by fetching all their videos and persisting them to PostgreSQL.
    Accepts a list of channel IDs and processes them concurrently.
    """
    channel_ids = request.channel_ids
    if not channel_ids:
        raise HTTPException(status_code=400, detail="channel_ids list cannot be empty.")

    # Validate format
    for cid in channel_ids:
        if not (len(cid) == 24 and cid.startswith("UC") and all(c.isalnum() or c in "-_" for c in cid)):
            raise HTTPException(status_code=400, detail=f"Invalid channel ID format: {cid}")

    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="YOUTUBE_API_KEY environment variable is not set.")

    # Filter out already existing channels in database
    existing_cids = {c.channel_id for c in db.query(CreatorModel.channel_id).all()}
    new_channel_ids = [cid for cid in channel_ids if cid not in existing_cids]
    already_cached_count = len(channel_ids) - len(new_channel_ids)

    if not new_channel_ids:
        updated_creators = get_creators(db=db)
        return {
            "message": f"All {already_cached_count} channels are already in database.",
            "added": [],
            "errors": [],
            "already_cached_count": already_cached_count,
            "creators": updated_creators,
        }

    # Process new channels concurrently with a semaphore
    sem = asyncio.Semaphore(5)

    async def add_single_channel(cid: str):
        async with sem:
            try:
                videos, new_count, cached_count = await asyncio.to_thread(
                    fetch_channel_videos, api_key, cid, False, True
                )
                return {
                    "channel_id": cid,
                    "video_count": len(videos) if isinstance(videos, list) else new_count + cached_count,
                    "error": None,
                }
            except Exception as ex:
                logger.error(f"Error adding channel {cid}: {ex}", exc_info=True)
                return {
                    "channel_id": cid,
                    "video_count": 0,
                    "error": str(ex),
                }

    tasks = [add_single_channel(cid) for cid in new_channel_ids]
    results = await asyncio.gather(*tasks)

    # Load updated creators metadata
    updated_creators = get_creators(db=db)
    creators_by_id = {c["channel_id"]: c for c in updated_creators}

    added_list = []
    errors = []
    for res in results:
        if res["error"]:
            errors.append({"channel_id": res["channel_id"], "error": res["error"]})
        else:
            creator_meta = creators_by_id.get(res["channel_id"], {})
            added_list.append({
                "channel_id": res["channel_id"],
                "channel_name": creator_meta.get("name") or "Unknown Channel",
                "thumbnail_url": creator_meta.get("thumbnail_url") or "",
                "video_count": res["video_count"],
            })

    status_msg = f"Successfully added {len(added_list)} new channels."
    if already_cached_count > 0:
        status_msg += f" {already_cached_count} channels were already in database."
    if errors:
        status_msg += f" {len(errors)} channels failed."

    return {
        "message": status_msg,
        "added": added_list,
        "errors": errors,
        "already_cached_count": already_cached_count,
        "creators": updated_creators,
    }

