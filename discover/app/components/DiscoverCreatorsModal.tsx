"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/app/utils/constants";

interface VideoCategory {
  id: string;
  title: string;
}

interface DiscoveredCreator {
  channel_id: string;
  name: string;
  handle: string;
  thumbnail_url: string;
  description: string;
  subscriber_count: number;
  video_count: number;
  trending_video_count: number;
  already_cached: boolean;
}

interface BulkAddResult {
  message: string;
  added: { channel_id: string; channel_name: string; thumbnail_url: string; video_count: number }[];
  errors: { channel_id: string; error: string }[];
  already_cached_count: number;
}

interface DiscoverCreatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatorsAdded: () => void; // Callback to refresh the creators list after bulk add
}

const REGIONS = [
  { code: "US", label: "🇺🇸 United States" },
  { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "AU", label: "🇦🇺 Australia" },
  { code: "IN", label: "🇮🇳 India" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "BR", label: "🇧🇷 Brazil" },
  { code: "JP", label: "🇯🇵 Japan" },
  { code: "KR", label: "🇰🇷 South Korea" },
  { code: "MX", label: "🇲🇽 Mexico" },
  { code: "PK", label: "🇵🇰 Pakistan" },
];

function formatSubscribers(count: number): string {
  if (!count) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return count.toString();
}

