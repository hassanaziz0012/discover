"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  scrollContainerRef,
}: BaseModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/55 backdrop-blur-md flex items-center justify-center z-[1100] p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-surface border border-border rounded-lg w-full max-w-[640px] max-h-[85vh] shadow-lg overflow-hidden animate-scale-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between py-5 px-6 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-lg">
              {icon}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-primary tracking-[-0.01em] line-clamp-1" title={title}>
                {title}
              </h2>
              <p className="text-xs text-secondary mt-0.5 truncate">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center text-secondary rounded-full w-8 h-8 transition-all duration-150 hover:bg-surface-raised hover:text-primary shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div ref={scrollContainerRef} className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end py-4 px-6 border-t border-border-subtle bg-surface-raised shrink-0 animate-fade-in">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
