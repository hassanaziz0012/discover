import React from "react";
import Link from "next/link";
import { Video } from "@/app/types/video";
import CreatorAvatar from "./CreatorAvatar";
import ThumbnailWrapper from "./ThumbnailWrapper";
import OutlierBadge from "./OutlierBadge";

interface MobileLayoutProps {
  videos: Video[];
  previewTheme: "dark" | "light";
  customImageSrc: string | null;
}

export default function MobileLayout({
  videos,
  previewTheme,
  customImageSrc,
}: MobileLayoutProps) {
  return (
    <div
      className={`w-full max-w-[340px] border rounded-[36px] overflow-hidden shadow-lg aspect-[9/18] p-3 flex flex-col gap-4 animate-scale-up ${
        previewTheme === "dark"
          ? "bg-[#0b0e14] border-zinc-800 text-white"
          : "bg-[#f9f9f9] border-zinc-200 text-black"
      }`}
    >
      {/* Mock Phone Status Bar */}
      <div
        className={`flex justify-between items-center px-4 pt-1.5 pb-0.5 text-[10px] font-bold ${
          previewTheme === "dark" ? "text-zinc-400" : "text-zinc-500"
        }`}
      >
        <span>9:41</span>
        <div className="flex gap-1.5 items-center">
          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm-1-8h2v5h-2zm0-3h2v2h-2z" />
          </svg>
          <span>5G</span>
        </div>
      </div>

      {/* Mobile YT Feed Cards Scroll Container */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-5 scrollbar-none">
        {videos.map((vid, index) => {
          const isCustom = vid.id === "custom-video-preview-id";
          const channelHref = `/creators/${encodeURIComponent(vid.channelId || vid.creator)}/outliers`;
          return (
            <div key={`${vid.id}-${index}`} className="flex flex-col gap-2.5 w-full">
              <ThumbnailWrapper
                thumbnailUrl={vid.thumbnailUrl}
                customImageSrc={customImageSrc}
                isCustom={isCustom}
                duration={vid.duration}
                previewTheme={previewTheme}
                className="aspect-video w-full p-2"
                durationTextSizeClass="text-[10px]"
              />

              <div className="flex gap-2.5 px-1 text-left">
                <Link href={channelHref} tabIndex={-1}>
                  <CreatorAvatar
                    creator={vid.creator}
                    creatorAvatar={vid.creatorAvatar}
                    previewTheme={previewTheme}
                    sizeClass="w-8 h-8"
                    textSizeClass="text-xs"
                  />
                </Link>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <h4
                    className={`text-[12px] font-bold line-clamp-2 leading-[1.1rem] ${
                      previewTheme === "dark" ? "text-white" : "text-zinc-950"
                    }`}
                  >
                    {vid.title}
                  </h4>
                  <div
                    className={`text-[10px] flex items-center flex-wrap gap-1 ${
                      previewTheme === "dark" ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    <Link
                      href={channelHref}
                      className="hover:underline cursor-pointer truncate font-medium"
                    >
                      {vid.creator}
                    </Link>
                    {(vid.views || vid.publishedAt) && (
                      <span>
                        • {vid.views}
                        {vid.views && vid.publishedAt && " • "}
                        {vid.publishedAt}
                      </span>
                    )}
                  </div>
                  {vid.outlierScore !== undefined && vid.outlierScore !== null && (
                    <div className="mt-1 flex">
                      <OutlierBadge
                        score={vid.outlierScore}
                        previewTheme={previewTheme}
                        className="text-[9px] font-bold py-0.2 px-1.5 rounded-full border inline-flex items-center justify-center whitespace-nowrap"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Scroll Sentinel inside scrollable viewport for mobile layout context */}
        <div id="scroll-sentinel" className="h-1 w-full" />
      </div>

      {/* Simple navigation indicator at bottom */}
      <div className="mt-auto mx-auto w-24 h-1 bg-zinc-400/30 rounded-full mb-1 flex-shrink-0" />
    </div>
  );
}
