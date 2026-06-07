import React from "react";

export interface LoadingFooterProps {
  hasMore: boolean;
  isLoading: boolean;
  loadingText?: string;
  scrollText?: string;
}

export default function LoadingFooter({
  hasMore,
  isLoading,
  loadingText = "Loading more outliers...",
  scrollText = "Scroll down to load more...",
}: LoadingFooterProps) {
  return (
    <>
      {/* Scroll Sentinel */}
      {hasMore && !isLoading && (
        <div id="scroll-sentinel" className="h-10 w-full flex items-center justify-center mb-6">
          <span className="text-secondary text-sm">{scrollText}</span>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="h-16 w-full flex items-center justify-center gap-2.5 text-brand mb-6">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="font-semibold text-sm">{loadingText}</span>
        </div>
      )}
    </>
  );
}
