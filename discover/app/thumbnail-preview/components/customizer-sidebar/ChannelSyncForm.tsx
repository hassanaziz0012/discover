import React from "react";
import { ChannelSyncFormProps } from "./types";

export default function ChannelSyncForm({
  channelName,
  setChannelName,
  channelUrl,
  setChannelUrl,
  profilePicture,
  setProfilePicture,
  dbSaving,
  dbSaveSuccess,
  handleSaveChannelToDb,
}: ChannelSyncFormProps) {
  return (
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
  );
}
