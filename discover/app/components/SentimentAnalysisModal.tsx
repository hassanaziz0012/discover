"use client";

import React, { useState, useEffect, useRef } from "react";
import BaseModal from "./BaseModal";
import ModelSelector from "./ModelSelector";

export interface CommentAnalysis {
  comment_id: string;
  username: string;
  text: string;
  sentiment: "Positive" | "Negative" | "Neutral" | "Mixed";
  reason: string;
  confidence_score: number;
}

export interface SentimentReasonCount {
  reason: string;
  count: number;
}

export interface SentimentReport {
  video_id: string;
  title: string;
  description: string;
  view_count: string;
  summaries: string[];
  most_common_reasons: SentimentReasonCount[];
  analyses: CommentAnalysis[];
}

interface SentimentAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
}

import { API_BASE_URL } from "@/app/utils/constants";

export default function SentimentAnalysisModal({
  isOpen,
  onClose,
  videoId,
  videoTitle,
}: SentimentAnalysisModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SentimentReport | null>(null);

  // Configuration settings states - Defaults to Gemma 4
  const [model, setModel] = useState<string>("gemma-4");
  const [limit, setLimit] = useState<number>(100);
  const [customLimit, setCustomLimit] = useState<string>("");
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  
  // Local rendering pagination states
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(100);

  // Scroll and Sentinel refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);



  const handleStartAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    setIsCommentsExpanded(false);
    setVisibleCount(100);
    setHasStarted(true);

    try {
      const finalLimit = customLimit ? parseInt(customLimit, 10) : limit;
      if (isNaN(finalLimit) || finalLimit < 1 || finalLimit > 2000) {
        setError("Please enter a valid comment limit between 1 and 2000.");
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/youtube/analyze-video-sentiment?video_id=${encodeURIComponent(
          videoId
        )}&limit=${finalLimit}&model=${encodeURIComponent(model)}`
      );
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      } else {
        const errJson = await response.json().catch(() => ({}));
        setError(errJson.detail || `Failed to analyze comments (Server status: ${response.status})`);
      }
    } catch (err) {
      console.error("Fetch sentiment error:", err);
      setError("Unable to connect to the backend server. Please verify the backend API is running.");
    } finally {
      setIsLoading(false);
    }
  };

  // Infinite Scroll Trigger inside the modal
  useEffect(() => {
    if (!isCommentsExpanded || !report || visibleCount >= report.analyses.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 100, report.analyses.length));
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "100px",
      }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [isCommentsExpanded, visibleCount, report]);

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "Positive":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      case "Negative":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
      case "Mixed":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
      default: // Neutral
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "Positive":
        return "😊";
      case "Negative":
        return "😢";
      case "Mixed":
        return "😐";
      default:
        return "😶";
    }
  };

  // Safe division helper for stats percentages
  const maxReasonCount = report?.most_common_reasons?.[0]?.count || 1;

  const renderFooter = () => {
    if (!hasStarted && !isLoading && !report && !error) {
      return (
        <div className="flex w-full sm:w-auto items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-5 rounded-md text-[0.9rem] font-semibold text-secondary transition-all duration-150 hover:bg-surface-overlay hover:text-primary text-center cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleStartAnalysis}
            className="w-full sm:w-auto py-2.5 px-8 rounded-md text-[0.9rem] font-semibold bg-brand text-on-brand shadow-sm transition-all duration-150 hover:bg-brand-hover hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 text-center cursor-pointer"
          >
            Start Analysis
          </button>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex w-full sm:w-auto items-center justify-end gap-3">
          <button
            onClick={() => {
              setError(null);
              setHasStarted(false);
            }}
            className="w-full sm:w-auto py-2.5 px-5 rounded-md text-[0.9rem] font-semibold text-secondary transition-all duration-150 hover:bg-surface-overlay hover:text-primary text-center cursor-pointer"
          >
            Adjust Settings
          </button>
          <button
            onClick={handleStartAnalysis}
            className="w-full sm:w-auto py-2.5 px-8 rounded-md text-[0.9rem] font-semibold bg-brand text-on-brand shadow-sm transition-all duration-150 hover:bg-brand-hover hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 text-center cursor-pointer"
          >
            Retry Analysis
          </button>
        </div>
      );
    }
    if (report) {
      return (
        <div className="flex w-full sm:w-auto items-center justify-end gap-3">
          <button
            onClick={() => {
              setReport(null);
              setHasStarted(false);
              setIsLoading(false);
              setError(null);
            }}
            className="w-full sm:w-auto py-2.5 px-5 rounded-md text-[0.9rem] font-semibold text-secondary transition-all duration-150 hover:bg-surface-overlay hover:text-primary text-center cursor-pointer"
          >
            Configure & Re-run
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-8 rounded-md text-[0.9rem] font-semibold bg-brand text-on-brand shadow-sm transition-all duration-150 hover:bg-brand-hover hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 text-center cursor-pointer"
          >
            Got It
          </button>
        </div>
      );
    }
    // Loading state
    return (
      <button
        className="w-full sm:w-auto py-2.5 px-8 rounded-md text-[0.9rem] font-semibold bg-brand/50 text-on-brand cursor-not-allowed text-center"
        disabled
      >
        Analyzing...
      </button>
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="User Sentiment Report"
      subtitle={`AI comment evaluation on: ${videoTitle}`}
      scrollContainerRef={scrollContainerRef}
      icon={
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      }
      footer={renderFooter()}
    >
      {!hasStarted && !isLoading && !report && !error && (
        <div className="flex flex-col gap-6 py-2 animate-fade-in">
          {/* Model Choice */}
          <ModelSelector value={model} onChange={setModel} />

          {/* Limit Choice */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[0.85rem] font-bold text-primary uppercase tracking-[0.05em] px-1">
              Max Comments to Fetch & Analyze
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[50, 100, 250, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setLimit(preset);
                    setCustomLimit("");
                  }}
                  className={`py-2 px-3 border rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    limit === preset && !customLimit
                      ? "bg-brand text-on-brand border-brand hover:bg-brand-hover shadow-sm"
                      : "bg-surface-raised border-border-subtle text-secondary hover:bg-surface-overlay hover:text-primary"
                  }`}
                >
                  {preset}
                </button>
              ))}
              
              <div className="relative flex-1 min-w-[120px]">
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={customLimit}
                  placeholder="Custom (1-2000)"
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomLimit(val);
                    if (val) {
                      setLimit(0);
                    } else {
                      setLimit(100);
                    }
                  }}
                  className={`w-full bg-surface-raised border rounded-md py-1.5 px-3 text-xs text-primary transition-all duration-150 outline-none focus:bg-surface-raised ${
                    customLimit
                      ? "border-brand ring-1 ring-brand"
                      : "border-border-subtle focus:border-brand/50"
                  }`}
                />
              </div>
            </div>
            <p className="text-[0.72rem] text-secondary leading-relaxed">
              Analyzing more comments provides deeper insights but takes longer to compute due to batch LLM calls.
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
          <p className="text-secondary text-sm font-semibold animate-pulse">Running AI Sentiment Analysis...</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-3 bg-error-subtle text-error rounded-full mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-primary mb-2">Analysis Failed</h3>
          <p className="text-secondary text-sm max-w-[400px] leading-relaxed mb-6">{error}</p>
        </div>
      )}

      {report && (
        <>
          {/* Overall Summary Section */}
          {report.summaries && report.summaries.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-primary uppercase tracking-[0.05em] px-1">
                AI Sentiment Summary
              </h3>
              <div className="flex flex-col gap-3">
                {report.summaries.map((sum, index) => (
                  <div
                    key={index}
                    className="p-4 bg-brand/5 border-l-4 border-brand rounded-r-xl text-[0.88rem] leading-relaxed text-primary"
                  >
                    {sum}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Themes / Most Common Reasons */}
          {report.most_common_reasons && report.most_common_reasons.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-primary uppercase tracking-[0.05em] px-1">
                Top Recurring Themes
              </h3>
              <div className="flex flex-col gap-3 bg-surface-raised border border-border-subtle rounded-xl p-4">
                {report.most_common_reasons.slice(0, 5).map((item, idx) => {
                  const percentage = (item.count / maxReasonCount) * 100;
                  return (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-semibold text-primary">
                        <span className="line-clamp-1">{item.reason}</span>
                        <span className="text-secondary shrink-0 font-medium">
                          {item.count} {item.count === 1 ? "comment" : "comments"}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-border-subtle">
                        <div
                          className="h-full bg-brand rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments Section Drawer */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
              className="w-full flex items-center justify-between p-3 bg-surface-raised border border-border-subtle rounded-xl hover:bg-surface-overlay hover:border-brand/30 transition-all duration-150 text-left select-none cursor-pointer"
            >
              <span className="text-xs font-bold text-primary uppercase tracking-[0.05em] flex items-center gap-2">
                <svg
                  className={`w-3.5 h-3.5 text-secondary transition-transform duration-200 ${
                    isCommentsExpanded ? "rotate-90 text-brand" : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                View Analyzed Comments ({report.analyses.length})
              </span>
              <span className="text-xs text-secondary font-semibold">
                {isCommentsExpanded ? "Hide" : "Show"}
              </span>
            </button>

            {isCommentsExpanded && (
              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 animate-fade-in mt-1">
                {report.analyses.slice(0, visibleCount).map((c) => (
                  <div
                    key={c.comment_id}
                    className="p-3.5 bg-surface border border-border-subtle rounded-xl flex flex-col gap-2 shadow-2xs hover:border-brand/20 transition-colors duration-150"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            c.username
                          )}`}
                          alt={c.username}
                          className="w-6 h-6 rounded-full bg-surface-raised border border-border"
                        />
                        <span className="text-xs font-bold text-primary truncate max-w-[150px]">
                          {c.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`py-0.5 px-2 rounded-full font-bold text-[0.68rem] tracking-wide inline-flex items-center gap-1 ${getSentimentBadge(
                            c.sentiment
                          )}`}
                        >
                          <span>{getSentimentIcon(c.sentiment)}</span>
                          <span>{c.sentiment}</span>
                        </span>
                        {c.confidence_score !== undefined && (
                          <span className="text-[0.65rem] text-disabled font-semibold">
                            {Math.round(c.confidence_score * 100)}% conf
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-primary leading-relaxed whitespace-pre-wrap">
                      {c.text}
                    </p>
                    {c.reason && (
                      <div className="text-[0.7rem] text-secondary font-medium mt-0.5 flex items-start gap-1">
                        <span className="text-disabled font-semibold uppercase tracking-wider text-[0.62rem] mt-0.5">
                          Theme:
                        </span>
                        <span>{c.reason}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Infinite Scroll Sentinel element */}
                {visibleCount < report.analyses.length && (
                  <div ref={sentinelRef} className="py-4 flex justify-center text-disabled text-xs font-medium">
                    <div className="w-4 h-4 border-2 border-brand/20 border-t-brand rounded-full animate-spin mr-2"></div>
                    Loading more comments...
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </BaseModal>
  );
}
