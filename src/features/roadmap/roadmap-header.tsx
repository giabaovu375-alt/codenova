// src/features/roadmap/roadmap-header.tsx
import React from "react";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import type { SortMode, DifficultyFilter } from "./roadmap-types";

export const RoadmapHeader = ({
  searchTerm,
  setSearchTerm,
  difficultyFilter,
  setDifficultyFilter,
  sortMode,
  setSortMode,
}: {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  difficultyFilter: DifficultyFilter;
  setDifficultyFilter: (v: DifficultyFilter) => void;
  sortMode: SortMode;
  setSortMode: (v: SortMode) => void;
}) => {
  const filters: [DifficultyFilter, string][] = [
    ["all", "Tất cả"],
    ["1", "Cơ bản"],
    ["2", "Trung cấp"],
    ["3", "Nâng cao"],
  ];

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Tìm kiếm lộ trình..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        <Filter className="h-3.5 w-3.5 text-muted-foreground ml-2" />
        {filters.map(([val, label]) => (
          <button
            key={val}
            onClick={() => setDifficultyFilter(val)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              difficultyFilter === val
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={() =>
          setSortMode((s) =>
            s === "default" ? "progress" : s === "progress" ? "alphabetical" : "default",
          )
        }
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/40 transition"
        title="Đổi cách sắp xếp"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {sortMode === "default" ? "Mặc định" : sortMode === "progress" ? "Tiến độ" : "A-Z"}
      </button>
    </div>
  );
};
