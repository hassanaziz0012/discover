import os
import re
import logging
from typing import List, Dict, Any, Optional
from youtube_transcript_api import YouTubeTranscriptApi
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from youtube.sentiment_analyzer import extract_video_id

logger = logging.getLogger("discover_api.youtube.summarize_video")

SYSTEM_PROMPT = """You are an AI agent tasked with summarizing YouTube videos and providing key takeaways. 

You will be provided with a transcript of a YouTube video, with timestamps included. 

You will provide the following items in your output:
- A concise overview of the entire video
- A bullet point list of key takeaways from the video
- Time stamps for the chapters in the video

For the video chapters, you can simply divide the video into sensible topics by analyzing the captions file provided to you. 


"""

class VideoChapter(BaseModel):
    timestamp: str = Field(description="The timestamp of the chapter start, formatted as MM:SS or HH:MM:SS (e.g., '00:56' or '01:23:45').")
    title: str = Field(description="A concise title for this chapter.")
    description: str = Field(description="A one-sentence summary/description of that chapter.")

class VideoSummaryResponse(BaseModel):
    overview: str = Field(description="A concise overview of the entire video.")
    takeaways: List[str] = Field(description="A bullet point list of key takeaways from the video.")
    chapters: List[VideoChapter] = Field(description="Timestamps and chapters in the video.")

def format_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def summarize_youtube_video(video_id_or_url: str, model: str = "gemini-3.5-flash") -> Dict[str, Any]:
    """
    Retrieves the transcript/captions for a YouTube video, then passes it to
    the Gemini model using LangChain to obtain a structured summary.
    """
    logger.info(f"Summarizing YouTube video: '{video_id_or_url}' using model: '{model}'")
    
    # 1. Extract Video ID
    video_id = extract_video_id(video_id_or_url)
    
    # 2. Retrieve Transcript
    try:
        transcript_list = YouTubeTranscriptApi().fetch(video_id)
    except Exception as e:
        logger.error(f"Failed to retrieve transcript for video {video_id}: {e}")
        raise ValueError(f"Could not retrieve transcript/captions for video {video_id}: {e}")
        
    # 3. Format Transcript with Timestamps
    formatted_transcript = ""
    for entry in transcript_list:
        time_str = format_timestamp(entry.start)
        text = entry.text.strip()
        formatted_transcript += f"[{time_str}] {text}\n"

    # 4. Initialize LLM via LangChain
    gemini_api_key = os.getenv("GEMINI_API_KEY_1") or os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise ValueError("Gemini API key (GEMINI_API_KEY_1 or GEMINI_API_KEY) is not set in environment variables.")

    # Support model mapping
    api_model = "gemma-4-31b-it" if model == "gemma-4" else model
    
    llm = ChatGoogleGenerativeAI(
        model=api_model,
        google_api_key=gemini_api_key,
        temperature=0.0
    )
    
    # 5. Build and Invoke Chain
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("user", "Here is the YouTube video transcript:\n\n{transcript}")
    ])
    
    structured_llm = llm.with_structured_output(VideoSummaryResponse)
    chain = prompt_template | structured_llm
    
    try:
        response = chain.invoke({"transcript": formatted_transcript})
        return {
            "video_id": video_id,
            "overview": response.overview,
            "takeaways": response.takeaways,
            "chapters": [
                {
                    "timestamp": ch.timestamp,
                    "title": ch.title,
                    "description": ch.description
                }
                for ch in response.chapters
            ]
        }
    except Exception as e:
        logger.error(f"Error during video summarization API call: {e}")
        raise ValueError(f"Failed to generate video summary: {e}")
