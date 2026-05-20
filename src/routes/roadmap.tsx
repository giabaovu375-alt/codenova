// src/routes/roadmap.tsx
// ────────────────────────────────────────────────────────────────────────────
// 🚀 CodeNova — Roadmap Page (PREMIUM EDITION v2 — with cover images)
// ────────────────────────────────────────────────────────────────────────────

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import {
  Globe,
  Code,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  Search,
  Flame,
  Star,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  Trophy,
  Target,
  TrendingUp,
  Sparkles,
  Award,
  Crown,
  Rocket,
  BookOpen,
  Filter,
  ArrowUpDown,
  PlayCircle,
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
      {
        name: "description",
        content:
          "Khám phá các lộ trình học lập trình từ cơ bản đến nâng cao với theo dõi tiến độ thông minh.",
      },
    ],
  }),
  component: RoadmapPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────
interface Module {
  id: string;
  title: string;
  completed: boolean;
  locked: boolean;
  estimatedTime: string;
  lessonCount: number;
  level: string;
  slug: string;
  bestScore: number;
  attemptsCount: number;
}

interface Roadmap {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  difficulty: string;
  difficultyLevel: 1 | 2 | 3;
  estimatedTime: string;
  modules: Module[];
  accent: string;
  image: string; // 🆕 cover image path
}

type SortMode = "default" | "progress" | "alphabetical";
type DifficultyFilter = "all" | "1" | "2" | "3";

// ─── Constants ───────────────────────────────────────────────────────────────
const LEVEL_ORDER: Record<string, number> = {
  "Cơ bản": 1,
  "Trung cấp": 2,
  "Nâng cao": 3,
};

const XP_PER_LEVEL = 500;

// 🆕 Mỗi roadmap có ảnh cover, đường dẫn theo id: /{id}.jpg (đặt trong /public)
const ROADMAP_META: Record<
  string,
  { accent: string; difficultyLevel: 1 | 2 | 3; image: string }
> = {
  python: {
    accent: "from-amber-400 via-yellow-400 to-emerald-400",
    difficultyLevel: 1,
    image: "/python.jpg",
  },
  "web-dev": {
    accent: "from-sky-400 via-cyan-400 to-indigo-400",
    difficultyLevel: 1,
    image: "/web-dev.jpg",
  },
  "js-mastery": {
    accent: "from-yellow-300 via-amber-400 to-orange-500",
    difficultyLevel: 2,
    image: "/js-mastery.jpg",
  },
  cpp: {
    accent: "from-blue-400 via-violet-500 to-fuchsia-500",
    difficultyLevel: 3,
    image: "/cpp.jpg",
  },
  java: {
    accent: "from-rose-400 via-orange-400 to-amber-300",
    difficultyLevel: 2,
    image: "/java.jpg",
  },
};

const FALLBACK_IMAGE = "/placeholder.jpg";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const buildRoadmaps = (
  lessons: Lesson[],
  progress: LessonProgress[],
  attempts: ExerciseAttempt[],
): Roadmap[] => {
  const progressMap = new Map(progress.map((p) => [p.lesson_slug, p]));
  const attemptsByLesson = new Map<string, number>();
  for (const a of attempts) {
    const slug = (a as any).lesson_slug;
    if (!slug) continue;
    attemptsByLesson.set(slug, (attemptsByLesson.get(slug) ?? 0) + 1);
  }

  const makeModule = (lesson: Lesson): Module => {
    const p = progressMap.get(lesson.slug);
    return {
      id: lesson.slug,
      title: lesson.title,
      completed: p?.completed ?? false,
      locked: false,
      estimatedTime: "1 tuần",
      lessonCount: lesson.blocks.length,
      level: lesson.level,
      slug: lesson.slug,
      bestScore: p?.best_score ?? 0,
      attemptsCount: attemptsByLesson.get(lesson.slug) ?? 0,
    };
  };

  const groupByLanguage = (lang: string) =>
    lessons
      .filter((l) => l.language === lang)
      .sort(
        (a, b) => (LEVEL_ORDER[a.level] || 99) - (LEVEL_ORDER[b.level] || 99),
      );

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
      const prev = modules[i - 1];
      const prevDone = prev.completed || prev.bestScore >= 7;
      if (!prevDone) modules[i].locked = true;
    }
    return modules;
  };

  const roadmaps: Roadmap[] = [];
  const push = (
    id: string,
    title: string,
    description: string,
    icon: React.ElementType,
    difficulty: string,
    modules: Module[],
  ) => {
    if (modules.length === 0) return;
    const meta = ROADMAP_META[id] ?? {
      accent: "from-primary to-fuchsia-500",
      difficultyLevel: 2 as const,
      image: FALLBACK_IMAGE,
    };
    roadmaps.push({
      id,
      title,
      description,
      icon,
      difficulty,
      difficultyLevel: meta.difficultyLevel,
      estimatedTime: `${modules.length} bài học`,
      modules: applyLocking(modules),
      accent: meta.accent,
      image: meta.image,
    });
  };

  push("python", "Python Developer", "Từ cú pháp cơ bản đến OOP và AI/ML", Code, "Cơ bản - Trung cấp", pythonModules);
  push("web-dev", "Web Development", "HTML, CSS, JavaScript nền tảng", Globe, "Cơ bản - Trung cấp", webModules);
  push("js-mastery", "JavaScript Mastery", "Nâng cao kỹ năng JavaScript hiện đại", Zap, "Trung cấp - Nâng cao", jsModules);
  push("cpp", "C++ Developer", "Lập trình hệ thống và game", Rocket, "Cơ bản - Nâng cao", cppModules);
  push("java", "Java Developer", "Lập trình hướng đối tượng và ứng dụng", BookOpen, "Cơ bản - Trung cấp", javaModules);

  return roadmaps;
};