export default function DiscoverCreatorsModal({
  isOpen,
  onClose,
  onCreatorsAdded,
}: DiscoverCreatorsModalProps) {
  // Filter states
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState("US");

  // Discovery results
  const [creators, setCreators] = useState<DiscoveredCreator[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [hasDiscovered, setHasDiscovered] = useState(false);

  // Selection for bulk-add
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk-add states
  const [isAdding, setIsAdding] = useState(false);
  const [addResult, setAddResult] = useState<BulkAddResult | null>(null);

  // Fetch categories on first open
  useEffect(() => {
    if (isOpen && categories.length === 0) {
      fetchCategories(selectedRegion);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCreators([]);
      setSelectedIds(new Set());
      setDiscoverError(null);
      setAddResult(null);
      setHasDiscovered(false);
    }
  }, [isOpen]);

  async function fetchCategories(region: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/youtube/video-categories?region=${region}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }

  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion);
    fetchCategories(newRegion);
  };

  const handleDiscover = useCallback(async () => {
    setIsDiscovering(true);
    setDiscoverError(null);
    setAddResult(null);
    setSelectedIds(new Set());

    try {
      const params = new URLSearchParams({ region: selectedRegion });
      if (selectedCategory) params.set("category_id", selectedCategory);

      const res = await fetch(`${API_BASE_URL}/api/youtube/discover-creators?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCreators(data.creators || []);
        setHasDiscovered(true);

        // Auto-select all non-cached creators
        const uncached = (data.creators || [])
          .filter((c: DiscoveredCreator) => !c.already_cached)
          .map((c: DiscoveredCreator) => c.channel_id);
        setSelectedIds(new Set(uncached));
      } else {
        const errJson = await res.json().catch(() => ({}));
        setDiscoverError(errJson.detail || `Failed to discover creators (${res.status})`);
      }
    } catch (err) {
      console.error("Discover error:", err);
      setDiscoverError("Unable to connect to the backend server.");
    } finally {
      setIsDiscovering(false);
    }
  }, [selectedCategory, selectedRegion]);

  const toggleSelection = (channelId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const selectAllUncached = () => {
    const uncached = creators.filter((c) => !c.already_cached).map((c) => c.channel_id);
    setSelectedIds(new Set(uncached));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkAdd = async () => {
    if (selectedIds.size === 0) return;
    setIsAdding(true);
    setAddResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/youtube/bulk-add-creators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_ids: Array.from(selectedIds) }),
      });

      if (res.ok) {
        const data: BulkAddResult = await res.json();
        setAddResult(data);

        // Mark added creators as cached in the local list
        setCreators((prev) =>
          prev.map((c) => {
            if (selectedIds.has(c.channel_id)) {
              return { ...c, already_cached: true };
            }
            return c;
          })
        );
        setSelectedIds(new Set());

        // Refresh the main creators list
        onCreatorsAdded();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setAddResult({
          message: errJson.detail || `Failed to add creators (${res.status})`,
          added: [],
          errors: [{ channel_id: "N/A", error: errJson.detail || "Unknown error" }],
          already_cached_count: 0,
        });
      }
    } catch (err) {
      console.error("Bulk add error:", err);
      setAddResult({
        message: "Unable to connect to the backend server.",
        added: [],
        errors: [{ channel_id: "N/A", error: "Connection failed" }],
        already_cached_count: 0,
      });
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  const addableCount = creators.filter((c) => !c.already_cached).length;
  const cachedCount = creators.filter((c) => c.already_cached).length;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-surface border border-border rounded-lg w-full max-w-[720px] shadow-lg overflow-hidden animate-scale-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between py-5 px-6 border-b border-border-subtle shrink-0">
          <div className="flex flex-col gap-1 pr-4">
            <h2 className="text-xl font-bold text-primary tracking-[-0.01em]">
              Discover Top Creators
            </h2>
            <p className="text-xs text-secondary">
              Find trending YouTube creators by category and region, then bulk-add them to your database.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center text-secondary rounded-full w-8 h-8 transition-all duration-150 hover:bg-surface-raised hover:text-primary shrink-0"
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 px-6 py-4 border-b border-border-subtle bg-surface-raised/40 shrink-0">
          {/* Category Dropdown */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <label className="text-[0.78rem] font-semibold text-secondary uppercase tracking-[0.05em]">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-surface border-[1.5px] border-border-subtle rounded-md py-2.5 px-3 text-[0.9rem] text-primary outline-none transition-all duration-150 focus:border-brand focus:bg-surface cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title}
                </option>
              ))}
            </select>
          </div>

          {/* Region Dropdown */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <label className="text-[0.78rem] font-semibold text-secondary uppercase tracking-[0.05em]">
              Region
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="bg-surface border-[1.5px] border-border-subtle rounded-md py-2.5 px-3 text-[0.9rem] text-primary outline-none transition-all duration-150 focus:border-brand focus:bg-surface cursor-pointer"
            >
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Discover Button */}
          <button
            onClick={handleDiscover}
            disabled={isDiscovering || isAdding}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 text-[0.88rem] font-bold rounded-md bg-brand text-on-brand hover:bg-brand-hover active:scale-[0.98] transition-all duration-150 shadow-sm shrink-0 ${
              isDiscovering || isAdding ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isDiscovering ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Discovering...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                Discover
              </>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {/* Error State */}
          {discoverError && (
            <div className="p-4 rounded-xl border border-error/20 bg-error/10 text-error text-sm font-semibold flex items-center gap-2 mb-4 animate-fade-in">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {discoverError}
            </div>
          )}

          {/* Add Result Banner */}
          {addResult && (
            <div
              className={`p-4 rounded-xl border text-sm font-semibold flex items-start gap-2 mb-4 animate-fade-in ${
                addResult.errors.length > 0 && addResult.added.length === 0
                  ? "border-error/20 bg-error/10 text-error"
                  : "border-brand/20 bg-brand/10 text-brand"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5">
                {addResult.added.length > 0 ? (
                  <polyline points="20 6 9 17 4 12"></polyline>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </>
                )}
              </svg>
              <div className="flex flex-col gap-1">
                <span>{addResult.message}</span>
                {addResult.errors.length > 0 && (
                  <span className="text-xs opacity-80">
                    Failed: {addResult.errors.map((e) => e.channel_id).join(", ")}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Empty State (before first discovery) */}
          {!hasDiscovered && !isDiscovering && (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
              <div className="text-disabled bg-surface-raised p-5 rounded-full mb-5">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">Explore Trending Creators</h3>
              <p className="text-[0.88rem] text-secondary max-w-[380px] leading-relaxed">
                Select a category and region, then click <strong>Discover</strong> to find the top YouTube creators based on currently trending videos.
              </p>
            </div>
          )}

          {/* Loading Skeleton */}
          {isDiscovering && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 bg-surface border border-border-subtle rounded-xl">
                  <div className="w-11 h-11 rounded-full bg-surface-raised shrink-0"></div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-4 w-2/3 bg-surface-raised rounded-md"></div>
                    <div className="h-3 w-1/3 bg-surface-raised rounded-md"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {hasDiscovered && !isDiscovering && creators.length > 0 && (
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[0.82rem] text-secondary font-medium">
                  {creators.length} creators found
                  {cachedCount > 0 && (
                    <span className="text-brand ml-1">· {cachedCount} already cached</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {addableCount > 0 && (
                    <>
                      <button
                        onClick={selectAllUncached}
                        className="text-[0.78rem] font-semibold text-brand hover:text-brand-hover transition-colors duration-150"
                      >
                        Select all ({addableCount})
                      </button>
                      <span className="text-border">·</span>
                    </>
                  )}
                  <button
                    onClick={deselectAll}
                    className="text-[0.78rem] font-semibold text-secondary hover:text-primary transition-colors duration-150"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {/* Creator Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {creators.map((creator) => {
                  const isSelected = selectedIds.has(creator.channel_id);
                  const isCached = creator.already_cached;

                  return (
                    <button
                      key={creator.channel_id}
                      onClick={() => !isCached && toggleSelection(creator.channel_id)}
                      disabled={isCached || isAdding}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-150 w-full group ${
                        isCached
                          ? "bg-surface-raised/50 border-border-subtle/60 opacity-60 cursor-default"
                          : isSelected
                          ? "bg-brand/8 border-brand/30 hover:border-brand/50"
                          : "bg-surface border-border-subtle hover:bg-surface-raised hover:border-brand/20"
                      }`}
                    >
                      {/* Checkbox / Cached Badge */}
                      <div className="shrink-0">
                        {isCached ? (
                          <div className="w-5 h-5 rounded-md bg-brand/20 flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-brand">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-md border-2 transition-all duration-150 flex items-center justify-center ${
                              isSelected
                                ? "bg-brand border-brand"
                                : "border-border bg-surface group-hover:border-brand/40"
                            }`}
                          >
                            {isSelected && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Avatar */}
                      <img
                        src={creator.thumbnail_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(creator.name)}`}
                        alt={creator.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full border border-border bg-surface object-cover shrink-0"
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[0.88rem] font-bold text-primary truncate">
                            {creator.name}
                          </span>
                          {isCached && (
                            <span className="text-[0.65rem] font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wide">
                              Added
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[0.75rem] text-secondary">
                          <span className="truncate">{creator.handle}</span>
                          <span>·</span>
                          <span className="shrink-0">{formatSubscribers(creator.subscriber_count)} subs</span>
                        </div>
                      </div>

                      {/* Trending Badge */}
                      {creator.trending_video_count > 1 && (
                        <span className="text-[0.7rem] font-bold text-on-brand bg-brand px-2 py-1 rounded-full shrink-0" title="Trending videos in this category">
                          🔥 {creator.trending_video_count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* No Results */}
          {hasDiscovered && !isDiscovering && creators.length === 0 && !discoverError && (
            <div className="flex flex-col items-center justify-center text-center py-12 px-6 animate-fade-in">
              <div className="text-disabled bg-surface-raised p-4 rounded-full mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </div>
              <h3 className="text-base font-bold text-primary mb-1">No Creators Found</h3>
              <p className="text-[0.85rem] text-secondary max-w-[340px] leading-relaxed">
                No trending videos found for this category and region. Try a different combination.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between py-4 px-6 border-t border-border-subtle bg-surface-raised shrink-0">
          <span className="text-[0.82rem] text-secondary font-medium">
            {selectedIds.size > 0 && `${selectedIds.size} selected`}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-md text-[0.88rem] font-semibold text-secondary hover:text-primary transition-colors duration-150"
            >
              Close
            </button>
            {addableCount > 0 && (
              <button
                onClick={handleBulkAdd}
                disabled={selectedIds.size === 0 || isAdding || isDiscovering}
                className={`flex items-center gap-2 py-2 px-5 rounded-md text-[0.88rem] font-bold bg-brand text-on-brand shadow-sm transition-all duration-150 hover:bg-brand-hover hover:-translate-y-[1px] hover:shadow-md ${
                  selectedIds.size === 0 || isAdding || isDiscovering
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {isAdding ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding {selectedIds.size} creators...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add {selectedIds.size > 0 ? selectedIds.size : ""} Creator{selectedIds.size !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
