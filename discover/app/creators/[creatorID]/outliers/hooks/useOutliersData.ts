import React, { useState, useEffect, useMemo } from "react";
import { Video } from "../../../../types/video";
import { formatViews, formatDuration, timeAgo } from "../../../../utils/format";
import { API_BASE_URL } from "@/app/utils/constants";
import { ApiResponse } from "../types";

export interface UseOutliersDataResult {
  data: ApiResponse | null;
  isLoading: boolean;
  error: string | null;
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

export function useOutliersData(creatorID: string): UseOutliersDataResult {
  // API State
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Query Parameter States (passed to backend API)
  const [daysBoost, setDaysBoost] = useState<string>("30"); // Recency boost time-frame cutoff (default 30 days)
  const [limit, setLimit] = useState<string>("all"); // Max videos retrieved from YouTube API
  const [excludeShorts, setExcludeShorts] = useState<boolean>(false);

  // Client-side Filter States (applied locally to the fetched results)
  const [searchQuery, setSearchQuery] = useState("");
  const [minOutlier, setMinOutlier] = useState<number>(0); // Default outlier score filter threshold
  const [sortBy, setSortBy] = useState<string>("outlierScore"); // Sort key

  // Clipboard copy feedback
  const [isCopied, setIsCopied] = useState(false);

  // Sync saved excludeShorts filter on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("creator_excludeShorts");
      if (saved) setExcludeShorts(saved === "true");
    }
  }, []);

  const handleSetExcludeShorts = (val: boolean) => {
    setExcludeShorts(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("creator_excludeShorts", val.toString());
    }
  };

  // Fetch data function
  const fetchOutliers = async () => {
    if (!creatorID) return;
    setIsLoading(true);
    setError(null);
    try {
      const daysQuery = daysBoost ? `&days=${encodeURIComponent(daysBoost)}` : "";
      const limitQuery = limit && limit !== "all" ? `&limit=${encodeURIComponent(limit)}` : "";
      const excludeShortsQuery = excludeShorts ? `&exclude_shorts=true` : "";
      const response = await fetch(
        `${API_BASE_URL}/api/youtube/fetch-outliers?channel=${encodeURIComponent(creatorID)}${daysQuery}${limitQuery}${excludeShortsQuery}`
      );
      if (response.ok) {
        const json = await response.json();
        setData(json);
      } else {
        const errJson = await response.json().catch(() => ({}));
        setError(errJson.detail || `Failed to fetch outliers. Server returned status code ${response.status}.`);
      }
    } catch (err) {
      console.error("Fetch outliers error:", err);
      setError("Unable to connect to the backend server. Please verify that the uvicorn server is running on port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger fetch when dynamic query params change
  useEffect(() => {
    fetchOutliers();
  }, [creatorID, daysBoost, limit, excludeShorts]);

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

  // Client-side filtering & sorting pipeline
  const filteredAndSortedVideos = useMemo(() => {
    if (!data || !data.outliers) return [];

    // Map ApiOutlier to standard Video interface
    let mapped: Video[] = data.outliers.map((o) => ({
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
  }, [data, searchQuery, minOutlier, sortBy, excludeShorts]);

  return {
    data,
    isLoading,
    error,
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
