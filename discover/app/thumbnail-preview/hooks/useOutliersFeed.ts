import { useState, useEffect, useRef, useMemo } from "react";
import { Video } from "@/app/types/video";
import { API_BASE_URL } from "@/app/utils/constants";
import { formatViews, formatDuration, timeAgo } from "@/app/utils/format";

interface UseOutliersFeedProps {
  outlierSearchQuery: string;
  searchSource?: "database" | "live";
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
  outlierSearchQuery,
  searchSource = "database",
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
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customVideoIndex, setCustomVideoIndex] = useState(0);

  // Search query debouncing
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(outlierSearchQuery);
  const lastFetchedPage = useRef<number>(0);
  const fetchIdRef = useRef<number>(0);
  const nextPageTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(outlierSearchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [outlierSearchQuery]);

  // Fetch Outliers from Backend
  async function fetchOutliers(pageToFetch: number, isReset: boolean) {
    if (!isReset && isLoading) return;

    if (!isReset && searchSource === "database" && pageToFetch <= lastFetchedPage.current) {
      return;
    }

    const currentFetchId = ++fetchIdRef.current;

    const prevLastFetched = lastFetchedPage.current;
    if (isReset) {
      lastFetchedPage.current = 1;
      nextPageTokenRef.current = null;
      setIsResetting(true);
    } else {
      lastFetchedPage.current = pageToFetch;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (searchSource === "live") {
        const queryParams = new URLSearchParams({
          limit: "12",
        });
        if (debouncedSearchQuery.trim()) {
          queryParams.append("search", debouncedSearchQuery.trim());
        }
        if (!isReset && nextPageTokenRef.current) {
          queryParams.append("page_token", nextPageTokenRef.current);
        }

        const response = await fetch(`${API_BASE_URL}/api/youtube/search-live?${queryParams.toString()}`);

        // Stale request check
        if (currentFetchId !== fetchIdRef.current) return;

        if (response.ok) {
          const data = await response.json();
          nextPageTokenRef.current = data.next_page_token || null;
          const newMappedVideos: Video[] = (data.videos || []).map((o: any) => ({
            id: o.video_id,
            title: o.title,
            creator: o.channel_name,
            creatorAvatar: o.channel_avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(o.channel_name)}`,
            views: formatViews(o.view_count),
            viewsRaw: o.view_count || 0,
            publishedAt: timeAgo(o.published_at),
            publishedAtRaw: new Date(o.published_at),
            duration: formatDuration(o.duration),
            outlierScore: undefined, // Skip outlier score for live YouTube search results
            thumbnailUrl: o.thumbnail_url,
            category: "Live Search",
            youtubeUrl: o.url,
            channelId: o.channel_id,
          }));

          setVideos((prev) => {
            const combined = isReset ? newMappedVideos : [...prev, ...newMappedVideos];
            const seen = new Set<string>();
            return combined.filter((v) => {
              if (!v.id || seen.has(v.id)) return false;
              seen.add(v.id);
              return true;
            });
          });
          setHasMore(Boolean(data.has_more));
          setPage(pageToFetch);
        } else {
          lastFetchedPage.current = prevLastFetched;
          const errJson = await response.json().catch(() => ({}));
          setError(errJson.detail || `Failed to fetch live search videos (Server status: ${response.status})`);
        }
      } else {
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

        // Stale request check
        if (currentFetchId !== fetchIdRef.current) return;

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
            channelId: o.channel_id,
          }));

          setVideos((prev) => {
            const combined = isReset ? newMappedVideos : [...prev, ...newMappedVideos];
            const seen = new Set<string>();
            return combined.filter((v) => {
              if (!v.id || seen.has(v.id)) return false;
              seen.add(v.id);
              return true;
            });
          });
          setHasMore(data.has_more);
          setPage(pageToFetch);
        } else {
          lastFetchedPage.current = prevLastFetched;
          const errJson = await response.json().catch(() => ({}));
          setError(errJson.detail || `Failed to fetch outliers (Server status: ${response.status})`);
        }
      }
    } catch (err) {
      if (currentFetchId !== fetchIdRef.current) return;
      lastFetchedPage.current = prevLastFetched;
      console.error("Fetch outliers error:", err);
      setError("Unable to connect to the backend server.");
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setIsLoading(false);
        setIsResetting(false);
      }
    }
  }

  // Trigger reset & load page 1 when debounced query or configuration changes
  useEffect(() => {
    if (!isFiltersLoaded) return;
    fetchOutliers(1, true);
  }, [debouncedSearchQuery, searchSource, platform, timeRange, minOutlier, sortBy, excludeShorts, selectedListId, isFiltersLoaded]);

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

  const isDebouncing = outlierSearchQuery.trim() !== debouncedSearchQuery.trim();
  const isSearchingOutliers = isDebouncing || isResetting;

  return {
    videos,
    displayVideos,
    isLoading,
    isSearchingOutliers,
    error,
    handleShuffleInputs,
    resetFeed,
    retryFetch: () => fetchOutliers(1, true),
  };
}
