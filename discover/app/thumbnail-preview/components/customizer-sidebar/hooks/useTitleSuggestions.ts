import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/app/utils/constants";

export function useTitleSuggestions(videoTitle: string, channelName: string) {
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const lastFetchedTitleRef = useRef<string>("");

  const fetchSuggestedTitles = async (titleToUse?: string) => {
    const targetTitle = titleToUse !== undefined ? titleToUse : videoTitle;
    if (!targetTitle || !targetTitle.trim()) {
      setSuggestError("Specify a Video Title under Video Details below to generate AI search queries.");
      setSuggestedTitles([]);
      return;
    }

    setIsSuggesting(true);
    setSuggestError(null);
    lastFetchedTitleRef.current = targetTitle.trim();

    try {
      const params = new URLSearchParams({
        video_title: targetTitle.trim(),
      });
      if (channelName.trim()) {
        params.append("channel_name", channelName.trim());
      }

      const response = await fetch(`${API_BASE_URL}/api/youtube/suggest-titles?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestedTitles(data.titles || []);
      } else {
        const errJson = await response.json().catch(() => ({}));
        setSuggestError(errJson.detail || `Failed to fetch AI suggestions (${response.status})`);
        setSuggestedTitles([]);
      }
    } catch (err: any) {
      console.error("Error fetching title suggestions:", err);
      setSuggestError("Unable to connect to AI suggestion service.");
      setSuggestedTitles([]);
    } finally {
      setIsSuggesting(false);
    }
  };

  useEffect(() => {
    if (videoTitle && videoTitle.trim()) {
      fetchSuggestedTitles(videoTitle.trim());
    }
  }, []);

  return {
    suggestedTitles,
    isSuggesting,
    suggestError,
    fetchSuggestedTitles,
    lastFetchedTitleRef,
  };
}
