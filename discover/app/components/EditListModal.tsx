"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Creator } from "./CreatorsList";
import { UserList } from "../types/list";

interface EditListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: UserList | null;
  allCreators: Creator[];
  onUpdateList: (listId: string, name: string, channelIds: string[]) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
}

export default function EditListModal({
  isOpen,
  onClose,
  list,
  allCreators,
  onUpdateList,
  onDeleteList,
}: EditListModalProps) {
  const [name, setName] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with selected list prop when modal opens/changes
  useEffect(() => {
    if (isOpen && list) {
      setName(list.name);
      setSelectedChannels(new Set(list.channels));
      setSearchQuery("");
      setError(null);
      setIsConfirmingDelete(false);
    }
  }, [isOpen, list]);

  // Local client-side search filtering
  const filteredCreators = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allCreators;
    return allCreators.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q)
    );
  }, [allCreators, searchQuery]);

  if (!isOpen || !list) return null;

  const handleToggleChannel = (channelId: string) => {
    const next = new Set(selectedChannels);
    if (next.has(channelId)) {
      next.delete(channelId);
    } else {
      next.add(channelId);
    }
    setSelectedChannels(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("List name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onUpdateList(list.id, cleanName, Array.from(selectedChannels));
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await onDeleteList(list.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete list.");
      setIsConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      id="edit-list-modal-backdrop"
    >
      <div
        className="bg-surface border border-border rounded-lg w-full max-w-[500px] shadow-lg overflow-hidden animate-scale-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        id="edit-list-modal-container"
      >
        {/* Header */}
        <div className="flex items-center justify-between py-5 px-6 border-b border-border-subtle shrink-0">
          <div className="flex flex-col gap-1 pr-4">
            <h2 className="text-xl font-bold text-primary tracking-[-0.01em]">
              Manage List Settings
            </h2>
            <p className="text-xs text-secondary truncate max-w-[340px]">
              Editing configuration for <span className="font-semibold text-brand-text">{list.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center text-secondary rounded-full w-8 h-8 transition-all duration-150 hover:bg-surface-raised hover:text-primary"
            aria-label="Close modal"
            id="edit-list-close-icon-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 min-h-0">
          {/* Section: List Name */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <label
              htmlFor="edit-list-name-input"
              className="text-[0.85rem] font-semibold text-primary uppercase tracking-[0.05em]"
            >
              List Name
            </label>
            <input
              id="edit-list-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Science & Tech"
              maxLength={100}
              className="w-full bg-surface-raised border-[1.5px] border-border-subtle rounded-md py-2.5 px-4 text-[0.95rem] text-primary outline-none transition-all duration-150 focus:border-brand focus:bg-surface"
              disabled={isSaving || isDeleting}
              required
            />
          </div>

          {/* Section: Bulk Channels Management */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <label className="text-[0.85rem] font-semibold text-primary uppercase tracking-[0.05em]">
              Channels ({selectedChannels.size} selected)
            </label>

            {/* Client-side Search Input */}
            <div className="relative shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input
                id="edit-list-search-channels"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels..."
                className="w-full bg-surface-raised border border-border-subtle rounded-md py-1.5 pl-9 pr-8 text-[0.88rem] text-primary outline-none transition-all duration-150 focus:border-brand focus:bg-surface"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary transition-colors duration-150"
                  aria-label="Clear search query"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>

            {/* Channels Scrollable List Box */}
            <div className="flex-1 border border-border-subtle rounded-md bg-surface-raised/40 overflow-y-auto p-2 min-h-[160px]">
              {filteredCreators.length === 0 ? (
                <div className="py-10 text-center text-secondary">
                  <p className="text-[0.9rem]">No channels found.</p>
                  {searchQuery && <p className="text-xs text-disabled mt-1">Try another search term.</p>}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {filteredCreators.map((creator) => {
                    const isChecked = selectedChannels.has(creator.channel_id);
                    return (
                      <label
                        key={creator.channel_id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-surface-raised cursor-pointer select-none transition-all duration-150"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleChannel(creator.channel_id)}
                          className="w-4.5 h-4.5 border-border rounded text-brand focus:ring-brand-subtle accent-brand cursor-pointer shrink-0"
                        />
                        <img
                          src={creator.thumbnail_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(creator.name)}`}
                          alt={creator.name}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full border border-border object-cover shrink-0"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[0.9rem] font-semibold text-primary truncate leading-snug">
                            {creator.name}
                          </span>
                          <span className="text-xs text-secondary truncate">
                            {creator.handle}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs text-error font-medium shrink-0 animate-fade-in">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between py-4 px-6 border-t border-border-subtle bg-surface-raised shrink-0">
          {/* Delete List - Left side secondary button with inline confirmation */}
          <button
            type="button"
            id="edit-list-delete-btn"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            onMouseLeave={() => setIsConfirmingDelete(false)}
            className={`py-2 px-3.5 rounded-md text-[0.88rem] font-semibold transition-all duration-150 flex items-center gap-1.5 ${
              isConfirmingDelete
                ? "bg-error text-on-brand hover:bg-error/90 animate-pulse"
                : "border border-error/25 text-error hover:bg-error-subtle disabled:opacity-50"
            }`}
          >
            {isDeleting ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            )}
            {isConfirmingDelete ? "Confirm Delete?" : "Delete List"}
          </button>

          {/* Action buttons - Right side */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="edit-list-cancel-btn"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="py-2 px-4 rounded-md text-[0.88rem] font-semibold text-secondary hover:text-primary transition-colors duration-150 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="edit-list-save-btn"
              onClick={handleSave}
              disabled={!name.trim() || isSaving || isDeleting}
              className="py-2 px-4.5 rounded-md text-[0.88rem] font-semibold bg-brand text-on-brand hover:bg-brand-hover shadow-sm transition-all duration-150 disabled:bg-disabled disabled:text-secondary disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
            >
              {isSaving ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
