// src/routes/roadmap.tsx
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import {
  Globe, Code, Zap, CheckCircle2, Lock, ArrowRight,
  Search, Flame, Star, CalendarDays, Loader2, RefreshCw, AlertCircle,
} from "lucide-react";
import { lessonsStore, type Lesson } from "@/lib/lessons-store";
import {
  progressStore,
  progressEvents,
  type LessonProgress,
  type ExerciseAttempt,
} from "@/lib/progress-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Lộ trình học tập — CodeNova" },
      { name: "description", content: "Khám phá các lộ trình học lập trình từ cơ bản đến nâng cao." },
    ],
  }),
  component: RoadmapPage,
});

// ─── Types ────────────────────────────────────────────
interface Module {
  id: string;
  title: string;
  completed: boolean;
  locked: boolean;
  estimatedTime: string;
  lessonCount: number;
  level: string;
  slug: string;
}

interface Roadmap {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  difficulty: string;
  estimatedTime: string;
  modules: Module[];
}

// ─── Helpers ─────────────────────────────────────────
const LEVEL_ORDER: Record<string, number> = {
  "Cơ bản": 1,
  "Trung cấp": 2,
  "Nâng cao": 3,
};

const buildRoadmaps = (lessons: Lesson[], progress: LessonProgress[]): Roadmap[] => {
  const progressMap = new Map(progress.map(p => [p.lesson_slug, p]));

  const makeModule = (lesson: Lesson): Module => {
    const p = progressMap.get(lesson.slug);
    const completed = p?.completed ?? false;
    return {
      id: lesson.slug,
      title: lesson.title,
      completed,
      locked: false,
      estimatedTime: "1 tuần",
      lessonCount: lesson.blocks.length,
      level: lesson.level,
      slug: lesson.slug,
    };
  };

  const groupByLanguage = (lang: string) => {
    return lessons
      .filter(l => l.language === lang)
      .sort((a, b) => (LEVEL_ORDER[a.level] || 99) - (LEVEL_ORDER[b.level] || 99));
  };

  const pythonLessons = groupByLanguage("python");
  const htmlLessons = groupByLanguage("html");
  const cssLessons = groupByLanguage("css");
  const jsLessons = groupByLanguage("javascript");
  const cppLessons = groupByLanguage("cpp");
  const javaLessons = groupByLanguage("java");

  const pythonModules = pythonLessons.map(makeModule);
  const webModules = [
    ...htmlLessons.map(makeModule),
    ...cssLessons.map(makeModule),
    ...jsLessons.map(makeModule),
  ];
  const jsModules = jsLessons.map(makeModule);
  const cppModules = cppLessons.map(makeModule);
  const javaModules = javaLessons.map(makeModule);

  const applyLocking = (modules: Module[]) => {
    for (let i = 1; i < modules.length; i++) {
      if (!modules[i-1].completed) {
        modules[i].locked = true;
      }
    }
    return modules;
  };

  const roadmaps: Roadmap[] = [];
  if (pythonModules.length > 0) {
    roadmaps.push({
      id: "python",
      title: "Python Developer",
      description: "Từ cú pháp cơ bản đến OOP và AI/ML",
      icon: Code,
      difficulty: "Cơ bản - Trung cấp",
      estimatedTime: `${pythonModules.length} bài học`,
      modules: applyLocking(pythonModules),
    });
  }
  if (webModules.length > 0) {
    roadmaps.push({
      id: "web-dev",
      title: "Web Development",
      description: "HTML, CSS, JavaScript nền tảng",
      icon: Globe,
      difficulty: "Cơ bản - Trung cấp",
      estimatedTime: `${webModules.length} bài học`,
      modules: applyLocking(webModules),
    });
  }
  if (jsModules.length > 0) {
    roadmaps.push({
      id: "js-mastery",
      title: "JavaScript Mastery",
      description: "Nâng cao kỹ năng JavaScript hiện đại",
      icon: Zap,
      difficulty: "Trung cấp - Nâng cao",
      estimatedTime: `${jsModules.length} bài học`,
      modules: applyLocking(jsModules),
    });
  }
  if (cppModules.length > 0) {
    roadmaps.push({
      id: "cpp",
      title: "C++ Developer",
      description: "Lập trình hệ thống và game",
      icon: Code,
      difficulty: "Cơ bản - Nâng cao",
      estimatedTime: `${cppModules.length} bài học`,
      modules: applyLocking(cppModules),
    });
  }
  if (javaModules.length > 0) {
    roadmaps.push({
      id: "java",
      title: "Java Developer",
      description: "Lập trình hướng đối tượng và ứng dụng",
      icon: Code,
      difficulty: "Cơ bản - Trung cấp",
      estimatedTime: `${javaModules.length} bài học`,
      modules: applyLocking(javaModules),
    });
  }

  return roadmaps;
};

