import React from "react";
import { VideoDetailsFormProps } from "./types";

export default function VideoDetailsForm({
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
  lastFetchedTitleRef,
  fetchSuggestedTitles,
}: VideoDetailsFormProps) {
  return (
    <div className="flex flex-col gap-4 border-t border-border-subtle/30 pt-4 mt-2">
      <span className="text-xs font-bold text-primary uppercase tracking-wider">Video Details</span>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">
          Video Title ({videoTitle.length} chars)
        </label>
        <textarea
          rows={2}
          value={videoTitle}
          onChange={(e) => setVideoTitle(e.target.value)}
          onBlur={() => {
            const trimmed = videoTitle.trim();
            if (trimmed && trimmed !== lastFetchedTitleRef.current) {
              fetchSuggestedTitles(trimmed);
            }
          }}
          className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors duration-150 resize-none"
          placeholder="Enter video title..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">Video Length</label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors"
            placeholder="e.g. 14:20"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">Views Display</label>
          <input
            type="text"
            value={views}
            onChange={(e) => setViews(e.target.value)}
            className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors"
            placeholder="e.g. 124K views"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">Upload Time ago</label>
          <input
            type="text"
            value={relativeTime}
            onChange={(e) => setRelativeTime(e.target.value)}
            className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors"
            placeholder="e.g. 2 days ago"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">Outlier Score (x)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={outlierScore}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setOutlierScore(isNaN(val) ? 0 : val);
            }}
            className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors"
            placeholder="e.g. 2.5"
          />
        </div>
      </div>
    </div>
  );
}
