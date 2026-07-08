"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import VideoGrid from "../../../components/VideoGrid";
import { useOutliersData } from "./hooks/useOutliersData";
import { OutliersHeader } from "./components/OutliersHeader";
import { OutliersFilters } from "./components/OutliersFilters";
import { OutliersSkeleton } from "./components/OutliersSkeleton";

export default function CreatorOutliersPage() {
  const params = useParams();
  const creatorID = decodeURIComponent((params?.creatorID as string) || "");

  const {
    data,
    isLoading,
    error,
    daysBoost,
    setDaysBoost,
    limit,
    setLimit,
    excludeShorts,
    handleSetExcludeShorts,
    searchQuery,
    setSearchQuery,
    minOutlier,
    setMinOutlier,
    sortBy,
    setSortBy,
    isCopied,
    fetchOutliers,
    handleCopyChannelId,
    handleResetFilters,
    filteredAndSortedVideos,
  } = useOutliersData(creatorID);

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 min-h-screen flex flex-col py-6">
      {/* Top Breadcrumb Navigation */}
      <header className="flex items-center gap-2 mb-6">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-1.5 text-[0.88rem] font-semibold text-secondary hover:text-primary hover:bg-surface-raised rounded-full transition-all duration-150 ease-in-out border border-transparent hover:border-border-subtle"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Dashboard
        </Link>
        <span className="text-disabled select-none">/</span>
        <span className="text-[0.88rem] text-disabled font-medium truncate max-w-[200px]">
          {isLoading ? "Loading..." : data?.channel_name || creatorID}
        </span>
      </header>

      {/* Main Content Layout */}
      {error ? (
        /* Error Display Screen */
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-6 bg-surface border border-error/20 rounded-2xl shadow-sm animate-fade-in my-6">
          <div className="text-error bg-error-subtle p-4 rounded-full mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary mb-3">Error Fetching Outliers</h2>
          <p className="text-[0.95rem] text-secondary max-w-[500px] leading-relaxed mb-8">
            {error}
          </p>
          <div className="flex gap-4">
            <button
              onClick={fetchOutliers}
              className="py-2.5 px-6 bg-primary text-bg rounded-full text-[0.88rem] font-semibold hover:bg-brand hover:text-on-brand transition-all duration-150 ease-in-out shadow-sm"
            >
              Retry Connection
            </button>
            <Link
              href="/"
              className="py-2.5 px-6 bg-surface-raised border border-border-subtle text-primary rounded-full text-[0.88rem] font-semibold hover:bg-surface-overlay transition-all duration-150 ease-in-out"
            >
              Return Home
            </Link>
          </div>
        </div>
      ) : isLoading ? (
        /* Shimmer Loading Screens */
        <OutliersSkeleton />
      ) : (
        /* Real Dashboard Content */
        <div className="flex-1 flex flex-col">
          {/* Creator Profile Summary Header */}
          <OutliersHeader
            data={data}
            isCopied={isCopied}
            onCopyChannelId={handleCopyChannelId}
          />

          {/* Filtering Configuration Panel Card */}
          <OutliersFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            minOutlier={minOutlier}
            setMinOutlier={setMinOutlier}
            daysBoost={daysBoost}
            setDaysBoost={setDaysBoost}
            limit={limit}
            setLimit={setLimit}
            excludeShorts={excludeShorts}
            setExcludeShorts={handleSetExcludeShorts}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />

          {/* Video Grid & Empty State Handler */}
          <main className="flex-1 flex flex-col">
            <VideoGrid
              videos={filteredAndSortedVideos}
              onResetFilters={handleResetFilters}
            />
          </main>
        </div>
      )}
    </div>
  );
}
