"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import VideoGrid from "../../../components/VideoGrid";
import { Video } from "../../../types/video";
import { formatViews, formatDuration, timeAgo } from "../../../utils/format";

import { API_BASE_URL } from "@/app/utils/constants";

interface ApiOutlier {
  video_id: string;
  title: string;
  description: string;
  published_at: string;
  thumbnail_url: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration: string;
  url: string;
  score: number;
  base_score: number;
  view_ratio: number;
  like_ratio: number;
  view_diff: number;
  like_diff: number;
  age_in_days: number;
  is_boosted: boolean;
  is_short?: boolean;
}

interface ApiResponse {
  channel_name: string;
  channel_id: string;
  channel_avatar: string | null;
  channel_description?: string;
  total_videos: number;
  average_views: number;
  average_likes: number;
  outliers: ApiOutlier[];
}

export default function CreatorOutliersPage() {
  const params = useParams();
  const creatorID = decodeURIComponent((params?.creatorID as string) || "");

  // API State
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Query Parameter States (passed to backend API)
  const [daysBoost, setDaysBoost] = useState<string>("30"); // Recency boost time-frame cutoff (default 30 days)
  const [limit, setLimit] = useState<string>("30"); // Max videos retrieved from YouTube API
  const [excludeShorts, setExcludeShorts] = useState<boolean>(false);

  // Client-side Filter States (applied locally to the fetched results)
  const [searchQuery, setSearchQuery] = useState("");
  const [minOutlier, setMinOutlier] = useState<number>(1.5); // Default outlier score filter threshold
  const [sortBy, setSortBy] = useState<string>("outlierScore"); // Sort key

  // Clipboard copy feedback
  const [isCopied, setIsCopied] = useState(false);

  // Sync saved excludeShorts filter on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("creator_excludeShorts");
      if (saved) setExcludeShorts(saved === "true");
    }
  }, []);

  const handleSetExcludeShorts = (val: boolean) => {
    setExcludeShorts(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("creator_excludeShorts", val.toString());
    }
  };

  // Fetch data function
  const fetchOutliers = async () => {
    if (!creatorID) return;
    setIsLoading(true);
    setError(null);
    try {
      const daysQuery = daysBoost ? `&days=${encodeURIComponent(daysBoost)}` : "";
      const limitQuery = limit && limit !== "all" ? `&limit=${encodeURIComponent(limit)}` : "";
      const excludeShortsQuery = excludeShorts ? `&exclude_shorts=true` : "";
      const response = await fetch(
        `${API_BASE_URL}/api/youtube/fetch-outliers?channel=${encodeURIComponent(creatorID)}${daysQuery}${limitQuery}${excludeShortsQuery}`
      );
      if (response.ok) {
        const json = await response.json();
        setData(json);
      } else {
        const errJson = await response.json().catch(() => ({}));
        setError(errJson.detail || `Failed to fetch outliers. Server returned status code ${response.status}.`);
      }
    } catch (err) {
      console.error("Fetch outliers error:", err);
      setError("Unable to connect to the backend server. Please verify that the uvicorn server is running on port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger fetch when dynamic query params change
  useEffect(() => {
    fetchOutliers();
  }, [creatorID, daysBoost, limit, excludeShorts]);

  // Handle Copy Channel ID
  const handleCopyChannelId = () => {
    if (data?.channel_id) {
      navigator.clipboard.writeText(data.channel_id);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Reset Filters to default values
  const handleResetFilters = () => {
    setSearchQuery("");
    setMinOutlier(1.5);
    setSortBy("outlierScore");
    handleSetExcludeShorts(false);
  };

  // Client-side filtering & sorting pipeline
  const filteredAndSortedVideos = useMemo(() => {
    if (!data || !data.outliers) return [];

    // Map ApiOutlier to standard Video interface
    let mapped: Video[] = data.outliers.map((o) => ({
      id: o.video_id,
      title: o.title,
      creator: data.channel_name,
      creatorAvatar: data.channel_avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(data.channel_name)}`,
      views: formatViews(o.view_count),
      viewsRaw: o.view_count,
      publishedAt: timeAgo(o.published_at),
      publishedAtRaw: new Date(o.published_at),
      duration: formatDuration(o.duration),
      outlierScore: o.score,
      thumbnailUrl: o.thumbnail_url,
      category: "Creators",
      youtubeUrl: o.url,
      isShort: o.is_short,
    }));

    // 1. Search Query Filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      mapped = mapped.filter((v) => v.title.toLowerCase().includes(q));
    }

    // 2. Outlier Score Threshold Filter
    mapped = mapped.filter((v) => v.outlierScore >= minOutlier);

    // 2.5. Exclude Shorts Filter
    if (excludeShorts) {
      mapped = mapped.filter((v) => !v.isShort);
    }

    // 3. Sorting pipeline
    mapped.sort((a, b) => {
      if (sortBy === "views") {
        return b.viewsRaw - a.viewsRaw;
      }
      if (sortBy === "newest") {
        return b.publishedAtRaw.getTime() - a.publishedAtRaw.getTime();
      }
      // Default: outlierScore
      return b.outlierScore - a.outlierScore;
    });

    return mapped;
  }, [data, searchQuery, minOutlier, sortBy]);

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
        <div className="flex-1 flex flex-col animate-pulse">
          {/* Header Skeleton */}
          <div className="flex sm:flex-row flex-col sm:items-start items-start gap-6 pb-6 border-b border-border-subtle mb-8">
            <div className="w-20 h-20 rounded-full bg-surface-raised mt-1"></div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-8 w-48 bg-surface-raised rounded-md"></div>
              <div className="h-5 w-72 bg-surface-raised rounded-md"></div>
              <div className="h-4 w-full max-w-[500px] bg-surface-raised rounded-md mt-1"></div>
              <div className="h-4 w-2/3 max-w-[400px] bg-surface-raised rounded-md"></div>
            </div>
            <div className="flex gap-3 sm:mt-0 mt-4">
              <div className="w-28 h-20 bg-surface-raised rounded-xl"></div>
              <div className="w-28 h-20 bg-surface-raised rounded-xl"></div>
              <div className="w-28 h-20 bg-surface-raised rounded-xl"></div>
            </div>
          </div>
          {/* Filters Skeleton */}
          <div className="h-24 bg-surface-raised rounded-2xl mb-8"></div>
          {/* Grid Skeleton */}
          <div className="grid sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] grid-cols-1 gap-5 mb-12">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="aspect-video w-full bg-surface-raised rounded-lg"></div>
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-raised shrink-0"></div>
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-4 bg-surface-raised rounded-md w-full"></div>
                    <div className="h-4 bg-surface-raised rounded-md w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Real Dashboard Content */
        <div className="flex-1 flex flex-col">
          {/* Creator Profile Summary Header */}
          <div className="flex md:flex-row flex-col md:items-start items-start gap-6 pb-6 border-b border-border-subtle mb-8">
            <img
              src={data?.channel_avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(data?.channel_name || "creator")}`}
              alt={data?.channel_name || "Creator avatar"}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full bg-surface-raised border border-border object-cover shadow-sm transition-transform duration-200 hover:scale-102 mt-1"
            />
            
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-extrabold text-primary tracking-tight mb-1">
                <a
                  href={`https://youtube.com/channel/${data?.channel_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group hover:text-brand transition-colors duration-150 inline-flex items-center gap-2"
                >
                  {data?.channel_name}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="opacity-40 group-hover:opacity-100 group-hover:text-brand transition-all duration-150"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </h1>
              
              <div className="flex items-center gap-1.5 text-[0.82rem] text-secondary">
                <span className="font-semibold text-primary truncate max-w-[250px]">{data?.channel_id}</span>
                <button
                  onClick={handleCopyChannelId}
                  className="p-1 hover:bg-surface-raised text-disabled hover:text-primary rounded transition-all duration-150"
                  title="Copy Channel ID"
                >
                  {isCopied ? (
                    <span className="text-brand font-semibold text-[0.75rem] px-1.5 py-0.5 bg-brand-subtle rounded-md">Copied!</span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
              </div>

              {data?.channel_description && (
                <p className="text-[0.9rem] text-secondary max-w-[650px] leading-relaxed mt-2 line-clamp-3" title={data.channel_description}>
                  {data.channel_description}
                </p>
              )}
            </div>

            {/* Quick Channel Statistics Column Indicators */}
            <div className="flex flex-wrap gap-3 md:mt-0 mt-4">
              <div className="bg-surface border border-border-subtle px-4 py-3 rounded-xl shadow-xs text-center min-w-[105px] flex-1">
                <span className="block text-secondary text-[0.72rem] font-bold uppercase tracking-wider mb-0.5">Analyzed</span>
                <span className="text-xl font-extrabold text-primary">{data?.total_videos}</span>
              </div>
              <div className="bg-surface border border-border-subtle px-4 py-3 rounded-xl shadow-xs text-center min-w-[105px] flex-1">
                <span className="block text-secondary text-[0.72rem] font-bold uppercase tracking-wider mb-0.5">Avg Views</span>
                <span className="text-xl font-extrabold text-primary">
                  {data?.average_views ? formatViews(data.average_views).split(" ")[0] : "0"}
                </span>
              </div>
              <div className="bg-surface border border-border-subtle px-4 py-3 rounded-xl shadow-xs text-center min-w-[105px] flex-1">
                <span className="block text-secondary text-[0.72rem] font-bold uppercase tracking-wider mb-0.5">Avg Likes</span>
                <span className="text-xl font-extrabold text-primary">
                  {data?.average_likes ? formatViews(data.average_likes).split(" ")[0] : "0"}
                </span>
              </div>
            </div>
          </div>

          {/* Filtering Configuration Panel Card */}
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
                  onClick={() => handleSetExcludeShorts(!excludeShorts)}
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
