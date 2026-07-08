import React from "react";
import { Video } from "@/app/types/video";
import CreatorAvatar from "./CreatorAvatar";
import ThumbnailWrapper from "./ThumbnailWrapper";
import OutlierBadge from "./OutlierBadge";

interface DesktopGridLayoutProps {
  videos: Video[];
  previewTheme: "dark" | "light";
  customImageSrc: string | null;
}

export default function DesktopGridLayout({
  videos,
  previewTheme,
  customImageSrc,
}: DesktopGridLayoutProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-8 w-full max-w-[1200px] animate-scale-up">
      {videos.map((vid) => {
        const isCustom = vid.id === "custom-video-preview-id";
        return (
          <div key={vid.id} className="flex flex-col gap-3 group">
            <ThumbnailWrapper
              thumbnailUrl={vid.thumbnailUrl}
              customImageSrc={customImageSrc}
              isCustom={isCustom}
              duration={vid.duration}
              previewTheme={previewTheme}
              showPlayOverlay={true}
            />

            <div className="flex gap-3">
              <CreatorAvatar
                creator={vid.creator}
                creatorAvatar={vid.creatorAvatar}
                previewTheme={previewTheme}
                sizeClass="w-9 h-9"
                textSizeClass="text-xs"
              />
              <div className="flex flex-col gap-1 w-full min-w-0">
                <h4
                  className={`text-sm font-bold line-clamp-2 leading-[1.35rem] ${
                    previewTheme === "dark" ? "text-white" : "text-zinc-950"
                  }`}
                  title={vid.title}
                >
                  {vid.title}
                </h4>
                <div
                  className={`flex flex-col text-xs leading-tight mt-0.5 ${
                    previewTheme === "dark" ? "text-zinc-400" : "text-zinc-600"
                  }`}
                >
                  <span className="hover:underline cursor-pointer truncate font-medium">{vid.creator}</span>
                  {(vid.views || vid.publishedAt) && (
                    <span>
                      {vid.views}
                      {vid.views && vid.publishedAt && " • "}
                      {vid.publishedAt}
                    </span>
                  )}
                </div>
                {vid.outlierScore !== undefined && vid.outlierScore !== null && (
                  <div className="mt-1.5 flex">
                    <OutlierBadge score={vid.outlierScore} previewTheme={previewTheme} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
