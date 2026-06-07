"use client";

import React from "react";
import Link from "next/link";

export interface Creator {
  channel_id: string;
  name: string;
  handle: string;
  thumbnail_url: string;
  description: string;
  subscriber_count: number;
  video_count: number;
}

interface CreatorsListProps {
  creators: Creator[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  layout?: "list" | "grid";
}

// Helper to format subscriber count (e.g., 17200000 -> 17.2M, 9700000 -> 9.7M)
function formatSubscribers(count: number): string {
  if (count === undefined || count === null || count === 0) return "0";
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

// Helper to format video count (e.g., 1200 -> 1.2K)
function formatVideoCount(count: number): string {
  if (count === undefined || count === null || count === 0) return "0";
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

export default function CreatorsList({ creators, isLoading, error, onRetry, layout = "list" }: CreatorsListProps) {
  
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-6 bg-surface border border-error/20 rounded-2xl shadow-sm animate-fade-in my-6">
        <div className="text-error bg-error-subtle p-4 rounded-full mb-6">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-primary mb-2">Failed to Load Creators</h3>
        <p className="text-[0.95rem] text-secondary max-w-[450px] leading-relaxed mb-6">
          {error}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="py-2.5 px-6 bg-primary text-bg rounded-full text-[0.88rem] font-semibold hover:bg-brand hover:text-on-brand transition-all duration-150 ease-in-out shadow-sm"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    if (layout === "grid") {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full animate-pulse my-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center p-5 bg-surface border border-border-subtle rounded-2xl"
            >
              <div className="w-20 h-20 rounded-full bg-surface-raised mb-4 shrink-0"></div>
              <div className="w-full flex flex-col items-center gap-2">
                <div className="h-5 w-2/3 bg-surface-raised rounded-md"></div>
                <div className="h-3.5 w-1/2 bg-surface-raised rounded-md"></div>
                <div className="h-3.5 w-full bg-surface-raised rounded-md mt-2"></div>
                <div className="h-3.5 w-3/4 bg-surface-raised rounded-md"></div>
                <div className="flex gap-4 mt-3">
                  <div className="h-3.5 w-12 bg-surface-raised rounded-md"></div>
                  <div className="h-3.5 w-12 bg-surface-raised rounded-md"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 w-full animate-pulse my-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-5 p-5 sm:p-6 bg-surface border border-border-subtle rounded-2xl"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface-raised shrink-0"></div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="h-6 w-32 sm:w-48 bg-surface-raised rounded-md"></div>
                <div className="h-4 w-20 bg-surface-raised rounded-md"></div>
              </div>
              <div className="h-4 w-full bg-surface-raised rounded-md"></div>
              <div className="h-4 w-2/3 bg-surface-raised rounded-md"></div>
              <div className="flex gap-4 mt-1">
                <div className="h-4 w-16 bg-surface-raised rounded-md"></div>
                <div className="h-4 w-16 bg-surface-raised rounded-md"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-6 bg-surface border border-border-subtle rounded-2xl shadow-xs animate-fade-in my-6">
        <div className="text-disabled bg-surface-raised p-5 rounded-full mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-primary mb-2">No Creators Cached</h3>
        <p className="text-[0.95rem] text-secondary max-w-[400px] leading-relaxed mb-6">
          There are no creators currently stored in the backend cache. Search for a creator to inspect their outliers and save them!
        </p>
      </div>
    );
  }

  const isGrid = layout === "grid";

  return (
    <div
      className={
        isGrid
          ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full my-4 animate-fade-in"
          : "flex flex-col gap-4 w-full my-4 animate-fade-in"
      }
    >
      {creators.map((creator) => (
        <Link
          key={creator.channel_id}
          href={`/creators/${encodeURIComponent(creator.channel_id)}/outliers`}
          className={
            isGrid
              ? "group flex flex-col items-center text-center p-5 bg-surface border border-border-subtle rounded-2xl transition-all duration-200 ease-in-out hover:bg-surface-raised hover:-translate-y-1 hover:shadow-md hover:border-brand active:scale-[0.99] w-full min-w-0"
              : "group flex items-center gap-5 sm:gap-6 p-5 sm:p-6 bg-surface border border-border-subtle rounded-2xl transition-all duration-200 ease-in-out hover:bg-surface-raised hover:-translate-y-0.5 hover:shadow-md hover:border-brand active:scale-[0.99]"
          }
        >
          {/* Avatar Profile */}
          <div
            className={
              isGrid
                ? "relative w-20 h-20 mb-3 shrink-0"
                : "relative w-16 h-16 sm:w-20 sm:h-20 shrink-0"
            }
          >
            <img
              src={creator.thumbnail_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(creator.name)}`}
              alt={creator.name}
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full border border-border bg-surface object-cover shadow-sm transition-all duration-200 group-hover:scale-[1.03] group-hover:border-brand"
            />
          </div>

          {/* Details */}
          <div
            className={
              isGrid
                ? "flex-1 w-full flex flex-col items-center gap-1.5 min-w-0"
                : "flex-1 min-w-0 flex flex-col gap-1 sm:gap-1.5"
            }
          >
            {/* Title & Handle row */}
            <div
              className={
                isGrid
                  ? "flex flex-col items-center w-full min-w-0 gap-0.5"
                  : "flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
              }
            >
              <h3
                className={
                  isGrid
                    ? "text-base font-bold text-primary tracking-tight transition-colors duration-150 group-hover:text-brand truncate w-full px-1"
                    : "text-base sm:text-lg font-bold text-primary tracking-tight transition-colors duration-150 group-hover:text-brand truncate max-w-[300px] sm:max-w-md"
                }
              >
                {creator.name}
              </h3>
              <span
                className={
                  isGrid
                    ? "text-xs font-medium text-secondary truncate w-full px-1"
                    : "text-xs sm:text-[0.85rem] font-medium text-secondary truncate max-w-[150px]"
                }
              >
                {creator.handle}
              </span>
            </div>

            {/* Description Snippet */}
            <p
              className={
                isGrid
                  ? "text-[0.82rem] leading-relaxed text-secondary line-clamp-2 overflow-hidden text-ellipsis w-full px-1"
                  : "text-[0.82rem] sm:text-[0.88rem] leading-relaxed text-secondary line-clamp-2 overflow-hidden text-ellipsis pr-2"
              }
            >
              {creator.description || "No description provided."}
            </p>

            {/* Stats Block */}
            <div
              className={
                isGrid
                  ? "flex items-center justify-center gap-4 mt-auto pt-2 text-[0.78rem] font-semibold text-secondary w-full"
                  : "flex items-center gap-4 mt-0.5 sm:mt-1 text-[0.78rem] sm:text-[0.82rem] font-semibold text-secondary"
              }
            >
              {/* Subs Stats */}
              <span className="inline-flex items-center gap-1.5 transition-colors duration-150 group-hover:text-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-75">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                {formatSubscribers(creator.subscriber_count)}
              </span>

              {/* Videos count */}
              <span className="inline-flex items-center gap-1 transition-colors duration-150 group-hover:text-primary">
                <span className="text-[0.82rem] font-bold opacity-75">#</span>
                {formatVideoCount(creator.video_count)}
              </span>
            </div>
          </div>

          {/* Nav arrow indicator shown on hover */}
          {!isGrid && (
            <div className="text-disabled group-hover:text-brand transition-colors duration-200 pl-2 shrink-0 hidden sm:block">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform duration-200 group-hover:translate-x-1">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
