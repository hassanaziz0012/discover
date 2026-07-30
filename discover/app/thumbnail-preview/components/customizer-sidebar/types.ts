import React from "react";
import { UserList } from "@/app/types/list";
import { Creator } from "@/app/components/CreatorsList";

export interface ViewModeTabsProps {
  viewMode: "youtube" | "size";
  setViewMode: (mode: "youtube" | "size") => void;
}

export interface LayoutSelectorProps {
  previewLayout: "desktop-grid" | "search-page" | "desktop-list" | "mobile";
  setPreviewLayout: (layout: "desktop-grid" | "search-page" | "desktop-list" | "mobile") => void;
  viewMode: "youtube" | "size";
  setViewMode: (mode: "youtube" | "size") => void;
}

export interface ChannelListPillsProps {
  lists: UserList[];
  creators: Creator[];
  selectedListId: string;
  setSelectedListId: (id: string) => void;
}

export interface OutlierSearchSectionProps {
  outlierSearchQuery: string;
  setOutlierSearchQuery: (query: string) => void;
  searchSource: "database" | "live";
  setSearchSource: (source: "database" | "live") => void;
  suggestedTitles: string[];
  isSuggesting: boolean;
  suggestError: string | null;
  onRefreshSuggestedTitles: () => void;
  isSearchingOutliers?: boolean;
}

export interface SidebarActionGridProps {
  previewTheme: "dark" | "light";
  setPreviewTheme: React.Dispatch<React.SetStateAction<"dark" | "light">>;
  handleShuffleInputs: () => void;
  handleResetFields: () => void;
}

export interface VideoDetailsFormProps {
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
  lastFetchedTitleRef: React.MutableRefObject<string>;
  fetchSuggestedTitles: (titleToUse?: string) => void;
}

export interface ImageUploadSectionProps {
  customImageSrc: string | null;
  setCustomImageSrc: (src: string | null) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface ChannelSyncFormProps {
  channelName: string;
  setChannelName: (name: string) => void;
  channelUrl: string;
  setChannelUrl: (url: string) => void;
  profilePicture: string;
  setProfilePicture: (pic: string) => void;
  dbSaving: boolean;
  dbSaveSuccess: boolean;
  handleSaveChannelToDb: () => Promise<void>;
}
