"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Video } from "../types/video";
import SentimentAnalysisModal from "./SentimentAnalysisModal";
import SummarizeModal from "./SummarizeModal";

interface VideoCardProps {
  video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSentimentModalOpen, setIsSentimentModalOpen] = useState(false);
  const [isSummarizeModalOpen, setIsSummarizeModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Format dynamic HSL colors for the outlier badge based on multiplier
  const getOutlierBadgeStyles = (score: number) => {
    if (score >= 100) {
      return {
        background: "rgba(220, 38, 38, 0.15)",
        color: "#DC2626",
        border: "1px solid rgba(220, 38, 38, 0.3)",
        label: "Extreme Outlier"
      };
    } else if (score >= 30) {
      return {
        background: "rgba(217, 119, 6, 0.15)",
        color: "#D97706",
        border: "1px solid rgba(217, 119, 6, 0.3)",
        label: "High Outlier"
      };
    } else if (score >= 10) {
      return {
        background: "rgba(245, 158, 11, 0.12)",
        color: "#F59E0B",
        border: "1px solid rgba(245, 158, 11, 0.25)",
        label: "Mid Outlier"
      };
    } else {
      return {
        background: "var(--color-surface-raised)",
        color: "var(--color-text-secondary)",
        border: "1px solid var(--color-border-subtle)",
        label: "Low Outlier"
      };
    }
  };

  const badgeStyle = getOutlierBadgeStyles(video.outlierScore);

  return (
    <article className="group/card flex flex-col bg-transparent rounded-md overflow-hidden relative transition-all duration-250 ease-in-out hover:-translate-y-1" id={`video-card-${video.id}`}>
      {/* Thumbnail Wrap */}
      <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="relative block w-full aspect-video rounded-md overflow-hidden border border-border-subtle bg-surface-raised">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-250 ease-in-out group-hover/card:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
            }}
            className="w-full h-full flex items-center justify-center text-zinc-400 font-semibold text-xs transition-transform duration-250 ease-in-out group-hover/card:scale-[1.04]"
          >
            <span>No Thumbnail</span>
          </div>
        )}
        <span className="absolute bottom-2 right-2 bg-black/82 text-white text-[0.72rem] font-semibold py-0.5 px-1.5 rounded tracking-[0.02em]">{video.duration}</span>
      </a>

      {/* Video Info / Details */}
      <div className="flex pt-2 pb-1 px-0.5 gap-2.5 relative">
        {/* Profile Avatar */}
        <Link href={`/creators/${encodeURIComponent(video.creator)}/outliers`} className="shrink-0 group/avatar">
          <img
            src={video.creatorAvatar}
            alt={video.creator}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full bg-surface-raised border border-border object-cover transition-all duration-150 group-hover/avatar:scale-105 group-hover/avatar:border-brand"
          />
        </Link>

        {/* Text Metadata */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <h3 className="text-[0.95rem] font-semibold leading-[1.35] text-primary line-clamp-2 overflow-hidden text-ellipsis max-h-[2.7em] tracking-[-0.01em] sm:text-[0.95rem] text-[0.9rem]" title={video.title}>
            <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand transition-colors duration-150">
              {video.title}
            </a>
          </h3>
          
          <Link href={`/creators/${encodeURIComponent(video.creator)}/outliers`} className="text-[0.82rem] font-medium text-secondary hover:text-brand transition-colors duration-150 w-fit">
            {video.creator}
          </Link>
          
          <div className="flex flex-col gap-1 mt-0.5">
            <div className="flex items-center text-[0.8rem] text-secondary whitespace-nowrap sm:text-[0.8rem] text-[0.78rem]">
              <span>{video.views}</span>
              <span className="opacity-50 mx-1">•</span>
              <span>{video.publishedAt}</span>
            </div>

            {/* Dynamic Outlier Score Badge */}
            <div
              className="text-[0.78rem] font-bold py-[3px] px-2 rounded-full border border-transparent inline-flex items-center justify-center whitespace-nowrap w-fit"
              style={{
                backgroundColor: badgeStyle.background,
                color: badgeStyle.color,
                borderColor: badgeStyle.color
              }}
              title={`${badgeStyle.label}: ${video.outlierScore}x typical view count`}
            >
              {video.outlierScore}x
            </div>
          </div>
        </div>

        {/* Options Dropdown Menu (3 dots) */}
        <div className="absolute bottom-2 right-0.5 flex items-center" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-transparent transition-all duration-150 opacity-80 sm:opacity-0 sm:group-hover/card:opacity-100 hover:bg-surface-raised hover:text-brand cursor-pointer"
            title="More Options"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="6" r="1.5"></circle>
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="12" cy="18" r="1.5"></circle>
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute bottom-8 right-0 bg-surface border border-border rounded-md shadow-md py-1 w-48 z-[60] animate-fade-in flex flex-col">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsSentimentModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-raised hover:text-brand text-left transition-colors duration-150 cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <path d="M8 10h.01M12 10h.01M16 10h.01" />
                </svg>
                Analyze user sentiment
              </button>
              
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsSummarizeModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-raised hover:text-brand text-left transition-colors duration-150 cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Summarize
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sentiment Analysis Report Modal */}
      {isSentimentModalOpen && (
        <SentimentAnalysisModal
          isOpen={isSentimentModalOpen}
          onClose={() => setIsSentimentModalOpen(false)}
          videoId={video.id}
          videoTitle={video.title}
        />
      )}

      {/* Summarization Report Modal */}
      {isSummarizeModalOpen && (
        <SummarizeModal
          isOpen={isSummarizeModalOpen}
          onClose={() => setIsSummarizeModalOpen(false)}
          videoId={video.id}
          videoTitle={video.title}
        />
      )}
    </article>
  );
}



