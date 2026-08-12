"""
Thread-Local YouTube API Client Management
===========================================
Provides thread-safe initialization and retrieval of YouTube API clients for concurrent worker threads.
"""

import threading
from typing import Optional
from ..utils import get_api_key, get_youtube_client

_thread_local = threading.local()


def _get_thread_youtube_client(api_key: Optional[str] = None):
    """
    Retrieve or initialize a thread-local YouTube API client resource.
    Guarantees thread-safety when executing API calls in concurrent worker threads.
    """
    key = api_key or get_api_key()
    if not hasattr(_thread_local, "client") or getattr(_thread_local, "api_key", None) != key:
        _thread_local.api_key = key
        _thread_local.client = get_youtube_client(key)
    return _thread_local.client
