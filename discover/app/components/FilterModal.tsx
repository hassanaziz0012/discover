"use client";

import React, { useState, useEffect } from "react";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  setPlatform: (p: string) => void;
  timeRange: string;
  setTimeRange: (t: string) => void;
  minOutlier: number;
  setMinOutlier: (m: number) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  excludeShorts: boolean;
  setExcludeShorts: (e: boolean) => void;
}

export default function FilterModal({
  isOpen,
  onClose,
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
}: FilterModalProps) {
  // Local state so changes only apply on hitting 'Save'
  const [localPlatform, setLocalPlatform] = useState(platform);
  const [localTimeRange, setLocalTimeRange] = useState(timeRange);
  const [localMinOutlier, setLocalMinOutlier] = useState(minOutlier);
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localExcludeShorts, setLocalExcludeShorts] = useState(excludeShorts);

  // Sync state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setLocalPlatform(platform);
      setLocalTimeRange(timeRange);
      setLocalMinOutlier(minOutlier);
      setLocalSortBy(sortBy);
      setLocalExcludeShorts(excludeShorts);
    }
  }, [isOpen, platform, timeRange, minOutlier, sortBy, excludeShorts]);

  if (!isOpen) return null;

  const handleSave = () => {
    setPlatform(localPlatform);
    setTimeRange(localTimeRange);
    setMinOutlier(localMinOutlier);
    setSortBy(localSortBy);
    setExcludeShorts(localExcludeShorts);
    onClose();
  };

  const timeOptions = [
    { value: "all", label: "All time" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "3months", label: "3 Months" },
    { value: "6months", label: "6 Months" },
  ];

  const outlierOptions = [0, 1.5, 2, 5, 10, 20, 50];

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-surface border border-border rounded-lg w-full max-w-[480px] shadow-lg overflow-hidden animate-scale-up flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between py-5 px-6 border-b border-border-subtle">
          <h2 className="text-xl font-bold text-primary tracking-[-0.01em]">Search Configuration</h2>
          <button id="btn-close-modal-x" onClick={onClose} className="flex items-center justify-center text-secondary rounded-full w-8 h-8 transition-all duration-150 hover:bg-surface-raised hover:text-primary" aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Section: Platform */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[0.85rem] font-semibold text-primary uppercase tracking-[0.05em]">Content Platform</label>
            <div className="relative w-full after:content-[''] after:absolute after:right-4 after:top-1/2 after:-translate-y-1/2 after:w-0 after:h-0 after:border-l-[5px] after:border-l-transparent after:border-r-[5px] after:border-r-transparent after:border-t-[6px] after:border-t-secondary after:pointer-events-none after:opacity-80">
              <select
                id="select-filter-platform"
                value={localPlatform}
                onChange={(e) => setLocalPlatform(e.target.value)}
                className="w-full bg-surface-raised border-[1.5px] border-border-subtle rounded-md py-3 px-4 pr-10 text-[0.95rem] text-primary appearance-none cursor-pointer transition-all duration-150 focus:border-brand focus:bg-surface outline-none"
              >
                <option value="YouTube">YouTube Videos</option>
                <option value="TikTok" disabled>TikTok (Coming Soon)</option>
                <option value="Instagram" disabled>Instagram Reels (Coming Soon)</option>
              </select>
            </div>
          </div>

          {/* Section: Time Cutoff */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[0.85rem] font-semibold text-primary uppercase tracking-[0.05em]">Publish Time Range</label>
            <div className="flex flex-wrap gap-2">
              {timeOptions.map((opt) => (
                <button
                  key={opt.value}
                  id={`btn-time-opt-${opt.value}`}
                  onClick={() => setLocalTimeRange(opt.value)}
                  className={`py-2 px-4 border rounded-sm text-[0.85rem] font-medium transition-all duration-150 ${
                    localTimeRange === opt.value
                      ? "bg-brand text-on-brand border-brand hover:bg-brand-hover"
                      : "bg-surface-raised border-border-subtle text-secondary hover:bg-surface-overlay hover:text-primary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Outlier Multiplier */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[0.85rem] font-semibold text-primary uppercase tracking-[0.05em]">
              Minimum Outlier Multiplier: <span className="text-brand font-bold">{localMinOutlier}x</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {outlierOptions.map((val) => (
                <button
                  key={val}
                  id={`btn-outlier-opt-${val}`}
                  onClick={() => setLocalMinOutlier(val)}
                  className={`py-2 px-4 border rounded-sm text-[0.85rem] font-medium transition-all duration-150 ${
                    localMinOutlier === val
                      ? "bg-brand text-on-brand border-brand hover:bg-brand-hover"
                      : "bg-surface-raised border-border-subtle text-secondary hover:bg-surface-overlay hover:text-primary"
                  }`}
                >
                  {val}x
                </button>
              ))}
            </div>
            <p className="text-[0.75rem] text-secondary leading-[1.4]">
              Filters videos whose performance is at least {localMinOutlier}x above channel averages.
            </p>
          </div>

          {/* Section: Hide YouTube Shorts Toggle */}
          <div className="flex items-center justify-between p-4 bg-surface-raised rounded-md border border-border-subtle hover:bg-surface-overlay transition-all duration-150">
            <div className="flex flex-col gap-1 pr-4">
              <label className="text-[0.92rem] font-bold text-primary cursor-pointer select-none" htmlFor="checkbox-exclude-shorts">
                Hide YouTube Shorts
              </label>
              <p className="text-[0.75rem] text-secondary leading-[1.4]">
                Filter out short vertical videos (YouTube Shorts) from the Discover feed.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="checkbox-exclude-shorts"
                checked={localExcludeShorts}
                onChange={(e) => setLocalExcludeShorts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-overlay border border-border-subtle rounded-full peer peer-focus:ring-2 peer-focus:ring-brand-subtle peer-checked:bg-brand peer-checked:border-brand after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-on-brand peer-checked:after:border-brand cursor-pointer"></div>
            </label>
          </div>

          {/* Section: Sorting */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[0.85rem] font-semibold text-primary uppercase tracking-[0.05em]">Sort By</label>
            <div className="relative w-full after:content-[''] after:absolute after:right-4 after:top-1/2 after:-translate-y-1/2 after:w-0 after:h-0 after:border-l-[5px] after:border-l-transparent after:border-r-[5px] after:border-r-transparent after:border-t-[6px] after:border-t-secondary after:pointer-events-none after:opacity-80">
              <select
                id="select-filter-sort"
                value={localSortBy}
                onChange={(e) => setLocalSortBy(e.target.value)}
                className="w-full bg-surface-raised border-[1.5px] border-border-subtle rounded-md py-3 px-4 pr-10 text-[0.95rem] text-primary appearance-none cursor-pointer transition-all duration-150 focus:border-brand focus:bg-surface outline-none"
              >
                <option value="outlierScore">Highest Outlier Score (Multiplier)</option>
                <option value="views">Most Viewed Videos</option>
                <option value="newest">Recently Uploaded</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 py-5 px-6 border-t border-border-subtle bg-surface-raised">
          <button id="btn-cancel-filter-modal" onClick={onClose} className="py-2.5 px-5 rounded-md text-[0.9rem] font-semibold text-secondary transition-all duration-150 hover:bg-surface-overlay hover:text-primary">
            Cancel
          </button>
          <button id="btn-save-filter-modal" onClick={handleSave} className="py-2.5 px-6 rounded-md text-[0.9rem] font-semibold bg-brand text-on-brand shadow-sm transition-all duration-150 hover:bg-brand-hover hover:-translate-y-[1px] hover:shadow-md active:translate-y-0">
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}

