#!/usr/bin/env python3
"""
Database Overview Script
------------------------
Displays key metrics and summary statistics from the database, including overall
disk storage usage & table breakdowns, active channel details, creator & video counts,
sentiment analysis stats, and user list breakdowns.
"""

import os
import sys
from pathlib import Path

# Auto-re-execute using the discover_api virtualenv Python if available
api_dir = Path(__file__).resolve().parent.parent / "discover_api"
sys.path.insert(0, str(api_dir))

venv_python = api_dir / ".venv" / "bin" / "python"
if venv_python.exists() and sys.executable != str(venv_python):
    os.execv(str(venv_python), [str(venv_python)] + sys.argv)

# Load .env file from discover_api if present
from dotenv import load_dotenv
env_path = api_dir / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

from sqlalchemy import func, desc, text
from db.session import SessionLocal, engine
from db.models import Creator, Video, UserList, ListCreator, ActiveChannel, SentimentAnalysis


# Terminal colors for output formatting
class Colors:
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"


def print_header(title: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN} {title.upper()}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 60}{Colors.RESET}")


def format_number(val: int | float | None) -> str:
    if val is None:
        return "0"
    return f"{val:,}"


def format_bytes(size_bytes: int | float | None) -> str:
    if size_bytes is None:
        return "N/A"
    size = float(size_bytes)
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if abs(size) < 1024.0:
            if unit == "B":
                return f"{int(size)} B"
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} PB"



