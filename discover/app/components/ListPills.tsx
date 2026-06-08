import React from "react";
import { UserList } from "../types/list";
import { Creator } from "./CreatorsList";

export interface ListPillsProps {
  lists: UserList[];
  selectedListId: string;
  onSelectListId: (id: string) => void;
  creators: Creator[];
  onManageListClick?: () => void;
}

export default function ListPills({
  lists,
  selectedListId,
  onSelectListId,
  creators,
  onManageListClick,
}: ListPillsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
      <button
        onClick={() => onSelectListId("all")}
        className={`py-1.5 px-4 rounded-full text-xs font-semibold tracking-wide border transition-all duration-150 cursor-pointer ${
          selectedListId === "all"
            ? "bg-brand text-on-brand border-brand shadow-sm"
            : "bg-surface border-border-subtle text-secondary hover:text-brand hover:border-brand"
        }`}
      >
        All ({creators.length})
      </button>
      {lists.map((list) => {
        const count = creators.filter((c) => list.channels.includes(c.channel_id)).length;
        return (
          <button
            key={list.id}
            onClick={() => onSelectListId(list.id)}
            className={`py-1.5 px-4 rounded-full text-xs font-semibold tracking-wide border transition-all duration-150 cursor-pointer ${
              selectedListId === list.id
                ? "bg-brand text-on-brand border-brand shadow-sm"
                : "bg-surface border-border-subtle text-secondary hover:text-brand hover:border-brand"
            }`}
          >
            {list.name} ({count})
          </button>
        );
      })}

      {/* Manage List Button (displayed only if a specific list is selected and click handler is provided) */}
      {selectedListId !== "all" && onManageListClick && (
        <button
          id="manage-list-settings-btn"
          onClick={onManageListClick}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 bg-surface border border-border-subtle hover:border-brand text-secondary hover:text-brand rounded-full transition-all duration-150 shadow-xs cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Manage List
        </button>
      )}
    </div>
  );
}
