import React, { useState, useEffect, useRef } from "react";

export interface ExpandableSearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  placeholder?: string;
  title?: string;
  ariaLabel?: string;
}

export default function ExpandableSearchBar({
  query,
  setQuery,
  placeholder = "Search...",
  title = "Search",
  ariaLabel = "Search",
}: ExpandableSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggleExpand = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      if (!query) {
        setIsExpanded(false);
      }
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!query) {
          setIsExpanded(false);
        }
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !query) {
        setIsExpanded(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [query]);

  return (
    <div
      ref={containerRef}
      className={`flex items-center bg-surface-raised border border-border-subtle rounded-full shadow-xs transition-all duration-300 ease-in-out h-[38px] overflow-hidden ${
        isExpanded
          ? "w-40 sm:w-56 px-3 gap-2"
          : "w-[38px] justify-center cursor-pointer hover:bg-surface-overlay hover:border-border"
      }`}
      onClick={() => {
        if (!isExpanded) handleToggleExpand();
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          if (isExpanded) {
            e.stopPropagation();
            handleToggleExpand();
          }
        }}
        className="flex items-center justify-center text-secondary hover:text-primary shrink-0 transition-transform duration-200"
        title={isExpanded ? "Collapse search" : title}
        aria-label={ariaLabel}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={`bg-transparent border-none text-[0.82rem] text-primary placeholder-disabled outline-none focus:outline-none transition-all duration-300 ease-in-out ${
          isExpanded ? "w-full opacity-100" : "w-0 opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      />

      {isExpanded && query && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setQuery("");
            inputRef.current?.focus();
          }}
          className="text-secondary hover:text-primary p-0.5 rounded-full hover:bg-surface-overlay transition-colors shrink-0"
          title="Clear search"
          aria-label="Clear search"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  );
}
