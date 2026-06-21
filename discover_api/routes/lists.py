import logging
import json
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# Import from the youtube package
from youtube.cached_creators import get_cached_creators

logger = logging.getLogger("discover_api.routes.lists")

router = APIRouter(prefix="/api/youtube", tags=["YouTube"])


# ── Lists API Models ───────────────────────────────────────────────────────────

class ListCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="The name of the new list", example="Tech & Development")

class ListUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="The updated name of the list", example="Science & Tech")
    channels: Optional[List[str]] = Field(None, description="Optional: List of channel IDs to set/replace")

class ChannelAdd(BaseModel):
    channel_id: str = Field(..., min_length=1, max_length=50, description="YouTube channel ID to add to list", example="UC-8QAzbLcRglXeN_MY9blyw")


# ── Lists File Persistence Helpers ─────────────────────────────────────────────

def get_lists_file_path() -> Path:
    """Resolve the lists.json file path in cache directory."""
    from youtube.cached_creators import cache_dir
    return cache_dir / "lists.json"

def load_lists() -> List[Dict[str, Any]]:
    """Load lists configuration from the local cache file."""
    path = get_lists_file_path()
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading lists file: {e}")
        return []

def save_lists(lists: List[Dict[str, Any]]):
    """Save lists configuration to the local cache file."""
    path = get_lists_file_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(lists, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error writing lists file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save list data.")


# ── Lists Endpoints ────────────────────────────────────────────────────────────

@router.get("/lists", response_model=List[Dict[str, Any]])
def get_lists():
    """Retrieve all customized lists."""
    return load_lists()

@router.post("/lists")
def create_list(data: ListCreate):
    """Create a new customized list."""
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="List name cannot be empty or only spaces.")
    
    lists = load_lists()
    # Check if a list with the same name already exists (case-insensitive)
    if any(l["name"].lower() == name.lower() for l in lists):
        raise HTTPException(status_code=400, detail="A list with this name already exists.")
        
    new_list = {
        "id": str(uuid.uuid4()),
        "name": name,
        "channels": []
    }
    lists.append(new_list)
    save_lists(lists)
    return new_list

@router.put("/lists/{list_id}")
def update_list(list_id: str, data: ListUpdate):
    """Update a list's name and/or channels (CRUD - Update)."""
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="List name cannot be empty or only spaces.")
        
    lists = load_lists()
    target_list = None
    for l in lists:
        if l["id"] == list_id:
            target_list = l
            break
            
    if not target_list:
        raise HTTPException(status_code=404, detail="List not found.")
        
    # Check duplicate names for other lists (case-insensitive)
    if any(l["name"].lower() == name.lower() and l["id"] != list_id for l in lists):
        raise HTTPException(status_code=400, detail="A list with this name already exists.")
        
    target_list["name"] = name

    # Handle bulk channels update if provided
    if data.channels is not None:
        # Validate each channel_id to prevent injection or directory traversal
        cached_creators = get_cached_creators()
        cached_cids = {c["channel_id"] for c in cached_creators}
        
        validated_cids = []
        for cid in data.channels:
            cid = cid.strip()
            if not cid.startswith("UC") or len(cid) != 24 or not all(c.isalnum() or c in "-_" for c in cid):
                raise HTTPException(status_code=400, detail=f"Invalid YouTube channel ID format: {cid}")
            if cid not in cached_cids:
                raise HTTPException(status_code=404, detail=f"Channel '{cid}' not found in cached creators. Please search and add it first.")
            validated_cids.append(cid)
        
        target_list["channels"] = validated_cids

    save_lists(lists)
    return target_list

@router.delete("/lists/{list_id}")
def delete_list(list_id: str):
    """Delete a list (CRUD - Delete)."""
    lists = load_lists()
    filtered_lists = [l for l in lists if l["id"] != list_id]
    if len(filtered_lists) == len(lists):
        raise HTTPException(status_code=404, detail="List not found.")
    save_lists(filtered_lists)
    return {"success": True, "message": f"List '{list_id}' deleted."}

@router.post("/lists/{list_id}/channels")
def add_channel_to_list(list_id: str, data: ChannelAdd):
    """Add a creator/channel to a specific list."""
    channel_id = data.channel_id.strip()
    
    # Input Validation: Check channel ID format to prevent any directory traversal or malicious injection
    if not channel_id.startswith("UC") or len(channel_id) != 24 or not all(c.isalnum() or c in "-_" for c in channel_id):
        raise HTTPException(status_code=400, detail="Invalid YouTube channel ID format.")
        
    # Check if the channel actually exists in cached creators
    cached_creators = get_cached_creators()
    if not any(c["channel_id"] == channel_id for c in cached_creators):
         raise HTTPException(status_code=404, detail="Channel not found in cached creators. Please search and add it first.")

    lists = load_lists()
    target_list = None
    for l in lists:
        if l["id"] == list_id:
            target_list = l
            break
            
    if not target_list:
        raise HTTPException(status_code=404, detail="List not found.")
        
    if channel_id in target_list["channels"]:
        return target_list  # Already exists in list, return ok
        
    target_list["channels"].append(channel_id)
    save_lists(lists)
    return target_list

@router.delete("/lists/{list_id}/channels/{channel_id}")
def remove_channel_from_list(list_id: str, channel_id: str):
    """Remove a creator/channel from a specific list."""
    # Input Validation: Check channel ID format
    if not channel_id.startswith("UC") or len(channel_id) != 24 or not all(c.isalnum() or c in "-_" for c in channel_id):
        raise HTTPException(status_code=400, detail="Invalid YouTube channel ID format.")
        
    lists = load_lists()
    target_list = None
    for l in lists:
        if l["id"] == list_id:
            target_list = l
            break
            
    if not target_list:
        raise HTTPException(status_code=404, detail="List not found.")
        
    if channel_id not in target_list["channels"]:
        raise HTTPException(status_code=404, detail="Channel not found in this list.")
        
    target_list["channels"].remove(channel_id)
    save_lists(lists)
    return target_list
