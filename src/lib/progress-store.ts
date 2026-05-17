// src/lib/progress-store.ts — CodeNova Premium Progress System v2
// Added: realtime sync event emitter

import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type LessonProgress = {
  lesson_slug: string;
  blocks_read: number;
  total_blocks: number;
  best_score: number;
  completed: boolean;
  completed_at: string | null;
  updated_at?: string;
};

export type ExerciseAttempt = {
  id: string;
  lesson_slug: string;
  exercise_id: string;
  score: number;
  feedback: string | null;
  code: string | null;
  created_at: string;
};

export type UserStats = {
  totalXP: number;
  completedLessons: number;
  streak: number;
  totalAttempts: number;
  accuracy: number;
  level: number;
  rank: string;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

// ─────────────────────────────────────────────
// CACHE
// ─────────────────────────────────────────────

const CACHE_KEY = "codenova-progress-cache";

function saveCache(data: any) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function loadCache() {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i + 1]).getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.1) streak++;
    else break;
  }
  return streak;
}

// ─── Realtime event emitter ─────────────────────
export const progressEvents = {
  emit() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("progress-updated"));
    }
  },
};

function levelFromXP(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

function accuracyFromAttempts(attempts: ExerciseAttempt[]): number {
  if (attempts.length === 0) return 0;
  const total = attempts.reduce((sum, a) => sum + a.score, 0);
  return Math.round(total / attempts.length);
}

// ─────────────────────────────────────────────
// RANK
// ─────────────────────────────────────────────

export function rankFor(totalXP: number) {
  if (totalXP >= 2000) {
    return { name: "Huyền thoại", color: "text-red-500", next: null };
  }
  if (totalXP >= 1000) {
    return { name: "Kim cương", color: "text-cyan-400", next: 2000 };
  }
  if (totalXP >= 500) {
    return { name: "Vàng", color: "text-yellow-400", next: 1000 };
  }
  if (totalXP >= 200) {
    return { name: "Bạc", color: "text-gray-300", next: 500 };
  }
  if (totalXP >= 50) {
    return { name: "Đồng", color: "text-amber-700", next: 200 };
  }
  return { name: "Tân binh", color: "text-muted-foreground", next: 50 };
}

// ─────────────────────────────────────────────
// MAIN STORE
// ─────────────────────────────────────────────

export const progressStore = {
  async get(slug: string): Promise<LessonProgress | null> {
    const id = await uid();
    if (!id) return null;
    const { data } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("user_id", id)
      .eq("lesson_slug", slug)
      .maybeSingle();
    return data as LessonProgress;
  },

  async listMine(): Promise<LessonProgress[]> {
    const id = await uid();
    if (!id) return [];
    const cached = loadCache();
    if (cached?.progress) {
      setTimeout(() => { this.sync(); }, 100);
      return cached.progress;
    }
    const { data } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("user_id", id);
    saveCache({ ...cached, progress: data ?? [] });
    return (data as LessonProgress[]) ?? [];
  },

  async setBlocksRead(slug: string, blocks_read: number, total_blocks: number) {
    const id = await uid();
    if (!id) return;

    const current = await this.get(slug);
    const completed = total_blocks > 0 && blocks_read >= total_blocks;
    const completed_at = completed && !current?.completed
      ? new Date().toISOString()
      : current?.completed_at ?? null;

    const payload = {
      user_id: id,
      lesson_slug: slug,
      blocks_read,
      total_blocks,
      completed,
      completed_at,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("lesson_progress")
      .upsert(payload, { onConflict: "user_id,lesson_slug" });

    // Phát sự kiện realtime
    progressEvents.emit();

    await this.sync();
  },

  async addAttempt(
    slug: string,
    exercise_id: string,
    score: number,
    feedback: string,
    code: string,
  ) {
    const id = await uid();
    if (!id) return;

    await supabase.from("exercise_attempts").insert({
      user_id: id,
      lesson_slug: slug,
      exercise_id,
      score,
      feedback,
      code,
    });

    const prev = await this.get(slug);
    const best = Math.max(prev?.best_score ?? 0, score);
    const completed = exercise_id === "final" || prev?.completed;

    await supabase
      .from("lesson_progress")
      .upsert(
        {
          user_id: id,
          lesson_slug: slug,
          blocks_read: prev?.blocks_read ?? 0,
          total_blocks: prev?.total_blocks ?? 0,
          best_score: best,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_slug" },
      );

    // Phát sự kiện realtime
    progressEvents.emit();

    await this.sync();
  },

  async listAttempts(slug?: string): Promise<ExerciseAttempt[]> {
    const id = await uid();
    if (!id) return [];
    let q = supabase
      .from("exercise_attempts")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });
    if (slug) q = q.eq("lesson_slug", slug);
    const { data } = await q.limit(100);
    return (data as ExerciseAttempt[]) ?? [];
  },

  async getStats(): Promise<UserStats> {
    const [progress, attempts] = await Promise.all([
      this.listMine(),
      this.listAttempts(),
    ]);
    const totalXP = progress.reduce((sum, p) => sum + p.best_score, 0);
    const completedLessons = progress.filter((p) => p.completed).length;
    const streak = computeStreak(attempts.map((a) => a.created_at.slice(0, 10)));
    const accuracy = accuracyFromAttempts(attempts);
    const level = levelFromXP(totalXP);
    const rank = rankFor(totalXP).name;
    return { totalXP, completedLessons, streak, totalAttempts: attempts.length, accuracy, level, rank };
  },

  async getAchievements(): Promise<Achievement[]> {
    const stats = await this.getStats();
    return [
      { id: "first-lesson", title: "Bước đầu tiên", description: "Hoàn thành bài học đầu tiên", unlocked: stats.completedLessons >= 1 },
      { id: "5-lessons", title: "Người chăm chỉ", description: "Hoàn thành 5 bài học", unlocked: stats.completedLessons >= 5 },
      { id: "100-xp", title: "100 XP", description: "Đạt 100 XP", unlocked: stats.totalXP >= 100 },
      { id: "7-day-streak", title: "🔥 7 ngày liên tục", description: "Học liên tiếp 7 ngày", unlocked: stats.streak >= 7 },
    ];
  },

  async sync() {
    const id = await uid();
    if (!id) return;
    const [progress, attempts] = await Promise.all([
      supabase.from("lesson_progress").select("*").eq("user_id", id),
      supabase.from("exercise_attempts").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    ]);
    saveCache({ progress: progress.data ?? [], attempts: attempts.data ?? [], syncedAt: Date.now() });
  },
};
