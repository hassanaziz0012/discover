import React, { useState } from "react";
import { sizeConfigs } from "@/app/utils/sizeConfig";
import CategorySelector from "./CategorySelector";
import SizePreviewCard from "./SizePreviewCard";

export interface SizeReadabilityGridProps {
  previewTheme: "dark" | "light";
  customImageSrc: string | null;
  duration: string;
  videoTitle?: string;
  channelName?: string;
  profilePicture?: string;
  views?: string;
  relativeTime?: string;
}

export default function SizeReadabilityGrid({
  previewTheme,
  customImageSrc,
  duration,
  videoTitle = "",
  channelName = "",
  profilePicture = "",
  views = "",
  relativeTime = "",
}: SizeReadabilityGridProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | "browser" | "mobile" | "tv">("all");

  // Filtering based on active category tab
  const filteredConfigs = sizeConfigs.filter(
    (config) => activeCategory === "all" || config.category === activeCategory
  );

  return (
    <div className="w-full flex flex-col gap-6 animate-scale-up">
      {/* Category selector tab bar */}
      <CategorySelector
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      {/* Main Grid display area */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {filteredConfigs.map((config) => (
          <SizePreviewCard
            key={config.id}
            config={config}
            previewTheme={previewTheme}
            customImageSrc={customImageSrc}
            duration={duration}
            videoTitle={videoTitle}
            channelName={channelName}
            profilePicture={profilePicture}
            views={views}
            relativeTime={relativeTime}
          />
        ))}
      </div>
    </div>
  );
}
