import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Video } from "../../../../types/video";
import { formatViews, formatDuration, timeAgo } from "../../../../utils/format";
import { API_BASE_URL } from "@/app/utils/constants";
import { ApiResponse, ApiOutlier } from "../types";

export interface UseOutliersDataResult {
  data: ApiResponse | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  daysBoost: string;
  setDaysBoost: (val: string) => void;
  limit: string;
  setLimit: (val: string) => void;
  excludeShorts: boolean;
  handleSetExcludeShorts: (val: boolean) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  minOutlier: number;
  setMinOutlier: (val: number) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  isCopied: boolean;
  fetchOutliers: () => Promise<void>;
  handleCopyChannelId: () => void;
  handleResetFilters: () => void;
  filteredAndSortedVideos: Video[];
}

const PER_PAGE = 50;

export function useOutliersData(creatorID: string): UseOutliersDataResult {
  // API State
  const [data, setData] = useState<ApiResponse | null>(null);
  const [allOutliers, setAllOutliers] = useState<ApiOutlier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // Dynamic Query Parameter States (passed to backend API)
  const [daysBoost, setDaysBoost] = useState<string>("30"); // Recency boost time-frame cutoff (default 30 days)
  const [limit, setLimit] = useState<string>("all"); // Max videos retrieved from YouTube API
  const [excludeShorts, setExcludeShorts] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("creator_excludeShorts") === "true";
    }
    return false;
  });

  // Client-side Filter States (applied locally to the fetched results)
  const [searchQuery, setSearchQuery] = useState("");
  const [minOutlier, setMinOutlier] = useState<number>(0); // Default outlier score filter threshold
  const [sortBy, setSortBy] = useState<string>("outlierScore"); // Sort key

  // Clipboard copy feedback
  const [isCopied, setIsCopied] = useState(false);

  // Ref to prevent concurrent fetches
  const isFetchingRef = useRef(false);
  const pageRef = useRef(page);
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading || isLoadingMore);

  useEffect(() => {
    pageRef.current = page;
    hasMoreRef.current = hasMore;
    isLoadingRef.current = isLoading || isLoadingMore;
  });

  const handleSetExcludeShorts = (val: boolean) => {
    setExcludeShorts(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("creator_excludeShorts", val.toString());
    }
  };

  // Fetch data function — supports both initial load and loading more pages
  const fetchPage = useCallback(async (pageToFetch: number, isReset: boolean) => {
    if (!creatorID) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isReset) {
      setIsLoading(true);
      setPage(1);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const daysQuery = daysBoost ? `&days=${encodeURIComponent(daysBoost)}` : "";
      const limitQuery = limit && limit !== "all" ? `&limit=${encodeURIComponent(limit)}` : "";
      const excludeShortsQuery = excludeShorts ? `&exclude_shorts=true` : "";
      const response = await fetch(
        `${API_BASE_URL}/api/youtube/fetch-outliers?channel=${encodeURIComponent(creatorID)}${daysQuery}${limitQuery}${excludeShortsQuery}&page=${pageToFetch}&per_page=${PER_PAGE}`
      );
      if (response.ok) {
        const json: ApiResponse = await response.json();

        // Store channel-level metadata (always from first page or latest)
        setData(json);

        // Accumulate outliers
        setAllOutliers((prev) => {
          if (isReset) return json.outliers;
          // Deduplicate by video_id
          const combined = [...prev, ...json.outliers];
          const seen = new Set<string>();
          return combined.filter((o) => {
            if (seen.has(o.video_id)) return false;
            seen.add(o.video_id);
            return true;
          });
        });

        setHasMore(json.has_more);
        setPage(pageToFetch);
      } else {
        const errJson = await response.json().catch(() => ({}));
        setError(errJson.detail || `Failed to fetch outliers. Server returned status code ${response.status}.`);
      }
    } catch (err) {
      console.error("Fetch outliers error:", err);
      setError("Unable to connect to the backend server. Please verify that the uvicorn server is running on port 8000.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [creatorID, daysBoost, limit, excludeShorts]);

  // Public fetchOutliers — always resets to page 1
  const fetchOutliers = useCallback(async () => {
    await fetchPage(1, true);
  }, [fetchPage]);

  // Trigger fresh fetch when dynamic query params change
  useEffect(() => {
    fetchPage(1, true);
  }, [creatorID, daysBoost, limit, excludeShorts]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    const sentinel = document.getElementById("scroll-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !isLoadingRef.current &&
          !isFetchingRef.current
        ) {
          fetchPage(pageRef.current + 1, false);
        }
      },
      {
        rootMargin: "300px",
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [fetchPage]);

  // Handle Copy Channel ID
  const handleCopyChannelId = () => {
    if (data?.channel_id) {
      navigator.clipboard.writeText(data.channel_id);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Reset Filters to default values
  const handleResetFilters = () => {
    setSearchQuery("");
    setMinOutlier(0);
    setLimit("all");
    setSortBy("outlierScore");
    handleSetExcludeShorts(false);
  };

  // Client-side filtering & sorting pipeline (operates on accumulated outliers)
  const filteredAndSortedVideos = useMemo(() => {
    if (!data || !allOutliers.length) return [];

    // Map ApiOutlier to standard Video interface
    let mapped: Video[] = allOutliers.map((o) => ({
      id: o.video_id,
      title: o.title,
      creator: data.channel_name,
      creatorAvatar: data.channel_avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(data.channel_name)}`,
      views: formatViews(o.view_count),
      viewsRaw: o.view_count,
      publishedAt: timeAgo(o.published_at),
      publishedAtRaw: new Date(o.published_at),
      duration: formatDuration(o.duration),
      outlierScore: o.score,
      thumbnailUrl: o.thumbnail_url,
      category: "Creators",
      youtubeUrl: o.url,
      isShort: o.is_short,
    }));

    // 1. Search Query Filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      mapped = mapped.filter((v) => v.title.toLowerCase().includes(q));
    }

    // 2. Outlier Score Threshold Filter
    mapped = mapped.filter((v) => v.outlierScore >= minOutlier);

    // 2.5. Exclude Shorts Filter
    if (excludeShorts) {
      mapped = mapped.filter((v) => !v.isShort);
    }

    // 3. Sorting pipeline
    mapped.sort((a, b) => {
      if (sortBy === "views") {
        return b.viewsRaw - a.viewsRaw;
      }
      if (sortBy === "newest") {
        return b.publishedAtRaw.getTime() - a.publishedAtRaw.getTime();
      }
      // Default: outlierScore
      return b.outlierScore - a.outlierScore;
    });

    return mapped;
  }, [data, allOutliers, searchQuery, minOutlier, sortBy, excludeShorts]);

  return {
    data,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    daysBoost,
    setDaysBoost,
    limit,
    setLimit,
    excludeShorts,
    handleSetExcludeShorts,
    searchQuery,
    setSearchQuery,
    minOutlier,
    setMinOutlier,
    sortBy,
    setSortBy,
    isCopied,
    fetchOutliers,
    handleCopyChannelId,
    handleResetFilters,
    filteredAndSortedVideos,
  };
}
