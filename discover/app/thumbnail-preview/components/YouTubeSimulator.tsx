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
}

export default function YouTubeSimulator({
  previewLayout,
  previewTheme,
  videos,
  customImageSrc,
}: YouTubeSimulatorProps) {
  return (
    <div
      className={`p-6 rounded-xl shadow-sm flex flex-col items-center justify-start min-h-[380px] w-full transition-all duration-200 border ${
        previewTheme === "dark"
          ? "bg-[#0f0f0f] border-zinc-800 text-white"
          : "bg-white border-zinc-200 text-black"
      }`}
    >
      {/* Desktop Grid (Monitor Home) */}
      {previewLayout === "desktop-grid" && (
        <DesktopGridLayout
          videos={videos}
          previewTheme={previewTheme}
          customImageSrc={customImageSrc}
        />
      )}

      {/* Search Page Result View */}
      {previewLayout === "search-page" && (
        <SearchPageLayout
          videos={videos}
          previewTheme={previewTheme}
          customImageSrc={customImageSrc}
        />
      )}

      {/* Sidebar List (Related Videos) */}
      {previewLayout === "desktop-list" && (
        <DesktopListLayout
          videos={videos}
          previewTheme={previewTheme}
          customImageSrc={customImageSrc}
        />
      )}

      {/* Mobile Feed inside phone border mockup */}
      {previewLayout === "mobile" && (
        <MobileLayout
          videos={videos}
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
