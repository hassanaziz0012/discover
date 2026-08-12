"""
YouTube Shorts Classification
==============================
On-the-fly classification of YouTube Shorts using HTTP HEAD validation and offline fallback heuristics.
"""

import logging
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger("discover_api.youtube.fetch_videos.shorts")

_YOUTUBE_REACHABLE: Optional[bool] = None


def check_youtube_connectivity() -> bool:
    """Check if youtube.com is reachable via HTTP HEAD request."""
    global _YOUTUBE_REACHABLE
    if _YOUTUBE_REACHABLE is not None:
        return _YOUTUBE_REACHABLE

    import requests
    try:
        res = requests.head(
            "https://www.youtube.com",
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
            timeout=1.5
        )
        _YOUTUBE_REACHABLE = (res.status_code < 400)
    except Exception:
        _YOUTUBE_REACHABLE = False
        logger.warning("YouTube is unreachable. Falling back to offline Shorts classification heuristic (duration <= 60s).")
    return _YOUTUBE_REACHABLE


def ensure_shorts_classification(videos_data: list, force_recheck: bool = False) -> bool:
    """
    On-the-fly classification of YouTube Shorts for a list of serialized videos.
    Modifies the dictionaries in place and returns True if any changes were made.

    Rules:
    - Videos longer than 180s are automatically considered long videos (is_short = False).
    - Videos <= 180s (or with missing duration) run an HTTP HEAD check against youtube.com/shorts/{video_id}.
    """
    from ..utils import parse_iso8601_duration
    needs_check = []
    modified = False

    for i, v in enumerate(videos_data):
        if force_recheck or "is_short" not in v or v["is_short"] is None:
            duration = v.get("duration")
            if isinstance(duration, (int, float)):
                duration_sec = int(duration)
            else:
                duration_sec = parse_iso8601_duration(duration)

            if duration_sec is not None and duration_sec > 180:
                if v.get("is_short") != False:
                    v["is_short"] = False
                    modified = True
            else:
                if not check_youtube_connectivity():
                    is_short_val = (duration_sec is not None and duration_sec <= 60)
                    if v.get("is_short") != is_short_val:
                        v["is_short"] = is_short_val
                        modified = True
                else:
                    needs_check.append((i, v["video_id"]))

    if needs_check:
        import requests
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry

        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
        retry_strategy = Retry(
            total=1,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=1, pool_maxsize=20)
        session.mount("https://", adapter)

        def check_short_http(video_id: str) -> bool:
            url = f"https://www.youtube.com/shorts/{video_id}"
            try:
                res = session.head(url, allow_redirects=False, timeout=5)
                return res.status_code == 200
            except Exception as e:
                logger.warning(f"Error checking YouTube Short status for {video_id}: {e}")
                return False

        with ThreadPoolExecutor(max_workers=20) as executor:
            results = list(executor.map(lambda x: check_short_http(x[1]), needs_check))

        for (idx, _), is_short in zip(needs_check, results):
            if videos_data[idx].get("is_short") != is_short:
                videos_data[idx]["is_short"] = is_short
                modified = True

        return True
    return modified
