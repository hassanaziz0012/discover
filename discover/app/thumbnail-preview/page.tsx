"use client";

import React, { useMemo, useState, useEffect } from "react";
import TabNavigation from "@/app/components/TabNavigation";
import SearchBar from "@/app/components/SearchBar";
import FilterModal from "@/app/components/FilterModal";
import CustomizerSidebar from "./components/CustomizerSidebar";
import YouTubeSimulator from "./components/YouTubeSimulator";
import SizeReadabilityGrid from "./components/SizeReadabilityGrid";
import { Video } from "@/app/types/video";
import { UserList } from "@/app/types/list";
import { Creator } from "@/app/components/CreatorsList";
import { API_BASE_URL } from "@/app/utils/constants";
import { useThumbnailFilters } from "./hooks/useThumbnailFilters";
import { useChannelCustomizer } from "./hooks/useChannelCustomizer";
import { useOutliersFeed } from "./hooks/useOutliersFeed";

export default function ThumbnailPreviewPage() {
  const {
    searchQuery,
    setSearchQuery,
    outlierSearchQuery,
    setOutlierSearchQuery,
    platform,
    setPlatform,
    timeRange,
    setTimeRange,
    minOutlier,
    setMinOutlier,
    sortBy,
    setSortBy,
    excludeShorts,
    setExcludeShorts,
    isFilterModalOpen,
    setIsFilterModalOpen,
    isFiltersLoaded,
  } = useThumbnailFilters();

  const [lists, setLists] = useState<UserList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("all");
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
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

    async function fetchCreators() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/youtube/cached-creators?page=1&limit=200`);
        if (response.ok) {
          const data = await response.json();
          setCreators(data.creators || (Array.isArray(data) ? data : []));
        }
      } catch (err) {
        console.error("Fetch creators error:", err);
      }
    }

    fetchLists();
    fetchCreators();
  }, []);

  const {
    viewMode,
    setViewMode,
    previewLayout,
    setPreviewLayout,
    previewTheme,
    setPreviewTheme,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    videoTitle,
    setVideoTitle,
    duration,
    setDuration,
    views,
    setViews,
    relativeTime,
    setRelativeTime,
    outlierScore,
    setOutlierScore,
    customImageSrc,
    setCustomImageSrc,
    channelName,
    setChannelName,
    channelUrl,
    setChannelUrl,
    profilePicture,
    setProfilePicture,
    dbSaving,
    dbSaveSuccess,
    handleImageUpload,
    handleSaveChannelToDb,
    resetCustomizerFields,
  } = useChannelCustomizer();

  const [searchSource, setSearchSource] = useState<"database" | "live">("database");

  // Custom Video Object
  const customVideo = useMemo<Video>(() => ({
    id: "custom-video-preview-id",
    title: videoTitle,
    creator: channelName,
    creatorAvatar: profilePicture || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(channelName)}`,
    views: views,
    viewsRaw: 0,
    publishedAt: relativeTime,
    publishedAtRaw: new Date(),
    duration: duration,
    outlierScore: outlierScore,
    thumbnailUrl: customImageSrc || "",
    category: "Custom",
    youtubeUrl: channelUrl || "https://youtube.com",
  }), [videoTitle, channelName, profilePicture, views, relativeTime, duration, customImageSrc, channelUrl, outlierScore]);

  const {
    displayVideos,
    isSearchingOutliers,
    error,
    handleShuffleInputs,
    resetFeed,
    retryFetch,
  } = useOutliersFeed({
    outlierSearchQuery,
    searchSource,
    platform,
    timeRange,
    minOutlier,
    sortBy,
    excludeShorts,
    isFiltersLoaded,
    viewMode,
    customVideo,
    selectedListId,
  });

  const handleResetFields = () => {
    setSearchQuery("");
    setOutlierSearchQuery("");
    resetCustomizerFields();
    resetFeed();
  };

  return (
    <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 min-h-screen flex flex-col pb-16">
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

      {/* Tab Horizontal Navigation (Discover, Channels, Thumbnail Preview) */}
      <TabNavigation activeTab="thumbnail-preview" />

      {/* Main Content Dashboard */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">

        {/* Left Settings Control Panel (Sidebar): 3 cols */}
        {!isSidebarCollapsed && (
          <CustomizerSidebar
            viewMode={viewMode}
            setViewMode={setViewMode}
            previewLayout={previewLayout}
            setPreviewLayout={setPreviewLayout}
            previewTheme={previewTheme}
            setPreviewTheme={setPreviewTheme}
            outlierSearchQuery={outlierSearchQuery}
            setOutlierSearchQuery={setOutlierSearchQuery}
            searchSource={searchSource}
            setSearchSource={setSearchSource}
            isSearchingOutliers={isSearchingOutliers}
            videoTitle={videoTitle}
            setVideoTitle={setVideoTitle}
            duration={duration}
            setDuration={setDuration}
            views={views}
            setViews={setViews}
            relativeTime={relativeTime}
            setRelativeTime={setRelativeTime}
            outlierScore={outlierScore}
            setOutlierScore={setOutlierScore}
            customImageSrc={customImageSrc}
            setCustomImageSrc={setCustomImageSrc}
            handleImageUpload={handleImageUpload}
            channelName={channelName}
            setChannelName={setChannelName}
            channelUrl={channelUrl}
            setChannelUrl={setChannelUrl}
            profilePicture={profilePicture}
            setProfilePicture={setProfilePicture}
            dbSaving={dbSaving}
            dbSaveSuccess={dbSaveSuccess}
            handleSaveChannelToDb={handleSaveChannelToDb}
            handleShuffleInputs={handleShuffleInputs}
            handleResetFields={handleResetFields}
            onCollapse={() => setIsSidebarCollapsed(true)}
            lists={lists}
            selectedListId={selectedListId}
            setSelectedListId={setSelectedListId}
            creators={creators}
          />
        )}

        {/* Right Preview Panel: 9 cols or 12 cols depending on sidebar state */}
        <section className={`${isSidebarCollapsed ? "lg:col-span-12" : "lg:col-span-9"} flex flex-col gap-6`}>
          {isSidebarCollapsed && (
            <div className="flex justify-between items-center bg-surface border border-border-subtle p-3.5 rounded-xl shadow-sm animate-scale-up">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  title="Expand Sidebar"
                  className="flex items-center gap-2 px-3.5 py-2 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#8B5CF6] hover:text-[#7C3AED] rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <path d="M12 9l3 3-3 3" />
                  </svg>
                  <span>Show Customizer Sidebar</span>
                </button>
                <span className="text-secondary text-xs font-medium">Sidebar is collapsed to maximize preview space.</span>
              </div>
            </div>
          )}
          {error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 bg-surface border border-error/15 rounded-lg shadow-sm animate-fade-in">
              <h3 className="text-xl font-bold text-error mb-2">Error Connecting to Backend</h3>
              <p className="text-secondary max-w-[440px] leading-relaxed mb-6">{error}</p>
              <button
                onClick={retryFetch}
                className="py-2 px-5 bg-brand text-on-brand rounded-md font-semibold shadow-sm hover:bg-brand-hover transition-all duration-150"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {viewMode === "youtube" && (
                <YouTubeSimulator
                  previewLayout={previewLayout}
                  previewTheme={previewTheme}
                  videos={displayVideos}
                  customImageSrc={customImageSrc}
                  isLoading={isSearchingOutliers}
                  searchQuery={outlierSearchQuery}
                />
              )}

              {viewMode === "size" && (
                <SizeReadabilityGrid
                  previewTheme={previewTheme}
                  customImageSrc={customImageSrc}
                  duration={duration}
                  videoTitle={videoTitle}
                  channelName={channelName}
                  profilePicture={profilePicture}
                  views={views}
                  relativeTime={relativeTime}
                />
              )}
            </>
          )}
        </section>

      </main>

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
    </div>
  );
}

