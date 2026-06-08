"""
YouTube Video Comment Sentiment Analyzer
========================================
Fetches a video's metadata and comments using the YouTube Data API v3,
then formats and sends them to Gemini-3.5-flash via LangChain to run sentiment analysis.
"""

import os
import re
import logging
from typing import Optional, List, Dict

logger = logging.getLogger("discover_api.youtube.sentiment_analyzer")

SYSTEM_PROMPT = """You are an expert data analyst. Analyze the sentiment of the following YouTube video comments.

For each comment:
1. Extract the comment ID.
2. Extract the author's username.
3. Extract the comment text.
4. Determine the sentiment: Positive, Negative, Neutral, or Mixed. 
5. Extract the primary reason for that sentiment.
6. Provide a confidence score (0.0 to 1.0).

In addition to individual analyses, provide a brief summary of the overall sentiment and main themes in the batch of comments.

IMPORTANT: To facilitate spreadsheet organization and categorization, you MUST reuse the exact same reason strings/phrases across comments where possible. Avoid slightly different wordings for identical reasons (for example, reuse standard reasons like "Appreciates video editing", "Audio volume too low", "Thanks creator", "Asks a question", "Technical issue", "Request for tutorial" rather than writing new unique descriptions for each comment).

Expected Schema Structure:
{{
  "analyses": [
    {{
      "comment_id": "string",
      "username": "string",
      "text": "string",
      "sentiment": "Positive" | "Negative" | "Neutral" | "Mixed",
      "reason": "string",
      "confidence_score": float
    }}
  ],
  "summary": "string"
}}
"""


def extract_video_id(url_or_id: str) -> str:
    """
    Extract the 11-character video ID from a YouTube URL or return it if it's already a valid ID.
    """
    url_or_id = url_or_id.strip()
    
    # Check if the input is directly a video ID (usually 11 characters, alphanumeric + underscore + hyphen)
    if len(url_or_id) == 11 and re.match(r"^[a-zA-Z0-9_-]{11}$", url_or_id):
        return url_or_id
    
    # Regexes for various youtube URL structures
    patterns = [
        r"(?:v=|\/v\/|embed\/|shorts\/|youtu\.be\/|\/watch\?v=)([a-zA-Z0-9_-]{11})",
        r"(?:watch\?.*v=)([a-zA-Z0-9_-]{11})"
    ]
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
            
    raise ValueError(f"Could not extract a valid 11-character YouTube video ID from: {url_or_id}")


def fetch_video_metadata(youtube, video_id: str) -> Dict[str, str]:
    """
    Fetch the title, description, and view count of a YouTube video.
    """
    logger.info(f"Fetching metadata for YouTube video ID: {video_id}")
    try:
        response = youtube.videos().list(
            part="snippet,statistics",
            id=video_id
        ).execute()
    except Exception as e:
        logger.error(f"Failed to communicate with YouTube API for video {video_id}: {e}")
        raise ValueError(f"Failed to communicate with YouTube API: {e}")
        
    items = response.get("items", [])
    if not items:
        logger.error(f"Video with ID {video_id} not found.")
        raise ValueError(f"Video with ID {video_id} not found.")
        
    snippet = items[0]["snippet"]
    statistics = items[0]["statistics"]
    
    metadata = {
        "title": snippet.get("title", ""),
        "description": snippet.get("description", ""),
        "view_count": statistics.get("viewCount", "0")
    }
    logger.info(f"Successfully retrieved metadata for video: '{metadata['title']}'")
    return metadata


def fetch_comments(youtube, video_id: str, limit: Optional[int] = None) -> List[Dict[str, str]]:
    """
    Fetch comments from the video. If limit is provided, fetch at most that many comments.
    """
    logger.info(f"Fetching comments for video ID {video_id} (limit: {limit})...")
    comments = []
    next_page_token = None
    
    try:
        while True:
            # Determine maxResults to request (capped at 100 by the YouTube API)
            max_results = 100
            if limit is not None:
                remaining = limit - len(comments)
                if remaining <= 0:
                    break
                max_results = min(100, remaining)
                
            response = youtube.commentThreads().list(
                part="snippet",
                videoId=video_id,
                maxResults=max_results,
                pageToken=next_page_token,
                textFormat="plainText"
            ).execute()
            
            items = response.get("items", [])
            for item in items:
                snippet = item["snippet"]["topLevelComment"]["snippet"]
                author = snippet.get("authorDisplayName", "Unknown")
                text = snippet.get("textDisplay", "")
                comments.append({"author": author, "text": text})
                
                if limit is not None and len(comments) >= limit:
                    break
            
            logger.info(f"Retrieved {len(comments)} comments from YouTube API so far...")
            
            if limit is not None and len(comments) >= limit:
                break
                
            next_page_token = response.get("nextPageToken")
            if not next_page_token:
                break
    except Exception as e:
        err_msg = str(e)
        if "commentsDisabled" in err_msg or "disabled" in err_msg.lower():
            logger.warning(f"Comments are disabled for video {video_id}.")
            raise ValueError("Comments are disabled for this video.")
        else:
            logger.error(f"Error occurred while fetching comments for video {video_id}: {e}")
            raise ValueError(f"Error occurred while fetching comments: {e}")
            
    logger.info(f"Finished fetching comments. Total retrieved: {len(comments)}")
    return comments


