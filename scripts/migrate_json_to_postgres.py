#!/usr/bin/env python3
import os
import sys
import json
import glob
import re
from datetime import datetime, timezone
from pathlib import Path

# Add discover_api directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "discover_api"))

from sqlalchemy import text
from db.session import engine, SessionLocal
from db.models import Base, Creator, Video, UserList, ListCreator


def clean_str(val):
    """Sanitizes text fields by stripping NUL (0x00) bytes disallowed by PostgreSQL."""
    if val is None:
        return None
    if isinstance(val, str):
        return val.replace("\x00", "").replace("\u0000", "")
    return val


def clean_tags(tags):
    """Sanitizes tag list by cleaning each element of NUL bytes."""
    if not isinstance(tags, list):
        return None
    cleaned = [clean_str(t) for t in tags if t is not None]
    return [t for t in cleaned if t]


def parse_iso_duration(duration_str: str) -> int:
    """Converts ISO 8601 duration string (e.g. PT24M4S) into total seconds."""
    if not duration_str:
        return 0
    if isinstance(duration_str, (int, float)):
        return int(duration_str)
    if str(duration_str).isdigit():
        return int(duration_str)

    pattern = r"P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?"
    match = re.match(pattern, str(duration_str))
    if not match:
        return 0

    days, hours, minutes, seconds = match.groups()
    total_seconds = 0
    if days:
        total_seconds += int(days) * 86400
    if hours:
        total_seconds += int(hours) * 3600
    if minutes:
        total_seconds += int(minutes) * 60
    if seconds:
        total_seconds += int(seconds)
    return total_seconds


