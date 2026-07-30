import React from "react";
import { ChannelListPillsProps } from "./types";

export default function ChannelListPills({
  lists,
  creators,
  selectedListId,
  setSelectedListId,
}: ChannelListPillsProps) {
  return (
    <div className="flex flex-col gap-2 border-t border-border-subtle/30 pt-4">
      <span className="text-xs font-bold text-primary uppercase tracking-wider">Channel Lists</span>
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
        <button
          onClick={() => setSelectedListId("all")}
          className={`py-1 px-2.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer ${
            selectedListId === "all"
              ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-sm"
              : "bg-surface border-border-subtle text-secondary hover:text-[#8B5CF6] hover:border-[#8B5CF6]"
          }`}
        >
          All ({creators.length})
        </button>
        {lists.map((list) => {
          const count = creators.filter((c) => list.channels.includes(c.channel_id)).length;
          return (
            <button
              key={list.id}
              onClick={() => setSelectedListId(list.id)}
              className={`py-1 px-2.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer ${
                selectedListId === list.id
                  ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-sm"
                  : "bg-surface border-border-subtle text-secondary hover:text-[#8B5CF6] hover:border-[#8B5CF6]"
              }`}
            >
              {list.name} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}
