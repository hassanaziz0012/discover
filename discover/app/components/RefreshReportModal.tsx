"use client";

import React, { useMemo } from "react";

export interface RefreshedChannel {
  channel_id: string;
  channel_name: string;
  thumbnail_url: string;
  new_videos_count: number;
  cached_videos_count: number;
}

export interface RefreshError {
  channel_id: string;
  error: string;
}

export interface RefreshReport {
  message: string;
  refreshed: RefreshedChannel[];
  errors: RefreshError[];
  title?: string;
  subtitle?: string;
}

interface RefreshReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: RefreshReport | null;
}

export default function RefreshReportModal({
  isOpen,
  onClose,
  report,
}: RefreshReportModalProps) {
  const [isCachedExpanded, setIsCachedExpanded] = React.useState(false);

  // Prevent body scroll when open (optional, but good UX)
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      setIsCachedExpanded(false);
    }
  }, [isOpen]);

  const stats = useMemo(() => {
    if (!report) return { totalChannels: 0, newVideos: 0, cachedVideos: 0 };
    const refreshed = report.refreshed || [];
    return {
      totalChannels: refreshed.length,
      newVideos: refreshed.reduce((sum, item) => sum + (item.new_videos_count || 0), 0),
      cachedVideos: refreshed.reduce((sum, item) => sum + (item.cached_videos_count || 0), 0),
    };
  }, [report]);

  const { newlyRefreshed, fullyCached } = useMemo(() => {
    const refreshed = report?.refreshed || [];
    
    const newlyRefreshed = refreshed
      .filter((chan) => chan.new_videos_count > 0)
      .sort((a, b) => {
        if (b.new_videos_count !== a.new_videos_count) {
          return b.new_videos_count - a.new_videos_count;
        }
        return a.channel_name.localeCompare(b.channel_name);
      });

    const fullyCached = refreshed
      .filter((chan) => chan.new_videos_count === 0)
      .sort((a, b) => a.channel_name.localeCompare(b.channel_name));

    return { newlyRefreshed, fullyCached };
  }, [report]);

  if (!isOpen || !report) return null;

  return (
    <div
      className="fixed inset-0 bg-black/55 backdrop-blur-md flex items-center justify-center z-[1100] p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-surface border border-border rounded-lg w-full max-w-[540px] max-h-[85vh] shadow-lg overflow-hidden animate-scale-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between py-5 px-6 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary tracking-[-0.01em]">{report.title || "Refresh Complete"}</h2>
              <p className="text-xs text-secondary mt-0.5">{report.subtitle || "Summary of channel updates"}</p>
            </div>
          </div>
          <button
            id="btn-close-report-modal-x"
            onClick={onClose}
            className="flex items-center justify-center text-secondary rounded-full w-8 h-8 transition-all duration-150 hover:bg-surface-raised hover:text-primary"
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-xs">
              <span className="text-[0.7rem] font-bold text-secondary uppercase tracking-[0.05em] mb-1">Channels</span>
              <span className="text-2xl font-extrabold text-primary">{stats.totalChannels}</span>
            </div>
            <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-xs">
              <span className="text-[0.7rem] font-bold text-brand uppercase tracking-[0.05em] mb-1">New Videos</span>
              <span className="text-2xl font-extrabold text-brand">{stats.newVideos}</span>
            </div>
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-xs">
              <span className="text-[0.7rem] font-bold text-secondary uppercase tracking-[0.05em] mb-1">From Cache</span>
              <span className="text-2xl font-extrabold text-primary">{stats.cachedVideos}</span>
            </div>
          </div>

          {/* Newly Refreshed Channels Group */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.05em] px-1 flex items-center justify-between">
              <span>Refreshed Channels ({newlyRefreshed.length})</span>
              {newlyRefreshed.length > 0 && (
                <span className="text-[0.65rem] font-medium bg-brand/15 text-brand py-0.5 px-1.5 rounded-sm normal-case tracking-normal">
                  new uploads found
                </span>
              )}
            </h3>
            {newlyRefreshed.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border-subtle rounded-xl text-secondary text-xs">
                No channels had new uploads.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                {newlyRefreshed.map((chan) => (
                  <div
                    key={chan.channel_id}
                    className="flex items-center justify-between p-3 bg-surface-raised border border-border-subtle rounded-xl hover:border-brand/40 transition-colors duration-150 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      {chan.thumbnail_url ? (
                        <img
                          src={chan.thumbnail_url}
                          alt={chan.channel_name}
                          className="w-9 h-9 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-surface-overlay flex items-center justify-center font-bold text-primary border border-border text-sm">
                          {chan.channel_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-primary line-clamp-1">{chan.channel_name}</h4>
                        <span className="text-[0.68rem] text-secondary font-mono">{chan.channel_id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="py-1 px-2.5 rounded-full text-[0.72rem] font-bold bg-brand text-on-brand shadow-xs animate-pulse">
                        +{chan.new_videos_count} new
                      </span>
                      <span className="py-1 px-2.5 rounded-full text-[0.72rem] font-medium bg-surface-overlay border border-border-subtle text-secondary hidden sm:inline-block">
                        {chan.cached_videos_count} cached
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fully Cached Channels Group */}
          {fullyCached.length > 0 && (
            <div className="flex flex-col gap-3">
              <button
                id="btn-toggle-cached-channels"
                onClick={() => setIsCachedExpanded(!isCachedExpanded)}
                className="w-full flex items-center justify-between p-3 bg-surface-raised border border-border-subtle rounded-xl hover:bg-surface-overlay hover:border-brand/30 transition-all duration-150 text-left select-none"
              >
                <span className="text-xs font-bold text-primary uppercase tracking-[0.05em] flex items-center gap-2">
                  <svg
                    className={`w-3.5 h-3.5 text-secondary transition-transform duration-200 ${
                      isCachedExpanded ? "rotate-90 text-brand" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  Fully Cached Channels ({fullyCached.length})
                </span>
                <span className="text-xs text-secondary font-semibold">
                  {isCachedExpanded ? "Hide" : "Show"}
                </span>
              </button>

              {isCachedExpanded && (
                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1 animate-fade-in">
                  {fullyCached.map((chan) => (
                    <div
                      key={chan.channel_id}
                      className="flex items-center justify-between p-2.5 bg-surface border border-border-subtle rounded-xl hover:border-brand/20 transition-colors duration-150 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        {chan.thumbnail_url ? (
                          <img
                            src={chan.thumbnail_url}
                            alt={chan.channel_name}
                            className="w-8 h-8 rounded-full object-cover border border-border opacity-70"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-surface-overlay flex items-center justify-center font-bold text-secondary border border-border text-xs opacity-75">
                            {chan.channel_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-secondary line-clamp-1">{chan.channel_name}</h4>
                          <span className="text-[0.62rem] text-disabled font-mono">{chan.channel_id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="py-0.5 px-2 rounded-full text-[0.68rem] font-medium bg-surface-raised border border-border-subtle text-secondary">
                          0 new
                        </span>
                        <span className="py-0.5 px-2 rounded-full text-[0.68rem] font-medium bg-surface-raised border border-border-subtle text-secondary hidden sm:inline-block">
                          {chan.cached_videos_count} cached
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Errors Section (if any) */}
          {report.errors && report.errors.length > 0 && (
            <div className="flex flex-col gap-3 shrink-0">
              <h3 className="text-xs font-bold text-error uppercase tracking-[0.05em] px-1 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Failed Channels ({report.errors.length})
              </h3>
              <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1">
                {report.errors.map((err, i) => (
                  <div
                    key={`${err.channel_id}-${i}`}
                    className="p-3 bg-error-subtle border border-error/20 rounded-xl flex flex-col gap-1 text-xs"
                  >
                    <span className="font-bold text-error">{err.channel_id}</span>
                    <span className="text-secondary leading-relaxed">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end py-4 px-6 border-t border-border-subtle bg-surface-raised shrink-0">
          <button
            id="btn-close-report-modal"
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-8 rounded-md text-[0.9rem] font-semibold bg-brand text-on-brand shadow-sm transition-all duration-150 hover:bg-brand-hover hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 text-center"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
