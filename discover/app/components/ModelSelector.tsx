"use client";

import React from "react";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
}

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <label className="text-[0.85rem] font-bold text-primary uppercase tracking-[0.05em] px-1">
        AI Model
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange("gemini-3.5-flash")}
          className={`p-4 rounded-xl border text-left flex flex-col gap-1.5 transition-all duration-150 cursor-pointer ${
            value === "gemini-3.5-flash"
              ? "bg-brand/5 border-brand ring-1 ring-brand"
              : "bg-surface-raised border-border-subtle hover:bg-surface-overlay hover:border-brand/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-primary">Gemini 3.5 Flash</span>
            {value === "gemini-3.5-flash" && (
              <span className="w-2 h-2 bg-brand rounded-full"></span>
            )}
          </div>
          <span className="text-xs text-secondary leading-normal">
            Fast, accurate, and optimized for structured text analysis.
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange("gemma-4")}
          className={`p-4 rounded-xl border text-left flex flex-col gap-1.5 transition-all duration-150 cursor-pointer ${
            value === "gemma-4"
              ? "bg-brand/5 border-brand ring-1 ring-brand"
              : "bg-surface-raised border-border-subtle hover:bg-surface-overlay hover:border-brand/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-primary">Gemma 4</span>
            {value === "gemma-4" && (
              <span className="w-2 h-2 bg-brand rounded-full"></span>
            )}
          </div>
          <span className="text-xs text-secondary leading-normal">
            Open weights model, optimized for advanced reasoning.
          </span>
        </button>
      </div>
    </div>
  );
}
