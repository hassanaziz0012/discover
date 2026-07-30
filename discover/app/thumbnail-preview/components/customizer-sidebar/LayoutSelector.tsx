import React from "react";
import { LayoutSelectorProps } from "./types";

export default function LayoutSelector({
  previewLayout,
  setPreviewLayout,
  viewMode,
  setViewMode,
}: LayoutSelectorProps) {
  return (
    <div className="flex items-center justify-around bg-bg p-2 rounded-full border border-border-subtle/30">
      {/* Desktop Grid */}
      <button
        onClick={() => {
          setPreviewLayout("desktop-grid");
          setViewMode("youtube");
        }}
        title="Desktop Page"
        className={`p-2.5 rounded-full transition-all duration-150 cursor-pointer ${
          previewLayout === "desktop-grid" && viewMode === "youtube"
            ? "bg-[#8B5CF6] text-white shadow-sm"
            : "text-secondary hover:text-primary"
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </button>

      {/* Search Page */}
      <button
        onClick={() => {
          setPreviewLayout("search-page");
          setViewMode("youtube");
        }}
        title="Search Page"
        className={`p-2.5 rounded-full transition-all duration-150 cursor-pointer ${
          previewLayout === "search-page" && viewMode === "youtube"
            ? "bg-[#8B5CF6] text-white shadow-sm"
            : "text-secondary hover:text-primary"
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {/* Sidebar List */}
      <button
        onClick={() => {
          setPreviewLayout("desktop-list");
          setViewMode("youtube");
        }}
        title="Sidebar Page"
        className={`p-2.5 rounded-full transition-all duration-150 cursor-pointer ${
          previewLayout === "desktop-list" && viewMode === "youtube"
            ? "bg-[#8B5CF6] text-white shadow-sm"
            : "text-secondary hover:text-primary"
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      </button>

      {/* Mobile Page */}
      <button
        onClick={() => {
          setPreviewLayout("mobile");
          setViewMode("youtube");
        }}
        title="Mobile Page"
        className={`p-2.5 rounded-full transition-all duration-150 cursor-pointer ${
          previewLayout === "mobile" && viewMode === "youtube"
            ? "bg-[#8B5CF6] text-white shadow-sm"
            : "text-secondary hover:text-primary"
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12" y2="18.01" />
        </svg>
      </button>
    </div>
  );
}
