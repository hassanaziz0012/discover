import React from "react";
import { UserList } from "@/app/types/list";
import { Creator } from "@/app/components/CreatorsList";
import { useTitleSuggestions } from "./customizer-sidebar/hooks/useTitleSuggestions";
import ViewModeTabs from "./customizer-sidebar/ViewModeTabs";
import LayoutSelector from "./customizer-sidebar/LayoutSelector";
import ChannelListPills from "./customizer-sidebar/ChannelListPills";
import OutlierSearchSection from "./customizer-sidebar/OutlierSearchSection";
import SidebarActionGrid from "./customizer-sidebar/SidebarActionGrid";
import VideoDetailsForm from "./customizer-sidebar/VideoDetailsForm";
import ImageUploadSection from "./customizer-sidebar/ImageUploadSection";
import ChannelSyncForm from "./customizer-sidebar/ChannelSyncForm";

export interface CustomizerSidebarProps {
  viewMode: "youtube" | "size";
  setViewMode: (mode: "youtube" | "size") => void;
  previewLayout: "desktop-grid" | "search-page" | "desktop-list" | "mobile";
  setPreviewLayout: (layout: "desktop-grid" | "search-page" | "desktop-list" | "mobile") => void;
  previewTheme: "dark" | "light";
  setPreviewTheme: React.Dispatch<React.SetStateAction<"dark" | "light">>;
  outlierSearchQuery: string;
  setOutlierSearchQuery: (query: string) => void;
  isSearchingOutliers?: boolean;
  videoTitle: string;
  setVideoTitle: (title: string) => void;
  duration: string;
  setDuration: (duration: string) => void;
  views: string;
  setViews: (views: string) => void;
  relativeTime: string;
  setRelativeTime: (time: string) => void;
  outlierScore: number;
  setOutlierScore: (score: number) => void;
  customImageSrc: string | null;
  setCustomImageSrc: (src: string | null) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  channelName: string;
  setChannelName: (name: string) => void;
  channelUrl: string;
  setChannelUrl: (url: string) => void;
  profilePicture: string;
  setProfilePicture: (pic: string) => void;
  dbSaving: boolean;
  dbSaveSuccess: boolean;
  handleSaveChannelToDb: () => Promise<void>;
  handleShuffleInputs: () => void;
  handleResetFields: () => void;
  onCollapse: () => void;
  lists: UserList[];
  selectedListId: string;
  setSelectedListId: (id: string) => void;
  creators: Creator[];
}

export default function CustomizerSidebar({
  viewMode,
  setViewMode,
  previewLayout,
  setPreviewLayout,
  previewTheme,
  setPreviewTheme,
  outlierSearchQuery,
  setOutlierSearchQuery,
  isSearchingOutliers,
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
  handleImageUpload,
  channelName,
  setChannelName,
  channelUrl,
  setChannelUrl,
  profilePicture,
  setProfilePicture,
  dbSaving,
  dbSaveSuccess,
  handleSaveChannelToDb,
  handleShuffleInputs,
  handleResetFields,
  onCollapse,
  lists,
  selectedListId,
  setSelectedListId,
  creators,
}: CustomizerSidebarProps) {
  const {
    suggestedTitles,
    isSuggesting,
    suggestError,
    fetchSuggestedTitles,
    lastFetchedTitleRef,
  } = useTitleSuggestions(videoTitle, channelName);

  return (
    <section className="lg:col-span-3 flex flex-col gap-6 bg-surface border border-border-subtle p-6 rounded-xl shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary mb-1">Preview Customizer</h2>
          <p className="text-secondary text-sm">Configure layouts, themes, metadata, and channel details.</p>
        </div>
        <button
          onClick={onCollapse}
          title="Collapse Sidebar"
          className="p-1.5 hover:bg-surface-raised active:scale-[0.95] rounded-lg border border-border-subtle/30 text-secondary hover:text-primary transition-all cursor-pointer flex-shrink-0"
        >
          <svg className="w-5 h-5 text-secondary hover:text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <path d="M15 15l-3-3 3-3" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-5">
        <ViewModeTabs viewMode={viewMode} setViewMode={setViewMode} />

        <LayoutSelector
          previewLayout={previewLayout}
          setPreviewLayout={setPreviewLayout}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        <ChannelListPills
          lists={lists}
          creators={creators}
          selectedListId={selectedListId}
          setSelectedListId={setSelectedListId}
        />

        <OutlierSearchSection
          outlierSearchQuery={outlierSearchQuery}
          setOutlierSearchQuery={setOutlierSearchQuery}
          suggestedTitles={suggestedTitles}
          isSuggesting={isSuggesting}
          suggestError={suggestError}
          onRefreshSuggestedTitles={() => fetchSuggestedTitles()}
          isSearchingOutliers={isSearchingOutliers}
        />

        <SidebarActionGrid
          previewTheme={previewTheme}
          setPreviewTheme={setPreviewTheme}
          handleShuffleInputs={handleShuffleInputs}
          handleResetFields={handleResetFields}
        />

        <VideoDetailsForm
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
          lastFetchedTitleRef={lastFetchedTitleRef}
          fetchSuggestedTitles={fetchSuggestedTitles}
        />

        <ImageUploadSection
          customImageSrc={customImageSrc}
          setCustomImageSrc={setCustomImageSrc}
          handleImageUpload={handleImageUpload}
        />

        <ChannelSyncForm
          channelName={channelName}
          setChannelName={setChannelName}
          channelUrl={channelUrl}
          setChannelUrl={setChannelUrl}
          profilePicture={profilePicture}
          setProfilePicture={setProfilePicture}
          dbSaving={dbSaving}
          dbSaveSuccess={dbSaveSuccess}
          handleSaveChannelToDb={handleSaveChannelToDb}
        />
      </div>
    </section>
  );
}
