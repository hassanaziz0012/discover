"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import TabNavigation from "./components/TabNavigation";
import SearchBar from "./components/SearchBar";
import VideoGrid from "./components/VideoGrid";
import FilterModal from "./components/FilterModal";
import { Creator } from "./components/CreatorsList";
import { Video } from "./types/video";
import { UserList } from "./types/list";
import EditListModal from "./components/EditListModal";
import LoadingFooter from "./components/LoadingFooter";
import ListPills from "./components/ListPills";
import ExpandableSearchBar from "./components/ExpandableSearchBar";
import { formatViews, formatDuration, timeAgo } from "./utils/format";

import { API_BASE_URL } from "@/app/utils/constants";

export default function Home() {
  // Navigation & Filtering States
  const [topSearchQuery, setTopSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Lists States
  const [lists, setLists] = useState<UserList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("all");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isEditListModalOpen, setIsEditListModalOpen] = useState(false);

  // Configuration Filter States (Syncs to FilterModal)
  const [platform, setPlatformState] = useState("YouTube");
  const [timeRange, setTimeRangeState] = useState("all");
  const [minOutlier, setMinOutlierState] = useState(1.5);
  const [sortBy, setSortByState] = useState("outlierScore");
  const [excludeShorts, setExcludeShortsState] = useState(false);
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

  const setExcludeShorts = (val: boolean) => {
    setExcludeShortsState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("discover_excludeShorts", val.toString());
    }
  };

  // Load saved filters on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPlatform = localStorage.getItem("discover_platform");
      const savedTimeRange = localStorage.getItem("discover_timeRange");
      const savedMinOutlier = localStorage.getItem("discover_minOutlier");
      const savedSortBy = localStorage.getItem("discover_sortBy");
      const savedExcludeShorts = localStorage.getItem("discover_excludeShorts");

      if (savedPlatform) setPlatformState(savedPlatform);
      if (savedTimeRange) setTimeRangeState(savedTimeRange);
      if (savedMinOutlier) {
        const parsed = parseFloat(savedMinOutlier);
        if (!isNaN(parsed)) setMinOutlierState(parsed);
      }
      if (savedSortBy) setSortByState(savedSortBy);
      if (savedExcludeShorts) setExcludeShortsState(savedExcludeShorts === "true");
    }
    setIsFiltersLoaded(true);
    fetchLists();
    fetchCreators();
  }, []);

  // Outliers Fetching States
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Creators cache state (used strictly for displaying ListPills names)
  const [creators, setCreators] = useState<Creator[]>([]);

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

  // Fetch cached creators from backend API for ListPills reference
  async function fetchCreators() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/cached-creators`);
      if (response.ok) {
        const data = await response.json();
        setCreators(data);
      }
    } catch (err) {
      console.error("Fetch creators error:", err);
    }
  }

  // Fetch Outliers from Backend
  async function fetchOutliers(pageToFetch: number, isReset: boolean) {
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
  }

  // Fetch customized lists from backend API
  async function fetchLists() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/lists`);
      if (response.ok) {
        const data = await response.json();
        setLists(data);
      }
    } catch (err) {
      console.error("Failed to fetch lists:", err);
    }
  }

  // Delete list
  const handleDeleteList = async (listId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/youtube/lists/${listId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      if (selectedListId === listId) {
        setSelectedListId("all");
      }
      setLists((prev) => prev.filter((l) => l.id !== listId));
    } else {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || "Failed to delete list.");
    }
  };

  // Update list name and channels
  const handleUpdateList = async (listId: string, name: string, channelIds: string[]) => {
    const response = await fetch(`${API_BASE_URL}/api/youtube/lists/${listId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, channels: channelIds }),
    });
    if (response.ok) {
      const updatedList = await response.json();
      setLists((prev) => prev.map((l) => (l.id === listId ? updatedList : l)));
    } else {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || "Failed to update list.");
    }
  };

  // Trigger reset & load page 1 when active tab, search, or configuration changes
  useEffect(() => {
    if (!isFiltersLoaded) return;
    fetchOutliers(1, true);
  }, [debouncedSearchQuery, minOutlier, timeRange, sortBy, excludeShorts, selectedListId, isFiltersLoaded]);

  // Infinite Scroll Trigger via Intersection Observer
  useEffect(() => {
    if (!isFiltersLoaded || !hasMore || isLoading) return;

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
  }, [hasMore, isLoading, page, debouncedSearchQuery, minOutlier, timeRange, sortBy, excludeShorts, selectedListId, isFiltersLoaded]);

  // Reset all filters to default
  const handleResetFilters = () => {
    setSearchQuery("");
    setPlatform("YouTube");
    setTimeRange("all");
    setMinOutlier(1.5);
    setSortBy("outlierScore");
    setExcludeShorts(false);
    setSelectedListId("all");
  };

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 min-h-screen flex flex-col">
      {/* Search Input Bar (Top Section) */}
      <SearchBar
        searchQuery={topSearchQuery}
        setSearchQuery={setTopSearchQuery}
        onOpenFilters={() => setIsFilterModalOpen(true)}
        activePlatform={platform}
        activeTimeRange={timeRange}
        activeMinOutlier={minOutlier}
        activeExcludeShorts={excludeShorts}
      />

      {/* Tab Horizontal Navigation (Discover, Channels, Thumbnail Preview) */}
      <TabNavigation activeTab="discover" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {error ? (
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
            {/* List Selection Pill Tags and Mini Search Bar for Discover tab */}
            <div className="mb-6 mt-4 border-b border-border-subtle/50 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex-1 min-w-0">
                {creators.length > 0 && (
                  <ListPills
                    lists={lists}
                    selectedListId={selectedListId}
                    onSelectListId={setSelectedListId}
                    creators={creators}
                    onManageListClick={() => setIsEditListModalOpen(true)}
                  />
                )}
              </div>
              <div className="shrink-0 self-end sm:self-auto">
                <ExpandableSearchBar
                  query={searchQuery}
                  setQuery={setSearchQuery}
                  placeholder="Search videos or creators..."
                  title="Search videos"
                  ariaLabel="Search videos"
                />
              </div>
            </div>

            <VideoGrid videos={videos} onResetFilters={handleResetFilters} />

            <LoadingFooter hasMore={hasMore} isLoading={isLoading} />
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
        excludeShorts={excludeShorts}
        setExcludeShorts={setExcludeShorts}
      />

      {/* Edit List Modal Overlay */}
      <EditListModal
        isOpen={isEditListModalOpen}
        onClose={() => setIsEditListModalOpen(false)}
        list={lists.find((l) => l.id === selectedListId) || null}
        allCreators={creators}
        onUpdateList={handleUpdateList}
        onDeleteList={handleDeleteList}
      />
    </div>
  );
}
