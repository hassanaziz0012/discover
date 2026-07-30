import React from "react";
import { Video } from "@/app/types/video";
import DesktopGridLayout from "./youtube-simulator/DesktopGridLayout";
import SearchPageLayout from "./youtube-simulator/SearchPageLayout";
import DesktopListLayout from "./youtube-simulator/DesktopListLayout";
import MobileLayout from "./youtube-simulator/MobileLayout";

export interface YouTubeSimulatorProps {
  previewLayout: "desktop-grid" | "search-page" | "desktop-list" | "mobile";
  previewTheme: "dark" | "light";
  videos: Video[];
  customImageSrc: string | null;
  isLoading?: boolean;
  searchQuery?: string;
}

export default function YouTubeSimulator({
  previewLayout,
  previewTheme,
  videos,
  customImageSrc,
  isLoading,
  searchQuery,
}: YouTubeSimulatorProps) {
  // Hardcoded filter: Shorts do not have traditional thumbnails, so NEVER render YouTube Shorts in thumbnail preview simulator
  const filteredVideos = React.useMemo(() => {
    return videos.filter((vid) => {
      if (vid.isShort) return false;
      if (vid.youtubeUrl && vid.youtubeUrl.includes("/shorts/")) return false;
      if (vid.duration) {
        const parts = vid.duration.split(":").map((p) => parseInt(p, 10));
        if (parts.length === 2 && parts[0] === 0 && !isNaN(parts[1]) && parts[1] <= 60) {
          return false;
        }
      }
      return true;
    });
  }, [videos]);

  return (
    <div
      className={`p-6 rounded-xl shadow-sm flex flex-col items-center justify-start min-h-[380px] w-full transition-all duration-200 border relative ${
        previewTheme === "dark"
          ? "bg-[#0f0f0f] border-zinc-800 text-white"
          : "bg-white border-zinc-200 text-black"
      }`}
    >
      {/* Loading Overlay Badge */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-xl z-20 flex flex-col items-center justify-center gap-3 animate-fade-in">
          <div className="flex items-center gap-3 bg-surface border border-border-subtle px-4.5 py-3 rounded-full shadow-lg">
            <svg className="animate-spin w-5 h-5 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span className="text-xs font-bold text-primary">
              {searchQuery ? `Searching outliers for "${searchQuery}"...` : "Updating outliers feed..."}
            </span>
          </div>
        </div>
      )}
      {/* Desktop Grid (Monitor Home) */}
      {previewLayout === "desktop-grid" && (
        <DesktopGridLayout
          videos={filteredVideos}
          previewTheme={previewTheme}
          customImageSrc={customImageSrc}
        />
      )}

      {/* Search Page Result View */}
      {previewLayout === "search-page" && (
        <SearchPageLayout
          videos={filteredVideos}
          previewTheme={previewTheme}
          customImageSrc={customImageSrc}
        />
      )}

      {/* Sidebar List (Related Videos) */}
      {previewLayout === "desktop-list" && (
        <DesktopListLayout
          videos={filteredVideos}
          previewTheme={previewTheme}
          customImageSrc={customImageSrc}
        />
      )}

      {/* Mobile Feed inside phone border mockup */}
      {previewLayout === "mobile" && (
        <MobileLayout
          videos={filteredVideos}
          previewTheme={previewTheme}
          customImageSrc={customImageSrc}
        />
      )}

      {/* Scroll sentinel for browser-level infinite scroll layouts */}
      {previewLayout !== "mobile" && (
        <div id="scroll-sentinel" className="h-4 w-full mt-4" />
      )}
    </div>
  );
}
