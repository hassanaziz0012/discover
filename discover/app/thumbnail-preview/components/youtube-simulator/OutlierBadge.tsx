import React from "react";
import { getOutlierBadgeStyles } from "./utils";

interface OutlierBadgeProps {
  score: number;
  previewTheme: "dark" | "light";
  className?: string;
}

export default function OutlierBadge({
  score,
  previewTheme,
  className = "text-[10px] font-bold py-0.5 px-2 rounded-full border inline-flex items-center justify-center whitespace-nowrap",
}: OutlierBadgeProps) {
  const badgeStyle = getOutlierBadgeStyles(score, previewTheme);
  return (
    <span
      className={className}
      style={{
        backgroundColor: badgeStyle.background,
        color: badgeStyle.color,
        borderColor: badgeStyle.color,
      }}
      title={`${badgeStyle.label}: ${score}x typical view count`}
    >
      {score}x
    </span>
  );
}
