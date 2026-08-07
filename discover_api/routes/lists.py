import logging
import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.session import get_db
from db.models import UserList, ListCreator, Creator

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


# ── Lists Endpoints ────────────────────────────────────────────────────────────

def format_user_list(user_list: UserList) -> Dict[str, Any]:
    """Helper to convert UserList ORM model to API response dictionary."""
    return {
        "id": user_list.id,
        "name": user_list.name,
        "description": user_list.description or "",
        "channels": [lc.channel_id for lc in user_list.creators]
    }


@router.get("/lists", response_model=List[Dict[str, Any]])
def get_lists(db: Session = Depends(get_db)):
    """Retrieve all customized lists from PostgreSQL."""
    user_lists = db.query(UserList).all()
    return [format_user_list(ul) for ul in user_lists]


@router.post("/lists")
def create_list(data: ListCreate, db: Session = Depends(get_db)):
    """Create a new customized list in PostgreSQL."""
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="List name cannot be empty or only spaces.")
    
    # Check if a list with the same name already exists (case-insensitive)
    existing = db.query(UserList).filter(UserList.name.ilike(name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="A list with this name already exists.")
        
    new_list = UserList(
        id=str(uuid.uuid4()),
        name=name,
        description=""
    )
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    return format_user_list(new_list)


@router.put("/lists/{list_id}")
def update_list(list_id: str, data: ListUpdate, db: Session = Depends(get_db)):
    """Update a list's name and/or channels in PostgreSQL."""
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="List name cannot be empty or only spaces.")
        
    target_list = db.query(UserList).filter(UserList.id == list_id).first()
    if not target_list:
        raise HTTPException(status_code=404, detail="List not found.")
        
    # Check duplicate names for other lists (case-insensitive)
    duplicate = db.query(UserList).filter(UserList.name.ilike(name), UserList.id != list_id).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="A list with this name already exists.")
        
    target_list.name = name

    # Handle bulk channels update if provided
    if data.channels is not None:
        validated_cids = []
        for cid in data.channels:
            cid = cid.strip()
            if not cid.startswith("UC") or len(cid) != 24 or not all(c.isalnum() or c in "-_" for c in cid):
                raise HTTPException(status_code=400, detail=f"Invalid YouTube channel ID format: {cid}")
            
            creator_exists = db.query(Creator).filter(Creator.channel_id == cid).first()
            if not creator_exists:
                raise HTTPException(status_code=404, detail=f"Channel '{cid}' not found in database. Please search and add it first.")
            validated_cids.append(cid)
        
        # Remove old channel associations
        db.query(ListCreator).filter(ListCreator.list_id == list_id).delete()
        db.flush()

        # Add new associations
        for cid in validated_cids:
            db.add(ListCreator(list_id=list_id, channel_id=cid))

    db.commit()
    db.refresh(target_list)
    return format_user_list(target_list)


@router.delete("/lists/{list_id}")
def delete_list(list_id: str, db: Session = Depends(get_db)):
    """Delete a list from PostgreSQL."""
    target_list = db.query(UserList).filter(UserList.id == list_id).first()
    if not target_list:
        raise HTTPException(status_code=404, detail="List not found.")
    
    db.delete(target_list)
    db.commit()
    return {"success": True, "message": f"List '{list_id}' deleted."}


@router.post("/lists/{list_id}/channels")
def add_channel_to_list(list_id: str, data: ChannelAdd, db: Session = Depends(get_db)):
    """Add a creator/channel to a specific list in PostgreSQL."""
    channel_id = data.channel_id.strip()
    
    if not channel_id.startswith("UC") or len(channel_id) != 24 or not all(c.isalnum() or c in "-_" for c in channel_id):
        raise HTTPException(status_code=400, detail="Invalid YouTube channel ID format.")
        
    creator_exists = db.query(Creator).filter(Creator.channel_id == channel_id).first()
    if not creator_exists:
        raise HTTPException(status_code=404, detail="Channel not found in database. Please search and add it first.")

    target_list = db.query(UserList).filter(UserList.id == list_id).first()
    if not target_list:
        raise HTTPException(status_code=404, detail="List not found.")
        
    existing_assoc = db.query(ListCreator).filter(ListCreator.list_id == list_id, ListCreator.channel_id == channel_id).first()
    if not existing_assoc:
        db.add(ListCreator(list_id=list_id, channel_id=channel_id))
        db.commit()
        db.refresh(target_list)
        
    return format_user_list(target_list)


@router.delete("/lists/{list_id}/channels/{channel_id}")
def remove_channel_from_list(list_id: str, channel_id: str, db: Session = Depends(get_db)):
    """Remove a creator/channel from a specific list in PostgreSQL."""
    if not channel_id.startswith("UC") or len(channel_id) != 24 or not all(c.isalnum() or c in "-_" for c in channel_id):
        raise HTTPException(status_code=400, detail="Invalid YouTube channel ID format.")
        
    target_list = db.query(UserList).filter(UserList.id == list_id).first()
    if not target_list:
        raise HTTPException(status_code=404, detail="List not found.")
        
    assoc = db.query(ListCreator).filter(ListCreator.list_id == list_id, ListCreator.channel_id == channel_id).first()
    if not assoc:
        raise HTTPException(status_code=404, detail="Channel not found in this list.")
        
    db.delete(assoc)
    db.commit()
    db.refresh(target_list)
    return format_user_list(target_list)

