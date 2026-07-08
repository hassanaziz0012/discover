import logging
import os
import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

# Import from the youtube package
from youtube.fetch_videos import fetch_channel_videos, video_to_dict
from youtube.utils import get_youtube_client, resolve_channel_id
from youtube.search_creators import search_youtube_creators

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
    )
):
    """
    Fetch all videos from a YouTube channel.
    Utilizes localized caching to speed up subsequent requests.
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
        videos = fetch_channel_videos(api_key, resolved_id, fresh=fresh)
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


@router.get("/cached-creators")
async def get_cached_creators_endpoint():
    """
    Retrieve YouTube channel metadata for all channels currently present in the cache.
    """
    try:
        from youtube.cached_creators import get_cached_creators
        creators = get_cached_creators()
        return creators
    except Exception as e:
        logger.error(f"Unexpected error in cached-creators: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch cached creators: {e}")


@router.post("/refresh-creators")
async def refresh_creators():
    """
    Refresh all cached YouTube creators/channels by scanning the cache directory
    and fetching any new uploads from the YouTube API for each channel (skipping
    already cached videos).
    """
    try:
        import json
        from youtube.cached_creators import cache_dir, get_cached_creators, metadata_file
        
        api_key = os.getenv("YOUTUBE_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="YOUTUBE_API_KEY environment variable is not set.")

        # 1. Scan directory for UC*.json files safely (conforming to regex / pattern constraints)
        channel_ids = []
        if cache_dir.exists():
            for file in cache_dir.glob("UC*.json"):
                name = file.stem
                if len(name) == 24 and name.startswith("UC") and all(c.isalnum() or c in "-_" for c in name):
                    channel_ids.append(name)
        
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
                # fresh=False to skip already cached videos and only retrieve new uploads
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

        # 4. After updating videos cache, force refresh metadata so statistics are updated
        if metadata_file.exists():
            try:
                with open(metadata_file, "r", encoding="utf-8") as f:
                    meta_data = json.load(f)
                if isinstance(meta_data, dict):
                    meta_data["updated_at"] = ""  # Force cache expiry
                    with open(metadata_file, "w", encoding="utf-8") as f:
                        json.dump(meta_data, f, indent=2, ensure_ascii=False)
            except Exception as e:
                logger.warning(f"Failed to reset metadata cache age: {e}")

        # 5. Load updated creators metadata
        updated_creators = get_cached_creators()
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
    )
):
    """
    Sync all subscriptions of the current channel.
    Retrieves all channels subscribed to, and if they are not already cached,
    fetches their videos and caches them.
    """
    try:
        import json
        api_key = os.getenv("YOUTUBE_API_KEY")
        target_channel = channel_id or os.getenv("YOUTUBE_CHANNEL_ID")
        
        if not api_key:
            raise HTTPException(status_code=500, detail="YOUTUBE_API_KEY environment variable is not set.")
        if not target_channel:
            raise HTTPException(status_code=400, detail="No YouTube channel provided and YOUTUBE_CHANNEL_ID is not configured.")

        from youtube.utils import get_youtube_client, resolve_channel_id
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

        # 2. Scan directory to identify which channel IDs are already cached
        from youtube.cached_creators import cache_dir, get_cached_creators, metadata_file
        
        cached_ids = set()
        if cache_dir.exists():
            for file in cache_dir.glob("UC*.json"):
                name = file.stem
                if len(name) == 24 and name.startswith("UC") and all(c.isalnum() or c in "-_" for c in name):
                    cached_ids.add(name)

        # 3. Identify new and already cached channels
        new_channels = []
        already_cached_list = []
        
        for sub in subscriptions:
            cid = sub["channel_id"]
            if cid in cached_ids:
                # Retrieve video count from local cache file safely
                cached_count = 0
                file_path = cache_dir / f"{cid}.json"
                if file_path.exists():
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            videos = json.load(f)
                            if isinstance(videos, list):
                                cached_count = len(videos)
                    except Exception:
                        pass
                already_cached_list.append({
                    "channel_id": cid,
                    "channel_name": sub["name"],
                    "thumbnail_url": sub["thumbnail_url"],
                    "new_videos_count": 0,
                    "cached_videos_count": cached_count
                })
            else:
                new_channels.append(sub)

        refreshed_list = list(already_cached_list)
        errors = []

        if new_channels:
            # Limit concurrency to 5 using a Semaphore
            sem = asyncio.Semaphore(5)
            
            async def sync_single_channel(sub_channel: dict):
                cid = sub_channel["channel_id"]
                async with sem:
                    try:
                        # fetch_channel_videos fetches all videos and caches them
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

            # Force refresh metadata cache
            if metadata_file.exists():
                try:
                    with open(metadata_file, "r", encoding="utf-8") as f:
                        meta_data = json.load(f)
                    if isinstance(meta_data, dict):
                        meta_data["updated_at"] = ""  # Force cache expiry
                        with open(metadata_file, "w", encoding="utf-8") as f:
                            json.dump(meta_data, f, indent=2, ensure_ascii=False)
                except Exception as e:
                    logger.warning(f"Failed to reset metadata cache age: {e}")

        # Load updated creators
        updated_creators = get_cached_creators()

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
async def delete_creator_endpoint(channel_id: str):
    """
    Delete a YouTube channel/creator from the local cache.
    """
    try:
        from youtube.cached_creators import delete_cached_creator
        # Perform deletion
        deleted = delete_cached_creator(channel_id)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Channel {channel_id} not found in cache.")
        return {
            "message": f"Successfully deleted channel {channel_id} from cache.",
            "channel_id": channel_id
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in delete_creator_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete creator: {e}")