def analyze_video_comments_sentiment(video_id_or_url: str, limit: Optional[int] = 100, model: str = "gemini-3.5-flash") -> Dict:
    """
    Core sentiment analysis logic. Fetches metadata and comments, runs LangChain with Gemini structured outputs,
    and returns a structured dictionary of results.
    """
    from youtube.utils import get_youtube_client
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.prompts import ChatPromptTemplate
    from pydantic import BaseModel, Field
    from typing import List, Literal
    from collections import Counter

    logger.info(f"Starting sentiment analysis operation for video: '{video_id_or_url}' (limit: {limit}, model: {model})")

    # 1. Verify Credentials
    youtube_api_key = os.getenv("YOUTUBE_API_KEY")
    if not youtube_api_key:
        raise ValueError("YOUTUBE_API_KEY is not set in environment variables.")
        
    gemini_api_key = os.getenv("GEMINI_API_KEY_1")
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY_1 is not set in environment variables.")

    # 2. Get Input Video ID/URL
    video_id = extract_video_id(video_id_or_url)
    logger.info(f"Extracted video ID: {video_id}")

    # 3. Fetch Video Details & Comments
    youtube_client = get_youtube_client(youtube_api_key)
    metadata = fetch_video_metadata(youtube_client, video_id)
    comments = fetch_comments(youtube_client, video_id, limit=limit)

    if not comments:
        logger.info("No comments found or comments are disabled. Returning empty sentiment report.")
        return {
            "video_id": video_id,
            "title": metadata["title"],
            "description": metadata["description"],
            "view_count": metadata["view_count"],
            "summaries": [],
            "most_common_reasons": [],
            "analyses": []
        }

    # Assign sequential comment IDs (c1, c2, ...)
    for i, c in enumerate(comments):
        c["comment_id"] = f"c{i+1}"

    # 4. Setup LLM Bot using LangChain
    api_model = "gemma-4-31b-it" if model == "gemma-4" else model
    logger.info(f"Setting up LangChain client with Gemini model: {api_model}")
    llm = ChatGoogleGenerativeAI(
        model=api_model,
        google_api_key=gemini_api_key,
        temperature=0.0
    )

    # Define the output schema using Pydantic
    class CommentSentiment(BaseModel):
        comment_id: str = Field(description="The ID of the comment being analyzed.")
        username: str = Field(description="The username of the comment author.")
        text: str = Field(description="The text of the comment.")
        sentiment: Literal["Positive", "Negative", "Neutral", "Mixed"] = Field(description="The overall sentiment of the comment.")
        reason: str = Field(description="The primary reason for the sentiment.")
        confidence_score: float = Field(description="Confidence score between 0.0 and 1.0.")

    class SentimentResponse(BaseModel):
        analyses: List[CommentSentiment] = Field(description="List of comment sentiment analyses.")
        summary: str = Field(description="A summary of users' sentiments for the comments in this batch.")

    # Configure the LLM to return structured output matching the schema
    structured_llm = llm.with_structured_output(SentimentResponse)

    # User prompt template contains video details and the formatted comments
    user_prompt = """Analyze the sentiment of comments in this YouTube video. 
Video Title: {title}
Description: {description}
View Count: {view_count}

Comments:
{comments}"""

    prompt_template = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("user", user_prompt)
    ])
    
    # Assemble Chain
    chain = prompt_template | structured_llm

    # 5. Invoke LLM Chain in chunks of 100 comments max (updated chunk size per user specification)
    aggregated_results = []
    chunk_summaries = []
    chunk_size = 100
    total_comments = len(comments)
    total_chunks = (total_comments + chunk_size - 1) // chunk_size

    logger.info(f"Starting sentiment analysis on {total_comments} comments in {total_chunks} chunk(s) (chunk size: {chunk_size})...")

    for i, start_idx in enumerate(range(0, total_comments, chunk_size), 1):
        chunk = comments[start_idx:start_idx + chunk_size]
        logger.info(f"Analyzing chunk {i}/{total_chunks} (comments {start_idx + 1} to {min(start_idx + chunk_size, total_comments)}) via Gemini API...")
        formatted_comments = "\n".join([f"{c['comment_id']}: {c['author']}: {c['text']}" for c in chunk])
        
        try:
            response = chain.invoke({
                "title": metadata["title"],
                "description": metadata["description"],
                "view_count": metadata["view_count"],
                "comments": formatted_comments
            })
            
            # Extract and append structured results
            for analysis in response.analyses:
                aggregated_results.append({
                    "comment_id": analysis.comment_id,
                    "username": analysis.username,
                    "text": analysis.text,
                    "sentiment": analysis.sentiment,
                    "reason": analysis.reason,
                    "confidence_score": analysis.confidence_score
                })
            
            if hasattr(response, "summary") and response.summary:
                chunk_summaries.append(response.summary)
            logger.info(f"Successfully processed chunk {i}/{total_chunks}.")
        except Exception as e:
            logger.error(f"Error during sentiment analysis for chunk starting at index {start_idx}: {e}")
            raise ValueError(f"Failed to analyze comment batch starting at comment {start_idx + 1}: {e}")

    logger.info(f"Completed sentiment analysis for all {total_comments} comments. Aggregating final results...")

    # Calculate the most common reasons and counts
    reasons = [analysis["reason"] for analysis in aggregated_results if analysis.get("reason")]
    reason_counts = Counter(reasons)
    most_common_reasons = [{"reason": r, "count": c} for r, c in reason_counts.most_common()]

    return {
        "video_id": video_id,
        "title": metadata["title"],
        "description": metadata["description"],
        "view_count": metadata["view_count"],
        "summaries": chunk_summaries,
        "most_common_reasons": most_common_reasons,
        "analyses": aggregated_results
    }



