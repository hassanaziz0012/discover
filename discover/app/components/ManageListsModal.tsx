"use client";
import React, { useState } from "react";
import { Creator } from "./CreatorsList";
import { UserList } from "../types/list";

interface ManageListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: Creator | null;
  lists: UserList[];
  onToggleList: (listId: string, channelId: string, isChecked: boolean) => Promise<void>;
  onCreateList: (name: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
}

export default function ManageListsModal({
  isOpen,
  onClose,
  creator,
  lists,
  onToggleList,
  onCreateList,
  onDeleteList,
}: ManageListsModalProps) {
  const [newListName, setNewListName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [togglingListId, setTogglingListId] = useState<string | null>(null);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);

  if (!isOpen || !creator) return null;

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newListName.trim();
    if (!name) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      await onCreateList(name);
      setNewListName("");
    } catch (err: any) {
      setCreateError(err.message || "Failed to create list.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (listId: string, isCurrentlyChecked: boolean) => {
    setTogglingListId(listId);
    try {
      await onToggleList(listId, creator.channel_id, !isCurrentlyChecked);
    } catch (err) {
      console.error("Failed to toggle list membership:", err);
    } finally {
      setTogglingListId(null);
    }
  };

  const handleDelete = async (listId: string) => {
    if (deletingListId) return;
    setDeletingListId(listId);
    try {
      await onDeleteList(listId);
    } catch (err) {
      console.error("Failed to delete list:", err);
    } finally {
      setDeletingListId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-surface border border-border rounded-lg w-full max-w-[480px] shadow-lg overflow-hidden animate-scale-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between py-5 px-6 border-b border-border-subtle">
          <div className="flex flex-col gap-1 pr-4">
            <h2 className="text-xl font-bold text-primary tracking-[-0.01em]">
              Manage Lists
            </h2>
            <p className="text-xs text-secondary truncate max-w-[340px]">
              For channel: <span className="font-semibold text-brand-text">{creator.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center text-secondary rounded-full w-8 h-8 transition-all duration-150 hover:bg-surface-raised hover:text-primary"
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          {/* Section: Create New List */}
          <form onSubmit={handleCreateList} className="flex flex-col gap-2">
            <label className="text-[0.85rem] font-semibold text-primary uppercase tracking-[0.05em]">
              Create New List
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => {
                  setNewListName(e.target.value);
                  if (createError) setCreateError(null);
                }}
                placeholder="e.g. Finance, Tech, Cooking"
                maxLength={100}
                className="flex-1 bg-surface-raised border-[1.5px] border-border-subtle rounded-md py-2.5 px-4 text-[0.95rem] text-primary outline-none transition-all duration-150 focus:border-brand focus:bg-surface"
                disabled={isCreating}
              />
              <button
                type="submit"
                disabled={!newListName.trim() || isCreating}
                className="py-2.5 px-4 rounded-md text-[0.9rem] font-semibold bg-brand text-on-brand hover:bg-brand-hover disabled:bg-disabled disabled:text-secondary disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center shrink-0"
              >
                {isCreating ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  "Create"
                )}
              </button>
            </div>
            {createError && (
              <p className="text-xs text-error mt-0.5 font-medium">{createError}</p>
            )}
          </form>

          {/* Section: Lists Select checkboxes */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[0.85rem] font-semibold text-primary uppercase tracking-[0.05em]">
              Select Lists
            </label>
            
            {lists.length === 0 ? (
              <div className="py-6 text-center text-secondary border border-dashed border-border-subtle rounded-md bg-surface-raised/40">
                <p className="text-[0.9rem]">No lists found.</p>
                <p className="text-[0.75rem] text-disabled mt-1">Create one above to get started!</p>
              </div>
            ) : (
              <div className="max-h-[220px] overflow-y-auto pr-1 flex flex-col gap-2 divide-y divide-border-subtle/40">
                {lists.map((list) => {
                  const isChecked = list.channels.includes(creator.channel_id);
                  const isToggling = togglingListId === list.id;
                  const isDeleting = deletingListId === list.id;

                  return (
                    <div
                      key={list.id}
                      className="flex items-center justify-between py-2.5 first:pt-0"
                    >
                      <label className="flex items-center gap-3 cursor-pointer select-none flex-1 py-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isToggling || isDeleting}
                          onChange={() => handleToggle(list.id, isChecked)}
                          className="w-4.5 h-4.5 border-border rounded text-brand focus:ring-brand-subtle accent-brand cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className="text-[0.95rem] font-medium text-primary hover:text-brand-text transition-colors duration-150">
                          {list.name}
                        </span>
                        {isToggling && (
                          <svg className="animate-spin h-3.5 w-3.5 text-brand" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                      </label>

                      <button
                        onClick={() => handleDelete(list.id)}
                        disabled={isDeleting || isToggling}
                        className="text-disabled hover:text-error p-1.5 rounded-full hover:bg-error-subtle transition-all duration-150"
                        title="Delete list"
                      >
                        {isDeleting ? (
                          <svg className="animate-spin h-4 w-4 text-error" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end py-4 px-6 border-t border-border-subtle bg-surface-raised">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-md text-[0.9rem] font-semibold bg-brand text-on-brand shadow-sm transition-all duration-150 hover:bg-brand-hover hover:-translate-y-[1px] hover:shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
