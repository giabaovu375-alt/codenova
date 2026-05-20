import type { Lesson } from "@/lib/lessons-store";
import type { LessonProgress, ExerciseAttempt } from "@/lib/progress-store";
import type { Module, Roadmap } from "./roadmap-types";

export const LEVEL_ORDER: Record<string, number> = {
  "Cơ bản": 1,
  "Trung cấp": 2,
  "Nâng cao": 3,
};

export const XP_PER_LEVEL = 500;

export const ROADMAP_META: Record<
  string,
  { accent: string; difficultyLevel: 1 | 2 | 3 }
> = {
  python: {
    accent: "from-amber-400 via-yellow-400 to-emerald-400",
    difficultyLevel: 1,
  },
  "web-dev": {
    accent: "from-sky-400 via-cyan-400 to-indigo-400",
    difficultyLevel: 1,
  },
  "js-mastery": {
    accent: "from-yellow-300 via-amber-400 to-orange-500",
    difficultyLevel: 2,
  },
  cpp: {
    accent: "from-blue-400 via-violet-500 to-fuchsia-500",
    difficultyLevel: 3,
  },
  java: {
    accent: "from-rose-400 via-orange-400 to-amber-300",
    difficultyLevel: 2,
  },
};

export function buildRoadmaps(
  lessons: Lesson[],
  progress: LessonProgress[],
  attempts: ExerciseAttempt[],
): Roadmap[] {
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
        (a, b) =>
          (LEVEL_ORDER[a.level] || 99) - (LEVEL_ORDER[b.level] || 99),
      );

  const applyLocking = (modules: Module[]) => {
    for (let i = 1; i < modules.length; i++) {
      const prev = modules[i - 1];
      if (!prev.completed && prev.bestScore < 7) modules[i].locked = true;
    }
    return modules;
  };

  const roadmaps: Roadmap[] = [];
  const push = (
    id: string,
    title: string,
    description: string,
    icon: any,
    difficulty: string,
    modules: Module[],
  ) => {
    if (modules.length === 0) return;
    const meta = ROADMAP_META[id] ?? {
      accent: "from-primary to-fuchsia-500",
      difficultyLevel: 2 as const,
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
    });
  };

  push("python", "Python Developer", "Từ cú pháp cơ bản đến OOP và AI/ML", null, "Cơ bản - Trung cấp", groupByLanguage("python").map(makeModule));
  push("web-dev", "Web Development", "HTML, CSS, JavaScript nền tảng", null, "Cơ bản - Trung cấp", [...groupByLanguage("html"), ...groupByLanguage("css"), ...groupByLanguage("javascript")].map(makeModule));
  push("js-mastery", "JavaScript Mastery", "Nâng cao kỹ năng JavaScript hiện đại", null, "Trung cấp - Nâng cao", groupByLanguage("javascript").map(makeModule));
  push("cpp", "C++ Developer", "Lập trình hệ thống và game", null, "Cơ bản - Nâng cao", groupByLanguage("cpp").map(makeModule));
  push("java", "Java Developer", "Lập trình hướng đối tượng và ứng dụng", null, "Cơ bản - Trung cấp", groupByLanguage("java").map(makeModule));

  return roadmaps;
}

export function calculateProgress(modules: Module[]) {
  const completed = modules.filter((m) => m.completed).length;
  const total = modules.length || 1;
  return {
    completed,
    total: modules.length,
    percent: Math.round((completed / total) * 100),
  };
}

export function getNextRecommendation(modules: Module[]): Module | null {
  for (const mod of modules) {
    if (!mod.completed && !mod.locked) return mod;
  }
  return null;
}

export function computeStreak(dates: string[]): number {
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
}

export function xpToLevel(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const currentLevelXp = xp % XP_PER_LEVEL;
  const percent = Math.round((currentLevelXp / XP_PER_LEVEL) * 100);
  return { level, currentLevelXp, percent, nextLevelXp: XP_PER_LEVEL };
}

export function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
