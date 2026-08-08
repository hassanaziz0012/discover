"""
YouTube Crawler Package
======================
Contains expansion strategies for automated creator discovery.
"""

from .category_crawler import crawl_categories_and_ingest, discover_channels_from_popular_chart

__all__ = [
    "crawl_categories_and_ingest",
    "discover_channels_from_popular_chart",
]
