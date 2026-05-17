// src/routes/roadmap.tsx
import React, { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Lộ trình học tập — CodeNova" },
      {
        name: "description",
        content: "Khám phá các lộ trình học lập trình từ cơ bản đến nâng cao. Web, Python, JavaScript và nhiều hơn nữa.",
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
  icon: string;
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
    icon: "🌐",
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
    icon: "🐍",
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
    icon: "⚡",
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

// ─── Components ───────────────────────────────────────
const ProgressBar = ({ percent }: { percent: number }) => (
  <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
    <div
      className="bg-indigo-500 h-2 rounded-full transition-all duration-700"
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
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-4 transition hover:shadow-lg ${
        isActive ? "border-indigo-500 bg-gray-800 shadow-md" : "border-gray-700 bg-gray-800/50 hover:border-gray-500"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{roadmap.icon}</span>
        <div>
          <h3 className="font-semibold text-white">{roadmap.title}</h3>
          <p className="text-sm text-gray-400">{roadmap.description}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>{roadmap.difficulty}</span>
        <span>{roadmap.estimatedTime}</span>
      </div>
      <ProgressBar percent={percent} />
      <div className="mt-2 flex justify-between text-xs text-gray-300">
        <span>{completed}/{total} bài học</span>
        <span>{percent}%</span>
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
          <div key={mod.id} className="flex gap-4 pb-4 group">
            <div className="flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                  state === "completed"
                    ? "bg-green-500 border-green-500"
                    : state === "current"
                    ? "bg-indigo-500 border-indigo-500 animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                    : "bg-gray-600 border-gray-500"
                }`}
              >
                {state === "completed" && <span className="text-white text-xs">✓</span>}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 mt-1 ${state === "completed" ? "bg-green-500" : "bg-gray-600"}`} />
              )}
            </div>
            <div className={`flex-1 transition-opacity ${locked ? "opacity-40" : ""}`}>
              <h4 className="text-sm font-medium text-white">{mod.title}</h4>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{mod.estimatedTime}</span>
                <span>{mod.lessonCount} bài</span>
              </div>
              {locked && (
                <p className="text-xs text-gray-500 italic mt-0.5">🔒 Cần hoàn thành trước</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const NextRecommendation = ({ module, allModules }: { module: Module; allModules: Module[] }) => {
  const fasterThanPercent = 72 + Math.floor(Math.random() * 15);
  return (
    <div className="mt-6 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
      <h3 className="text-sm font-semibold text-indigo-300">✨ Đề xuất tiếp theo</h3>
      <div className="mt-2">
        <h4 className="text-lg font-bold text-white">{module.title}</h4>
        <p className="text-xs text-gray-300">Bạn đã sẵn sàng để tiếp tục</p>
        <div className="mt-2 flex gap-4 text-xs text-gray-400">
          <span>⏱ {module.estimatedTime}</span>
          <span>📚 {module.lessonCount} bài</span>
        </div>
        {module.prerequisites.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Yêu cầu: {module.prerequisites.map(id => allModules.find(m => m.id === id)?.title).join(", ")}
          </p>
        )}
        <p className="mt-2 text-xs text-green-400">🚀 Bạn đang đi nhanh hơn {fasterThanPercent}% người học</p>
        <button className="mt-3 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition">
          Bắt đầu học
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
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Lộ trình học tập</h1>
            <p className="text-gray-400 text-sm mt-1">Chọn một lộ trình và tiếp tục hành trình của bạn</p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-1 rounded-full bg-gray-800 px-3 py-1 text-sm">
              <span>🔥</span> {stats.streak} ngày
            </div>
            <div className="flex items-center gap-1 rounded-full bg-gray-800 px-3 py-1 text-sm">
              <span>⭐</span> {stats.xp} XP
            </div>
            <div className="flex items-center gap-1 rounded-full bg-gray-800 px-3 py-1 text-sm">
              <span>📅</span> {stats.totalCompleted}/{stats.dailyGoal} hôm nay
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm lộ trình..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-80 rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Continue learning CTA */}
        {activeRoadmap && nextRecommendation && (
          <div className="mb-6 p-4 rounded-xl border border-indigo-500/40 bg-indigo-500/5 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-semibold text-white">Tiếp tục học</h3>
              <p className="text-sm text-gray-300">{nextRecommendation.title} – {activeRoadmap.title}</p>
            </div>
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition">
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
            <p className="text-gray-500 text-sm">Không tìm thấy lộ trình phù hợp.</p>
          )}
        </div>

        {/* Active roadmap detail */}
        <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 md:p-6">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl">{activeRoadmap.icon}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">{activeRoadmap.title}</h2>
              <p className="text-gray-400 text-sm">{activeRoadmap.description}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4">📋 Lộ trình chi tiết</h3>
              <ModuleTimeline modules={activeRoadmap.modules} />
            </div>

            <div>
              {nextRecommendation && (
                <NextRecommendation module={nextRecommendation} allModules={activeRoadmap.modules} />
              )}
              <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h3 className="text-sm font-semibold text-gray-300">📊 Tổng quan</h3>
                <ProgressBar percent={calculateProgress(activeRoadmap.modules).percent} />
                <div className="mt-2 flex justify-between text-xs text-gray-400">
                  <span>{calculateProgress(activeRoadmap.modules).completed} hoàn thành</span>
                  <span>{calculateProgress(activeRoadmap.modules).total} tổng</span>
                </div>
                {recentActivity.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-gray-400 mb-2">Gần đây</h4>
                    <ul className="space-y-1">
                      {recentActivity.map((act, i) => (
                        <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
                          <span className="text-green-400">✓</span> {act.title} <span className="text-gray-600">({act.roadmap})</span>
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
    </div>
  );
}
