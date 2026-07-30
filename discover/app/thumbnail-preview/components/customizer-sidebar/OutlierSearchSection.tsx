import React from "react";
import { OutlierSearchSectionProps } from "./types";

export default function OutlierSearchSection({
  outlierSearchQuery,
  setOutlierSearchQuery,
  suggestedTitles,
  isSuggesting,
  suggestError,
  onRefreshSuggestedTitles,
  isSearchingOutliers,
}: OutlierSearchSectionProps) {
  return (
    <div className="flex flex-col gap-2 border-t border-border-subtle/30 pt-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">Outliers Search Query</span>
        {outlierSearchQuery && (
          <button
            onClick={() => setOutlierSearchQuery("")}
            className="text-[#8B5CF6] hover:underline text-[10px] font-semibold cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
      <div className="relative flex items-center">
        <div className="absolute left-3 text-secondary pointer-events-none flex items-center">
          {isSearchingOutliers ? (
            <svg className="animate-spin w-3.5 h-3.5 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </div>
        <input
          type="text"
          value={outlierSearchQuery}
          onChange={(e) => setOutlierSearchQuery(e.target.value)}
          className="w-full text-xs bg-bg border border-border-subtle rounded-lg pl-8 pr-7 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors"
          placeholder="Search outliers (e.g. Coding, Gaming...)"
        />
        {outlierSearchQuery && (
          <button
            onClick={() => setOutlierSearchQuery("")}
            className="absolute right-2.5 text-secondary hover:text-primary text-xs font-bold p-0.5 cursor-pointer"
            title="Clear search query"
          >
            ✕
          </button>
        )}
      </div>
      <span className="text-[10px] text-secondary">
        Filter feed to only show outliers matching this topic or keyword.
      </span>

      {/* AI Suggested Titles Pills */}
      <div className="flex flex-col gap-2 mt-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            AI Suggested Topics
          </span>
          <button
            onClick={onRefreshSuggestedTitles}
            disabled={isSuggesting}
            title="Generate new AI search suggestions"
            className="text-[#8B5CF6] hover:text-[#7C3AED] text-[10px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <svg className={`w-3 h-3 ${isSuggesting ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67" />
            </svg>
            <span>{isSuggesting ? "Generating..." : "Refresh AI"}</span>
          </button>
        </div>

        {/* Loading Skeleton */}
        {isSuggesting && (
          <div className="flex flex-wrap gap-1.5 animate-pulse">
            <div className="h-6 w-20 bg-surface-raised rounded-full border border-border-subtle/40" />
            <div className="h-6 w-28 bg-surface-raised rounded-full border border-border-subtle/40" />
            <div className="h-6 w-24 bg-surface-raised rounded-full border border-border-subtle/40" />
          </div>
        )}

        {/* Error Message */}
        {suggestError && !isSuggesting && (
          <div className="text-[11px] text-error bg-error/10 border border-error/20 p-2 rounded-lg leading-tight">
            {suggestError}
          </div>
        )}

        {/* Suggested Pills */}
        {!isSuggesting && !suggestError && suggestedTitles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {suggestedTitles.map((title, idx) => {
              const isSelected = outlierSearchQuery.trim().toLowerCase() === title.trim().toLowerCase();
              return (
                <button
                  key={idx}
                  onClick={() => setOutlierSearchQuery(title)}
                  className={`py-1 px-2.5 rounded-full text-[11px] font-semibold border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-xs"
                      : "bg-surface border-border-subtle text-secondary hover:text-[#8B5CF6] hover:border-[#8B5CF6] hover:bg-surface-raised"
                  }`}
                >
                  {title}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
