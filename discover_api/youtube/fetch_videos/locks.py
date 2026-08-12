"""
Channel Synchronization Locks
==============================
Provides thread-safe per-channel locking to synchronize concurrent fetch requests.
"""

import threading

_channel_locks: dict[str, threading.Lock] = {}
_channel_locks_guard = threading.Lock()


def _get_channel_lock(channel_id: str) -> threading.Lock:
    """
    Retrieve or create a thread lock specific to a YouTube channel ID.
    Synchronizes concurrent requests so only one thread fetches from YouTube API
    while subsequent requests reuse database cache.
    """
    with _channel_locks_guard:
        if channel_id not in _channel_locks:
            _channel_locks[channel_id] = threading.Lock()
        return _channel_locks[channel_id]
