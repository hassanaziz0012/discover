"use client";

import React from "react";
import ModelSelector from "../ModelSelector";

interface SentimentConfigFormProps {
  model: string;
  setModel: (model: string) => void;
  limit: number;
  setLimit: (limit: number) => void;
  customLimit: string;
  setCustomLimit: (limit: string) => void;
}

export default function SentimentConfigForm({
  model,
  setModel,
  limit,
  setLimit,
  customLimit,
  setCustomLimit,
}: SentimentConfigFormProps) {
  return (
    <div className="flex flex-col gap-6 py-2 animate-fade-in">
      {/* Model Choice */}
      <ModelSelector value={model} onChange={setModel} />

      {/* Limit Choice */}
      <div className="flex flex-col gap-2.5">
        <label className="text-[0.85rem] font-bold text-primary uppercase tracking-[0.05em] px-1">
          Max Comments to Fetch & Analyze
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {[50, 100, 250, 500, 1000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setLimit(preset);
                setCustomLimit("");
              }}
              className={`py-2 px-3 border rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer ${
                limit === preset && !customLimit
                  ? "bg-brand text-on-brand border-brand hover:bg-brand-hover shadow-sm"
                  : "bg-surface-raised border-border-subtle text-secondary hover:bg-surface-overlay hover:text-primary"
              }`}
            >
              {preset}
            </button>
          ))}
          
          <div className="relative flex-1 min-w-[120px]">
            <input
              type="number"
              min="1"
              max="2000"
              value={customLimit}
              placeholder="Custom (1-2000)"
              onChange={(e) => {
                const val = e.target.value;
                setCustomLimit(val);
                if (val) {
                  setLimit(0);
                } else {
                  setLimit(100);
                }
              }}
              className={`w-full bg-surface-raised border rounded-md py-1.5 px-3 text-xs text-primary transition-all duration-150 outline-none focus:bg-surface-raised ${
                customLimit
                  ? "border-brand ring-1 ring-brand"
                  : "border-border-subtle focus:border-brand/50"
              }`}
            />
          </div>
        </div>
        <p className="text-[0.72rem] text-secondary leading-relaxed">
          Analyzing more comments provides deeper insights but takes longer to compute due to batch LLM calls.
        </p>
      </div>
    </div>
  );
}
