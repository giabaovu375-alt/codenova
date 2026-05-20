// src/features/roadmap/roadmap-page.tsx – Bản an toàn tuyệt đối
import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore, type Lesson } from "@/lib/lessons-store";
import { progressStore, type LessonProgress } from "@/lib/progress-store";
import { useAuth } from "@/lib/auth";
import {
  ArrowRight, BookOpen, Lock, PlayCircle, Sparkles, CheckCircle2,
  Flame, Star, CalendarDays, TrendingUp,
} from "lucide-react";
import { CircularProgress, ProgressBar, SkeletonCard } from "./ui-atoms";

/* ─── Kiểu dữ liệu an toàn ─── */
interface SafeModule {
  id: string; title: string; level: string;
  completed: boolean; locked: boolean;
  bestScore: number; slug: string;
  lessonCount: number; attemptsCount: number;
}
interface SafeRoadmap {
  id: string; title: string; description: string;
  accent: string; difficultyLevel: number;
  modules: SafeModule[];
}

/* ─── Helpers an toàn ─── */
const safeLesson = (l: any) => ({
  slug: l?.slug ?? "", title: l?.title ?? "Chưa có tên",
  language: l?.language ?? "unknown", level: l?.level ?? "Cơ bản",
  blocks: Array.isArray(l?.blocks) ? l.blocks : [],
});

const buildSafeRoadmaps = (lessons: any[], progress: any[]): SafeRoadmap[] => {
  const progressMap = new Map(progress.map((p) => [p.lesson_slug, p]));
  const groups: Record<string, SafeModule[]> = {};
  for (const raw of lessons) {
    const l = safeLesson(raw);
    const p = progressMap.get(l.slug);
    const mod: SafeModule = {
      id: l.slug, title: l.title, slug: l.slug,
      level: l.level, lessonCount: l.blocks.length || 1,
      completed: p?.completed ?? false,
      locked: false,
      bestScore: p?.best_score ?? 0,
      attemptsCount: 0,
    };
    const lang = l.language;
    if (!groups[lang]) groups[lang] = [];
    groups[lang].push(mod);
  }

  const roadmaps: SafeRoadmap[] = [];
  const accentMap: Record<string, string> = {
    python: "from-amber-400 via-yellow-400 to-emerald-400",
    html: "from-sky-400 via-cyan-400 to-indigo-400",
    css: "from-sky-400 via-cyan-400 to-indigo-400",
    javascript: "from-yellow-300 via-amber-400 to-orange-500",
    cpp: "from-blue-400 via-violet-500 to-fuchsia-500",
    java: "from-rose-400 via-orange-400 to-amber-300",
  };
  const entries: [string, SafeModule[]][] = [
    ["python", groups["python"] ?? []],
    ["web-dev", [...(groups["html"] ?? []), ...(groups["css"] ?? []), ...(groups["javascript"] ?? [])]],
    ["javascript", groups["javascript"] ?? []],
    ["cpp", groups["cpp"] ?? []],
    ["java", groups["java"] ?? []],
  ];
  for (const [id, mods] of entries) {
    if (mods.length === 0) continue;
    for (let i = 1; i < mods.length; i++) {
      const prev = mods[i - 1];
      if (!prev.completed && prev.bestScore < 7) mods[i].locked = true;
    }
    roadmaps.push({
      id, modules: mods,
      title: id === "web-dev" ? "Web Development" : `${id.toUpperCase()} Developer`,
      description: `Khóa học ${id}`,
      accent: accentMap[id] ?? "from-primary to-fuchsia-500",
      difficultyLevel: 1,
    });
  }
  return roadmaps;
};

/* ─── UI Atoms nhỏ ─── */
const ModuleRow = ({ mod }: { mod: SafeModule }) => (
  <div className={`rounded-lg border p-3 ${mod.locked ? "opacity-60" : ""}`}>
    <div className="flex items-center gap-2">
      {mod.completed && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
      {mod.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
      <span className="font-semibold text-sm">{mod.title}</span>
    </div>
    <div className="text-xs text-muted-foreground mt-1">
      {mod.level} · {mod.lessonCount} bài · {mod.bestScore} XP
    </div>
  </div>
);

const RoadmapCardSafe = ({ rm }: { rm: SafeRoadmap }) => {
  const completed = rm.modules.filter((m) => m.completed).length;
  const pct = Math.round((completed / rm.modules.length) * 100);
  return (
    <div className="rounded-2xl border p-5 bg-card/80">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${rm.accent}`} />
        <div>
          <h3 className="font-bold">{rm.title}</h3>
          <p className="text-xs text-muted-foreground">{rm.description}</p>
        </div>
      </div>
      <ProgressBar percent={pct} accent="bg-primary" />
      <div className="text-xs mt-2 text-muted-foreground">{completed}/{rm.modules.length} bài</div>
    </div>
  );
};

/* ─── MAIN COMPONENT ─── */
export function RoadmapPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [l, p] = await Promise.all([
          lessonsStore.listAsync(true),
          user ? progressStore.listMine() : [],
        ]);
        if (!cancelled) {
          setLessons(l || []);
          setProgress(p || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const roadmaps = React.useMemo(() => buildSafeRoadmaps(lessons, progress), [lessons, progress]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (roadmaps.length > 0 && !activeId) setActiveId(roadmaps[0].id);
  }, [roadmaps, activeId]);

  const active = roadmaps.find((r) => r.id === activeId) || roadmaps[0];
  const next = active ? active.modules.find((m) => !m.completed && !m.locked) : null;
  const totalXP = progress.reduce((sum, p) => sum + (p.best_score || 0), 0);
  const totalCompleted = progress.filter((p) => p.completed).length;

  if (loading) {
    return (
      <CodeNovaLayout>
        <div className="p-10 grid gap-4 md:grid-cols-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      </CodeNovaLayout>
    );
  }

  if (roadmaps.length === 0) {
    return (
      <CodeNovaLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Chưa có bài học nào.</p>
        </div>
      </CodeNovaLayout>
    );
  }

  return (
    <CodeNovaLayout>
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Lộ trình học tập
          </h1>
          {user && (
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> {totalXP} XP</span>
              <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {totalCompleted} bài</span>
            </div>
          )}
        </div>

        {/* Roadmap grid */}
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          {roadmaps.map((r) => (
            <button key={r.id} onClick={() => setActiveId(r.id)} className="text-left">
              <RoadmapCardSafe rm={r} />
            </button>
          ))}
        </div>

        {active && (
          <div className="rounded-2xl border bg-card/60 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> {active.title}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-3">
                {active.modules.map((m) => (
                  m.locked ? <ModuleRow key={m.id} mod={m} /> : (
                    <Link key={m.id} to="/lesson/$slug" params={{ slug: m.slug }}>
                      <ModuleRow mod={m} />
                    </Link>
                  )
                ))}
              </div>
              <div className="space-y-4">
                {next && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <p className="text-xs text-primary font-bold uppercase">Tiếp tục</p>
                    <p className="font-bold text-lg mt-1">{next.title}</p>
                    <Link to="/lesson/$slug" params={{ slug: next.slug }}
                      className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
                      Bắt đầu <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
                <div className="rounded-xl border p-4">
                  <p className="text-sm font-semibold flex items-center gap-1"><TrendingUp className="h-4 w-4 text-emerald-500" /> Tiến độ</p>
                  <ProgressBar percent={Math.round((active.modules.filter((m) => m.completed).length / active.modules.length) * 100)} accent="bg-gradient-to-r from-primary to-fuchsia-400" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CodeNovaLayout>
  );
}
