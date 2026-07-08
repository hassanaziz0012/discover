import React from "react";

export interface CustomizerSidebarProps {
  viewMode: "youtube" | "size";
  setViewMode: (mode: "youtube" | "size") => void;
  previewLayout: "desktop-grid" | "search-page" | "desktop-list" | "mobile";
  setPreviewLayout: (layout: "desktop-grid" | "search-page" | "desktop-list" | "mobile") => void;
  previewTheme: "dark" | "light";
  setPreviewTheme: React.Dispatch<React.SetStateAction<"dark" | "light">>;
  videoTitle: string;
  setVideoTitle: (title: string) => void;
  duration: string;
  setDuration: (duration: string) => void;
  views: string;
  setViews: (views: string) => void;
  relativeTime: string;
  setRelativeTime: (time: string) => void;
  outlierScore: number;
  setOutlierScore: (score: number) => void;
  customImageSrc: string | null;
  setCustomImageSrc: (src: string | null) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  channelName: string;
  setChannelName: (name: string) => void;
  channelUrl: string;
  setChannelUrl: (url: string) => void;
  profilePicture: string;
  setProfilePicture: (pic: string) => void;
  dbSaving: boolean;
  dbSaveSuccess: boolean;
  handleSaveChannelToDb: () => Promise<void>;
  handleShuffleInputs: () => void;
  handleResetFields: () => void;
  onCollapse: () => void;
}

