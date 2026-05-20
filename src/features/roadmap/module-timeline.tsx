// src/features/roadmap/module-timeline.tsx
import React from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Lock } from "lucide-react";
import type { Module } from "./roadmap-types";

export const ModuleTimeline = ({ modules }: { modules: Module[] }) => {
  return (
    <div className="relative">
      {modules.map((mod, idx) => {
        const isLast = idx === modules.length - 1;
        const state = mod.completed ? "completed" : mod.locked ? "locked" : "current";
        const content = (
          <div
            className={`flex-1 rounded-lg border p-3 transition-all
              ${
                state === "current"
                  ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                  : state === "completed"
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                    : "border-border bg-card opacity-60"
              }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {mod.title}
                </h4>
                {mod.locked && (
                  <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
                {mod.completed && (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                )}
              </div>
              {mod.completed && mod.bestScore > 0 && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  +{mod.bestScore} XP
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>{mod.level}</span>
              <span>{mod.lessonCount} bài</span>
              {mod.attemptsCount > 0 && (
                <span>{mod.attemptsCount} lần thử</span>
              )}
            </div>
          </div>
        );

        return (
          <div
            key={mod.id}
            className="flex gap-4 pb-3 group/row"
            style={{ animation: `row-in 0.35s ${idx * 0.03}s both` }}
          >
            <div className="flex flex-col items-center pt-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                  state === "completed"
                    ? "bg-emerald-500 border-emerald-500"
                    : state === "current"
                      ? "bg-primary border-primary shadow-[0_0_16px_hsl(var(--primary)/0.6)] animate-pulse"
                      : "bg-secondary border-border"
                }`}
              >
                {state === "completed" && (
                  <CheckCircle2 className="h-3 w-3 text-white" />
                )}
                {state === "locked" && (
                  <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 mt-1 ${
                    state === "completed" ? "bg-emerald-500" : "bg-border"
                  }`}
                />
              )}
            </div>
            {mod.locked ? (
              content
            ) : (
              <Link
                to="/lesson/$slug"
                params={{ slug: mod.slug }}
                className="flex-1 no-underline"
              >
                {content}
              </Link>
            )}
          </div>
        );
      })}
      <style>{`
        @keyframes row-in {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
