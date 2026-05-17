// lessons-store.ts — Stable Production Edition
import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────
export type CodeBlock = {
  id: string;
  code: string;
  explanation?: string;
};

export type Exercise = {
  id: string;
  prompt: string;
};

export type LessonLanguage =
  | "python"
  | "html"
  | "css"
  | "javascript"
  | "java"
  | "cpp";

export const LANGUAGE_LABELS: Record<LessonLanguage, string> = {
  python: "Python",
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  java: "Java",
  cpp: "C++",
};

export const LANGUAGE_COLORS: Record<LessonLanguage, string> = {
  python: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400",
  html: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  css: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  javascript: "bg-yellow-400/10 text-yellow-700 border-yellow-400/20 dark:text-yellow-300",
  java: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  cpp: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400",
};

export const LEVEL_LABELS: Record<string, string> = {
  "Cơ bản": "Cơ bản",
  "Trung cấp": "Trung cấp",
  "Nâng cao": "Nâng cao",
};

export type Lesson = {
  slug: string;
  title: string;
  level: "Cơ bản" | "Trung cấp" | "Nâng cao";
  language?: LessonLanguage;
  description: string;
  image?: string;
  blocks: CodeBlock[];
  exercises: Exercise[];
  createdAt: number;
};

// ─── Helpers ────────────────────────────────────
function generateUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function notify() {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("codenova:lessons:changed"));
    }
  } catch {}
}

function normalizeLevel(level: string | undefined | null): Lesson["level"] {
  if (!level) return "Cơ bản";
  const l = level
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (l.includes("trung") || l.includes("intermediate")) return "Trung cấp";
  if (l.includes("nang") || l.includes("advanced")) return "Nâng cao";
  return "Cơ bản";
}

function mapRow(row: any): Lesson {
  return {
    slug: row.slug,
    title: row.title,
    level: normalizeLevel(row.level),
    language: row.language as LessonLanguage | undefined,
    description: row.description || "",
    image: row.image || undefined,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : row.createdAt || Date.now(),
  };
}

// ─── Cache ──────────────────────────────────────
let _lessonsCache: Lesson[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

function isCacheValid() {
  return (
    _lessonsCache !== null &&
    Date.now() - _cacheTimestamp < CACHE_TTL_MS
  );
}

// ─── Store ──────────────────────────────────────
export const lessonsStore = {
  async listAsync(force = false): Promise<Lesson[]> {
    if (!force && isCacheValid()) {
      return [..._lessonsCache!];
    }

    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("❌ listAsync:", error);
      return _lessonsCache ? [..._lessonsCache] : [];
    }

    const lessons = (data || []).map(mapRow);
    _lessonsCache = lessons;
    _cacheTimestamp = Date.now();
    return [...lessons];
  },

  list(): Lesson[] {
    return _lessonsCache ? [..._lessonsCache] : [];
  },

  get(slug: string): Lesson | undefined {
    return _lessonsCache?.find((l) => l.slug === slug);
  },

  async getAsync(slug: string): Promise<Lesson | undefined> {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      console.warn("⚠️ getAsync:", slug);
      return undefined;
    }
    return mapRow(data);
  },

  async upsert(lesson: Lesson): Promise<void> {
    const payload = {
      slug: lesson.slug,
      title: lesson.title,
      level: lesson.level,
      language: lesson.language || null,
      description: lesson.description,
      image: lesson.image || null,
      blocks: lesson.blocks,
      exercises: lesson.exercises,
      created_at: new Date(lesson.createdAt || Date.now()).toISOString(),
    };

    const { error } = await supabase
      .from("lessons")
      .upsert(payload, {
        onConflict: "slug",
      });

    if (error) {
      console.error("❌ upsert:", error);
      throw new Error("Không thể lưu bài học.");
    }

    const newLesson: Lesson = {
      ...lesson,
      createdAt: lesson.createdAt || Date.now(),
    };

    if (_lessonsCache) {
      const idx = _lessonsCache.findIndex((l) => l.slug === lesson.slug);
      if (idx >= 0) {
        _lessonsCache[idx] = newLesson;
      } else {
        _lessonsCache.unshift(newLesson);
      }
    }

    _cacheTimestamp = Date.now();
    notify();
  },

  async remove(slug: string): Promise<void> {
    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("slug", slug);

    if (error) {
      console.error("❌ remove:", error);
      throw new Error("Không thể xoá bài học.");
    }

    if (_lessonsCache) {
      _lessonsCache = _lessonsCache.filter((l) => l.slug !== slug);
    }

    _cacheTimestamp = Date.now();
    notify();
  },

  reset() {
    _lessonsCache = null;
    _cacheTimestamp = 0;
  },

  get newId() {
    return generateUID();
  },

  slugify(s: string): string {
    return (
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60) || "lesson-" + generateUID()
    );
  },
};
