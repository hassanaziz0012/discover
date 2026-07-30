import React from "react";
import Link from "next/link";
import { Video } from "@/app/types/video";
import CreatorAvatar from "./CreatorAvatar";
import ThumbnailWrapper from "./ThumbnailWrapper";
import OutlierBadge from "./OutlierBadge";

interface SearchPageLayoutProps {
  videos: Video[];
  previewTheme: "dark" | "light";
  customImageSrc: string | null;
}

export default function SearchPageLayout({
  videos,
  previewTheme,
  customImageSrc,
}: SearchPageLayoutProps) {
  return (
    <div className="w-full max-w-[800px] flex flex-col gap-6 animate-scale-up">
      {videos.map((vid, index) => {
        const isCustom = vid.id === "custom-video-preview-id";
        const channelHref = `/creators/${encodeURIComponent(vid.channelId || vid.creator)}/outliers`;
        return (
          <div key={`${vid.id}-${index}`} className="flex flex-col sm:flex-row gap-4 group w-full">
            <ThumbnailWrapper
              thumbnailUrl={vid.thumbnailUrl}
              customImageSrc={customImageSrc}
              isCustom={isCustom}
              duration={vid.duration}
              previewTheme={previewTheme}
              className="aspect-video w-full sm:w-[280px] rounded-xl p-2 flex-shrink-0"
            />

            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <h4
                className={`text-base font-semibold line-clamp-2 leading-[1.35rem] ${
                  previewTheme === "dark" ? "text-white" : "text-zinc-950"
                }`}
              >
                {vid.title}
              </h4>
              
              {(vid.views || vid.publishedAt || (vid.outlierScore !== undefined && vid.outlierScore !== null)) && (
                <div className="flex items-center flex-wrap gap-2 mt-0.5">
                  {(vid.views || vid.publishedAt) && (
                    <span className={`text-xs ${previewTheme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>
                      {vid.views}
                      {vid.views && vid.publishedAt && " • "}
                      {vid.publishedAt}
                    </span>
                  )}
                  {vid.outlierScore !== undefined && vid.outlierScore !== null && (
                    <OutlierBadge score={vid.outlierScore} previewTheme={previewTheme} />
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 my-1">
                <Link href={channelHref} className="flex items-center gap-2 max-w-full">
                  <CreatorAvatar
                    creator={vid.creator}
                    creatorAvatar={vid.creatorAvatar}
                    previewTheme={previewTheme}
                    sizeClass="w-6 h-6"
                    textSizeClass="text-[9px]"
                  />
                  <span
                    className={`text-xs hover:underline cursor-pointer truncate font-medium ${
                      previewTheme === "dark" ? "text-zinc-300" : "text-zinc-700"
                    }`}
                  >
                    {vid.creator}
                  </span>
                </Link>
              </div>

              <p
                className={`text-xs line-clamp-2 leading-relaxed ${
                  previewTheme === "dark" ? "text-zinc-500" : "text-zinc-500"
                }`}
              >
                {isCustom 
                  ? "This is an in-depth video showing the step-by-step process of creating premium, highly engaging content. Check out the channel for more resources!"
                  : `Watch the latest video from ${vid.creator} analyzing trends and sharing keys to success. Join now for exclusive tips!`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
