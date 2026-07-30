import os
import json
import logging
from typing import List, Optional
from groq import Groq
from dotenv import load_dotenv

# Ensure environment variables from .env file are loaded
load_dotenv()

logger = logging.getLogger("discover_api.agentic.suggest_titles")

SYSTEM_PROMPT = """You are an expert YouTube algorithm and content researcher.
Your goal is to help a YouTube creator discover related outlier videos and competitors for the specific video idea they are working on.

Given the user's video title concept, generate 5 to 7 concise, high-performing search queries (2 to 5 words each) that YouTube viewers search for when looking for content on this topic.

Guidelines:
1. Search queries must directly relate to the core topic, angle, technology, or niche of the user's video title.
2. Provide diverse search angles (e.g., core concepts, competitor video topics, common problem/tutorial searches, comparisons).
3. Keep each search query short, natural, and optimized for finding relevant YouTube videos.
4. Return strictly structured JSON matching the provided schema."""


def suggest_titles(
    topic: Optional[str] = None,
    video_title: Optional[str] = None,
    channel_name: Optional[str] = None
) -> List[str]:
    """
    Call Groq API using the GPT OSS 120B model with constrained structured outputs
    to return a list of recommended search queries for YouTube outlier research.

    Raises RuntimeError if GROQ_API_KEY is missing or the Groq API call fails.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY environment variable is not set.")
        raise RuntimeError("GROQ_API_KEY environment variable is missing.")

    client = Groq(api_key=api_key)

    # Build prompt context prioritizing video_title
    main_title = video_title or topic or ""

    if main_title and main_title.strip():
        user_prompt = (
            f"The creator is making a YouTube video with the title/concept: \"{main_title.strip()}\".\n"
            + (f"Channel context: {channel_name.strip()}\n" if channel_name and channel_name.strip() else "")
            + "Generate 5 to 7 targeted search queries to find related YouTube videos and competitor outliers."
        )
    else:
        user_prompt = "Generate 5 to 7 top search query suggestions for discovering viral tech, coding, and creator videos."

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "suggested_titles",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "titles": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "List of 5 to 7 suggested search terms or video titles for YouTube outlier research."
                            }
                        },
                        "required": ["titles"],
                        "additionalProperties": False
                    }
                }
            }
        )

        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("Empty response received from Groq API.")

        data = json.loads(content)
        titles = data.get("titles", [])
        if not isinstance(titles, list) or len(titles) == 0:
            raise RuntimeError("Groq API returned an empty list of title suggestions.")

        # Clean titles
        cleaned_titles = [str(t).strip() for t in titles if str(t).strip()]
        if not cleaned_titles:
            raise RuntimeError("No valid title strings found in Groq response.")

        logger.info(f"Successfully generated {len(cleaned_titles)} title suggestions via Groq GPT OSS 120B.")
        return cleaned_titles

    except Exception as e:
        logger.error(f"Failed to generate title suggestions via Groq: {e}", exc_info=True)
        raise RuntimeError(f"Groq AI suggestion error: {str(e)}")
