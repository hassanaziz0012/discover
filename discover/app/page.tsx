"use client";

import React, { useState, useMemo, useEffect } from "react";
import TabNavigation from "./components/TabNavigation";
import SearchBar from "./components/SearchBar";
import VideoGrid from "./components/VideoGrid";
import FilterModal from "./components/FilterModal";
import CreatorsList, { Creator } from "./components/CreatorsList";
import { Video } from "./types/video";

const API_BASE_URL = "http://localhost:8000";

// Helper: Format large numbers to human-readable views (e.g. 1.2M, 45K)
function formatViews(views: number): string {
  if (views === undefined || views === null) return "0 views";
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1).replace(/\.0$/, "")}M views`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1).replace(/\.0$/, "")}K views`;
  }
  return `${views} views`;
}

// Helper: Convert ISO 8601 duration (e.g., PT15M33S) into standard format (e.g., 15:33)
function formatDuration(isoDuration: string): string {
  if (!isoDuration) return "0:00";
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return isoDuration;
  const hrs = matches[1] ? parseInt(matches[1]) : 0;
  const mins = matches[2] ? parseInt(matches[2]) : 0;
  const secs = matches[3] ? parseInt(matches[3]) : 0;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Helper: Relative time ago (e.g., 2mo ago, 12d ago)
function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1mo ago";
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.floor(diffMonths / 12);
  if (diffYears === 1) return "1yr ago";
  return `${diffYears}yr ago`;
}

export default function Home() {
  // Navigation & Filtering States
  const [activeTab, setActiveTab] = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Configuration Filter States (Syncs to FilterModal)
  const [platform, setPlatform] = useState("YouTube");
  const [timeRange, setTimeRange] = useState("all");
  const [minOutlier, setMinOutlier] = useState(1.5); // updated default to be 1.5x
  const [sortBy, setSortBy] = useState("outlierScore");

  // Outliers Fetching States
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cached Creators API States
  const [creators, setCreators] = useState<Creator[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [creatorsError, setCreatorsError] = useState<string | null>(null);

  // Fetch cached creators from backend API
  const fetchCreators = async () => {
    setCreatorsLoading(true);
    setCreatorsError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/cached-creators`);
      if (response.ok) {
        const data = await response.json();
        setCreators(data);
      } else {
        const errJson = await response.json().catch(() => ({}));
        setCreatorsError(errJson.detail || `Failed to fetch creators (Server status: ${response.status})`);
      }
    } catch (err) {
      console.error("Fetch creators error:", err);
      setCreatorsError("Unable to connect to the backend server. Please verify that the uvicorn server is running on port 8000.");
    } finally {
      setCreatorsLoading(false);
    }
  };

  // Fetch Outliers from Backend
  const fetchOutliers = async (pageToFetch: number, isReset: boolean) => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: pageToFetch.toString(),
        limit: "12",
        sort_by: sortBy,
      });
      if (searchQuery.trim()) {
        queryParams.append("search", searchQuery.trim());
      }
      if (minOutlier !== undefined) {
        queryParams.append("min_outlier", minOutlier.toString());
      }
      if (timeRange && timeRange !== "all") {
        queryParams.append("time_range", timeRange);
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
        const errJson = await response.json().catch(() => ({}));
        setError(errJson.detail || `Failed to fetch outliers (Server status: ${response.status})`);
      }
    } catch (err) {
      console.error("Fetch outliers error:", err);
      setError("Unable to connect to the backend server. Please verify that the uvicorn server is running on port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger reset & load page 1 when active tab, search, or configuration changes
  useEffect(() => {
    if (activeTab === "discover") {
      fetchOutliers(1, true);
    } else if (activeTab === "creators" && creators.length === 0) {
      fetchCreators();
    }
  }, [activeTab, searchQuery, minOutlier, timeRange, sortBy]);

  // Infinite Scroll Trigger via Intersection Observer
  useEffect(() => {
    if (!hasMore || isLoading || activeTab !== "discover") return;

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
  }, [hasMore, isLoading, page, activeTab, searchQuery, minOutlier, timeRange, sortBy]);

  // Reset all filters to default
  const handleResetFilters = () => {
    setSearchQuery("");
    setPlatform("YouTube");
    setTimeRange("all");
    setMinOutlier(1.5);
    setSortBy("outlierScore");
  };

  // High-fidelity search filter for cached creators
  const filteredCreators = useMemo(() => {
    if (!searchQuery.trim()) return creators;
    const q = searchQuery.toLowerCase().trim();
    return creators.filter(
      (c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)
    );
  }, [creators, searchQuery]);

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 min-h-screen flex flex-col">
      {/* Search Input Bar (Top Section) */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenFilters={() => setIsFilterModalOpen(true)}
        activePlatform={platform}
        activeTimeRange={timeRange}
        activeMinOutlier={minOutlier}
      />

      {/* Tab Horizontal Navigation (Discover, Creators, My Lists) */}
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {activeTab === "creators" ? (
          <CreatorsList
            creators={filteredCreators}
            isLoading={creatorsLoading}
            error={creatorsError}
            onRetry={fetchCreators}
          />
        ) : activeTab === "mylists" ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-surface border border-border-subtle rounded-lg my-6 shadow-sm">
            <h3 className="text-xl font-bold text-primary mb-2">My Lists</h3>
            <p className="text-secondary max-w-[440px] leading-relaxed">
              Bookmarked and saved lists functionality is currently offline. All local mock data has been deprecated.
            </p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 bg-surface border border-error/15 rounded-lg my-6 shadow-sm animate-fade-in">
            <h3 className="text-xl font-bold text-error mb-2">Error Connecting to Backend</h3>
            <p className="text-secondary max-w-[440px] leading-relaxed mb-6">{error}</p>
            <button
              onClick={() => fetchOutliers(1, true)}
              className="py-2 px-5 bg-brand text-on-brand rounded-md font-semibold shadow-sm hover:bg-brand-hover transition-all duration-150"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <VideoGrid videos={videos} onResetFilters={handleResetFilters} />

            {/* Scroll Sentinel */}
            {hasMore && !isLoading && (
              <div id="scroll-sentinel" className="h-10 w-full flex items-center justify-center mb-6">
                <span className="text-secondary text-sm">Scroll down to load more...</span>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="h-16 w-full flex items-center justify-center gap-2.5 text-brand mb-6">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="font-semibold text-sm">Loading more outliers...</span>
              </div>
            )}
          </>
        )}
      </main>

      {/* Filter Options Configuration Overlay Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        platform={platform}
        setPlatform={setPlatform}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        minOutlier={minOutlier}
        setMinOutlier={setMinOutlier}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />
    </div>
  );
}

