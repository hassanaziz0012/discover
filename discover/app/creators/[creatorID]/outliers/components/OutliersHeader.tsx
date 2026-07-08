import React from "react";
import { ApiResponse } from "../types";
import { formatViews } from "../../../../utils/format";

interface OutliersHeaderProps {
  data: ApiResponse | null;
  isCopied: boolean;
  onCopyChannelId: () => void;
}

export function OutliersHeader({ data, isCopied, onCopyChannelId }: OutliersHeaderProps) {
  return (
    <div className="flex md:flex-row flex-col md:items-start items-start gap-6 pb-6 border-b border-border-subtle mb-8">
      <img
        src={data?.channel_avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(data?.channel_name || "creator")}`}
        alt={data?.channel_name || "Creator avatar"}
        referrerPolicy="no-referrer"
        className="w-20 h-20 rounded-full bg-surface-raised border border-border object-cover shadow-sm transition-transform duration-200 hover:scale-102 mt-1"
      />
      
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-extrabold text-primary tracking-tight mb-1">
          <a
            href={`https://youtube.com/channel/${data?.channel_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group hover:text-brand transition-colors duration-150 inline-flex items-center gap-2"
          >
            {data?.channel_name}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="opacity-40 group-hover:opacity-100 group-hover:text-brand transition-all duration-150"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </h1>
        
        <div className="flex items-center gap-1.5 text-[0.82rem] text-secondary">
          <span className="font-semibold text-primary truncate max-w-[250px]">{data?.channel_id}</span>
          <button
            onClick={onCopyChannelId}
            className="p-1 hover:bg-surface-raised text-disabled hover:text-primary rounded transition-all duration-150"
            title="Copy Channel ID"
          >
            {isCopied ? (
              <span className="text-brand font-semibold text-[0.75rem] px-1.5 py-0.5 bg-brand-subtle rounded-md">Copied!</span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            )}
          </button>
        </div>

        {data?.channel_description && (
          <p className="text-[0.9rem] text-secondary max-w-[650px] leading-relaxed mt-2 line-clamp-3" title={data.channel_description}>
            {data.channel_description}
          </p>
        )}
      </div>

      {/* Quick Channel Statistics Column Indicators */}
      <div className="flex flex-wrap gap-3 md:mt-0 mt-4">
        <div className="bg-surface border border-border-subtle px-4 py-3 rounded-xl shadow-xs text-center min-w-[105px] flex-1">
          <span className="block text-secondary text-[0.72rem] font-bold uppercase tracking-wider mb-0.5">Analyzed</span>
          <span className="text-xl font-extrabold text-primary">{data?.total_videos}</span>
        </div>
        <div className="bg-surface border border-border-subtle px-4 py-3 rounded-xl shadow-xs text-center min-w-[105px] flex-1">
          <span className="block text-secondary text-[0.72rem] font-bold uppercase tracking-wider mb-0.5">Avg Views</span>
          <span className="text-xl font-extrabold text-primary">
            {data?.average_views ? formatViews(data.average_views).split(" ")[0] : "0"}
          </span>
        </div>
        <div className="bg-surface border border-border-subtle px-4 py-3 rounded-xl shadow-xs text-center min-w-[105px] flex-1">
          <span className="block text-secondary text-[0.72rem] font-bold uppercase tracking-wider mb-0.5">Avg Likes</span>
          <span className="text-xl font-extrabold text-primary">
            {data?.average_likes ? formatViews(data.average_likes).split(" ")[0] : "0"}
          </span>
        </div>
      </div>
    </div>
  );
}
