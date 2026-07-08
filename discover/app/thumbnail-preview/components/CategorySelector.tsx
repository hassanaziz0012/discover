import React from "react";
import { categories } from "../../utils/sizeConfig";

interface CategorySelectorProps {
  activeCategory: "all" | "browser" | "mobile" | "tv";
  setActiveCategory: (category: "all" | "browser" | "mobile" | "tv") => void;
}

export default function CategorySelector({
  activeCategory,
  setActiveCategory,
}: CategorySelectorProps) {
  return (
    <div className="flex flex-wrap gap-2.5 p-1 bg-surface-raised/40 backdrop-blur-md rounded-2xl border border-border-subtle/30 max-w-fit shadow-inner">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => setActiveCategory(cat.id)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            activeCategory === cat.id
              ? "bg-[#8B5CF6] text-white shadow-md scale-[1.02]"
              : "text-secondary hover:text-primary hover:bg-surface-raised/80"
          }`}
        >
          <span>{cat.icon}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  );
}
