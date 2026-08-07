"use client";

import React, { useState } from "react";

export interface PresetItem {
  id: string;
  label: string;
  tooltip: string;
}

export const PRESET_OPTIONS: PresetItem[] = [
  {
    id: "breakouts",
    label: "🚀 Breakouts",
    tooltip: "Under-50K creators whose recent posts did 5x+ their usual numbers",
  },
  {
    id: "hidden_gems",
    label: "💎 Hidden gems",
    tooltip: "Tiny accounts (under 20K) with posts that did 10x+ their usual reach",
  },
  {
    id: "proven_at_scale",
    label: "⚖️ Proven at scale",
    tooltip: "100K–1M creators' overperformers — ideas validated on a big audience",
  },
  {
    id: "viral_now",
    label: "🔥 Viral now",
    tooltip: "The biggest overperformers of the last 30 days — at least 500 likes (50K views where views count)",
  },
  {
    id: "all_time_greats",
    label: "👑 All-time greats",
    tooltip: "The best-performing reference posts ever indexed — no date limit",
  },
];

interface PresetPillsProps {
  activePreset: string | null;
  onSelectPreset: (presetId: string | null) => void;
}

export default function PresetPills({ activePreset, onSelectPreset }: PresetPillsProps) {
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);

  const handlePresetClick = (presetId: string) => {
    if (activePreset === presetId) {
      onSelectPreset(null); // Toggle off if clicked again
    } else {
      onSelectPreset(presetId);
    }
  };

  return (
    <div className="relative flex flex-wrap items-center gap-2 py-1 z-20">
      <span className="text-xs font-semibold text-secondary uppercase tracking-wider shrink-0 mr-1 select-none flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        Presets:
      </span>
      {PRESET_OPTIONS.map((preset) => {
        const isActive = activePreset === preset.id;
        const isHovered = hoveredPreset === preset.id;

        return (
          <div key={preset.id} className="relative inline-flex items-center shrink-0">
            <button
              id={`preset-pill-${preset.id}`}
              onClick={() => handlePresetClick(preset.id)}
              onMouseEnter={() => setHoveredPreset(preset.id)}
              onMouseLeave={() => setHoveredPreset(null)}
              className={`py-1.5 px-3.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-150 cursor-pointer flex items-center gap-1.5 select-none ${
                isActive
                  ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/50 shadow-xs ring-1 ring-amber-500/30"
                  : "bg-surface border-border-subtle text-secondary hover:text-primary hover:border-border hover:bg-surface-raised"
              }`}
            >
              {preset.label}
            </button>

            {/* Custom Hover Tooltip */}
            {isHovered && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 p-2.5 bg-surface-overlay text-primary text-xs rounded-lg border border-border shadow-xl pointer-events-none text-center leading-relaxed">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-surface-overlay border-t border-l border-border rotate-45"></div>
                <div className="font-semibold text-amber-400 mb-0.5 relative z-10">{preset.label}</div>
                <div className="text-secondary font-normal text-[0.75rem] relative z-10">{preset.tooltip}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
