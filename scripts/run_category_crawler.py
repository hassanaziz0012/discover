#!/usr/bin/env python3
"""
Strategy 1 CLI Runner: Automated Category & Regional Trending Crawler
=====================================================================
Executes creator discovery across YouTube categories & regions,
extracts unique channels, batch fetches metadata, and upserts into PostgreSQL.
"""

import sys
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Add discover_api directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "discover_api"))

env_path = Path(__file__).parent.parent / "discover_api" / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()


# Configure logging to stdout
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger("run_category_crawler")


def main():
    print("=" * 65)
    print("      DISCOVER CREATOR DATABASE EXPANSION: STRATEGY 1")
    print("      Automated Category & Regional Trending Crawler")
    print("=" * 65)

    from youtube.utils import get_api_key
    api_key = get_api_key()
    if not api_key:
        print("❌ Error: YOUTUBE_API_KEY environment variable is not set.")
        sys.exit(1)

    from youtube.crawler.category_crawler import crawl_categories_and_ingest

    try:
        results = crawl_categories_and_ingest(api_key=api_key)
        
        print("\n" + "=" * 65)
        print("                  CRAWL SUMMARY & REPORT")
        print("=" * 65)
        print(f" Status:                      {results['status'].upper()}")
        print(f" Unique Channels Discovered:  {results['unique_channels_discovered']}")
        print(f" New Creators Inserted:       {results['new_creators_added']}")
        print(f" Existing Creators Updated:   {results['existing_creators_updated']}")
        print(f" Total Creators in Database:  {results['total_creators_in_db']}")
        print(f" API Quota Limit Exceeded:    {results['quota_exceeded']}")
        print("=" * 65)

        if results["quota_exceeded"]:
            print("\n⚠️ Note: Crawl was paused due to API quota limit. All progress has been saved!")
            print("You can re-run this script tomorrow to resume discovery seamlessly.")
        else:
            print("\n🎉 Strategy 1 Category Crawl completed successfully!")

    except Exception as e:
        logger.error(f"Failed during Category Crawler execution: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
