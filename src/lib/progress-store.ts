// src/lib/progress-store.ts — CodeNova Premium Progress System v3
// Fixed: bỏ cache listMine() gây stale data, luôn fetch fresh từ Supabase
// Added: invalidateCache() sau mỗi write, optimistic local state
// Fixed setBlocksRead: no internal get() to avoid race condition, receives preserved best_score & completed_at

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
// CACHE — chỉ dùng cho attempts (ít thay đổi)
// progress luôn fetch fresh để tránh stale
// ─────────────────────────────────────────────

const ATTEMPTS_CACHE_KEY = "codenova-attempts-cache";
const ATTEMPTS_CACHE_TTL = 30_000; // 30s

function saveAttemptsCache(data: ExerciseAttempt[]) {
  try {
    localStorage.setItem(
      ATTEMPTS_CACHE_KEY,
      JSON.stringify({ data, savedAt: Date.now() }),
    );
  } catch { /* quota */ }
}

function loadAttemptsCache(): ExerciseAttempt[] | null {
  try {
    const raw = localStorage.getItem(ATTEMPTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > ATTEMPTS_CACHE_TTL) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function invalidateAttemptsCache() {
  try { localStorage.removeItem(ATTEMPTS_CACHE_KEY); } catch { /* noop */ }
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
    const diff =
      (new Date(sorted[i]).getTime() - new Date(sorted[i + 1]).getTime()) /
      86400000;
    if (Math.abs(diff - 1) < 0.1) streak++;
    else break;
  }
  return streak;
}

// ─── Realtime event emitter ──────────────────
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
  if (totalXP >= 2000) return { name: "Huyền thoại", color: "text-red-500", next: null };
  if (totalXP >= 1000) return { name: "Kim cương", color: "text-cyan-400", next: 2000 };
  if (totalXP >= 500) return { name: "Vàng", color: "text-yellow-400", next: 1000 };
  if (totalXP >= 200) return { name: "Bạc", color: "text-gray-300", next: 500 };
  if (totalXP >= 50) return { name: "Đồng", color: "text-amber-700", next: 200 };
  return { name: "Tân binh", color: "text-muted-foreground", next: 50 };
}

// ─────────────────────────────────────────────
// MAIN STORE
// ─────────────────────────────────────────────

export const progressStore = {
  // ── Get single lesson progress ──────────────
  async get(slug: string): Promise<LessonProgress | null> {
    const id = await uid();
    if (!id) return null;
    const { data } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("user_id", id)
      .eq("lesson_slug", slug)
      .maybeSingle();
    return data as LessonProgress | null;
  },

  // ── FIX: luôn fetch fresh, không dùng cache ─
  async listMine(): Promise<LessonProgress[]> {
    const id = await uid();
    if (!id) return [];
    const { data, error } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("user_id", id)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("listMine error:", error);
      return [];
    }
    return (data as LessonProgress[]) ?? [];
  },

  // ── Save blocks read progress (FIXED: no internal get, receives preserved fields) ──
  async setBlocksRead(
    slug: string,
    blocks_read: number,
    total_blocks: number,
    opts?: { preserveBestScore?: number; preserveCompletedAt?: string | null }
  ) {
    const id = await uid();
    if (!id) return;

    const completed = total_blocks > 0 && blocks_read >= total_blocks;

    const payload = {
      user_id: id,
      lesson_slug: slug,
      blocks_read,
      total_blocks,
      best_score: opts?.preserveBestScore ?? 0,
      completed,
      completed_at: completed
        ? (opts?.preserveCompletedAt ?? new Date().toISOString())
        : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("lesson_progress")
      .upsert(payload, { onConflict: "user_id,lesson_slug" });

    if (error) console.error("setBlocksRead error:", error);

    progressEvents.emit();
  },

  // ── Save exercise attempt + update progress ─
  async addAttempt(
    slug: string,
    exercise_id: string,
    score: number,
    feedback: string,
    code: string,
  ) {
    const id = await uid();
    if (!id) return;

    // Insert attempt
    const { error: attemptError } = await supabase
      .from("exercise_attempts")
      .insert({
        user_id: id,
        lesson_slug: slug,
        exercise_id,
        score,
        feedback,
        code,
      });

    if (attemptError) console.error("addAttempt insert error:", attemptError);

    // Update lesson_progress
    const prev = await this.get(slug);
    const best = Math.max(prev?.best_score ?? 0, score);

    // FIX: completed khi nộp bài cuối (exercise_id === "final")
    // KHÔNG yêu cầu score = 10, chỉ cần đã nộp
    const completed = exercise_id === "final" ? true : (prev?.completed ?? false);
    const completed_at = completed
      ? (prev?.completed_at ?? new Date().toISOString())
      : null;

    const { error: progressError } = await supabase
      .from("lesson_progress")
      .upsert(
        {
          user_id: id,
          lesson_slug: slug,
          blocks_read: prev?.blocks_read ?? 0,
          total_blocks: prev?.total_blocks ?? 0,
          best_score: best,
          completed,
          completed_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_slug" },
      );

    if (progressError) console.error("addAttempt progress error:", progressError);

    // Invalidate cache sau khi write
    invalidateAttemptsCache();

    // Emit để roadmap/profile re-fetch
    progressEvents.emit();
  },

  // ── List attempts (cache 30s) ───────────────
  async listAttempts(slug?: string): Promise<ExerciseAttempt[]> {
    const id = await uid();
    if (!id) return [];

    // Chỉ dùng cache khi không filter theo slug
    if (!slug) {
      const cached = loadAttemptsCache();
      if (cached) return cached;
    }

    let q = supabase
      .from("exercise_attempts")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });
    if (slug) q = q.eq("lesson_slug", slug);

    const { data, error } = await q.limit(200);
    if (error) {
      console.error("listAttempts error:", error);
      return [];
    }

    const result = (data as ExerciseAttempt[]) ?? [];
    if (!slug) saveAttemptsCache(result);
    return result;
  },

  // ── Stats ───────────────────────────────────
  async getStats(): Promise<UserStats> {
    const [progress, attempts] = await Promise.all([
      this.listMine(),
      this.listAttempts(),
    ]);
    const totalXP = progress.reduce((sum, p) => sum + p.best_score, 0);
    const completedLessons = progress.filter((p) => p.completed).length;
    const streak = computeStreak(
      attempts.map((a) => a.created_at.slice(0, 10)),
    );
    const accuracy = accuracyFromAttempts(attempts);
    const level = levelFromXP(totalXP);
    const rank = rankFor(totalXP).name;
    return {
      totalXP,
      completedLessons,
      streak,
      totalAttempts: attempts.length,
      accuracy,
      level,
      rank,
    };
  },

  // ── Achievements ────────────────────────────
  async getAchievements(): Promise<Achievement[]> {
    const stats = await this.getStats();
    return [
      {
        id: "first-lesson",
        title: "Bước đầu tiên",
        description: "Hoàn thành bài học đầu tiên",
        unlocked: stats.completedLessons >= 1,
      },
      {
        id: "5-lessons",
        title: "Người chăm chỉ",
        description: "Hoàn thành 5 bài học",
        unlocked: stats.completedLessons >= 5,
      },
      {
        id: "100-xp",
        title: "100 XP",
        description: "Đạt 100 XP",
        unlocked: stats.totalXP >= 100,
      },
      {
        id: "7-day-streak",
        title: "🔥 7 ngày liên tục",
        description: "Học liên tiếp 7 ngày",
        unlocked: stats.streak >= 7,
      },
    ];
  },
};
