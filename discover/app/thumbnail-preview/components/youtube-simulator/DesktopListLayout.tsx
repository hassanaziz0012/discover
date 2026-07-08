import React from "react";
import { Video } from "@/app/types/video";
import ThumbnailWrapper from "./ThumbnailWrapper";
import OutlierBadge from "./OutlierBadge";

interface DesktopListLayoutProps {
  videos: Video[];
  previewTheme: "dark" | "light";
  customImageSrc: string | null;
}

export default function DesktopListLayout({
  videos,
  previewTheme,
  customImageSrc,
}: DesktopListLayoutProps) {
  return (
    <div className="w-full max-w-[400px] flex flex-col gap-4 animate-scale-up">
      {videos.map((vid) => {
        const isCustom = vid.id === "custom-video-preview-id";
        return (
          <div key={vid.id} className="flex gap-2.5 group w-full">
            <ThumbnailWrapper
              thumbnailUrl={vid.thumbnailUrl}
              customImageSrc={customImageSrc}
              isCustom={isCustom}
              duration={vid.duration}
              previewTheme={previewTheme}
              className="aspect-video w-[168px] rounded-lg p-1.5 flex-shrink-0"
              durationTextSizeClass="text-[10px]"
            />

            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <h4
                className={`text-[13px] font-bold line-clamp-2 leading-[1.15rem] ${
                  previewTheme === "dark" ? "text-white" : "text-zinc-950"
                }`}
              >
                {vid.title}
              </h4>
              <span
                className={`text-[11px] hover:underline cursor-pointer mt-1 truncate ${
                  previewTheme === "dark" ? "text-zinc-400" : "text-zinc-600"
                }`}
              >
                {vid.creator}
              </span>
              {(vid.views || vid.publishedAt) && (
                <span
                  className={`text-[11px] ${
                    previewTheme === "dark" ? "text-zinc-500" : "text-zinc-500"
                  }`}
                >
                  {vid.views}
                  {vid.views && vid.publishedAt && " • "}
                  {vid.publishedAt}
                </span>
              )}
              {vid.outlierScore !== undefined && vid.outlierScore !== null && (
                <div className="mt-1 flex">
                  <OutlierBadge
                    score={vid.outlierScore}
                    previewTheme={previewTheme}
                    className="text-[10px] font-bold py-0.5 px-1.5 rounded-full border inline-flex items-center justify-center whitespace-nowrap"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
