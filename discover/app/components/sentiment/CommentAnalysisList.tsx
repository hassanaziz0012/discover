"use client";

import React, { useState, useEffect, useRef } from "react";
import { CommentAnalysis } from "../SentimentAnalysisModal";

interface CommentAnalysisListProps {
  analyses: CommentAnalysis[];
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export default function CommentAnalysisList({
  analyses,
  scrollContainerRef,
}: CommentAnalysisListProps) {
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(100);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset pagination if analyses change
  useEffect(() => {
    setVisibleCount(100);
  }, [analyses]);

  // Infinite Scroll Trigger
  useEffect(() => {
    if (!isCommentsExpanded || visibleCount >= analyses.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 100, analyses.length));
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
  }, [isCommentsExpanded, visibleCount, analyses, scrollContainerRef]);

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

  return (
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
          View Analyzed Comments ({analyses.length})
        </span>
        <span className="text-xs text-secondary font-semibold">
          {isCommentsExpanded ? "Hide" : "Show"}
        </span>
      </button>

      {isCommentsExpanded && (
        <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 animate-fade-in mt-1">
          {analyses.slice(0, visibleCount).map((c) => (
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
          {visibleCount < analyses.length && (
            <div
              ref={sentinelRef}
              className="py-4 flex justify-center text-disabled text-xs font-medium"
            >
              <div className="w-4 h-4 border-2 border-brand/20 border-t-brand rounded-full animate-spin mr-2"></div>
              Loading more comments...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