// ─── Utilities ────────────────────────────────────────
const calculateProgress = (modules: Module[]) => {
  const completed = modules.filter((m) => m.completed).length;
  return { completed, total: modules.length, percent: Math.round((completed / modules.length) * 100) };
};

const getNextRecommendation = (modules: Module[]): Module | null => {
  for (const mod of modules) {
    if (!mod.completed && !mod.locked) {
      return mod;
    }
  }
  return null;
};

const computeStreak = (dates: string[]): number => {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
  const today = new Date().toISOString().slice(0,10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i+1]).getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.1) streak++;
    else break;
  }
  return streak;
};

// ─── Components ───────────────────────────────────────
const ProgressBar = ({ percent }: { percent: number }) => (
  <div className="w-full bg-secondary rounded-full h-2 mt-1">
    <div
      className="bg-primary h-2 rounded-full transition-all duration-700"
      style={{ width: `${percent}%` }}
    />
  </div>
);

const RoadmapCard = ({
  roadmap,
  isActive,
  onClick,
}: {
  roadmap: Roadmap;
  isActive: boolean;
  onClick: () => void;
}) => {
  const { completed, total, percent } = calculateProgress(roadmap.modules);
  const IconComponent = roadmap.icon;
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-4 transition hover:shadow-lg ${
        isActive
          ? "border-primary bg-card shadow-md"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <IconComponent className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{roadmap.title}</h3>
          <p className="text-sm text-muted-foreground">{roadmap.description}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{roadmap.difficulty}</span>
        <span>{roadmap.estimatedTime}</span>
      </div>
      <ProgressBar percent={percent} />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{completed}/{total} bài học</span>
        <span className="font-medium text-primary">{percent}%</span>
      </div>
    </div>
  );
};

