import React from "react";

interface CreatorAvatarProps {
  creator: string;
  creatorAvatar?: string | null;
  previewTheme: "dark" | "light";
  sizeClass?: string;
  textSizeClass?: string;
}

export default function CreatorAvatar({
  creator,
  creatorAvatar,
  previewTheme,
  sizeClass = "w-9 h-9",
  textSizeClass = "text-xs",
}: CreatorAvatarProps) {
  if (creatorAvatar) {
    return (
      <img
        src={creatorAvatar}
        alt={creator}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
        onError={(e) => {
          (e.target as HTMLElement).style.display = "none";
        }}
      />
    );
  }
  const initials = creator.substring(0, 2).toUpperCase();
  return (
    <div
      className={`${sizeClass} ${textSizeClass} rounded-full flex-shrink-0 flex items-center justify-center font-bold border ${
        previewTheme === "dark"
          ? "bg-zinc-800 text-[#8B5CF6] border-zinc-700"
          : "bg-zinc-100 text-[#8B5CF6] border-zinc-200"
      }`}
    >
      {initials}
    </div>
  );
}