const calculateProgress = (modules: Module[]) => {
  const completed = modules.filter((m) => m.completed).length;
  const total = modules.length || 1;
  return {
    completed,
    total: modules.length,
    percent: Math.round((completed / total) * 100),
  };
};

const getNextRecommendation = (modules: Module[]): Module | null => {
  for (const mod of modules) {
    if (!mod.completed && !mod.locked) return mod;
  }
  return null;
};

const computeStreak = (dates: string[]): number => {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff =
      (new Date(sorted[i]).getTime() - new Date(sorted[i + 1]).getTime()) /
      86400000;
    if (Math.abs(diff - 1) < 0.1) streak++;
    else break;
  }
  return streak;
};

const xpToLevel = (xp: number) => {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const currentLevelXp = xp % XP_PER_LEVEL;
  const percent = Math.round((currentLevelXp / XP_PER_LEVEL) * 100);
  return { level, currentLevelXp, percent, nextLevelXp: XP_PER_LEVEL };
};

const last7Days = (): string[] => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};

// ─── Small UI Atoms ──────────────────────────────────────────────────────────
const ProgressBar = ({
  percent,
  accent = "bg-primary",
}: {
  percent: number;
  accent?: string;
}) => (
  <div className="w-full bg-secondary rounded-full h-2 mt-1 overflow-hidden">
    <div
      className={`h-2 rounded-full transition-all duration-700 ease-out ${accent}`}
      style={{ width: `${percent}%` }}
    />
  </div>
);

const CircularProgress = ({
  percent,
  size = 56,
  stroke = 5,
  accentClass = "stroke-primary",
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  accentClass?: string;
  children?: React.ReactNode;
}) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percent / 100) * circ;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="stroke-secondary fill-none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={`${accentClass} fill-none transition-all duration-700 ease-out`}
          style={{
            strokeDasharray: circ,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {children ?? `${percent}%`}
      </div>
    </div>
  );
};

// 🆕 Ảnh cover với fallback + skeleton mượt
const CoverImage = ({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && !errored && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-secondary via-secondary/60 to-secondary" />
      )}
      <img
        src={errored ? FALLBACK_IMAGE : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={`h-full w-full object-cover transition-all duration-700 ease-out ${
          loaded ? "scale-100 opacity-100" : "scale-105 opacity-0"
        } group-hover:scale-110`}
      />
    </div>
  );
};

const SkeletonCard = () => (
  <div className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
    <div className="h-36 bg-secondary" />
    <div className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-secondary" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-secondary" />
          <div className="h-3 w-48 rounded bg-secondary" />
        </div>
      </div>
      <div className="mt-4 h-2 w-full rounded bg-secondary" />
    </div>
  </div>
);

// ─── Toast ────────────────────────────────────────────────────────────────────
const useToast = () => {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const show = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, show };
};

const ToastView = ({ message }: { message: string }) => (
  <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
    <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-card/95 backdrop-blur px-4 py-3 shadow-2xl shadow-primary/20">
      <Sparkles className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  </div>
);