const ModuleTimeline = ({ modules }: { modules: Module[] }) => {
  const currentId = useMemo(() => {
    for (const mod of modules) {
      if (!mod.completed && !mod.locked) return mod.id;
    }
    return null;
  }, [modules]);

  return (
    <div className="relative">
      {modules.map((mod, idx) => {
        const isLast = idx === modules.length - 1;
        const state = mod.completed ? "completed" : mod.locked ? "locked" : "current";
        return (
          <div key={mod.id} className="flex gap-4 pb-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                  state === "completed"
                    ? "bg-green-500 border-green-500"
                    : state === "current"
                    ? "bg-primary border-primary animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                    : "bg-secondary border-border"
                }`}
              >
                {state === "completed" && <CheckCircle2 className="h-3 w-3 text-white" />}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 mt-1 ${state === "completed" ? "bg-green-500" : "bg-border"}`} />
              )}
            </div>
            <div className={`flex-1 ${mod.locked ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-foreground">{mod.title}</h4>
                {mod.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{mod.level}</span>
                <span>{mod.lessonCount} bài</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const NextRecommendation = ({ module: mod }: { module: Module; allModules: Module[] }) => {
  return (
    <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <h3 className="text-sm font-semibold text-primary">✨ Đề xuất tiếp theo</h3>
      <div className="mt-2">
        <h4 className="text-lg font-bold text-foreground">{mod.title}</h4>
        <p className="text-xs text-muted-foreground">Bạn đã sẵn sàng để tiếp tục</p>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span>{mod.level}</span>
          <span>{mod.lessonCount} bài</span>
        </div>
        <Link
          to="/lesson/$slug"
          params={{ slug: mod.slug }}
          className="mt-3 w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          Bắt đầu học
          <ArrowRight className="ml-2 inline h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

// ─── Main Page Component ─────────────────────────────
function RoadmapPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [attempts, setAttempts] = useState<ExerciseAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [allLessons, userProgress, userAttempts] = await Promise.all([
        lessonsStore.listAsync(true),
        user ? progressStore.listMine() : Promise.resolve([]),
        user ? progressStore.listAttempts() : Promise.resolve([]),
      ]);
      setLessons(allLessons);
      setProgress(userProgress);
      setAttempts(userAttempts);
    } catch (e: any) {
      setError(e.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();

    // Lắng nghe sự kiện realtime để tự động làm mới dữ liệu
    const reload = () => {
      fetchData();
    };
    window.addEventListener("progress-updated", reload);

    return () => {
      window.removeEventListener("progress-updated", reload);
    };
  }, [fetchData]);

  const roadmaps = useMemo(() => buildRoadmaps(lessons, progress), [lessons, progress]);

  const [activeRoadmapId, setActiveRoadmapId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (roadmaps.length > 0 && !activeRoadmapId) {
      setActiveRoadmapId(roadmaps[0].id);
    }
  }, [roadmaps, activeRoadmapId]);

  const activeRoadmap = useMemo(() => roadmaps.find(r => r.id === activeRoadmapId) || roadmaps[0], [roadmaps, activeRoadmapId]);
  const nextRecommendation = useMemo(() => activeRoadmap ? getNextRecommendation(activeRoadmap.modules) : null, [activeRoadmap]);

  const filteredRoadmaps = useMemo(() => {
    if (!searchTerm.trim()) return roadmaps;
    const q = searchTerm.toLowerCase();
    return roadmaps.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }, [roadmaps, searchTerm]);

  // Stats từ dữ liệu thật
  const stats = useMemo(() => {
    const activeDays = new Set(attempts.map(a => new Date(a.created_at).toISOString().slice(0,10)));
    const streak = computeStreak(Array.from(activeDays));
    const totalCompleted = progress.filter(p => p.completed).length;
    const totalXP = progress.reduce((sum, p) => sum + p.best_score, 0);
    return {
      streak,
      xp: totalXP,
      totalCompleted,
      dailyGoal: 5,
    };
  }, [attempts, progress]);

  const recentActivity = useMemo(() => {
    const completed = progress.filter(p => p.completed);
    return completed.slice(-2).reverse().map(p => ({
      title: lessons.find(l => l.slug === p.lesson_slug)?.title || p.lesson_slug,
      roadmap: lessons.find(l => l.slug === p.lesson_slug)?.language || "",
    }));
  }, [progress, lessons]);

  if (loading) {
    return (
      <CodeNovaLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CodeNovaLayout>
    );
  }

  if (error) {
    return (
      <CodeNovaLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-12 w-12 text-destructive/70 mb-4" />
          <p className="text-muted-foreground">{error}</p>
          <button onClick={fetchData} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      </CodeNovaLayout>
    );
  }

  if (roadmaps.length === 0) {
    return (
      <CodeNovaLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Chưa có bài học nào để tạo lộ trình.</p>
        </div>
      </CodeNovaLayout>
    );
  }

  return (
    <CodeNovaLayout>
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-20">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              Lộ trình học tập{" "}
              <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
                chi tiết
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Chọn một lộ trình và tiếp tục hành trình của bạn</p>
          </div>
          {user && (
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm">
                <Flame className="h-4 w-4 text-orange-500" /> {stats.streak} ngày
              </div>
              <div className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm">
                <Star className="h-4 w-4 text-yellow-500" /> {stats.xp} XP
              </div>
              <div className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm">
                <CalendarDays className="h-4 w-4 text-primary" /> {stats.totalCompleted} bài
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm lộ trình..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition-all focus:border-primary"
            />
          </div>
        </div>

        {/* Continue learning CTA */}
        {activeRoadmap && nextRecommendation && (
          <div className="mb-6 p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-semibold text-foreground">Tiếp tục học</h3>
              <p className="text-sm text-muted-foreground">{nextRecommendation.title} – {activeRoadmap.title}</p>
            </div>
            <Link
              to="/lesson/$slug"
              params={{ slug: nextRecommendation.slug }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
            >
              Bắt đầu ngay
            </Link>
          </div>
        )}

        {/* Roadmap cards grid */}
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          {filteredRoadmaps.map((roadmap) => (
            <RoadmapCard
              key={roadmap.id}
              roadmap={roadmap}
              isActive={roadmap.id === activeRoadmapId}
              onClick={() => setActiveRoadmapId(roadmap.id)}
            />
          ))}
          {filteredRoadmaps.length === 0 && (
            <p className="text-muted-foreground text-sm">Không tìm thấy lộ trình phù hợp.</p>
          )}
        </div>

        {/* Active roadmap detail */}
        {activeRoadmap && (
          <div className="rounded-xl border border-border bg-card/80 p-4 md:p-6 backdrop-blur">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <activeRoadmap.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{activeRoadmap.title}</h2>
                <p className="text-muted-foreground text-sm">{activeRoadmap.description}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Timeline */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-foreground mb-4">📋 Lộ trình chi tiết</h3>
                {activeRoadmap.modules.length > 0 ? (
                  <ModuleTimeline modules={activeRoadmap.modules} />
                ) : (
                  <p className="text-muted-foreground text-sm">Chưa có bài học nào trong lộ trình này.</p>
                )}
              </div>

              {/* Sidebar */}
              <div>
                {nextRecommendation && (
                  <NextRecommendation module={nextRecommendation} allModules={activeRoadmap.modules} />
                )}
                <div className="mt-6 rounded-lg border border-border bg-card/80 p-4 backdrop-blur">
                  <h3 className="text-sm font-semibold text-foreground">📊 Tổng quan</h3>
                  <ProgressBar percent={calculateProgress(activeRoadmap.modules).percent} />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{calculateProgress(activeRoadmap.modules).completed} hoàn thành</span>
                    <span>{calculateProgress(activeRoadmap.modules).total} tổng</span>
                  </div>
                  {recentActivity.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">Gần đây</h4>
                      <ul className="space-y-1">
                        {recentActivity.map((act, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" /> {act.title} <span className="text-muted-foreground/50">({act.roadmap})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CodeNovaLayout>
  );
}
  
