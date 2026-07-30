import React from "react";
import { ViewModeTabsProps } from "./types";

export default function ViewModeTabs({ viewMode, setViewMode }: ViewModeTabsProps) {
  return (
    <div className="flex bg-bg p-1.5 rounded-full border border-border-subtle/30 w-full">
      <button
        onClick={() => setViewMode("youtube")}
        className={`flex-1 text-center py-2.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
          viewMode === "youtube"
            ? "bg-[#8B5CF6] text-white shadow-sm"
            : "text-secondary hover:text-primary"
        }`}
      >
        YouTube View
      </button>
      <button
        onClick={() => setViewMode("size")}
        className={`flex-1 text-center py-2.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
          viewMode === "size"
            ? "bg-[#8B5CF6] text-white shadow-sm"
            : "text-secondary hover:text-primary"
        }`}
      >
        Size View
      </button>
    </div>
  );
}
