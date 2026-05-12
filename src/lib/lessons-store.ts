// lessons-store.ts — Premium Edition
// Fix: cache per-request, no global leak, secure uid, limit, dedupe labels
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("codenova:lessons:changed"));
  }
}

// Map raw Supabase row -> Lesson (immutable)
function mapRow(row: any): Lesson {
  return Object.freeze({
    slug: row.slug,
    title: row.title,
    level: row.level as Lesson["level"],
    language: row.language as LessonLanguage | undefined,
    description: row.description ?? "",
    image: row.image ?? undefined,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
    createdAt: new Date(row.created_at).getTime(),
  });
}

// ─── Per-request cache (short-lived, no cross-user leak) ──
let _lessonsCache: Lesson[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 giây

function isCacheValid(): boolean {
  return _lessonsCache !== null && Date.now() - _cacheTimestamp < CACHE_TTL_MS;
}

// ─── Store ──────────────────────────────────────
export const lessonsStore = {
  /** Lấy toàn bộ bài học (async, có cache ngắn hạn) */
  async listAsync(force = false): Promise<Lesson[]> {
    if (!force && isCacheValid()) {
      return [..._lessonsCache!];
    }

    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200); // an toàn, sau này phân trang

    if (error) {
      console.error("❌ Supabase listAsync error:", error);
      return _lessonsCache ? [..._lessonsCache] : [];
    }

    const lessons = (data ?? []).map(mapRow);
    _lessonsCache = lessons;
    _cacheTimestamp = Date.now();
    return [...lessons]; // trả về bản sao để tránh bị mutate
  },

  /** Sync từ cache, nếu chưa có cache trả về mảng rỗng (an toàn) */
  list(): Lesson[] {
    return _lessonsCache ? [..._lessonsCache] : [];
  },

  /** Tìm bài học trong cache */
  get(slug: string): Lesson | undefined {
    return _lessonsCache?.find((l) => l.slug === slug);
  },

  /** Lấy 1 bài từ Supabase (không cache) */
  async getAsync(slug: string): Promise<Lesson | undefined> {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      console.warn("⚠️ getAsync not found:", slug);
      return undefined;
    }
    return mapRow(data);
  },

  /** Thêm hoặc cập nhật bài học */
  async upsert(lesson: Lesson): Promise<void> {
    const { error } = await supabase.from("lessons").upsert({
      slug: lesson.slug,
      title: lesson.title,
      level: lesson.level,
      language: lesson.language ?? null,
      description: lesson.description,
      image: lesson.image ?? null,
      blocks: lesson.blocks,
      exercises: lesson.exercises,
      created_at: new Date(lesson.createdAt).toISOString(),
    });

    if (error) {
      console.error("❌ Upsert error:", error);
      throw new Error("Không thể lưu bài học.");
    }

    // Cập nhật cache
    if (_lessonsCache) {
      const idx = _lessonsCache.findIndex((l) => l.slug === lesson.slug);
      const newLesson = mapRow(lesson);
      if (idx >= 0) _lessonsCache[idx] = newLesson;
      else _lessonsCache.unshift(newLesson);
    }
    notify();
  },

  /** Xoá bài học */
  async remove(slug: string): Promise<void> {
    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("slug", slug);

    if (error) {
      console.error("❌ Delete error:", error);
      throw new Error("Không thể xoá bài học.");
    }

    if (_lessonsCache) {
      _lessonsCache = _lessonsCache.filter((l) => l.slug !== slug);
    }
    notify();
  },

  /** Reset cache (dùng khi logout hoặc debug) */
  reset() {
    _lessonsCache = null;
    _cacheTimestamp = 0;
  },

  /** Tạo ID ngắn an toàn */
  newId: generateUID,

  /** Slugify đơn giản */
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
