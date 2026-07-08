import React, { useState } from "react";
import { SizeConfig } from "@/app/utils/sizeConfig";

const DEFAULT_PLACEHOLDER_BG = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";

export interface SizePreviewCardProps {
  config: SizeConfig;
  previewTheme: "dark" | "light";
  customImageSrc: string | null;
  duration: string;
  videoTitle?: string;
  channelName?: string;
  profilePicture?: string;
  views?: string;
  relativeTime?: string;
}

export default function SizePreviewCard({
  config,
  previewTheme,
  customImageSrc,
  duration,
  videoTitle = "",
  channelName = "",
  profilePicture = "",
  views = "",
  relativeTime = "",
}: SizePreviewCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Fallbacks for empty customizer fields
  const displayTitle = videoTitle.trim() || "Add a title in sidebar";
  const displayChannel = channelName.trim() || "Channel Name";
  const displayViews = views.trim() || "123K views";
  const displayTime = relativeTime.trim() || "1 hour ago";
  const displayDuration = duration.trim() || "12:34";
  const displayAvatar = profilePicture.trim() || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(displayChannel)}`;
  const displayViewsAndTime = `${displayViews}${displayViews && displayTime ? " • " : ""}${displayTime}`;

  const getReadabilityBadge = (rating: "optimal" | "moderate" | "critical") => {
    switch (rating) {
      case "optimal":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
          text: "Optimal Size",
        };
      case "moderate":
        return {
          bg: "bg-purple-500/10 border-purple-500/30 text-purple-500",
          text: "Moderate Size",
        };
      case "critical":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-500",
          text: "Critical Scale",
        };
    }
  };

  const getCategoryLabel = (cat: "browser" | "mobile" | "tv") => {
    switch (cat) {
      case "browser":
        return "Desktop Browser";
      case "mobile":
        return "Mobile Feed";
      case "tv":
        return "Apple TV YouTube";
    }
  };

  // Although getReadabilityBadge is computed, matching the original component design
  const _badge = getReadabilityBadge(config.readability);

  // Base containers depending on page dark/light mode
  const pageBg = previewTheme === "dark" ? "bg-[#0f0f0f] border-zinc-800 text-white" : "bg-white border-zinc-200 text-black";
  const metaGray = previewTheme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const titleColor = previewTheme === "dark" ? "text-white" : "text-zinc-900";

  return (
    <div
      className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 relative shadow-sm ${pageBg} ${
        isHovered
          ? "border-[#8B5CF6]/50 shadow-lg shadow-[#8B5CF6]/5 -translate-y-1"
          : "border-border-subtle/40"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header card information */}
      <div className="flex items-start justify-between gap-4 mb-4 border-b border-border-subtle/10 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8B5CF6]">
              {getCategoryLabel(config.category)}
            </span>
            <span className="text-[10px] text-zinc-500">•</span>
            <span className="text-[10px] text-zinc-500 font-medium">
              {config.layout === "grid" ? "Grid Card" : "List Row"}
            </span>
          </div>
          <h3 className="text-sm font-bold text-primary">{config.name}</h3>
        </div>
        <div className="flex flex-col items-end justify-center">
          <span className="text-[11px] font-mono font-semibold opacity-70">
            {config.width} × {config.height} px
          </span>
        </div>
      </div>

      {/* Simulated Device Frame Workspace */}
      <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950/40 rounded-xl border border-zinc-900/50 mb-4 overflow-x-auto min-h-[340px]">
        {/* Mock Container matching the exact specifications */}
        {config.layout === "grid" ? (
          /* --- VERTICAL GRID CARD PREVIEW --- */
          <div
            style={{ width: `${config.width}px` }}
            className="flex flex-col gap-2.5 select-none"
          >
            {/* Thumbnail wrapper at specified dimensions */}
            <div
              style={{ width: `${config.width}px`, height: `${config.height}px` }}
              className="rounded-xl relative overflow-hidden shadow-md flex-shrink-0 bg-zinc-900 border border-zinc-800/40 group"
            >
              <div
                style={{
                  backgroundImage: customImageSrc ? `url("${customImageSrc}")` : DEFAULT_PLACEHOLDER_BG,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                className="w-full h-full transform transition-transform duration-500 group-hover:scale-105"
              />
              {/* Video duration badge */}
              <span className="absolute bottom-2.5 right-2.5 bg-black/85 text-white font-semibold text-[10px] px-1.5 py-0.5 rounded tracking-wide font-mono">
                {displayDuration}
              </span>
            </div>

            {/* Metadata area */}
            <div className="flex gap-3 px-1">
              {config.showAvatar && (
                <div
                  style={{
                    backgroundImage: `url("${displayAvatar}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  className="w-9 h-9 rounded-full bg-zinc-800 flex-shrink-0 border border-zinc-700/20"
                />
              )}
              <div className="flex-1 min-w-0">
                {/* Title text layout */}
                <h4 className={`text-xs font-bold leading-tight line-clamp-2 ${titleColor} break-words`}>
                  {displayTitle}
                </h4>
                
                {config.showChannel && (
                  <p className={`text-[11px] font-medium mt-1 truncate ${metaGray}`}>
                    {displayChannel}
                  </p>
                )}
                
                {config.showViews && (
                  <p className={`text-[10px] mt-0.5 truncate ${metaGray}`}>
                    {displayViewsAndTime}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* --- HORIZONTAL ROW LIST ITEM PREVIEW --- */
          <div
            style={{
              width: config.id === "browser-watch-later" ? "540px" : `${config.width + 180}px`,
              height: `${config.height}px`,
            }}
            className={`flex items-start gap-3 select-none text-left overflow-hidden ${
              config.id === "browser-watch-later" ? "border border-zinc-800/20 p-2 rounded-xl bg-zinc-900/10" : ""
            }`}
          >
            {/* Thumbnail element */}
            <div
              style={{ width: `${config.width}px`, height: `${config.height}px` }}
              className="rounded-lg relative overflow-hidden shadow-sm bg-zinc-900 border border-zinc-800/40 flex-shrink-0 group"
            >
              <div
                style={{
                  backgroundImage: customImageSrc ? `url("${customImageSrc}")` : DEFAULT_PLACEHOLDER_BG,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                className="w-full h-full transform transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-white font-semibold text-[9px] px-1 py-0.5 rounded tracking-wide font-mono">
                {displayDuration}
              </span>
            </div>

            {/* Metadata details on the right */}
            <div className="flex-1 min-w-0 flex flex-col justify-start h-full py-0.5">
              <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${titleColor} break-words`}>
                {displayTitle}
              </h4>
              
              {/* Avatar next to/above channel name */}
              {config.showAvatar && (
                <div className="flex items-center gap-2 mt-2 mb-1">
                  <div
                    style={{
                      backgroundImage: `url("${displayAvatar}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="w-5 h-5 rounded-full bg-zinc-800 flex-shrink-0 border border-zinc-700/20"
                  />
                  <p className={`text-[11px] font-semibold truncate ${titleColor}`}>
                    {displayChannel}
                  </p>
                </div>
              )}

              {!config.showAvatar && config.showChannel && (
                <p className={`text-[10px] mt-1 truncate ${metaGray}`}>
                  {displayChannel}
                </p>
              )}

              {config.showViews && (
                <p className={`text-[10px] mt-0.5 truncate ${metaGray}`}>
                  {displayViewsAndTime}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
