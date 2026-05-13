// lessons-store.ts — Best Stable Edition
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
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

export const LEVEL_LABELS = {
  "Cơ bản": "Cơ bản",
  "Trung cấp": "Trung cấp",
  "Nâng cao": "Nâng cao",
} as const;

export type LessonLevel = keyof typeof LEVEL_LABELS;

export type Lesson = {
  slug: string;
  title: string;
  level: LessonLevel;
  language?: LessonLanguage;
  description: string;
  image?: string;
  blocks: CodeBlock[];
  exercises: Exercise[];
  createdAt: number;
};

// ─────────────────────────────────────────────────────────────
// Internal Types
// ─────────────────────────────────────────────────────────────
type LessonRow = {
  slug: string;
  title: string;
  level: string | null;
  language: string | null;
  description: string | null;
  image: string | null;
  blocks: unknown;
  exercises: unknown;
  created_at: string | null;
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const TABLE = "lessons";
const CACHE_TTL_MS = 30_000;
const MAX_LESSONS = 500;

// ─────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────
let lessonsCache: Lesson[] | null = null;
let cacheTimestamp = 0;

function isCacheValid(): boolean {
  return lessonsCache !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

function updateCache(lessons: Lesson[]) {
  lessonsCache = lessons;
  cacheTimestamp = Date.now();
}

function clearCache() {
  lessonsCache = null;
  cacheTimestamp = 0;
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
function generateUID(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
    }
  } catch {}
  return Math.random().toString(36).slice(2, 12);
}

function notifyLessonsChanged() {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("codenova:lessons:changed"));
    }
  } catch {}
}

function normalizeLevel(value: string | null | undefined): LessonLevel {
  if (!value) return "Cơ bản";
  const v = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (v.includes("trung") || v.includes("intermediate")) return "Trung cấp";
  if (v.includes("nang") || v.includes("advanced")) return "Nâng cao";
  return "Cơ bản";
}

function isLanguage(value: unknown): value is LessonLanguage {
  return typeof value === "string" && value in LANGUAGE_LABELS;
}

function safeBlocks(value: unknown): CodeBlock[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((b): CodeBlock | null => {
      if (!b || typeof b !== "object") return null;
      const block = b as Partial<CodeBlock>;
      if (typeof block.code !== "string") return null;
      return {
        id: typeof block.id === "string" ? block.id : generateUID(),
        code: block.code,
        explanation: typeof block.explanation === "string" ? block.explanation : undefined,
      };
    })
    .filter(Boolean) as CodeBlock[];
}

function safeExercises(value: unknown): Exercise[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((e): Exercise | null => {
      if (!e || typeof e !== "object") return null;
      const ex = e as Partial<Exercise>;
      if (typeof ex.prompt !== "string") return null;
      return {
        id: typeof ex.id === "string" ? ex.id : generateUID(),
        prompt: ex.prompt,
      };
    })
    .filter(Boolean) as Exercise[];
}

function mapRow(row: LessonRow): Lesson {
  return {
    slug: row.slug,
    title: row.title || "Untitled",
    level: normalizeLevel(row.level),
    language: isLanguage(row.language) ? row.language : undefined,
    description: row.description || "",
    image: row.image || undefined,
    blocks: safeBlocks(row.blocks),
    exercises: safeExercises(row.exercises),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function lessonToPayload(lesson: Lesson) {
  return {
    slug: lesson.slug,
    title: lesson.title.trim(),
    level: lesson.level,
    language: lesson.language || null,
    description: lesson.description.trim(),
    image: lesson.image?.trim() || null,
    blocks: lesson.blocks,
    exercises: lesson.exercises,
    created_at: new Date(lesson.createdAt || Date.now()).toISOString(),
  };
}

function validateLesson(lesson: Lesson) {
  if (!lesson.slug?.trim()) throw new Error("Slug không hợp lệ.");
  if (!lesson.title?.trim()) throw new Error("Tiêu đề không được để trống.");
  if (!lesson.description?.trim()) throw new Error("Mô tả không được để trống.");
  if (!Array.isArray(lesson.blocks)) throw new Error("Blocks không hợp lệ.");
  if (!Array.isArray(lesson.exercises)) throw new Error("Exercises không hợp lệ.");
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────
export const lessonsStore = {
  // Sync cache trả về mảng, an toàn cho component cũ
  list(): Lesson[] {
    return lessonsCache ? [...lessonsCache] : [];
  },

  async listAsync(force = false): Promise<Lesson[]> {
    if (!force && isCacheValid()) {
      return [...(lessonsCache || [])];
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(MAX_LESSONS);

    if (error) {
      console.error("❌ lessonsStore.listAsync:", error);
      if (lessonsCache) return [...lessonsCache];
      return [];
    }

    const lessons = ((data || []) as LessonRow[]).map(mapRow);
    updateCache(lessons);
    return [...lessons];
  },

  // Getter cho phép dùng `lessonsStore.newId` mà không cần gọi hàm
  get newId() {
    return generateUID();
  },

  get(slug: string): Lesson | undefined {
    if (!lessonsCache) return undefined;
    return lessonsCache.find((l) => l.slug === slug);
  },

  async getAsync(slug: string): Promise<Lesson | undefined> {
    if (!slug) return undefined;
    const cached = this.get(slug);
    if (cached) return cached;

    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      console.warn("⚠️ lessonsStore.getAsync:", slug);
      return undefined;
    }

    return mapRow(data as LessonRow);
  },

  async upsert(lesson: Lesson): Promise<void> {
    validateLesson(lesson);
    const payload = lessonToPayload(lesson);

    const { error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: "slug" });

    if (error) {
      console.error("❌ lessonsStore.upsert:", error);
      throw new Error("Không thể lưu bài học.");
    }

    const normalizedLesson: Lesson = {
      ...lesson,
      createdAt: lesson.createdAt || Date.now(),
    };

    if (lessonsCache) {
      const idx = lessonsCache.findIndex((l) => l.slug === lesson.slug);
      if (idx >= 0) {
        lessonsCache[idx] = normalizedLesson;
      } else {
        lessonsCache.unshift(normalizedLesson);
      }
      cacheTimestamp = Date.now();
    }

    notifyLessonsChanged();
  },

  async remove(slug: string): Promise<void> {
    if (!slug) return;

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("slug", slug);

    if (error) {
      console.error("❌ lessonsStore.remove:", error);
      throw new Error("Không thể xoá bài học.");
    }

    if (lessonsCache) {
      lessonsCache = lessonsCache.filter((l) => l.slug !== slug);
      cacheTimestamp = Date.now();
    }

    notifyLessonsChanged();
  },

  reset() {
    clearCache();
  },

  slugify(input: string): string {
    const slug = input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-")
      .slice(0, 80);

    return slug || `lesson-${generateUID()}`;
  },
};
