import { useState, useEffect, useRef, useMemo } from "react";
import { Video } from "@/app/types/video";
import { API_BASE_URL } from "@/app/utils/constants";
import { formatViews, formatDuration, timeAgo } from "@/app/utils/format";

interface UseOutliersFeedProps {
  searchQuery: string;
  platform: string;
  timeRange: string;
  minOutlier: number;
  sortBy: string;
  excludeShorts: boolean;
  isFiltersLoaded: boolean;
  viewMode: string;
  customVideo: Video;
  selectedListId: string;
}

// Helper to shuffle list
const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export function useOutliersFeed({
  searchQuery,
  platform,
  timeRange,
  minOutlier,
  sortBy,
  excludeShorts,
  isFiltersLoaded,
  viewMode,
  customVideo,
  selectedListId,
}: UseOutliersFeedProps) {
  // Outliers Fetching States
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customVideoIndex, setCustomVideoIndex] = useState(0);

  // Search query debouncing
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const lastFetchedPage = useRef<number>(0);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Fetch Outliers from Backend
  async function fetchOutliers(pageToFetch: number, isReset: boolean) {
    if (isLoading) return;

    if (!isReset && pageToFetch <= lastFetchedPage.current) {
      return;
    }

    const prevLastFetched = lastFetchedPage.current;
    if (isReset) {
      lastFetchedPage.current = 1;
    } else {
      lastFetchedPage.current = pageToFetch;
    }

    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: pageToFetch.toString(),
        limit: "12",
        sort_by: sortBy,
      });
      if (debouncedSearchQuery.trim()) {
        queryParams.append("search", debouncedSearchQuery.trim());
      }
      if (minOutlier !== undefined) {
        queryParams.append("min_outlier", minOutlier.toString());
      }
      if (timeRange && timeRange !== "all") {
        queryParams.append("time_range", timeRange);
      }
      if (excludeShorts) {
        queryParams.append("exclude_shorts", "true");
      }
      if (selectedListId && selectedListId !== "all") {
        queryParams.append("list", selectedListId);
      }

      // Default days boost mapping if time range is specified
      if (timeRange && timeRange !== "all") {
        let daysBoostVal = "30";
        if (timeRange === "weekly") daysBoostVal = "7";
        else if (timeRange === "monthly") daysBoostVal = "30";
        else if (timeRange === "3months") daysBoostVal = "90";
        else if (timeRange === "6months") daysBoostVal = "180";
        queryParams.append("days", daysBoostVal);
      }

      const response = await fetch(`${API_BASE_URL}/api/youtube/all-outliers?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const newMappedVideos: Video[] = data.videos.map((o: any) => ({
          id: o.video_id,
          title: o.title,
          creator: o.channel_name,
          creatorAvatar: o.channel_avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(o.channel_name)}`,
          views: formatViews(o.view_count),
          viewsRaw: o.view_count,
          publishedAt: timeAgo(o.published_at),
          publishedAtRaw: new Date(o.published_at),
          duration: formatDuration(o.duration),
          outlierScore: o.score,
          thumbnailUrl: o.thumbnail_url,
          category: "Creators",
          youtubeUrl: o.url,
        }));

        setVideos((prev) => (isReset ? newMappedVideos : [...prev, ...newMappedVideos]));
        setHasMore(data.has_more);
        setPage(pageToFetch);
      } else {
        lastFetchedPage.current = prevLastFetched;
        const errJson = await response.json().catch(() => ({}));
        setError(errJson.detail || `Failed to fetch outliers (Server status: ${response.status})`);
      }
    } catch (err) {
      lastFetchedPage.current = prevLastFetched;
      console.error("Fetch outliers error:", err);
      setError("Unable to connect to the backend server.");
    } finally {
      setIsLoading(false);
    }
  }

  // Trigger reset & load page 1 when debounced query or configuration changes
  useEffect(() => {
    if (!isFiltersLoaded) return;
    fetchOutliers(1, true);
  }, [debouncedSearchQuery, platform, timeRange, minOutlier, sortBy, excludeShorts, selectedListId, isFiltersLoaded]);

  // Infinite Scroll Trigger via Intersection Observer
  useEffect(() => {
    if (!isFiltersLoaded || !hasMore || isLoading || viewMode !== "youtube") return;

    const sentinel = document.getElementById("scroll-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchOutliers(page + 1, false);
        }
      },
      {
        rootMargin: "200px",
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, page, debouncedSearchQuery, platform, timeRange, minOutlier, sortBy, excludeShorts, selectedListId, viewMode, isFiltersLoaded]);

  // Actions
  const handleShuffleInputs = () => {
    if (videos.length > 0) {
      setVideos((prev) => shuffleArray(prev));
      const newIdx = Math.floor(Math.random() * (videos.length + 1));
      setCustomVideoIndex(newIdx);
    }
  };

  const resetFeed = () => {
    setCustomVideoIndex(0);
    fetchOutliers(1, true);
  };

  // Combine fetched videos with the custom video
  const displayVideos = useMemo(() => {
    const list = [...videos];
    const index = Math.min(Math.max(0, customVideoIndex), list.length);
    list.splice(index, 0, customVideo);
    return list;
  }, [videos, customVideo, customVideoIndex]);

  return {
    videos,
    displayVideos,
    isLoading,
    error,
    handleShuffleInputs,
    resetFeed,
    retryFetch: () => fetchOutliers(1, true),
  };
}
