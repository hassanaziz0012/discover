#!/usr/bin/env python3
"""
Re-classify YouTube Shorts in PostgreSQL Database.

Rules:
- Videos with duration > 180s are guaranteed long-form videos (is_short = False).
- Videos with duration <= 180s run an HTTP HEAD check against https://www.youtube.com/shorts/{video_id}
  to accurately determine whether they are a YouTube Short (200 OK) or long video (303 redirect).
"""

import os
import sys
import time
import requests
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# Add discover_api directory to path
api_dir = Path(__file__).resolve().parent.parent / "discover_api"
sys.path.insert(0, str(api_dir))

from db.session import SessionLocal
from db.models import Video

def reclassify_database_shorts(batch_size: int = 1000, max_workers: int = 50):
    db = SessionLocal()
    try:
        # Fetch all target video IDs (duration <= 180s, currently is_short=False) at once
        query = db.query(Video.video_id).filter(
            Video.duration <= 180,
            Video.is_short == False
        )
        target_records = query.all()
        total_to_check = len(target_records)
        print(f"Total videos (<= 180s, currently is_short=False) to check: {total_to_check}")

        if total_to_check == 0:
            print("All eligible videos are already classified!")
            return

        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })

        def check_video(vid: str):
            url = f"https://www.youtube.com/shorts/{vid}"
            try:
                res = session.head(url, allow_redirects=False, timeout=3)
                return vid, res.status_code == 200
            except Exception:
                return vid, False

        updated_shorts_count = 0
        start_time = time.time()

        for i in range(0, total_to_check, batch_size):
            chunk = target_records[i : i + batch_size]
            video_ids = [v.video_id for v in chunk]
            
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                results = list(executor.map(check_video, video_ids))

            shorts_to_update = [vid for vid, is_short in results if is_short]
            if shorts_to_update:
                db.query(Video).filter(Video.video_id.in_(shorts_to_update)).update(
                    {Video.is_short: True},
                    synchronize_session=False
                )
                db.commit()
                updated_shorts_count += len(shorts_to_update)

            elapsed = time.time() - start_time
            processed = min(i + batch_size, total_to_check)
            rate = processed / elapsed if elapsed > 0 else 0
            print(f"Processed {processed} / {total_to_check} ({rate:.1f} vids/sec)... Newly identified Shorts: {updated_shorts_count}")

        print(f"Completed! Total new Shorts identified and updated in DB: {updated_shorts_count} in {time.time() - start_time:.1f}s")
    finally:
        db.close()

if __name__ == "__main__":
    reclassify_database_shorts()
