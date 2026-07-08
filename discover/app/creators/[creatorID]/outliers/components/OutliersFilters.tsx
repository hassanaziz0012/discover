import React from "react";

interface OutliersFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  minOutlier: number;
  setMinOutlier: (val: number) => void;
  daysBoost: string;
  setDaysBoost: (val: string) => void;
  limit: string;
  setLimit: (val: string) => void;
  excludeShorts: boolean;
  setExcludeShorts: (val: boolean) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
}

export function OutliersFilters({
  searchQuery,
  setSearchQuery,
  minOutlier,
  setMinOutlier,
  daysBoost,
  setDaysBoost,
  limit,
  setLimit,
  excludeShorts,
  setExcludeShorts,
  sortBy,
  setSortBy,
}: OutliersFiltersProps) {
  return (
    <section className="bg-surface border border-border-subtle rounded-2xl p-5 mb-8 shadow-xs">
      <div className="grid lg:grid-cols-6 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-5">
        {/* Local Video Title Search */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-bold text-secondary uppercase tracking-wider">Search Videos</label>
          <div className="relative flex items-center bg-surface-raised border border-border-subtle rounded-lg px-3 py-2 focus-within:border-brand transition-colors duration-150">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-secondary mr-2 shrink-0">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-[0.88rem] text-primary w-full outline-none p-0 focus:outline-none placeholder-disabled"
            />
          </div>
        </div>

        {/* Local Min Outlier Score Threshold Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[0.75rem] font-bold text-secondary uppercase tracking-wider">Min Outlier</label>
            <span className="text-[0.78rem] font-extrabold text-brand bg-brand-subtle py-0.5 px-2 rounded-full">
              {minOutlier}x
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="15.0"
            step="0.5"
            value={minOutlier}
            onChange={(e) => setMinOutlier(parseFloat(e.target.value))}
            className="w-full mt-2 accent-brand cursor-pointer h-1.5 bg-surface-raised rounded-lg appearance-none"
          />
        </div>

        {/* Dynamic Recency Days Boost cut-off parameter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-bold text-secondary uppercase tracking-wider">Recency Days Boost</label>
          <select
            value={daysBoost}
            onChange={(e) => setDaysBoost(e.target.value)}
            className="bg-surface-raised border border-border-subtle rounded-lg px-3 py-2.5 text-[0.88rem] font-semibold text-primary outline-none focus:border-brand cursor-pointer select-none"
          >
            <option value="">No Boost</option>
            <option value="7">Last 7 Days (10% boost)</option>
            <option value="14">Last 14 Days (10% boost)</option>
            <option value="30">Last 30 Days (10% boost)</option>
            <option value="60">Last 60 Days (10% boost)</option>
            <option value="90">Last 90 Days (10% boost)</option>
          </select>
        </div>

        {/* Dynamic Max Videos API Limit parameter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-bold text-secondary uppercase tracking-wider">Max Videos Checked</label>
          <select
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="bg-surface-raised border border-border-subtle rounded-lg px-3 py-2.5 text-[0.88rem] font-semibold text-primary outline-none focus:border-brand cursor-pointer select-none"
          >
            <option value="10">Top 10 uploads</option>
            <option value="20">Top 20 uploads</option>
            <option value="30">Top 30 uploads</option>
            <option value="50">Top 50 uploads</option>
            <option value="100">Top 100 uploads</option>
            <option value="all">All videos (No limit)</option>
          </select>
        </div>

        {/* YouTube Shorts Exclude Toggle Switch */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-bold text-secondary uppercase tracking-wider">YouTube Shorts</label>
          <button
            onClick={() => setExcludeShorts(!excludeShorts)}
            className={`flex items-center justify-between bg-surface-raised border border-border-subtle rounded-lg px-3 py-2.5 text-[0.88rem] font-semibold transition-all duration-150 cursor-pointer ${
              excludeShorts 
                ? "text-brand border-brand/50 bg-brand-subtle/20" 
                : "text-primary hover:bg-surface-overlay"
            }`}
          >
            <span>Hide Shorts</span>
            <div className="relative inline-flex items-center">
              <div className={`w-8 h-4.5 rounded-full transition-colors ${
                excludeShorts ? "bg-brand" : "bg-secondary/30"
              } relative`}>
                <div className={`absolute top-[2px] left-[2px] bg-surface w-3.5 h-3.5 rounded-full transition-transform ${
                  excludeShorts ? "translate-x-3.5 bg-on-brand" : "translate-x-0"
                }`} />
              </div>
            </div>
          </button>
        </div>

        {/* Local Sorting option selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-bold text-secondary uppercase tracking-wider">Sort Outliers By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-surface-raised border border-border-subtle rounded-lg px-3 py-2.5 text-[0.88rem] font-semibold text-primary outline-none focus:border-brand cursor-pointer select-none"
          >
            <option value="outlierScore">Outlier Multiplier</option>
            <option value="views">Highest View Count</option>
            <option value="newest">Newest Publish Date</option>
          </select>
        </div>
      </div>
    </section>
  );
}
