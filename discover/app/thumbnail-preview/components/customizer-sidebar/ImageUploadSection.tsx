import React from "react";
import { ImageUploadSectionProps } from "./types";

export default function ImageUploadSection({
  customImageSrc,
  setCustomImageSrc,
  handleImageUpload,
}: ImageUploadSectionProps) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-border-subtle/30 pt-4 mt-2">
      <label className="text-xs font-semibold text-secondary uppercase tracking-wider">
        Upload Thumbnail Image
      </label>
      <div className="relative border-2 border-dashed border-border/60 hover:border-[#8B5CF6]/60 rounded-lg p-4 flex flex-col items-center justify-center bg-bg transition-colors duration-150 cursor-pointer group">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
        />
        <span className="text-xs text-[#8B5CF6] font-semibold group-hover:underline">
          {customImageSrc ? "Replace uploaded image" : "Browse local files"}
        </span>
        <span className="text-[10px] text-secondary mt-1">PNG, JPG or WebP</span>
      </div>
      {customImageSrc && (
        <button
          onClick={() => setCustomImageSrc(null)}
          className="text-xs text-error font-medium hover:underline self-end cursor-pointer"
        >
          Clear custom image
        </button>
      )}
    </div>
  );
}
