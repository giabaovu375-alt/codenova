// src/features/roadmap/roadmap-page.tsx – DEBUG VERSION (sẽ hiện lỗi nếu có)
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore } from "@/lib/lessons-store";
import { progressStore } from "@/lib/progress-store";
import { useAuth } from "@/lib/auth";
import { RoadmapCard } from "./roadmap-card";
import { ModuleTimeline } from "./module-timeline";
import { RoadmapSidebar } from "./roadmap-sidebar";
import { RoadmapHeader } from "./roadmap-header";
import { SkeletonCard } from "./ui-atoms";
import { buildRoadmaps, calculateProgress } from "./roadmap-utils";
import type { Roadmap } from "./roadmap-types";
import { AlertCircle, RefreshCw, BookOpen, PlayCircle, ArrowRight, Sparkles, Flame, Star, CalendarDays, Target, TrendingUp } from "lucide-react";
import { CircularProgress, ProgressBar, useToast, ToastView, Confetti } from "./ui-atoms";
import { getNextRecommendation, computeStreak, xpToLevel, last7Days } from "./roadmap-utils";

export function RoadmapPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast, show: showToast } = useToast();
  const [showConfetti, setShowConfetti] = useState(false);
  const prevCompletedCount = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    if (!mountedRef.current) return;
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const [allLessons, userProgress, userAttempts] = await Promise.all([
        lessonsStore.listAsync(true).catch((e: any) => {
          throw new Error("Lỗi tải lessons: " + (e?.message || e));
        }),
        user ? progressStore.listMine().catch((e: any) => {
          throw new Error("Lỗi tải progress: " + (e?.message || e));
        }) : Promise.resolve([]),
        user ? progressStore.listAttempts().catch((e: any) => {
          throw new Error("Lỗi tải attempts: " + (e?.message || e));
        }) : Promise.resolve([]),
      ]);
      if (!mountedRef.current) return;
      setLessons(allLessons || []);
      setProgress(userProgress || []);
      setAttempts(userAttempts || []);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setError(e.message || "Lỗi không xác định khi tải dữ liệu");
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLessons([]);
    setProgress([]);
    setAttempts([]);
    setActiveRoadmapId("");
    fetchData();
  }, [fetchData]);

  // Build roadmaps – bọc try-catch riêng
  const [buildError, setBuildError] = useState<string | null>(null);
  const roadmaps = useMemo(() => {
    try {
      const result = buildRoadmaps(lessons, progress, attempts);
      setBuildError(null);
      return result;
    } catch (e: any) {
      setBuildError("Lỗi buildRoadmaps: " + (e?.message || e));
      return [];
    }
  }, [lessons, progress, attempts]);

  const [activeRoadmapId, setActiveRoadmapId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<any>("all");
  const [sortMode, setSortMode] = useState<any>("default");

  useEffect(() => {
    if (roadmaps.length > 0 && !activeRoadmapId) {
      setActiveRoadmapId(roadmaps[0].id);
    }
  }, [roadmaps]);

  const activeRoadmap = useMemo(
    () => roadmaps.find((r) => r.id === activeRoadmapId) || roadmaps[0],
    [roadmaps, activeRoadmapId],
  );

  const nextRecommendation = useMemo(
    () => (activeRoadmap ? getNextRecommendation(activeRoadmap.modules) : null),
    [activeRoadmap],
  );

  const filteredRoadmaps = useMemo(() => {
    try {
      let arr = [...roadmaps];
      if (difficultyFilter !== "all") {
        const lv = Number(difficultyFilter);
        arr = arr.filter((r) => r.difficultyLevel === lv);
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        arr = arr.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q),
        );
      }
      if (sortMode === "alphabetical") {
        arr.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortMode === "progress") {
        arr.sort(
          (a, b) =>
            calculateProgress(b.modules).percent -
            calculateProgress(a.modules).percent,
        );
      }
      return arr;
    } catch (e: any) {
      return [];
    }
  }, [roadmaps, searchTerm, difficultyFilter, sortMode]);

  const stats = useMemo(() => {
    try {
      const activeDates = new Set(
        attempts.map((a) => new Date(a.created_at).toISOString().slice(0, 10)),
      );
      const completedDates = new Set(
        progress
          .filter((p) => p.completed && p.updated_at)
          .map((p) => new Date(p.updated_at).toISOString().slice(0, 10)),
      );
      const allActiveDates = new Set([...activeDates, ...completedDates]);
      const streak = computeStreak(Array.from(allActiveDates));
      const totalCompleted = progress.filter((p) => p.completed).length;
      const totalXP = progress.reduce((sum, p) => sum + p.best_score, 0);
      const todayCount = progress.filter(
        (p) =>
          p.completed &&
          p.updated_at &&
          new Date(p.updated_at).toISOString().slice(0, 10) ===
            new Date().toISOString().slice(0, 10),
      ).length;
      return {
        streak,
        xp: totalXP,
        totalCompleted,
        dailyGoal: 5,
        todayCount,
        activeDates: allActiveDates,
        ...xpToLevel(totalXP),
      };
    } catch (e: any) {
      return {
        streak: 0,
        xp: 0,
        totalCompleted: 0,
        dailyGoal: 5,
        todayCount: 0,
        activeDates: new Set<string>(),
        level: 1,
        percent: 0,
        currentLevelXp: 0,
        nextLevelXp: 500,
      };
    }
  }, [attempts, progress]);

  const recentActivity = useMemo(() => {
    try {
      const completed = progress.filter((p) => p.completed);
      return completed
        .slice(-5)
        .reverse()
        .map((p) => ({
          title:
            lessons.find((l) => l.slug === p.lesson_slug)?.title || p.lesson_slug,
          score: p.best_score,
        }));
    } catch (e: any) {
      return [];
    }
  }, [progress, lessons]);

  const achievements = useMemo(
    () => [
      { icon: PlayCircle, label: "Bài đầu tiên", unlocked: stats.totalCompleted >= 1, color: "sky" },
      { icon: Flame, label: "Streak 3 ngày", unlocked: stats.streak >= 3, color: "orange" },
      { icon: Star, label: "10 bài học", unlocked: stats.totalCompleted >= 10, color: "amber" },
      { icon: Crown, label: "Level 5", unlocked: stats.level >= 5, color: "fuchsia" },
      { icon: Trophy, label: "Hoàn thành lộ trình", unlocked: roadmaps.some((r) => calculateProgress(r.modules).percent === 100), color: "emerald" },
    ],
    [stats, roadmaps],
  );

  const dailyPercent = Math.min(100, Math.round((stats.todayCount / stats.dailyGoal) * 100));

  if (loading) {
    return (
      <CodeNovaLayout>
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-20">
          <div className="mb-8 space-y-3">
            <div className="h-10 w-72 rounded bg-secondary animate-pulse" />
            <div className="h-4 w-96 rounded bg-secondary animate-pulse" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </CodeNovaLayout>
    );
  }

  // Hiển thị lỗi fetch data hoặc build roadmaps
  if (error || buildError) {
    return (
      <CodeNovaLayout>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <AlertCircle className="h-12 w-12 text-destructive/70 mb-4" />
          <p className="text-red-500 font-bold text-lg mb-2">Lỗi dữ liệu:</p>
          <p className="text-muted-foreground text-center max-w-2xl whitespace-pre-wrap break-words">
            {error || buildError}
          </p>
          <button
            onClick={() => fetchData()}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition"
          >
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      </CodeNovaLayout>
    );
  }

  if (!activeRoadmap || roadmaps.length === 0) {
    return (
      <CodeNovaLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Chưa có bài học nào để tạo lộ trình.</p>
        </div>
      </CodeNovaLayout>
    );
  }

  return (
    <CodeNovaLayout>
      {showConfetti && <Confetti />}
      {toast && <ToastView message={toast.message} />}
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-24">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card/80 to-primary/5 p-6 md:p-8 mb-8">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-primary/30 to-fuchsia-500/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-500/20 to-sky-500/20 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
                <Sparkles className="h-3 w-3" /> Hành trình của bạn
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                Lộ trình học tập{" "}
                <span className="bg-gradient-to-r from-primary via-fuchsia-400 to-orange-400 bg-clip-text text-transparent">
                  chi tiết
                </span>
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mt-2 max-w-xl">
                Chọn một lộ trình và tiếp tục hành trình của bạn.
              </p>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <CircularProgress percent={stats.percent} size={80} stroke={6} accentClass="stroke-primary">
                  <div className="text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">Lv</div>
                    <div className="text-lg font-black text-primary leading-none">{stats.level}</div>
                  </div>
                </CircularProgress>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
                    <Flame className={`h-3.5 w-3.5 ${stats.streak > 0 ? "animate-pulse" : ""}`} />
                    {stats.streak} ngày streak
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-500">
                    <Star className="h-3.5 w-3.5" /> {stats.xp} XP
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                    <CalendarDays className="h-3.5 w-3.5" /> {stats.totalCompleted} bài
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Daily goal + Heatmap */}
        {user && (
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Mục tiêu hôm nay</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {stats.todayCount}/{stats.dailyGoal} bài
                </span>
              </div>
              <ProgressBar percent={dailyPercent} accent={dailyPercent === 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-primary to-fuchsia-400"} />
              <p className="text-[11px] text-muted-foreground mt-2">
                {dailyPercent === 100
                  ? "🎉 Tuyệt vời! Bạn đã đạt mục tiêu hôm nay!"
                  : `Còn ${stats.dailyGoal - stats.todayCount} bài nữa để đạt mục tiêu.`}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold">7 ngày qua</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {stats.activeDates.size} ngày hoạt động
                </span>
              </div>
              <div className="flex gap-1">
                {last7Days().map((d) => {
                  const active = stats.activeDates.has(d);
                  return (
                    <div
                      key={d}
                      title={new Date(d).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit" })}
                      className={`h-7 flex-1 rounded ${active ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm shadow-emerald-500/30" : "bg-secondary"}`}
                    />
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Giữ vững phong độ mỗi ngày để xây dựng thói quen học tập.
              </p>
            </div>
          </div>
        )}

        <RoadmapHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
          sortMode={sortMode}
          setSortMode={setSortMode}
        />

        {/* Continue learning CTA */}
        {activeRoadmap && nextRecommendation && (
          <div className="mb-6 relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg shadow-primary/30">
                  <PlayCircle className="h-7 w-7" />
                </div>
                <div>
                  <div className="text-xs font-medium text-primary uppercase tracking-wider">Tiếp tục học</div>
                  <h3 className="text-lg font-bold text-foreground">{nextRecommendation.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {activeRoadmap.title} · {nextRecommendation.level}
                  </p>
                </div>
              </div>
              <Link to="/lesson/$slug" params={{ slug: nextRecommendation.slug }} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 hover:shadow-xl transition-all flex items-center gap-2">
                Bắt đầu ngay <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Roadmap cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {filteredRoadmaps.map((roadmap, i) => (
            <RoadmapCard key={roadmap.id} roadmap={roadmap} isActive={roadmap.id === activeRoadmapId} onClick={() => setActiveRoadmapId(roadmap.id)} index={i} />
          ))}
          {filteredRoadmaps.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              Không tìm thấy lộ trình phù hợp.
            </div>
          )}
        </div>

        {/* Active roadmap detail */}
        {activeRoadmap && (
          <div className="rounded-2xl border border-border bg-card/60 p-4 md:p-6 backdrop-blur">
            <div className="flex items-center gap-4 mb-6">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${activeRoadmap.accent} text-white shadow-lg`}>
                {activeRoadmap.icon && <activeRoadmap.icon className="h-7 w-7" />}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-foreground truncate">
                  {activeRoadmap.title}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {activeRoadmap.description}
                </p>
              </div>
              <div className="hidden sm:block">
                <CircularProgress percent={calculateProgress(activeRoadmap.modules).percent} size={64} stroke={5} />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" /> Lộ trình chi tiết
                </h3>
                {activeRoadmap.modules.length > 0 ? (
                  <ModuleTimeline modules={activeRoadmap.modules} />
                ) : (
                  <p className="text-muted-foreground text-sm">Chưa có bài học nào trong lộ trình này.</p>
                )}
              </div>
              <RoadmapSidebar
                activeRoadmap={activeRoadmap}
                nextRecommendation={nextRecommendation}
                stats={stats}
                achievements={achievements}
                recentActivity={recentActivity}
                dailyPercent={dailyPercent}
              />
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-[11px] text-muted-foreground">
          Mẹo: dùng phím <kbd className="rounded bg-secondary px-1.5 py-0.5">j</kbd>{" "}
          <kbd className="rounded bg-secondary px-1.5 py-0.5">k</kbd> để chuyển lộ trình, hoặc{" "}
          <kbd className="rounded bg-secondary px-1.5 py-0.5">1-9</kbd> để nhảy nhanh.
        </div>
      </div>
    </CodeNovaLayout>
  );
}
