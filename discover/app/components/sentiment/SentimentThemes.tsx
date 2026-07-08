"use client";

import React from "react";
import { SentimentReasonCount } from "../SentimentAnalysisModal";

interface SentimentThemesProps {
  themes: SentimentReasonCount[];
}

export default function SentimentThemes({ themes }: SentimentThemesProps) {
  if (!themes || themes.length === 0) return null;

  const maxReasonCount = themes[0]?.count || 1;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-bold text-primary uppercase tracking-[0.05em] px-1">
        Top Recurring Themes
      </h3>
      <div className="flex flex-col gap-3 bg-surface-raised border border-border-subtle rounded-xl p-4">
        {themes.slice(0, 5).map((item, idx) => {
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
  );
}
