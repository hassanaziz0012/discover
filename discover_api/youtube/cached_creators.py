"""
YouTube Cached Creators Metadata Fetcher
========================================
Scans the local video cache directory, resolves channel IDs, and fetches
enriched channel metadata (subscriber count, video count, handle, thumbnail,
and description) using the YouTube Data API. Caches metadata locally for performance.
"""

import os
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any

from .utils import get_youtube_client

logger = logging.getLogger("discover_api.youtube.cached_creators")

# Confinement cache path definitions
cache_dir = Path(__file__).resolve().parent / "cache"
metadata_file = cache_dir / "channels_metadata_cache.json"


def fetch_channels_metadata_from_api(youtube, channel_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Query YouTube API in batches to get channel snippet and statistics.
    """
    results = {}
    # Batch requests up to 50 IDs (API constraint)
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


def get_fallback_channel_metadata(channel_id: str) -> Dict[str, Any]:
    """
    Extract fallback channel details from cached video lists when YouTube API is offline.
    """
    file_path = cache_dir / f"{channel_id}.json"
    name = "Unknown Creator"
    video_count = 0
    thumbnail_url = f"https://api.dicebear.com/7.x/pixel-art/svg?seed={channel_id}"
    description = "Cached creator. Detailed profile metadata is temporarily unavailable."
    
    if file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                videos = json.load(f)
                if isinstance(videos, list):
                    video_count = len(videos)
                    if videos:
                        first_video = videos[0]
                        name = first_video.get("channel_title", name)
                        thumbnail_url = first_video.get("creatorAvatar", thumbnail_url)
        except Exception as e:
            logger.warning(f"Failed to read fallback data from {file_path}: {e}")
            
    # Normalize custom handle fallback
    clean_name = "".join(char for char in name.lower() if char.isalnum())
    handle = f"@{clean_name}" if clean_name else f"@{channel_id.lower()}"
    
    return {
        "channel_id": channel_id,
        "name": name,
        "handle": handle,
        "thumbnail_url": thumbnail_url,
        "description": description,
        "subscriber_count": 0,
        "video_count": video_count
    }


def get_cached_creators() -> List[Dict[str, Any]]:
    """
    Scans the cached creators files, resolves their API details (cached or fresh),
    and returns a sorted list of creators.
    """
    # 1. Scan directory for UC*.json files
    channel_ids = []
    if cache_dir.exists():
        for file in cache_dir.glob("UC*.json"):
            name = file.stem
            if len(name) == 24 and name.startswith("UC"):
                channel_ids.append(name)
                
    if not channel_ids:
        return []
        
    # 2. Load existing metadata cache
    cache_data = {"updated_at": "", "channels": {}}
    if metadata_file.exists():
        try:
            with open(metadata_file, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, dict) and "channels" in loaded:
                    cache_data = loaded
        except Exception as e:
            logger.warning(f"Failed to load metadata cache: {e}")
            
    channels = cache_data.get("channels", {})
    updated_at_str = cache_data.get("updated_at", "")
    
    # Check if cache is fresh (less than 24 hours old)
    cache_fresh = False
    if updated_at_str:
        try:
            updated_at = datetime.fromisoformat(updated_at_str)
            age = (datetime.now(timezone.utc) - updated_at).total_seconds()
            if age < 86400:  # 24 hours
                cache_fresh = True
        except Exception:
            pass
            
    # Check what IDs need updating (not in cache or expired cache)
    missing_or_expired_ids = []
    for cid in channel_ids:
        if cid not in channels or not cache_fresh:
            missing_or_expired_ids.append(cid)
            
    # 3. Fetch from YouTube API if needed
    if missing_or_expired_ids:
        api_success = False
        try:
            youtube = get_youtube_client()
            api_results = fetch_channels_metadata_from_api(youtube, missing_or_expired_ids)
            if api_results:
                for cid, mdata in api_results.items():
                    channels[cid] = mdata
                api_success = True
        except Exception as e:
            logger.warning(f"Failed to initialize YouTube client or fetch metadata: {e}")
            
        # 4. Supply fallback for anything still missing (e.g. if offline)
        for cid in channel_ids:
            if cid not in channels:
                channels[cid] = get_fallback_channel_metadata(cid)
                
        # 5. Save metadata cache if we got API updates or have no cache file
        if api_success or not metadata_file.exists():
            try:
                cache_data["updated_at"] = datetime.now(timezone.utc).isoformat()
                cache_data["channels"] = channels
                with open(metadata_file, "w", encoding="utf-8") as f:
                    json.dump(cache_data, f, indent=2, ensure_ascii=False)
            except Exception as e:
                logger.warning(f"Failed to save metadata cache: {e}")
                
    # 6. Build the final output list
    result_list = []
    for cid in channel_ids:
        if cid in channels:
            result_list.append(channels[cid])
        else:
            result_list.append(get_fallback_channel_metadata(cid))
            
    # Sort creators by subscriber count descending
    result_list.sort(key=lambda c: c["subscriber_count"], reverse=True)
    
    return result_list


def delete_cached_creator(channel_id: str) -> bool:
    """
    Deletes a cached creator/channel:
    1. Removes UC*.json video cache file.
    2. Removes the channel metadata from channels_metadata_cache.json.
    3. Removes the channel from lists.json.
    """
    # 1. Validate channel_id format strictly
    if not (len(channel_id) == 24 and channel_id.startswith("UC") and all(c.isalnum() or c in "-_" for c in channel_id)):
        raise ValueError("Invalid channel ID format.")
        
    deleted_any = False
    
    # 2. Delete UC*.json
    file_path = cache_dir / f"{channel_id}.json"
    if file_path.exists():
        try:
            file_path.unlink()
            deleted_any = True
            logger.info(f"Deleted cache file for channel {channel_id}")
        except Exception as e:
            logger.error(f"Failed to delete cache file {file_path}: {e}")
            
    # 3. Delete from metadata cache
    if metadata_file.exists():
        try:
            with open(metadata_file, "r", encoding="utf-8") as f:
                cache_data = json.load(f)
            if isinstance(cache_data, dict) and "channels" in cache_data:
                if channel_id in cache_data["channels"]:
                    del cache_data["channels"][channel_id]
                    # Save the metadata cache back
                    with open(metadata_file, "w", encoding="utf-8") as f:
                        json.dump(cache_data, f, indent=2, ensure_ascii=False)
                    deleted_any = True
                    logger.info(f"Deleted metadata entry for channel {channel_id}")
        except Exception as e:
            logger.error(f"Failed to update metadata file after deleting channel {channel_id}: {e}")
            
    # 4. Clean up lists.json
    lists_file = cache_dir / "lists.json"
    if lists_file.exists():
        try:
            with open(lists_file, "r", encoding="utf-8") as f:
                lists = json.load(f)
            if isinstance(lists, list):
                updated_lists = []
                list_changed = False
                for lst in lists:
                    if isinstance(lst, dict) and "channels" in lst:
                        orig_len = len(lst["channels"])
                        lst["channels"] = [cid for cid in lst["channels"] if cid != channel_id]
                        if len(lst["channels"]) != orig_len:
                            list_changed = True
                    updated_lists.append(lst)
                if list_changed:
                    with open(lists_file, "w", encoding="utf-8") as f:
                        json.dump(updated_lists, f, indent=2, ensure_ascii=False)
                    logger.info(f"Removed channel {channel_id} from lists.")
        except Exception as e:
            logger.error(f"Failed to clean up lists.json for channel {channel_id}: {e}")
            
    return deleted_any

