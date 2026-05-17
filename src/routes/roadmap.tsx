// src/routes/roadmap.tsx
import React, { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import {
  Globe, Code, Zap, CheckCircle2, Lock, ArrowRight,
  Search, Flame, Star, CalendarDays,
} from "lucide-react";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Lộ trình học tập — CodeNova" },
      {
        name: "description",
        content: "Khám phá các lộ trình học lập trình từ cơ bản đến nâng cao.",
      },
    ],
  }),
  component: RoadmapPage,
});

// ─── Types ────────────────────────────────────────────
interface Module {
  id: string;
  title: string;
  completed: boolean;
  prerequisites: string[];
  estimatedTime: string;
  lessonCount: number;
}

interface Roadmap {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType; // thay vì emoji
  difficulty: string;
  estimatedTime: string;
  modules: Module[];
}

// ─── Mock Data ────────────────────────────────────────
const ROADMAPS: Roadmap[] = [
  {
    id: "web-dev",
    title: "Web Development",
    description: "Từ HTML cơ bản đến Fullstack Project",
    icon: Globe,
    difficulty: "Trung cấp",
    estimatedTime: "12 tuần",
    modules: [
      { id: "html-basic", title: "HTML Basics", completed: true, prerequisites: [], estimatedTime: "1 tuần", lessonCount: 5 },
      { id: "inter-html", title: "Intermediate HTML", completed: false, prerequisites: [], estimatedTime: "1 tuần", lessonCount: 4 },
      { id: "css-basic", title: "CSS Basics", completed: false, prerequisites: [], estimatedTime: "1 tuần", lessonCount: 5 },
      { id: "resp-css", title: "Responsive CSS", completed: false, prerequisites: ["css-basic"], estimatedTime: "2 tuần", lessonCount: 6 },
      { id: "js-basic", title: "JavaScript Basics", completed: false, prerequisites: [], estimatedTime: "2 tuần", lessonCount: 6 },
      { id: "dom-manip", title: "DOM Manipulation", completed: false, prerequisites: ["js-basic"], estimatedTime: "1.5 tuần", lessonCount: 4 },
      { id: "async-js", title: "Async JavaScript", completed: false, prerequisites: ["js-basic"], estimatedTime: "2 tuần", lessonCount: 5 },
      { id: "react-basic", title: "React Basics", completed: false, prerequisites: ["js-basic", "dom-manip"], estimatedTime: "2 tuần", lessonCount: 6 },
      { id: "fullstack", title: "Fullstack Project", completed: false, prerequisites: ["react-basic", "async-js", "resp-css"], estimatedTime: "3 tuần", lessonCount: 8 },
    ],
  },
  {
    id: "python",
    title: "Python Developer",
    description: "Từ cú pháp cơ bản đến AI/ML",
    icon: Code, // tạm dùng icon Code, sau có thể thay bằng ảnh
    difficulty: "Cơ bản",
    estimatedTime: "10 tuần",
    modules: [
      { id: "py-syntax", title: "Python Syntax", completed: true, prerequisites: [], estimatedTime: "1 tuần", lessonCount: 6 },
      { id: "py-data", title: "Data Structures", completed: true, prerequisites: [], estimatedTime: "1 tuần", lessonCount: 5 },
      { id: "py-oop", title: "OOP in Python", completed: false, prerequisites: ["py-syntax"], estimatedTime: "2 tuần", lessonCount: 6 },
      { id: "py-web", title: "Web với Flask", completed: false, prerequisites: ["py-oop"], estimatedTime: "2 tuần", lessonCount: 5 },
      { id: "py-ai", title: "AI/ML Cơ bản", completed: false, prerequisites: ["py-data", "py-oop"], estimatedTime: "3 tuần", lessonCount: 7 },
    ],
  },
  {
    id: "js-mastery",
    title: "JavaScript Mastery",
    description: "Nâng cao kỹ năng JavaScript hiện đại",
    icon: Zap,
    difficulty: "Nâng cao",
    estimatedTime: "8 tuần",
    modules: [
      { id: "js-adv-func", title: "Advanced Functions", completed: false, prerequisites: [], estimatedTime: "1 tuần", lessonCount: 4 },
      { id: "js-async", title: "Asynchronous JS", completed: false, prerequisites: ["js-adv-func"], estimatedTime: "2 tuần", lessonCount: 5 },
      { id: "js-patterns", title: "Design Patterns", completed: false, prerequisites: ["js-async"], estimatedTime: "2 tuần", lessonCount: 4 },
      { id: "js-testing", title: "Testing", completed: false, prerequisites: ["js-patterns"], estimatedTime: "1.5 tuần", lessonCount: 3 },
    ],
  },
];

