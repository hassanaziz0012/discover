import React, { useState } from "react";
import BaseModal from "./BaseModal";
import ModelSelector from "./ModelSelector";
import { API_BASE_URL } from "@/app/utils/constants";

interface SummarizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
}

interface SummaryReport {
  video_id: string;
  overview: string;
  takeaways: string[];
  chapters: { timestamp: string; title: string; description: string }[];
  model: string;
}

export default function SummarizeModal({
  isOpen,
  onClose,
  videoId,
  videoTitle,
}: SummarizeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [model, setModel] = useState<string>("gemma-4"); // Gemma 4 is default
  const [hasStarted, setHasStarted] = useState(false);

  const handleStartSummarization = async () => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    setHasStarted(true);
    console.log("Summarizing video:", videoId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_id: videoId,
          model: model,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const modelName = model === "gemma-4" ? "Gemma 4" : "Gemini 3.5 Flash";
        setReport({
          ...data,
          model: modelName,
        });
      } else {
        const errJson = await response.json().catch(() => ({}));
        setError(errJson.detail || `Failed to summarize video (Server status: ${response.status})`);
      }
    } catch (err) {
      console.error("Fetch summarization error:", err);
      setError("Unable to connect to the backend server. Please verify the backend API is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderFooter = () => {
    if (!hasStarted && !isLoading && !report && !error) {
      return (
        <div className="flex w-full sm:w-auto items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-5 rounded-md text-[0.9rem] font-semibold text-secondary transition-all duration-150 hover:bg-surface-overlay hover:text-primary text-center cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleStartSummarization}
            className="w-full sm:w-auto py-2.5 px-8 rounded-md text-[0.9rem] font-semibold bg-brand text-on-brand shadow-sm transition-all duration-150 hover:bg-brand-hover hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 text-center cursor-pointer"
          >
            Start Summarization
          </button>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex w-full sm:w-auto items-center justify-end gap-3">
          <button
            onClick={() => {
              setError(null);
              setHasStarted(false);
            }}
            className="w-full sm:w-auto py-2.5 px-5 rounded-md text-[0.9rem] font-semibold text-secondary transition-all duration-150 hover:bg-surface-overlay hover:text-primary text-center cursor-pointer"
          >
            Adjust Settings
          </button>
          <button
            onClick={handleStartSummarization}
            className="w-full sm:w-auto py-2.5 px-8 rounded-md text-[0.9rem] font-semibold bg-brand text-on-brand shadow-sm transition-all duration-150 hover:bg-brand-hover hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 text-center cursor-pointer"
          >
            Retry Summarization
          </button>
        </div>
      );
    }
    if (report) {
      return (
        <div className="flex w-full sm:w-auto items-center justify-end gap-3">
          <button
            onClick={() => {
              setReport(null);
              setHasStarted(false);
              setIsLoading(false);
              setError(null);
            }}
            className="w-full sm:w-auto py-2.5 px-5 rounded-md text-[0.9rem] font-semibold text-secondary transition-all duration-150 hover:bg-surface-overlay hover:text-primary text-center cursor-pointer"
          >
            Re-summarize
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-8 rounded-md text-[0.9rem] font-semibold bg-brand text-on-brand shadow-sm transition-all duration-150 hover:bg-brand-hover hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 text-center cursor-pointer"
          >
            Got It
          </button>
        </div>
      );
    }
    // Loading state
    return (
      <button
        className="w-full sm:w-auto py-2.5 px-8 rounded-md text-[0.9rem] font-semibold bg-brand/50 text-on-brand cursor-not-allowed text-center"
        disabled
      >
        Summarizing...
      </button>
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Video Summarization"
      subtitle={`AI-generated content summary for: ${videoTitle}`}
      icon={
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      }
      footer={renderFooter()}
    >
      {!hasStarted && !isLoading && !report && !error && (
        <div className="flex flex-col gap-6 py-2 animate-fade-in">
          {/* Model Choice */}
          <ModelSelector value={model} onChange={setModel} />

          <div className="bg-surface-raised border border-border-subtle rounded-xl p-4 flex gap-3.5 items-start">
            <div className="p-2 bg-brand/10 text-brand rounded-lg shrink-0 mt-0.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-primary uppercase tracking-[0.05em]">
                Video Summarization
              </span>
              <p className="text-[0.82rem] text-secondary leading-relaxed">
                Click **Start Summarization** to retrieve the captions transcript and run LLM analysis to compile a high-level summary, key takeaways, and chronological chapters.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
          <p className="text-secondary text-sm font-semibold animate-pulse">
            Summarizing video using {model === "gemma-4" ? "Gemma 4" : "Gemini 3.5 Flash"}...
          </p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="p-3 bg-rose-500/10 text-rose-600 rounded-full mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-primary mb-2">Summarization Failed</h3>
          <p className="text-secondary text-sm max-w-[400px] leading-relaxed mb-6">{error}</p>
        </div>
      )}

      {report && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Summary Overview */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.05em] px-1">
              Video Overview ({report.model})
            </h3>
            <div className="p-4 bg-brand/5 border-l-4 border-brand rounded-r-xl text-[0.88rem] leading-relaxed text-primary">
              {report.overview}
            </div>
          </div>

          {/* Key Takeaways */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.05em] px-1">
              Key Takeaways
            </h3>
            <ul className="flex flex-col gap-2.5">
              {report.takeaways.map((point, index) => (
                <li key={index} className="flex gap-3 items-start text-[0.85rem] text-secondary leading-relaxed">
                  <span className="p-1 bg-emerald-500/10 text-emerald-600 rounded-full mt-0.5 shrink-0 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Chapters breakdown */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.05em] px-1">
              Timeline & Chapters
            </h3>
            <div className="flex flex-col border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
              {report.chapters.map((chapter, index) => (
                <div
                  key={index}
                  className="p-3.5 bg-surface hover:bg-surface-raised transition-colors duration-150 flex gap-4"
                >
                  <span className="font-mono text-xs text-brand font-bold shrink-0 bg-brand/10 px-2 py-0.5 rounded h-fit">
                    {chapter.timestamp}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-xs font-bold text-primary">{chapter.title}</h4>
                    <p className="text-[0.78rem] text-secondary leading-relaxed">{chapter.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