// ─── Confetti ─────────────────────────────────────────────────────────────────
const Confetti = () => {
  const pieces = Array.from({ length: 60 });
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 2 + Math.random() * 1.5;
        const colors = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#ec4899", "#3b82f6"];
        const bg = colors[i % colors.length];
        return (
          <span
            key={i}
            className="absolute top-[-10px] block h-2 w-2 rounded-sm"
            style={{
              left: `${left}%`,
              backgroundColor: bg,
              animation: `confetti-fall ${duration}s ${delay}s linear forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          to { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ─── Roadmap Card (✨ Premium with cover image) ──────────────────────────────
const RoadmapCard = ({
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
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden text-left cursor-pointer rounded-2xl border transition-all duration-300
        hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20
        ${
          isActive
            ? "border-primary/60 bg-card shadow-xl shadow-primary/20 ring-2 ring-primary/40"
            : "border-border bg-card/80 backdrop-blur hover:border-primary/40"
        }`}
      style={{ animation: `card-in 0.4s ${index * 0.05}s both` }}
    >
      {/* 🆕 Cover image */}
      <div className="relative h-36 w-full overflow-hidden">
        <CoverImage
          src={roadmap.image}
          alt={roadmap.title}
          className="h-full w-full"
        />
        {/* Gradient overlay tạo độ sâu + accent màu của roadmap */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent`}
        />
        <div
          className={`absolute inset-0 bg-gradient-to-br ${roadmap.accent} opacity-25 mix-blend-overlay`}
        />

        {/* Icon nổi trên ảnh */}
        <div
          className={`absolute bottom-3 left-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${roadmap.accent} text-white shadow-lg shadow-black/30 ring-2 ring-card/60`}
        >
          <IconComponent className="h-6 w-6" />
        </div>

        {/* Badge difficulty */}
        <div className="absolute top-3 left-3 rounded-full bg-black/40 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-white">
          {roadmap.difficulty}
        </div>

        {/* Badge done */}
        {isDone && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
            <Crown className="h-3 w-3" /> HOÀN THÀNH
          </div>
        )}

        {/* Progress ring nổi trên ảnh */}
        <div className="absolute bottom-3 right-3 rounded-full bg-card/80 backdrop-blur p-1 shadow-lg">
          <CircularProgress
            percent={percent}
            size={44}
            stroke={4}
            accentClass={isDone ? "stroke-emerald-500" : "stroke-primary"}
          >
            <span className="text-[10px] font-bold">{percent}%</span>
          </CircularProgress>
        </div>
      </div>

      {/* Body */}
      <div className="relative p-4">
        <h3 className="font-bold text-foreground truncate">{roadmap.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2rem]">
          {roadmap.description}
        </p>

        <div className="mt-3">
          <ProgressBar
            percent={percent}
            accent={
              isDone
                ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                : `bg-gradient-to-r ${roadmap.accent}`
            }
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{roadmap.estimatedTime}</span>
            <span className="font-semibold text-foreground">
              {completed}/{total} bài
            </span>
          </div>
        </div>
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

// ─── Module Timeline ─────────────────────────────────────────────────────────
const ModuleTimeline = ({ modules }: { modules: Module[] }) => {
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
                  <Lock
                    className="h-3 w-3 text-muted-foreground shrink-0"
                    aria-label="Cần hoàn thành bài trước"
                  />
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

// ─── Sidebar widgets ─────────────────────────────────────────────────────────
const NextRecommendation = ({ module: mod }: { module: Module }) => (
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

const HeatmapWeek = ({ activeDates }: { activeDates: Set<string> }) => {
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

const AchievementBadge = ({
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

// ─── Main ────────────────────────────────────────────────────────────────────
function RoadmapPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [attempts, setAttempts] = useState<ExerciseAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast, show: showToast } = useToast();

  const prevCompletedCount = useRef<number | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        }
        const [allLessons, userProgress, userAttempts] = await Promise.all([
          lessonsStore.listAsync(true),
          user ? progressStore.listMine() : Promise.resolve([]),
          user ? progressStore.listAttempts() : Promise.resolve([]),
        ]);
        if (!mountedRef.current) return;
        setLessons(allLessons);
        setProgress(userProgress);
        setAttempts(userAttempts);
      } catch (e: any) {
        if (!mountedRef.current) return;
        setError(e.message || "Không thể tải dữ liệu");
      } finally {
        if (mountedRef.current && !silent) setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    setLessons([]);
    setProgress([]);
    setAttempts([]);
    setActiveRoadmapId("");
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const reload = () => fetchData(true);

    window.addEventListener("progress-updated", reload);

    let unsubEmitter: (() => void) | undefined;
    if (progressEvents && typeof (progressEvents as any).on === "function") {
      const handler = () => reload();
      (progressEvents as any).on("change", handler);
      unsubEmitter = () => (progressEvents as any).off?.("change", handler);
    }

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes("progress") || e.key.includes("lesson")) {
        reload();
      }
    };
    window.addEventListener("storage", onStorage);

    const onVisibility = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisibility);

    window.addEventListener("focus", reload);

    return () => {
      window.removeEventListener("progress-updated", reload);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", reload);
      unsubEmitter?.();
    };
  }, [fetchData]);

  useEffect(() => {
    const completedNow = progress.filter((p) => p.completed).length;
    if (
      prevCompletedCount.current !== null &&
      completedNow > prevCompletedCount.current
    ) {
      const diff = completedNow - prevCompletedCount.current;
      showToast(`🎉 +${diff} bài hoàn thành! Tiếp tục phát huy!`);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }
    prevCompletedCount.current = completedNow;
  }, [progress, showToast]);

  const roadmaps = useMemo(
    () => buildRoadmaps(lessons, progress, attempts),
    [lessons, progress, attempts],
  );

  const [activeRoadmapId, setActiveRoadmapId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");

  useEffect(() => {
    if (roadmaps.length > 0 && !activeRoadmapId) {
      setActiveRoadmapId(roadmaps[0].id);
    }
  }, [roadmaps]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeRoadmap = useMemo(
    () => roadmaps.find((r) => r.id === activeRoadmapId) || roadmaps[0],
    [roadmaps, activeRoadmapId],
  );

  const nextRecommendation = useMemo(
    () => (activeRoadmap ? getNextRecommendation(activeRoadmap.modules) : null),
    [activeRoadmap],
  );

  const filteredRoadmaps = useMemo(() => {
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
  }, [roadmaps, searchTerm, difficultyFilter, sortMode]);

  const stats = useMemo(() => {
    const activeDates = new Set(
      attempts.map((a) => new Date(a.created_at).toISOString().slice(0, 10)),
    );
    const completedDates = new Set(
      progress
        .filter((p) => p.completed && (p as any).updated_at)
        .map((p) =>
          new Date((p as any).updated_at).toISOString().slice(0, 10),
        ),
    );
    const allActiveDates = new Set([...activeDates, ...completedDates]);
    const streak = computeStreak(Array.from(allActiveDates));
    const totalCompleted = progress.filter((p) => p.completed).length;
    const totalXP = progress.reduce((sum, p) => sum + p.best_score, 0);
    const todayCount = progress.filter(
      (p) =>
        p.completed &&
        (p as any).updated_at &&
        new Date((p as any).updated_at).toISOString().slice(0, 10) ===
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
  }, [attempts, progress]);

  const recentActivity = useMemo(() => {
    const completed = progress.filter((p) => p.completed);
    return completed
      .slice(-5)
      .reverse()
      .map((p) => ({
        title:
          lessons.find((l) => l.slug === p.lesson_slug)?.title || p.lesson_slug,
        roadmap: lessons.find((l) => l.slug === p.lesson_slug)?.language || "",
        score: p.best_score,
      }));
  }, [progress, lessons]);

  const achievements = useMemo(
    () => [
      { icon: Rocket, label: "Bài đầu tiên", unlocked: stats.totalCompleted >= 1, color: "sky" },
      { icon: Flame, label: "Streak 3 ngày", unlocked: stats.streak >= 3, color: "orange" },
      { icon: Trophy, label: "10 bài học", unlocked: stats.totalCompleted >= 10, color: "amber" },
      { icon: Award, label: "Level 5", unlocked: stats.level >= 5, color: "fuchsia" },
      {
        icon: Crown,
        label: "Hoàn thành lộ trình",
        unlocked: roadmaps.some((r) => calculateProgress(r.modules).percent === 100),
        color: "emerald",
      },
    ],
    [stats, roadmaps],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const list = filteredRoadmaps;
      if (list.length === 0) return;
      const idx = list.findIndex((r) => r.id === activeRoadmapId);
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveRoadmapId(list[Math.min(idx + 1, list.length - 1)].id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveRoadmapId(list[Math.max(idx - 1, 0)].id);
      } else if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1;
        if (list[n]) setActiveRoadmapId(list[n].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filteredRoadmaps, activeRoadmapId]);

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

  if (error) {
    return (
      <CodeNovaLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-12 w-12 text-destructive/70 mb-4" />
          <p className="text-muted-foreground">{error}</p>
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

  if (roadmaps.length === 0) {
    return (
      <CodeNovaLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Chưa có bài học nào để tạo lộ trình.</p>
        </div>
      </CodeNovaLayout>
    );
  }

  const dailyPercent = Math.min(
    100,
    Math.round((stats.todayCount / stats.dailyGoal) * 100),
  );

  return (
    <CodeNovaLayout>
      {showConfetti && <Confetti />}
      {toast && <ToastView message={toast.message} />}

      <div className="mx-auto max-w-6xl px-4 pt-10 pb-24">
        {/* Hero header */}
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
                Chọn một lộ trình và tiếp tục hành trình của bạn. Mỗi bài học
                hoàn thành đều được{" "}
                <span className="text-primary font-semibold">ghi nhận tự động</span>{" "}
                vào tiến độ.
              </p>
            </div>

            {user && (
              <div className="flex items-center gap-4">
                <CircularProgress
                  percent={stats.percent}
                  size={80}
                  stroke={6}
                  accentClass="stroke-primary"
                >
                  <div className="text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">Lv</div>
                    <div className="text-lg font-black text-primary leading-none">
                      {stats.level}
                    </div>
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
              <ProgressBar
                percent={dailyPercent}
                accent={
                  dailyPercent === 100
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                    : "bg-gradient-to-r from-primary to-fuchsia-400"
                }
              />
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
              <HeatmapWeek activeDates={stats.activeDates} />
              <p className="text-[11px] text-muted-foreground mt-2">
                Giữ vững phong độ mỗi ngày để xây dựng thói quen học tập.
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
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
            {(
              [
                ["all", "Tất cả"],
                ["1", "Cơ bản"],
                ["2", "Trung cấp"],
                ["3", "Nâng cao"],
              ] as const
            ).map(([val, label]) => (
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

        {/* Continue learning CTA — 🆕 nền là ảnh của roadmap đang active */}
        {activeRoadmap && nextRecommendation && (
          <div className="mb-6 relative overflow-hidden rounded-2xl border border-primary/30 p-5">
            <div className="absolute inset-0">
              <CoverImage
                src={activeRoadmap.image}
                alt=""
                className="h-full w-full opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/40" />
              <div
                className={`absolute inset-0 bg-gradient-to-r ${activeRoadmap.accent} opacity-10`}
              />
            </div>
            <div className="relative flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${activeRoadmap.accent} text-white shadow-lg shadow-primary/30`}
                >
                  <PlayCircle className="h-7 w-7" />
                </div>
                <div>
                  <div className="text-xs font-medium text-primary uppercase tracking-wider">
                    Tiếp tục học
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {nextRecommendation.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {activeRoadmap.title} · {nextRecommendation.level}
                  </p>
                </div>
              </div>
              <Link
                to="/lesson/$slug"
                params={{ slug: nextRecommendation.slug }}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 hover:shadow-xl transition-all flex items-center gap-2"
              >
                Bắt đầu ngay <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Roadmap cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {filteredRoadmaps.map((roadmap, i) => (
            <RoadmapCard
              key={roadmap.id}
              roadmap={roadmap}
              isActive={roadmap.id === activeRoadmapId}
              onClick={() => setActiveRoadmapId(roadmap.id)}
              index={i}
            />
          ))}
          {filteredRoadmaps.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              Không tìm thấy lộ trình phù hợp.
            </div>
          )}
        </div>

        {/* Active roadmap detail — 🆕 header có ảnh banner */}
        {activeRoadmap && (
          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden backdrop-blur">
            {/* Banner */}
            <div className="relative h-44 md:h-56 w-full overflow-hidden">
              <CoverImage
                src={activeRoadmap.image}
                alt={activeRoadmap.title}
                className="h-full w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent" />
              <div
                className={`absolute inset-0 bg-gradient-to-br ${activeRoadmap.accent} opacity-20 mix-blend-overlay`}
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-end gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${activeRoadmap.accent} text-white shadow-lg ring-2 ring-card/60`}
                >
                  <activeRoadmap.icon className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl md:text-3xl font-black text-foreground truncate drop-shadow">
                    {activeRoadmap.title}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {activeRoadmap.description}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <CircularProgress
                    percent={calculateProgress(activeRoadmap.modules).percent}
                    size={64}
                    stroke={5}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" /> Lộ trình chi tiết
                </h3>
                {activeRoadmap.modules.length > 0 ? (
                  <ModuleTimeline modules={activeRoadmap.modules} />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Chưa có bài học nào trong lộ trình này.
                  </p>
                )}
              </div>

              <div className="space-y-5">
                {nextRecommendation && (
                  <NextRecommendation module={nextRecommendation} />
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
                    <span>
                      {calculateProgress(activeRoadmap.modules).completed} hoàn thành
                    </span>
                    <span>{calculateProgress(activeRoadmap.modules).total} tổng</span>
                  </div>
                </div>

                {user && (
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
                )}

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
