// src/features/roadmap/roadmap-sidebar.tsx
import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  PlayCircle,
  ArrowRight,
  TrendingUp,
  Award,
  CalendarDays,
  CheckCircle2,
  Target,
  Flame,
  Trophy,
  Crown,
  Rocket,
} from "lucide-react";
import { ProgressBar, CircularProgress } from "./ui-atoms";
import { calculateProgress, getNextRecommendation, last7Days } from "./roadmap-utils";
import type { Module, Roadmap } from "./roadmap-types";

export const NextRecommendation = ({ module: mod, roadmapTitle }: { module: Module; roadmapTitle: string }) => (
  <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
      <Sparkles className="h-3.5 w-3.5" /> Đề xuất tiếp theo
    </h3>
    <h4 className="mt-2 text-lg font-bold text-foreground line-clamp-2">
      {mod.title}
    </h4>
    <p className="text-xs text-muted-foreground">Bạn đã sẵn sàng để tiếp tục</p>
    <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
      <span className="rounded-full bg-secondary px-2 py-0.5">{mod.level}</span>
      <span>{mod.lessonCount} bài</span>
    </div>
    <Link
      to="/lesson/$slug"
      params={{ slug: mod.slug }}
      className="mt-3 w-full inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 transition-all"
    >
      <PlayCircle className="mr-2 h-4 w-4" /> Bắt đầu học
      <ArrowRight className="ml-1 h-4 w-4" />
    </Link>
  </div>
);

export const HeatmapWeek = ({ activeDates }: { activeDates: Set<string> }) => {
  const days = last7Days();
  return (
    <div className="flex gap-1">
      {days.map((d) => {
        const active = activeDates.has(d);
        const label = new Date(d).toLocaleDateString("vi-VN", {
          weekday: "short",
          day: "2-digit",
        });
        return (
          <div
            key={d}
            title={label}
            className={`h-7 flex-1 rounded ${
              active
                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm shadow-emerald-500/30"
                : "bg-secondary"
            }`}
          />
        );
      })}
    </div>
  );
};

export const AchievementBadge = ({
  icon: Icon,
  label,
  unlocked,
  color,
}: {
  icon: React.ElementType;
  label: string;
  unlocked: boolean;
  color: string;
}) => (
  <div
    title={label}
    className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition ${
      unlocked
        ? `border-${color}-500/40 bg-${color}-500/10`
        : "border-border bg-secondary/40 opacity-50"
    }`}
  >
    <Icon
      className={`h-5 w-5 ${unlocked ? `text-${color}-500` : "text-muted-foreground"}`}
    />
    <span className="text-[10px] font-medium leading-tight">{label}</span>
  </div>
);

export const RoadmapSidebar = ({
  activeRoadmap,
  nextRecommendation,
  stats,
  achievements,
  recentActivity,
  dailyPercent,
}: {
  activeRoadmap: Roadmap;
  nextRecommendation: Module | null;
  stats: any;
  achievements: any[];
  recentActivity: any[];
  dailyPercent: number;
}) => {
  const { completed, total } = calculateProgress(activeRoadmap.modules);

  return (
    <div className="space-y-5">
      {nextRecommendation && (
        <NextRecommendation module={nextRecommendation} roadmapTitle={activeRoadmap.title} />
      )}

      <div className="rounded-xl border border-border bg-card/80 p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-primary" /> Tổng quan
        </h3>
        <ProgressBar
          percent={calculateProgress(activeRoadmap.modules).percent}
          accent="bg-gradient-to-r from-primary to-fuchsia-400"
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{completed} hoàn thành</span>
          <span>{total} tổng</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/80 p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
          <Award className="h-4 w-4 text-amber-500" /> Thành tựu
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {achievements.map((a, i) => (
            <AchievementBadge key={i} {...a} />
          ))}
        </div>
      </div>

      {recentActivity.length > 0 && (
        <div className="rounded-xl border border-border bg-card/80 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-emerald-500" /> Gần đây
          </h4>
          <ul className="space-y-2">
            {recentActivity.map((act, i) => (
              <li
                key={i}
                className="text-xs text-muted-foreground flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span className="truncate">{act.title}</span>
                </span>
                {act.score > 0 && (
                  <span className="text-[10px] font-bold text-emerald-500 shrink-0">
                    +{act.score}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
