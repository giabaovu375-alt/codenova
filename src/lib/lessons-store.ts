import { supabase } from "@/integrations/supabase/client";

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

export const LANGUAGE_LABEL: Record<LessonLanguage, string> = {
  python: "Python",
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  java: "Java",
  cpp: "C++",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Cache local để tránh gọi Supabase liên tục
let _cache: Lesson[] | null = null;

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("codenova:lessons:changed"));
  }
}

export const lessonsStore = {
  async listAsync(): Promise<Lesson[]> {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return [];
    }

    const lessons = (data ?? []).map((row: any) => ({
      slug: row.slug,
      title: row.title,
      level: row.level,
      language: row.language,
      description: row.description,
      image: row.image,
      blocks: row.blocks ?? [],
      exercises: row.exercises ?? [],
      createdAt: new Date(row.created_at).getTime(),
    }));

    _cache = lessons;
    return lessons;
  },

  // Sync version dùng cache (cho các component không async)
  list(): Lesson[] {
    return _cache ?? [];
  },

  get(slug: string): Lesson | undefined {
    return (_cache ?? []).find((l) => l.slug === slug);
  },

  async getAsync(slug: string): Promise<Lesson | undefined> {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) return undefined;

    return {
      slug: data.slug,
      title: data.title,
      level: data.level as Lesson["level"],
      language: data.language as LessonLanguage,
      description: data.description,
      image: data.image,
      blocks: data.blocks as CodeBlock[],
      exercises: data.exercises as Exercise[],
      createdAt: new Date(data.created_at).getTime(),
    };
  },

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
      console.error("Upsert error:", error);
      throw error;
    }

    // Update cache
    if (_cache) {
      const idx = _cache.findIndex((l) => l.slug === lesson.slug);
      if (idx >= 0) _cache[idx] = lesson;
      else _cache.unshift(lesson);
    }

    notify();
  },

  async remove(slug: string): Promise<void> {
    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("slug", slug);

    if (error) {
      console.error("Delete error:", error);
      throw error;
    }

    if (_cache) {
      _cache = _cache.filter((l) => l.slug !== slug);
    }

    notify();
  },

  reset() {
    _cache = null;
  },

  newId: uid,

  slugify(s: string) {
    return (
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60) || "lesson-" + uid()
    );
  },
};