// ─── Utilities ────────────────────────────────────────
const isModuleLocked = (module: Module, allModules: Module[]): boolean => {
  if (module.prerequisites.length === 0) return false;
  return !module.prerequisites.every((prereqId) => {
    const prereq = allModules.find((m) => m.id === prereqId);
    return prereq && prereq.completed;
  });
};

const calculateProgress = (modules: Module[]) => {
  const completed = modules.filter((m) => m.completed).length;
  return { completed, total: modules.length, percent: Math.round((completed / modules.length) * 100) };
};

const getNextRecommendation = (modules: Module[]): Module | null => {
  for (const mod of modules) {
    if (!mod.completed && !isModuleLocked(mod, modules)) {
      return mod;
    }
  }
  return null;
};

// ─── Reusable Components ──────────────────────────────
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
      if (!mod.completed && !isModuleLocked(mod, modules)) return mod.id;
    }
    return null;
  }, [modules]);

  return (
    <div className="relative">
      {modules.map((mod, idx) => {
        const isLast = idx === modules.length - 1;
        const locked = isModuleLocked(mod, modules);
        const state = mod.completed ? "completed" : locked ? "locked" : "current";
        return (
          <div key={mod.id} className="flex gap-4 pb-4">
            {/* timeline dot & line */}
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
            {/* module info */}
            <div className={`flex-1 ${locked ? "opacity-50" : ""}`}>
              <h4 className="text-sm font-medium text-foreground">{mod.title}</h4>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{mod.estimatedTime}</span>
                <span>{mod.lessonCount} bài</span>
              </div>
              {locked && (
                <p className="text-xs text-muted-foreground italic mt-0.5 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Cần hoàn thành trước
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const NextRecommendation = ({ module, allModules }: { module: Module; allModules: Module[] }) => {
  return (
    <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <h3 className="text-sm font-semibold text-primary">✨ Đề xuất tiếp theo</h3>
      <div className="mt-2">
        <h4 className="text-lg font-bold text-foreground">{module.title}</h4>
        <p className="text-xs text-muted-foreground">Bạn đã sẵn sàng để tiếp tục</p>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span>⏱ {module.estimatedTime}</span>
          <span>📚 {module.lessonCount} bài</span>
        </div>
        {module.prerequisites.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Yêu cầu: {module.prerequisites.map(id => allModules.find(m => m.id === id)?.title).join(", ")}
          </p>
        )}
        <button className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
          Bắt đầu học
          <ArrowRight className="ml-2 inline h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Main Page Component ─────────────────────────────
function RoadmapPage() {
  const [activeRoadmapId, setActiveRoadmapId] = useState(ROADMAPS[0].id);
  const [searchTerm, setSearchTerm] = useState("");

  const activeRoadmap = useMemo(() => ROADMAPS.find((r) => r.id === activeRoadmapId)!, [activeRoadmapId]);
  const nextRecommendation = useMemo(() => getNextRecommendation(activeRoadmap.modules), [activeRoadmap]);

  const filteredRoadmaps = useMemo(() => {
    if (!searchTerm.trim()) return ROADMAPS;
    const q = searchTerm.toLowerCase();
    return ROADMAPS.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  }, [searchTerm]);

  // Gamification mock (sẽ thay bằng data thật sau)
  const stats = useMemo(() => {
    let totalCompleted = 0;
    ROADMAPS.forEach((r) => {
      totalCompleted += r.modules.filter((m) => m.completed).length;
    });
    return {
      streak: 7,
      xp: totalCompleted * 50,
      totalCompleted,
      dailyGoal: 5,
    };
  }, []);

  const recentActivity = useMemo(() => {
    const completedModules: { title: string; roadmap: string }[] = [];
    ROADMAPS.forEach(r => {
      r.modules.forEach(m => {
        if (m.completed) completedModules.push({ title: m.title, roadmap: r.title });
      });
    });
    return completedModules.slice(-2).reverse();
  }, []);

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
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm">
              <Flame className="h-4 w-4 text-orange-500" /> {stats.streak} ngày
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm">
              <Star className="h-4 w-4 text-yellow-500" /> {stats.xp} XP
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm">
              <CalendarDays className="h-4 w-4 text-primary" /> {stats.totalCompleted}/{stats.dailyGoal} hôm nay
            </div>
          </div>
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
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
              Bắt đầu ngay
            </button>
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
              <ModuleTimeline modules={activeRoadmap.modules} />
            </div>

            {/* Sidebar with recommendation & overview */}
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
      </div>
    </CodeNovaLayout>
  );
}
