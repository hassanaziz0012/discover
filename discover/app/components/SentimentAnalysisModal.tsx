"use client";

import React, { useState, useEffect, useRef } from "react";
import BaseModal from "./BaseModal";
import SentimentConfigForm from "./sentiment/SentimentConfigForm";
import PreviousReportsList from "./sentiment/PreviousReportsList";
import SentimentSummary from "./sentiment/SentimentSummary";
import SentimentThemes from "./sentiment/SentimentThemes";
import CommentAnalysisList from "./sentiment/CommentAnalysisList";
import { API_BASE_URL } from "@/app/utils/constants";

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
  
  // Previous analyses state
  const [oldAnalyses, setOldAnalyses] = useState<any[]>([]);

  // Scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchOldAnalyses = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/youtube/video-sentiment-reports?video_id=${encodeURIComponent(
          videoId
        )}`
      );
      if (response.ok) {
        const data = await response.json();
        setOldAnalyses(data);
      }
    } catch (err) {
      console.error("Failed to fetch old sentiment analyses:", err);
    }
  };

  useEffect(() => {
    if (isOpen && videoId) {
      fetchOldAnalyses();
    }
  }, [isOpen, videoId]);

  const handleStartAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setReport(null);
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
        fetchOldAnalyses();
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

  const handleSelectReport = (selectedReport: SentimentReport) => {
    setReport(selectedReport);
    setHasStarted(true);
  };

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
          <SentimentConfigForm
            model={model}
            setModel={setModel}
            limit={limit}
            setLimit={setLimit}
            customLimit={customLimit}
            setCustomLimit={setCustomLimit}
          />
          <PreviousReportsList
            oldAnalyses={oldAnalyses}
            onSelectReport={handleSelectReport}
          />
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
        <div className="flex flex-col gap-6 py-2">
          <SentimentSummary summaries={report.summaries} />
          <SentimentThemes themes={report.most_common_reasons} />
          <CommentAnalysisList
            analyses={report.analyses}
            scrollContainerRef={scrollContainerRef}
          />
        </div>
      )}
    </BaseModal>
  );
}
