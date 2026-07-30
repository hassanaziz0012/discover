import React from "react";
import { SidebarActionGridProps } from "./types";

export default function SidebarActionGrid({
  previewTheme,
  setPreviewTheme,
  handleShuffleInputs,
  handleResetFields,
}: SidebarActionGridProps) {
  return (
    <div className="bg-bg p-4 rounded-xl border border-border-subtle/30 grid grid-cols-3 gap-3">
      {/* Theme toggle */}
      <button
        onClick={() => setPreviewTheme((prev) => (prev === "dark" ? "light" : "dark"))}
        className="flex items-center gap-2 justify-center py-2 px-3 bg-surface-raised hover:bg-surface-overlay active:scale-[0.98] border border-border-subtle/30 rounded-full text-xs font-bold text-primary transition-all cursor-pointer"
      >
        {previewTheme === "dark" ? (
          <>
            <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
            <span>Dark</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.22" x2="5.64" y2="17.78" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <span>Light</span>
          </>
        )}
      </button>

      {/* Shuffle button */}
      <button
        onClick={handleShuffleInputs}
        className="flex items-center gap-2 justify-center py-2 px-3 bg-surface-raised hover:bg-surface-overlay active:scale-[0.98] border border-border-subtle/30 rounded-full text-xs font-bold text-primary transition-all cursor-pointer"
      >
        <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
        <span>Shuffle</span>
      </button>

      {/* Reset button */}
      <button
        onClick={handleResetFields}
        className="flex items-center gap-2 justify-center py-2 px-3 bg-surface-raised hover:bg-surface-overlay active:scale-[0.98] border border-border-subtle/30 rounded-full text-xs font-bold text-primary transition-all cursor-pointer"
      >
        <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67" />
        </svg>
        <span>Reset</span>
      </button>
    </div>
  );
}
