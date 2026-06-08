import React from "react";

export interface CreatorsHeaderProps {
  creatorsLayout: "list" | "grid";
  setCreatorsLayout: (layout: "list" | "grid") => void;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  refreshStatus: { type: "success" | "error"; message: string } | null;
  setRefreshStatus: (status: { type: "success" | "error"; message: string } | null) => void;
  children?: React.ReactNode;
}

export default function CreatorsHeader({
  creatorsLayout,
  setCreatorsLayout,
  isRefreshing,
  onRefresh,
  refreshStatus,
  setRefreshStatus,
  children,
}: CreatorsHeaderProps) {
  return (
    <div className="flex flex-col gap-3 mb-4 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        {children && <div className="flex-1 min-w-0">{children}</div>}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {/* Layout Toggles */}
          <div className="flex items-center bg-surface-raised border border-border-subtle p-0.5 rounded-full shadow-xs">
            <button
              onClick={() => setCreatorsLayout("list")}
              className={`p-1.5 rounded-full transition-all duration-150 ${
                creatorsLayout === "list"
                  ? "bg-brand text-on-brand shadow-xs"
                  : "text-secondary hover:text-primary hover:bg-surface-overlay"
              }`}
              title="List View"
              aria-label="List View"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
            <button
              onClick={() => setCreatorsLayout("grid")}
              className={`p-1.5 rounded-full transition-all duration-150 ${
                creatorsLayout === "grid"
                  ? "bg-brand text-on-brand shadow-xs"
                  : "text-secondary hover:text-primary hover:bg-surface-overlay"
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-4 py-2 text-[0.82rem] font-bold rounded-full border border-border-subtle bg-surface-raised text-primary hover:bg-surface-overlay hover:border-brand active:scale-[0.98] transition-all duration-150 ease-in-out shadow-xs select-none ${
              isRefreshing ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Refresh all creators"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-brand" : "text-secondary hover:text-brand"}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            {isRefreshing ? "Refreshing Channels..." : "Refresh Channels"}
          </button>
        </div>
      </div>

      {refreshStatus && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between animate-fade-in text-sm font-semibold shadow-xs ${
            refreshStatus.type === "success"
              ? "bg-brand/10 border-brand/20 text-brand"
              : "bg-error/10 border-error/20 text-error"
          }`}
        >
          <div className="flex items-center gap-2">
            {refreshStatus.type === "success" ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="shrink-0"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="shrink-0"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
            <span className="leading-relaxed">{refreshStatus.message}</span>
          </div>
          <button
            onClick={() => setRefreshStatus(null)}
            className="hover:opacity-75 transition-opacity p-1 ml-3 shrink-0"
            aria-label="Dismiss banner"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