export default function CustomizerSidebar({
  viewMode,
  setViewMode,
  previewLayout,
  setPreviewLayout,
  previewTheme,
  setPreviewTheme,
  videoTitle,
  setVideoTitle,
  duration,
  setDuration,
  views,
  setViews,
  relativeTime,
  setRelativeTime,
  outlierScore,
  setOutlierScore,
  customImageSrc,
  setCustomImageSrc,
  handleImageUpload,
  channelName,
  setChannelName,
  channelUrl,
  setChannelUrl,
  profilePicture,
  setProfilePicture,
  dbSaving,
  dbSaveSuccess,
  handleSaveChannelToDb,
  handleShuffleInputs,
  handleResetFields,
  onCollapse,
}: CustomizerSidebarProps) {
  return (
    <section className="lg:col-span-3 flex flex-col gap-6 bg-surface border border-border-subtle p-6 rounded-xl shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary mb-1">Preview Customizer</h2>
          <p className="text-secondary text-sm">Configure layouts, themes, metadata, and channel details.</p>
        </div>
        <button
          onClick={onCollapse}
          title="Collapse Sidebar"
          className="p-1.5 hover:bg-surface-raised active:scale-[0.95] rounded-lg border border-border-subtle/30 text-secondary hover:text-primary transition-all cursor-pointer flex-shrink-0"
        >
          <svg className="w-5 h-5 text-secondary hover:text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <path d="M15 15l-3-3 3-3" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {/* View Mode Toggle Tabs */}
        <div className="flex bg-bg p-1.5 rounded-full border border-border-subtle/30 w-full">
          <button
            onClick={() => setViewMode("youtube")}
            className={`flex-1 text-center py-2.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
              viewMode === "youtube"
                ? "bg-[#8B5CF6] text-white shadow-sm"
                : "text-secondary hover:text-primary"
            }`}
          >
            YouTube View
          </button>
          <button
            onClick={() => setViewMode("size")}
            className={`flex-1 text-center py-2.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
              viewMode === "size"
                ? "bg-[#8B5CF6] text-white shadow-sm"
                : "text-secondary hover:text-primary"
            }`}
          >
            Size View
          </button>
        </div>

        {/* Layout Selector Icons */}
        <div className="flex items-center justify-around bg-bg p-2 rounded-full border border-border-subtle/30">
          {/* Desktop Grid */}
          <button
            onClick={() => {
              setPreviewLayout("desktop-grid");
              setViewMode("youtube");
            }}
            title="Desktop Page"
            className={`p-2.5 rounded-full transition-all duration-150 cursor-pointer ${
              previewLayout === "desktop-grid" && viewMode === "youtube"
                ? "bg-[#8B5CF6] text-white shadow-sm"
                : "text-secondary hover:text-primary"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </button>

          {/* Search Page */}
          <button
            onClick={() => {
              setPreviewLayout("search-page");
              setViewMode("youtube");
            }}
            title="Search Page"
            className={`p-2.5 rounded-full transition-all duration-150 cursor-pointer ${
              previewLayout === "search-page" && viewMode === "youtube"
                ? "bg-[#8B5CF6] text-white shadow-sm"
                : "text-secondary hover:text-primary"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Sidebar List */}
          <button
            onClick={() => {
              setPreviewLayout("desktop-list");
              setViewMode("youtube");
            }}
            title="Sidebar Page"
            className={`p-2.5 rounded-full transition-all duration-150 cursor-pointer ${
              previewLayout === "desktop-list" && viewMode === "youtube"
                ? "bg-[#8B5CF6] text-white shadow-sm"
                : "text-secondary hover:text-primary"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>

          {/* Mobile Page */}
          <button
            onClick={() => {
              setPreviewLayout("mobile");
              setViewMode("youtube");
            }}
            title="Mobile Page"
            className={`p-2.5 rounded-full transition-all duration-150 cursor-pointer ${
              previewLayout === "mobile" && viewMode === "youtube"
                ? "bg-[#8B5CF6] text-white shadow-sm"
                : "text-secondary hover:text-primary"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12" y2="18.01" />
            </svg>
          </button>
        </div>

        {/* Action Grid Container */}
        <div className="bg-bg p-4 rounded-xl border border-border-subtle/30 grid grid-cols-3 gap-3">
          {/* Theme toggle */}
          <button
            onClick={() => setPreviewTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            className="flex items-center gap-2 justify-center py-2 px-3 bg-surface-raised hover:bg-surface-overlay active:scale-[0.98] border border-border-subtle/30 rounded-full text-xs font-bold text-primary transition-all cursor-pointer"
          >
            {previewTheme === "dark" ? (
              <>
                <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
                <span>Dark</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.22" x2="5.64" y2="17.78" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                <span>Light</span>
              </>
            )}
          </button>

          {/* Shuffle button */}
          <button
            onClick={handleShuffleInputs}
            className="flex items-center gap-2 justify-center py-2 px-3 bg-surface-raised hover:bg-surface-overlay active:scale-[0.98] border border-border-subtle/30 rounded-full text-xs font-bold text-primary transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
            <span>Shuffle</span>
          </button>

          {/* Reset button */}
          <button
            onClick={handleResetFields}
            className="flex items-center gap-2 justify-center py-2 px-3 bg-surface-raised hover:bg-surface-overlay active:scale-[0.98] border border-border-subtle/30 rounded-full text-xs font-bold text-primary transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67" />
            </svg>
            <span>Reset</span>
          </button>
        </div>

        {/* Video Settings */}
        <div className="flex flex-col gap-4 border-t border-border-subtle/30 pt-4 mt-2">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Video Details</span>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">
              Video Title ({videoTitle.length} chars)
            </label>
            <textarea
              rows={2}
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors duration-150 resize-none"
              placeholder="Enter video title..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">Video Length</label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors"
                placeholder="e.g. 14:20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">Views Display</label>
              <input
                type="text"
                value={views}
                onChange={(e) => setViews(e.target.value)}
                className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors"
                placeholder="e.g. 124K views"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">Upload Time ago</label>
              <input
                type="text"
                value={relativeTime}
                onChange={(e) => setRelativeTime(e.target.value)}
                className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors"
                placeholder="e.g. 2 days ago"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">Outlier Score (x)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={outlierScore}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setOutlierScore(isNaN(val) ? 0 : val);
                }}
                className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors"
                placeholder="e.g. 2.5"
              />
            </div>
          </div>
        </div>

        {/* Upload Custom Image */}
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

        {/* Active Channel Details (Database Synced) */}
        <div className="flex flex-col gap-4 border-t border-border-subtle/30 pt-4 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Select Active Channel</span>
            <span className="text-[10px] text-secondary bg-surface-raised px-2.5 py-0.5 rounded-full border border-border-subtle/30">Synced</span>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">Channel Name</label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors"
              placeholder="e.g. Phantom Creator"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">Video Creator (Handle/URL)</label>
            <input
              type="text"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors"
              placeholder="e.g. @phantomcreator"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-secondary font-medium uppercase tracking-wide">Profile Picture URL</label>
            <input
              type="text"
              value={profilePicture}
              onChange={(e) => setProfilePicture(e.target.value)}
              className="w-full text-xs bg-bg border border-border-subtle rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-[#8B5CF6] transition-colors"
              placeholder="e.g. https://images.unsplash.com/photo-..."
            />
          </div>

          <button
            onClick={handleSaveChannelToDb}
            disabled={dbSaving}
            className="w-full text-center py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:bg-[#8B5CF6]/50 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {dbSaving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Saving to DB...</span>
              </>
            ) : dbSaveSuccess ? (
              <>
                <svg className="w-3.5 h-3.5 text-white animate-scale-up" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Saved to Database!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 01-2-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>Update Channel in DB</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
