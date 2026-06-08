"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import TabNavigation from "./components/TabNavigation";
import SearchBar from "./components/SearchBar";
import VideoGrid from "./components/VideoGrid";
import FilterModal from "./components/FilterModal";
import CreatorsList, { Creator } from "./components/CreatorsList";
import { Video } from "./types/video";
import { UserList } from "./types/list";
import ManageListsModal from "./components/ManageListsModal";
import EditListModal from "./components/EditListModal";
import RefreshReportModal, { RefreshReport } from "./components/RefreshReportModal";
import CreatorsHeader from "./components/CreatorsHeader";
import LoadingFooter from "./components/LoadingFooter";
import ListPills from "./components/ListPills";
import { formatViews, formatDuration, timeAgo } from "./utils/format";

const API_BASE_URL = "http://localhost:8000";

export default function Home() {
  // Navigation & Filtering States
  const [activeTab, setActiveTab] = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");

  // Lists States
  const [lists, setLists] = useState<UserList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("all");
  const [activeManageListCreator, setActiveManageListCreator] = useState<Creator | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isEditListModalOpen, setIsEditListModalOpen] = useState(false);

  // Configuration Filter States (Syncs to FilterModal)
  const [platform, setPlatformState] = useState("YouTube");
  const [timeRange, setTimeRangeState] = useState("all");
  const [minOutlier, setMinOutlierState] = useState(1.5); // updated default to be 1.5x
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

  const [creatorsLayout, setCreatorsLayoutState] = useState<"list" | "grid">("list");

  const setCreatorsLayout = (val: "list" | "grid") => {
    setCreatorsLayoutState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("discover_creatorsLayout", val);
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
      const savedCreatorsLayout = localStorage.getItem("discover_creatorsLayout");

      if (savedPlatform) setPlatformState(savedPlatform);
      if (savedTimeRange) setTimeRangeState(savedTimeRange);
      if (savedMinOutlier) {
        const parsed = parseFloat(savedMinOutlier);
        if (!isNaN(parsed)) setMinOutlierState(parsed);
      }
      if (savedSortBy) setSortByState(savedSortBy);
      if (savedExcludeShorts) setExcludeShortsState(savedExcludeShorts === "true");
      if (savedCreatorsLayout === "list" || savedCreatorsLayout === "grid") {
        setCreatorsLayoutState(savedCreatorsLayout);
      }
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
  async function fetchCreators() {
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
  }

  // Refresh Creators States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(false);
  const [refreshReport, setRefreshReport] = useState<RefreshReport | null>(null);

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
        setRefreshReport({
          message: data.message || "Successfully refreshed all channels.",
          refreshed: data.refreshed || [],
          errors: data.errors || [],
        });
        setIsRefreshModalOpen(true);
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

  // Create new list in backend
  const handleCreateList = async (name: string) => {
    const response = await fetch(`${API_BASE_URL}/api/youtube/lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.ok) {
      const newList = await response.json();
      setLists((prev) => [...prev, newList]);
    } else {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || "Failed to create list.");
    }
  };

  // Toggle channel in list (Add/Remove)
  const handleToggleListChannel = async (listId: string, channelId: string, isChecked: boolean) => {
    let response;
    if (isChecked) {
      response = await fetch(`${API_BASE_URL}/api/youtube/lists/${listId}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: channelId }),
      });
    } else {
      response = await fetch(`${API_BASE_URL}/api/youtube/lists/${listId}/channels/${channelId}`, {
        method: "DELETE",
      });
    }

    if (response.ok) {
      fetchLists();
    } else {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || "Failed to update list membership.");
    }
  };

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
    if (!isFiltersLoaded) return; // Wait until filters are loaded from localStorage

    if (activeTab === "discover") {
      fetchOutliers(1, true);
    } else if (activeTab === "creators") {
      if (creators.length === 0) {
        fetchCreators();
      }
      fetchLists();
    }
  }, [activeTab, debouncedSearchQuery, minOutlier, timeRange, sortBy, excludeShorts, selectedListId, isFiltersLoaded]);

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
  }, [hasMore, isLoading, page, activeTab, debouncedSearchQuery, minOutlier, timeRange, sortBy, excludeShorts, selectedListId, isFiltersLoaded]);

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

  // High-fidelity search filter for cached creators
  const filteredCreators = useMemo(() => {
    if (!searchQuery.trim()) return creators;
    const q = searchQuery.toLowerCase().trim();
    return creators.filter(
      (c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)
    );
  }, [creators, searchQuery]);

  // Filter creators by selected list tag pill
  const displayedCreators = useMemo(() => {
    if (selectedListId === "all") return filteredCreators;
    const activeList = lists.find((l) => l.id === selectedListId);
    if (!activeList) return [];
    return filteredCreators.filter((c) => activeList.channels.includes(c.channel_id));
  }, [filteredCreators, selectedListId, lists]);

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
        activeExcludeShorts={excludeShorts}
      />

      {/* Tab Horizontal Navigation (Discover, Creators, My Lists) */}
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {activeTab === "creators" ? (
          <>
            {creators.length > 0 && !creatorsLoading && (
              <CreatorsHeader
                creatorsLayout={creatorsLayout}
                setCreatorsLayout={setCreatorsLayout}
                isRefreshing={isRefreshing}
                onRefresh={handleRefreshCreators}
                refreshStatus={refreshStatus}
                setRefreshStatus={setRefreshStatus}
              >
                {/* List Selection Pill Tags */}
                {!creatorsError && (
                  <ListPills
                    lists={lists}
                    selectedListId={selectedListId}
                    onSelectListId={setSelectedListId}
                    creators={creators}
                    onManageListClick={() => setIsEditListModalOpen(true)}
                  />
                )}
              </CreatorsHeader>
            )}

            <CreatorsList
              creators={displayedCreators}
              isLoading={creatorsLoading}
              error={creatorsError}
              onRetry={fetchCreators}
              layout={creatorsLayout}
              onManageLists={setActiveManageListCreator}
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
            {/* List Selection Pill Tags for Discover tab */}
            {creators.length > 0 && (
              <div className="mb-6 mt-4 border-b border-border-subtle/50 pb-4">
                <ListPills
                  lists={lists}
                  selectedListId={selectedListId}
                  onSelectListId={setSelectedListId}
                  creators={creators}
                  onManageListClick={() => setIsEditListModalOpen(true)}
                />
              </div>
            )}

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

      {/* Refresh Report Modal */}
      <RefreshReportModal
        isOpen={isRefreshModalOpen}
        onClose={() => setIsRefreshModalOpen(false)}
        report={refreshReport}
      />

      {/* Manage Lists Modal Overlay */}
      <ManageListsModal
        isOpen={activeManageListCreator !== null}
        onClose={() => setActiveManageListCreator(null)}
        creator={activeManageListCreator}
        lists={lists}
        onToggleList={handleToggleListChannel}
        onCreateList={handleCreateList}
        onDeleteList={handleDeleteList}
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