def main():
    db = SessionLocal()
    try:
        print_header("Database Connection & Disk Storage")
        db_url_display = str(engine.url).split("@")[-1] if "@" in str(engine.url) else str(engine.url)
        print(f"  {Colors.BOLD}Target Database:{Colors.RESET} {Colors.GREEN}{db_url_display}{Colors.RESET}")
        print(f"  {Colors.BOLD}Database Engine:{Colors.RESET} {engine.dialect.name}")

        dialect = engine.dialect.name
        total_db_bytes = None
        table_storage_info = []

        if dialect == "postgresql":
            try:
                total_db_bytes = db.execute(text("SELECT pg_database_size(current_database());")).scalar()
                rows = db.execute(text("""
                    SELECT
                        relname AS table_name,
                        pg_total_relation_size(relid) AS total_bytes,
                        pg_relation_size(relid) AS table_bytes,
                        pg_indexes_size(relid) AS index_bytes
                    FROM pg_catalog.pg_stat_user_tables
                    ORDER BY pg_total_relation_size(relid) DESC;
                """)).fetchall()
                table_storage_info = [
                    {
                        "table_name": row[0],
                        "total_bytes": row[1],
                        "table_bytes": row[2],
                        "index_bytes": row[3],
                    }
                    for row in rows
                ]
            except Exception as err:
                print(f"  {Colors.YELLOW}Could not fetch PostgreSQL storage details: {err}{Colors.RESET}")

        elif dialect == "sqlite":
            try:
                page_size = db.execute(text("PRAGMA page_size;")).scalar() or 0
                page_count = db.execute(text("PRAGMA page_count;")).scalar() or 0
                total_db_bytes = page_size * page_count
            except Exception as err:
                print(f"  {Colors.YELLOW}Could not fetch SQLite storage details: {err}{Colors.RESET}")

        elif dialect in ("mysql", "mariadb"):
            try:
                total_db_bytes = db.execute(text("""
                    SELECT SUM(data_length + index_length)
                    FROM information_schema.tables
                    WHERE table_schema = database();
                """)).scalar()
                rows = db.execute(text("""
                    SELECT
                        table_name,
                        (data_length + index_length) AS total_bytes,
                        data_length AS table_bytes,
                        index_length AS index_bytes
                    FROM information_schema.tables
                    WHERE table_schema = database()
                    ORDER BY (data_length + index_length) DESC;
                """)).fetchall()
                table_storage_info = [
                    {
                        "table_name": row[0],
                        "total_bytes": row[1],
                        "table_bytes": row[2],
                        "index_bytes": row[3],
                    }
                    for row in rows
                ]
            except Exception as err:
                print(f"  {Colors.YELLOW}Could not fetch MySQL storage details: {err}{Colors.RESET}")

        if total_db_bytes is not None:
            raw_bytes_str = f"({format_number(total_db_bytes)} bytes)"
            print(f"  {Colors.BOLD}Total Disk Storage:{Colors.RESET} {Colors.GREEN}{format_bytes(total_db_bytes)}{Colors.RESET} {Colors.DIM}{raw_bytes_str}{Colors.RESET}")

        if table_storage_info:
            print(f"\n  {Colors.DIM}Table Storage Breakdown:{Colors.RESET}")
            print(f"  {Colors.BOLD}{'Table Name':<30} | {'Total Size':<12} | {'Data Size':<12} | {'Index Size':<12}{Colors.RESET}")
            print(f"  {'-' * 30}-+-{'-' * 12}-+-{'-' * 12}-+-{'-' * 12}")
            for item in table_storage_info:
                t_name = item["table_name"]
                t_total = format_bytes(item["total_bytes"])
                t_data = format_bytes(item["table_bytes"])
                t_idx = format_bytes(item["index_bytes"])
                print(f"  {t_name:<30} | {t_total:<12} | {t_data:<12} | {t_idx:<12}")


        # ------------------------------------------------------------------
        # 1. Active Channel Information
        # ------------------------------------------------------------------
        print_header("1. Active Channel Information")
        active_channels = db.query(ActiveChannel).all()
        if not active_channels:
            print(f"  {Colors.YELLOW}No active channel configured.{Colors.RESET}")
        else:
            for ac in active_channels:
                print(f"  {Colors.BOLD}ID:{Colors.RESET} {ac.id}")
                print(f"  {Colors.BOLD}Name:{Colors.RESET} {ac.name}")
                print(f"  {Colors.BOLD}URL:{Colors.RESET} {ac.url}")
                print(f"  {Colors.BOLD}Profile Picture:{Colors.RESET} {ac.profile_picture or 'N/A'}")

        # ------------------------------------------------------------------
        # 2. Creators Overview
        # ------------------------------------------------------------------
        print_header("2. Creators Overview")
        total_creators = db.query(func.count(Creator.channel_id)).scalar() or 0
        total_subs = db.query(func.sum(Creator.subscriber_count)).scalar() or 0
        last_synced = db.query(func.max(Creator.last_synced_at)).scalar()

        print(f"  {Colors.BOLD}Total Creators:{Colors.RESET} {Colors.GREEN}{format_number(total_creators)}{Colors.RESET}")
        print(f"  {Colors.BOLD}Total Combined Subscribers:{Colors.RESET} {format_number(total_subs)}")
        print(f"  {Colors.BOLD}Last Creator Sync:{Colors.RESET} {last_synced or 'N/A'}")

        # Top 3 creators by subscriber count
        if total_creators > 0:
            top_creators = db.query(Creator).order_by(desc(Creator.subscriber_count)).limit(3).all()
            print(f"\n  {Colors.DIM}Top Creators by Subscribers:{Colors.RESET}")
            for idx, c in enumerate(top_creators, 1):
                handle_str = f" (@{c.handle})" if c.handle else ""
                print(f"    {idx}. {Colors.BOLD}{c.name}{Colors.RESET}{handle_str} - {format_number(c.subscriber_count)} subs")

        # ------------------------------------------------------------------
        # 3. Videos Overview
        # ------------------------------------------------------------------
        print_header("3. Videos Overview")
        total_videos = db.query(func.count(Video.video_id)).scalar() or 0
        short_videos = db.query(func.count(Video.video_id)).filter(Video.is_short == True).scalar() or 0
        regular_videos = total_videos - short_videos
        total_views = db.query(func.sum(Video.view_count)).scalar() or 0
        total_likes = db.query(func.sum(Video.like_count)).scalar() or 0
        earliest_pub = db.query(func.min(Video.published_at)).scalar()
        latest_pub = db.query(func.max(Video.published_at)).scalar()

        print(f"  {Colors.BOLD}Total Videos:{Colors.RESET} {Colors.GREEN}{format_number(total_videos)}{Colors.RESET}")
        print(f"    - Regular Videos: {format_number(regular_videos)}")
        print(f"    - YouTube Shorts: {format_number(short_videos)}")
        print(f"  {Colors.BOLD}Total Views Across Videos:{Colors.RESET} {format_number(total_views)}")
        print(f"  {Colors.BOLD}Total Likes Across Videos:{Colors.RESET} {format_number(total_likes)}")
        print(f"  {Colors.BOLD}Earliest Published Date:{Colors.RESET} {earliest_pub or 'N/A'}")
        print(f"  {Colors.BOLD}Latest Published Date:{Colors.RESET} {latest_pub or 'N/A'}")

        # ------------------------------------------------------------------
        # 4. Sentiment Analyses Overview
        # ------------------------------------------------------------------
        print_header("4. Sentiment Analyses Overview")
        total_sentiments = db.query(func.count(SentimentAnalysis.id)).scalar() or 0
        distinct_videos_analyzed = db.query(func.count(func.distinct(SentimentAnalysis.video_id))).scalar() or 0
        latest_sentiment = db.query(func.max(SentimentAnalysis.created_at)).scalar()

        print(f"  {Colors.BOLD}Total Sentiment Analyses:{Colors.RESET} {Colors.GREEN}{format_number(total_sentiments)}{Colors.RESET}")
        print(f"  {Colors.BOLD}Unique Videos Analyzed:{Colors.RESET} {format_number(distinct_videos_analyzed)}")
        print(f"  {Colors.BOLD}Latest Sentiment Analysis:{Colors.RESET} {latest_sentiment or 'N/A'}")

        # Breakdown by model
        if total_sentiments > 0:
            model_counts = (
                db.query(SentimentAnalysis.model, func.count(SentimentAnalysis.id))
                .group_by(SentimentAnalysis.model)
                .all()
            )
            print(f"\n  {Colors.DIM}Breakdown by Model:{Colors.RESET}")
            for model_name, count in model_counts:
                print(f"    - {model_name}: {format_number(count)} run(s)")

        # ------------------------------------------------------------------
        # 5. User Lists & Channel Breakdown
        # ------------------------------------------------------------------
        print_header("5. User Lists & Channel Count")
        lists_with_counts = (
            db.query(
                UserList.id,
                UserList.name,
                UserList.description,
                func.count(ListCreator.channel_id).label("channel_count")
            )
            .outerjoin(ListCreator, UserList.id == ListCreator.list_id)
            .group_by(UserList.id, UserList.name, UserList.description)
            .order_by(UserList.name)
            .all()
        )

        if not lists_with_counts:
            print(f"  {Colors.YELLOW}No user lists found.{Colors.RESET}")
        else:
            print(f"  {Colors.BOLD}{'List Name':<30} | {'Channels':<10} | {'List ID'}{Colors.RESET}")
            print(f"  {'-' * 30}-+-{'-' * 10}-+-{'-' * 20}")
            for l_id, l_name, l_desc, count in lists_with_counts:
                print(f"  {l_name:<30} | {count:<10} | {l_id}")

        print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 60}{Colors.RESET}\n")

    except Exception as e:
        print(f"\n{Colors.BOLD}\033[91mError querying database: {e}{Colors.RESET}\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()
