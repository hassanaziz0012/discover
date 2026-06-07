"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  const [platform, setPlatformState] = useState("YouTube");
  const [timeRange, setTimeRangeState] = useState("all");
  const [minOutlier, setMinOutlierState] = useState(1.5); // updated default to be 1.5x
  const [sortBy, setSortByState] = useState("outlierScore");
  const [isFiltersLoaded, setIsFiltersLoaded] = useState(false);

  // Custom setters that update both state and localStorage
  const setPlatform = (val: string) => {
    setPlatformState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("discover_platform", val);
    }
  };

  const setTimeRange = (val: string) => {
    setTimeRangeState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("discover_timeRange", val);
    }
  };

  const setMinOutlier = (val: number) => {
    setMinOutlierState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("discover_minOutlier", val.toString());
    }
  };

  const setSortBy = (val: string) => {
    setSortByState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("discover_sortBy", val);
    }
  };

  // Load saved filters on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPlatform = localStorage.getItem("discover_platform");
      const savedTimeRange = localStorage.getItem("discover_timeRange");
      const savedMinOutlier = localStorage.getItem("discover_minOutlier");
      const savedSortBy = localStorage.getItem("discover_sortBy");

      if (savedPlatform) setPlatformState(savedPlatform);
      if (savedTimeRange) setTimeRangeState(savedTimeRange);
      if (savedMinOutlier) {
        const parsed = parseFloat(savedMinOutlier);
        if (!isNaN(parsed)) setMinOutlierState(parsed);
      }
      if (savedSortBy) setSortByState(savedSortBy);
    }
    setIsFiltersLoaded(true);
  }, []);

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

  // Search query debouncing state
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  // Keep track of the last successfully initiated fetch page number to avoid duplicates
  const lastFetchedPage = useRef<number>(0);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

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

  // Refresh Creators States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleRefreshCreators = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshStatus(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/refresh-creators`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.creators) {
          setCreators(data.creators);
        }
        setRefreshStatus({
          type: "success",
          message: data.message || "Successfully refreshed all channels.",
        });
      } else {
        const errJson = await response.json().catch(() => ({}));
        setRefreshStatus({
          type: "error",
          message: errJson.detail || `Failed to refresh channels (Server status: ${response.status})`,
        });
      }
    } catch (err) {
      console.error("Refresh creators error:", err);
      setRefreshStatus({
        type: "error",
        message: "Unable to connect to the backend server. Please verify that the uvicorn server is running on port 8000.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (refreshStatus && refreshStatus.type === "success") {
      const timer = setTimeout(() => {
        setRefreshStatus(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [refreshStatus]);

  // Fetch Outliers from Backend
  const fetchOutliers = async (pageToFetch: number, isReset: boolean) => {
    if (isLoading) return;

    // Prevent fetching the same page number concurrently or repeatedly unless it is a reset
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
        // Revert lastFetchedPage on failure to allow retry
        lastFetchedPage.current = prevLastFetched;
        const errJson = await response.json().catch(() => ({}));
        setError(errJson.detail || `Failed to fetch outliers (Server status: ${response.status})`);
      }
    } catch (err) {
      // Revert lastFetchedPage on failure to allow retry
      lastFetchedPage.current = prevLastFetched;
      console.error("Fetch outliers error:", err);
      setError("Unable to connect to the backend server. Please verify that the uvicorn server is running on port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger reset & load page 1 when active tab, search, or configuration changes
  useEffect(() => {
    if (!isFiltersLoaded) return; // Wait until filters are loaded from localStorage

    if (activeTab === "discover") {
      fetchOutliers(1, true);
    } else if (activeTab === "creators" && creators.length === 0) {
      fetchCreators();
    }
  }, [activeTab, debouncedSearchQuery, minOutlier, timeRange, sortBy, isFiltersLoaded]);

  // Infinite Scroll Trigger via Intersection Observer
  useEffect(() => {
    if (!isFiltersLoaded || !hasMore || isLoading || activeTab !== "discover") return;

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
  }, [hasMore, isLoading, page, activeTab, debouncedSearchQuery, minOutlier, timeRange, sortBy, isFiltersLoaded]);

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
          <>
            {creators.length > 0 && !creatorsLoading && (
              <div className="flex flex-col gap-3 mb-4 mt-6">
                <div className="flex justify-between items-center px-1">
                  <h2 className="text-lg font-bold text-primary">
                    Cached Creators
                  </h2>
                  <button
                    onClick={handleRefreshCreators}
                    disabled={isRefreshing}
                    className={`flex items-center gap-2 px-4 py-2 text-[0.82rem] font-bold rounded-full border border-border-subtle bg-surface-raised text-primary hover:bg-surface-overlay hover:border-brand active:scale-[0.98] transition-all duration-150 ease-in-out shadow-xs select-none ${
                      isRefreshing ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title="Refresh all creators"
                  >
                    <svg
                      className={`w-4 h-4 ${isRefreshing ? "animate-spin text-brand" : "text-secondary hover:text-brand"}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    {isRefreshing ? "Refreshing Channels..." : "Refresh Channels"}
                  </button>
                </div>

                {refreshStatus && (
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between animate-fade-in text-sm font-semibold shadow-xs ${
                      refreshStatus.type === "success"
                        ? "bg-brand/10 border-brand/20 text-brand"
                        : "bg-error/10 border-error/20 text-error"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {refreshStatus.type === "success" ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="shrink-0"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="shrink-0"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                      )}
                      <span className="leading-relaxed">{refreshStatus.message}</span>
                    </div>
                    <button
                      onClick={() => setRefreshStatus(null)}
                      className="hover:opacity-75 transition-opacity p-1 ml-3 shrink-0"
                      aria-label="Dismiss banner"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
            <CreatorsList
              creators={filteredCreators}
              isLoading={creatorsLoading}
              error={creatorsError}
              onRetry={fetchCreators}
            />
          </>
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

