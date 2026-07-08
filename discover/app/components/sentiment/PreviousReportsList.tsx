"use client";

import React from "react";
import { SentimentReport } from "../SentimentAnalysisModal";

interface PreviousReportItem {
  model: string;
  limit: number;
  created_at: string;
  report: SentimentReport;
}

interface PreviousReportsListProps {
  oldAnalyses: PreviousReportItem[];
  onSelectReport: (report: SentimentReport) => void;
}

export default function PreviousReportsList({
  oldAnalyses,
  onSelectReport,
}: PreviousReportsListProps) {
  if (oldAnalyses.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mt-4 border-t border-border-subtle pt-4 animate-fade-in">
      <label className="text-[0.85rem] font-bold text-primary uppercase tracking-[0.05em] px-1">
        Previous Reports
      </label>
      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
        {oldAnalyses.map((analysis, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelectReport(analysis.report)}
            className="flex items-center justify-between p-3.5 bg-surface-raised border border-border-subtle rounded-xl hover:bg-surface-overlay hover:border-brand/30 transition-all duration-150 text-left cursor-pointer group"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">
                  Model:{" "}
                  <span className="text-brand font-semibold capitalize">
                    {analysis.model}
                  </span>
                </span>
                <span className="text-[0.68rem] font-medium py-0.5 px-2 bg-brand/10 text-brand rounded-full">
                  {analysis.limit} comments
                </span>
              </div>
              <span className="text-[0.72rem] text-secondary font-medium">
                Analyzed on {new Date(analysis.created_at).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-brand font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <span>View Report</span>
              <svg
                className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
