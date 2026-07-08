import React from "react";
import { DEFAULT_PLACEHOLDER_BG } from "./utils";

interface ThumbnailWrapperProps {
  thumbnailUrl?: string | null;
  customImageSrc: string | null;
  isCustom: boolean;
  duration?: string | null;
  previewTheme: "dark" | "light";
  className?: string;
  showPlayOverlay?: boolean;
  durationTextSizeClass?: string;
}

export default function ThumbnailWrapper({
  thumbnailUrl,
  customImageSrc,
  isCustom,
  duration,
  previewTheme,
  className = "aspect-video w-full rounded-xl p-2",
  showPlayOverlay = false,
  durationTextSizeClass = "text-[11px]",
}: ThumbnailWrapperProps) {
  const bgImage = isCustom
    ? (customImageSrc ? `url(${customImageSrc})` : DEFAULT_PLACEHOLDER_BG)
    : (thumbnailUrl ? `url(${thumbnailUrl})` : DEFAULT_PLACEHOLDER_BG);

  return (
    <div
      style={{
        backgroundImage: bgImage,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className={`${className} relative overflow-hidden shadow-md flex items-end justify-end border ${
        previewTheme === "dark" ? "border-zinc-800" : "border-zinc-200"
      }`}
    >
      {showPlayOverlay && (
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/80 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform duration-150">
            <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
      {duration && (
        <span className={`bg-black/85 text-white font-semibold ${durationTextSizeClass} px-1.5 py-0.5 rounded tracking-wide z-10`}>
          {duration}
        </span>
      )}
    </div>
  );
}
