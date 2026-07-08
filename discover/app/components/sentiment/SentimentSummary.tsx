"use client";

import React from "react";

interface SentimentSummaryProps {
  summaries: string[];
}

export default function SentimentSummary({ summaries }: SentimentSummaryProps) {
  if (!summaries || summaries.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-bold text-primary uppercase tracking-[0.05em] px-1">
        AI Sentiment Summary
      </h3>
      <div className="flex flex-col gap-3">
        {summaries.map((sum, index) => (
          <div
            key={index}
            className="p-4 bg-brand/5 border-l-4 border-brand rounded-r-xl text-[0.88rem] leading-relaxed text-primary"
          >
            {sum}
          </div>
        ))}
      </div>
    </div>
  );
}
