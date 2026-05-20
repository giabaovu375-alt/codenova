// src/features/roadmap/roadmap-card.tsx
import React from "react";
import { Crown } from "lucide-react";
import { CircularProgress } from "./ui-atoms";
import { calculateProgress } from "./roadmap-utils";
import type { Roadmap } from "./roadmap-types";

export const RoadmapCard = ({
  roadmap,
  isActive,
  onClick,
  index,
}: {
  roadmap: Roadmap;
  isActive: boolean;
  onClick: () => void;
  index: number;
}) => {
  const { completed, total, percent } = calculateProgress(roadmap.modules);
  const IconComponent = roadmap.icon;
  const isDone = percent === 100;
  const thumbnail = `/assets/roadmap/${roadmap.id}.jpg`;

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden text-left cursor-pointer rounded-2xl border p-5 transition-all duration-300
        hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10
        ${
          isActive
            ? "border-primary/60 bg-card shadow-xl shadow-primary/20 ring-2 ring-primary/30"
            : "border-border bg-card/80 backdrop-blur hover:border-primary/40"
        }`}
      style={{ animation: `card-in 0.4s ${index * 0.05}s both` }}
    >
      <div
        className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${roadmap.accent} opacity-20 blur-2xl transition-opacity group-hover:opacity-40`}
      />

      {/* Ảnh thumbnail */}
      <div className="aspect-video w-full mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-secondary/50 to-secondary">
        <img
          src={thumbnail}
          alt={roadmap.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            // Ẩn ảnh nếu không tải được
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {isDone && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
          <Crown className="h-3 w-3" /> HOÀN THÀNH
        </div>
      )}

      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${roadmap.accent} text-white shadow-lg`}
        >
          {IconComponent && <IconComponent className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-foreground truncate">{roadmap.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {roadmap.description}
          </p>
        </div>
        <CircularProgress
          percent={percent}
          size={48}
          stroke={4}
          accentClass={isDone ? "stroke-emerald-500" : "stroke-primary"}
        >
          <span className="text-[10px] font-bold">{percent}%</span>
        </CircularProgress>
      </div>

      <div className="relative mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="rounded-full bg-secondary px-2 py-0.5">
          {roadmap.difficulty}
        </span>
        <span className="font-medium">
          {completed}/{total} bài
        </span>
      </div>

      <style>{`
        @keyframes card-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </button>
  );
};