def parse_datetime(dt_str: str) -> datetime:
    """Parses ISO datetime string into UTC datetime object."""
    if not dt_str:
        return datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(str(dt_str).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


VIDEO_UPSERT_SQL = """
INSERT INTO videos (
    video_id, channel_id, title, description, published_at, thumbnail_url,
    view_count, like_count, comment_count, duration, is_short, category_id,
    live_broadcast, tags, url, updated_at
) VALUES (
    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
)
ON CONFLICT (video_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    published_at = EXCLUDED.published_at,
    thumbnail_url = EXCLUDED.thumbnail_url,
    view_count = EXCLUDED.view_count,
    like_count = EXCLUDED.like_count,
    comment_count = EXCLUDED.comment_count,
    duration = EXCLUDED.duration,
    is_short = EXCLUDED.is_short,
    category_id = EXCLUDED.category_id,
    live_broadcast = EXCLUDED.live_broadcast,
    tags = EXCLUDED.tags,
    url = EXCLUDED.url,
    updated_at = EXCLUDED.updated_at;
"""


def flush_video_batch_raw(conn, video_dict):
    if not video_dict:
        return 0

    rows = []
    for item in video_dict.values():
        rows.append((
            item["video_id"],
            item["channel_id"],
            item["title"],
            item["description"],
            item["published_at"],
            item["thumbnail_url"],
            item["view_count"],
            item["like_count"],
            item["comment_count"],
            item["duration"],
            item["is_short"],
            item["category_id"],
            item["live_broadcast"],
            item["tags"],
            item["url"],
            item["updated_at"],
        ))

    with conn.cursor() as cur:
        cur.executemany(VIDEO_UPSERT_SQL, rows)
    conn.commit()

    count = len(rows)
    video_dict.clear()
    return count


def migrate():
    base_dir = Path(__file__).parent.parent / "discover_api" / "youtube" / "cache"
    metadata_file = base_dir / "channels_metadata_cache.json"
    lists_file = base_dir / "lists.json"

    print("=== Step 1: Initializing Database Schemas & Tables ===", flush=True)
    Base.metadata.create_all(bind=engine)

    # Create Full-Text Search GIN Index on videos(title)
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_videos_search_title "
                "ON videos USING gin(to_tsvector('english', title));"
            )
        )
    print("✓ Tables and indexes created successfully.", flush=True)

    db = SessionLocal()
    raw_conn = engine.raw_connection()

    try:
        # Step 2: Migrate Creators from channels_metadata_cache.json
        print("\n=== Step 2: Migrating Creators ===", flush=True)
        existing_creator_ids = set()

        if metadata_file.exists():
            with open(metadata_file, "r", encoding="utf-8") as f:
                meta_data = json.load(f)

            channels = meta_data.get("channels", {})
            print(f"Found {len(channels)} channels in metadata cache.", flush=True)

            creator_rows = []
            for cid, cinfo in channels.items():
                existing_creator_ids.add(cid)
                creator_rows.append((
                    cid,
                    clean_str(cinfo.get("name", "Unknown Channel")),
                    clean_str(cinfo.get("handle")),
                    clean_str(cinfo.get("thumbnail_url")),
                    clean_str(cinfo.get("description")),
                    cinfo.get("subscriber_count", 0),
                    cinfo.get("video_count", 0),
                    datetime.now(timezone.utc),
                    datetime.now(timezone.utc),
                ))

            if creator_rows:
                CREATOR_UPSERT_SQL = """
                INSERT INTO creators (
                    channel_id, name, handle, avatar_url, description,
                    subscriber_count, video_count, last_synced_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (channel_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    handle = EXCLUDED.handle,
                    avatar_url = EXCLUDED.avatar_url,
                    description = EXCLUDED.description,
                    subscriber_count = EXCLUDED.subscriber_count,
                    video_count = EXCLUDED.video_count,
                    last_synced_at = EXCLUDED.last_synced_at,
                    updated_at = EXCLUDED.updated_at;
                """
                with raw_conn.cursor() as cur:
                    cur.executemany(CREATOR_UPSERT_SQL, creator_rows)
                raw_conn.commit()
                print(f"✓ Successfully upserted {len(creator_rows)} creators.", flush=True)

        # Step 3: Migrate Videos from all UC*.json files
        print("\n=== Step 3: Migrating Videos ===", flush=True)
        channel_files = glob.glob(str(base_dir / "UC*.json"))
        print(f"Found {len(channel_files)} channel video JSON files.", flush=True)

        total_videos = 0
        video_batch_dict = {}
        BATCH_SIZE = 1000

        for idx, file_path in enumerate(channel_files, 1):
            with open(file_path, "r", encoding="utf-8") as f:
                try:
                    videos_data = json.load(f)
                except Exception as e:
                    print(f"⚠️ Skipping invalid JSON {file_path}: {e}", flush=True)
                    continue

            if not isinstance(videos_data, list):
                continue

            for item in videos_data:
                video_id = clean_str(item.get("video_id"))
                channel_id = clean_str(item.get("channel_id"))
                if not video_id or not channel_id:
                    continue

                # If creator is missing from creators table, insert placeholder
                if channel_id not in existing_creator_ids:
                    with raw_conn.cursor() as cur:
                        cur.execute(
                            "INSERT INTO creators (channel_id, name, subscriber_count, video_count, last_synced_at) "
                            "VALUES (%s, %s, 0, 0, %s) ON CONFLICT DO NOTHING;",
                            (channel_id, clean_str(item.get("channel_title", "Unknown Channel")), datetime.now(timezone.utc))
                        )
                    raw_conn.commit()
                    existing_creator_ids.add(channel_id)

                published_at = parse_datetime(item.get("published_at"))
                duration_sec = parse_iso_duration(item.get("duration"))
                tags = clean_tags(item.get("tags"))

                video_batch_dict[video_id] = {
                    "video_id": video_id,
                    "channel_id": channel_id,
                    "title": clean_str(item.get("title", "")),
                    "description": clean_str(item.get("description")),
                    "published_at": published_at,
                    "thumbnail_url": clean_str(item.get("thumbnail_url")),
                    "view_count": item.get("view_count", 0),
                    "like_count": item.get("like_count", 0),
                    "comment_count": item.get("comment_count", 0),
                    "duration": duration_sec,
                    "is_short": item.get("is_short", False),
                    "category_id": clean_str(str(item.get("category_id"))) if item.get("category_id") is not None else None,
                    "live_broadcast": clean_str(item.get("live_broadcast")),
                    "tags": tags,
                    "url": clean_str(item.get("url")) or f"https://www.youtube.com/watch?v={video_id}",
                    "updated_at": datetime.now(timezone.utc),
                }

                if len(video_batch_dict) >= BATCH_SIZE:
                    total_videos += flush_video_batch_raw(raw_conn, video_batch_dict)

            if idx % 20 == 0 or idx == len(channel_files):
                print(f"  Processed {idx}/{len(channel_files)} files ({total_videos + len(video_batch_dict)} videos imported)...", flush=True)

        # Flush remaining batch
        if video_batch_dict:
            total_videos += flush_video_batch_raw(raw_conn, video_batch_dict)

        print(f"✓ Successfully upserted {total_videos} total video records.", flush=True)

        # Step 4: Migrate User Lists from lists.json
        print("\n=== Step 4: Migrating User Lists ===", flush=True)
        if lists_file.exists():
            with open(lists_file, "r", encoding="utf-8") as f:
                lists_data = json.load(f)

            list_count = 0
            mapping_count = 0
            for litem in lists_data:
                lid = clean_str(litem.get("id"))
                name = clean_str(litem.get("name"))
                channels = litem.get("channels", [])
                if not lid or not name:
                    continue

                with raw_conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO user_lists (id, name, description) VALUES (%s, %s, %s) "
                        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;",
                        (lid, name, clean_str(litem.get("description")))
                    )
                list_count += 1

                for cid in channels:
                    clean_cid = clean_str(cid)
                    if clean_cid in existing_creator_ids:
                        with raw_conn.cursor() as cur:
                            cur.execute(
                                "INSERT INTO list_creators (list_id, channel_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;",
                                (lid, clean_cid)
                            )
                        mapping_count += 1

            raw_conn.commit()
            print(f"✓ Successfully imported {list_count} user lists with {mapping_count} channel associations.", flush=True)

        # Step 5: Verification Report
        print("\n=== Step 5: Migration Verification Report ===", flush=True)
        db_creators_count = db.query(Creator).count()
        db_videos_count = db.query(Video).count()
        db_lists_count = db.query(UserList).count()

        print("---------------------------------------------", flush=True)
        print(f"PostgreSQL Creators Count:   {db_creators_count}", flush=True)
        print(f"PostgreSQL Videos Count:     {db_videos_count}", flush=True)
        print(f"PostgreSQL User Lists Count: {db_lists_count}", flush=True)
        print("---------------------------------------------", flush=True)
        print("🎉 Migration completed successfully!", flush=True)

    except Exception as e:
        raw_conn.rollback()
        db.rollback()
        print(f"❌ Error during migration: {e}", flush=True)
        raise
    finally:
        raw_conn.close()
        db.close()


if __name__ == "__main__":
    migrate()
