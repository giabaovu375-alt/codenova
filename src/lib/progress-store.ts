// progress-store.ts — Premium Edition (auto-complete, streak, XP)
import { supabase } from "@/integrations/supabase/client";

export type LessonProgress = {
  lesson_slug: string;
  blocks_read: number;
  total_blocks: number;
  best_score: number;
  completed: boolean;
  completed_at: string | null;
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

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ─── Helpers ───────────────────────────────────────
function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
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

// ─── Store ──────────────────────────────────────────
export const progressStore = {
  async get(slug: string): Promise<LessonProgress | null> {
    const id = await uid();
    if (!id) return null;
    const { data } = await supabase
      .from("lesson_progress")
      .select("lesson_slug, blocks_read, total_blocks, best_score, completed, completed_at")
      .eq("user_id", id)
      .eq("lesson_slug", slug)
      .maybeSingle();
    return (data as LessonProgress) ?? null;
  },

  async listMine(): Promise<LessonProgress[]> {
    const id = await uid();
    if (!id) return [];
    const { data } = await supabase
      .from("lesson_progress")
      .select("lesson_slug, blocks_read, total_blocks, best_score, completed, completed_at")
      .eq("user_id", id);
    return (data as LessonProgress[]) ?? [];
  },

  // Đánh dấu số block đã đọc – tự động tính completed
  async setBlocksRead(slug: string, blocks_read: number, total_blocks: number) {
    const id = await uid();
    if (!id) return;
    const already = await this.get(slug);
    const wasCompleted = already?.completed === true;
    const completed = total_blocks > 0 && blocks_read >= total_blocks;
    const completed_at =
      completed && !wasCompleted ? new Date().toISOString() : already?.completed_at ?? null;

    await supabase.from("lesson_progress").upsert(
      {
        user_id: id,
        lesson_slug: slug,
        blocks_read,
        total_blocks,
        completed,
        completed_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_slug" },
    );
  },

  // Thêm lần nộp bài – cập nhật best_score, đánh dấu hoàn thành nếu là bài cuối
  async addAttempt(
    slug: string,
    exercise_id: string,
    score: number,
    feedback: string,
    code: string,
  ): Promise<void> {
    const id = await uid();
    if (!id) return;

    // 1. Lưu attempt
    await supabase.from("exercise_attempts").insert({
      user_id: id,
      lesson_slug: slug,
      exercise_id,
      score,
      feedback,
      code,
    });

    // 2. Cập nhật best_score và completed
    const { data: prev } = await supabase
      .from("lesson_progress")
      .select("blocks_read, total_blocks, best_score, completed, completed_at")
      .eq("user_id", id)
      .eq("lesson_slug", slug)
      .maybeSingle();

    const best = Math.max(prev?.best_score ?? 0, score);
    const blocks_read = prev?.blocks_read ?? 0;
    const total_blocks = prev?.total_blocks ?? 0;
    // Nếu đây là bài nộp cuối cùng (final), tự động đánh dấu hoàn thành
    const isFinal = exercise_id === "final";
    const wasCompleted = prev?.completed === true;
    const completed = isFinal || (total_blocks > 0 && blocks_read >= total_blocks);
    const completed_at =
      completed && !wasCompleted ? new Date().toISOString() : prev?.completed_at ?? null;

    await supabase.from("lesson_progress").upsert(
      {
        user_id: id,
        lesson_slug: slug,
        blocks_read,
        total_blocks,
        best_score: best,
        completed,
        completed_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_slug" },
    );
  },

  async listAttempts(slug?: string): Promise<ExerciseAttempt[]> {
    const id = await uid();
    if (!id) return [];
    let q = supabase
      .from("exercise_attempts")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (slug) q = q.eq("lesson_slug", slug);
    const { data } = await q;
    return (data as ExerciseAttempt[]) ?? [];
  },

  // ── Tiện ích cho profile / roadmap ─────────────────
  async getStats(): Promise<{
    totalXP: number;
    completedLessons: number;
    streak: number;
    totalLessons: number;
  }> {
    const id = await uid();
    if (!id) return { totalXP: 0, completedLessons: 0, streak: 0, totalLessons: 0 };

    const [progress, attempts] = await Promise.all([
      this.listMine(),
      this.listAttempts(),
    ]);

    const totalXP = progress.reduce((sum, p) => sum + p.best_score, 0);
    const completedLessons = progress.filter((p) => p.completed).length;

    const activeDays = new Set(attempts.map((a) => a.created_at.slice(0, 10)));
    const streak = computeStreak(Array.from(activeDays));

    // Đếm tổng số bài học hiện có (có thể import lessonsStore nhưng để tránh phụ thuộc vòng, trả về 0)
    return { totalXP, completedLessons, streak, totalLessons: 0 };
  },

  async getStreak(): Promise<number> {
    const id = await uid();
    if (!id) return 0;
    const { data } = await supabase
      .from("exercise_attempts")
      .select("created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!data) return 0;
    const days = new Set(data.map((a) => a.created_at.slice(0, 10)));
    return computeStreak(Array.from(days));
  },
};

export function rankFor(totalScore: number): { name: string; color: string; next: number | null } {
  if (totalScore >= 200) return { name: "Vàng", color: "text-primary", next: null };
  if (totalScore >= 80) return { name: "Bạc", color: "text-foreground", next: 200 };
  if (totalScore >= 20) return { name: "Đồng", color: "text-amber-700", next: 80 };
  return { name: "Tân binh", color: "text-muted-foreground", next: 20 };
}
