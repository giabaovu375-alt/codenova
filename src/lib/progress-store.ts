// Cloud-backed progress + attempts store. Falls back to no-op for guests.
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

  async setBlocksRead(slug: string, blocks_read: number, total_blocks: number) {
    const id = await uid();
    if (!id) return;
    const completed = blocks_read >= total_blocks && total_blocks > 0;
    await supabase.from("lesson_progress").upsert(
      {
        user_id: id,
        lesson_slug: slug,
        blocks_read,
        total_blocks,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_slug" },
    );
  },

  async addAttempt(
    slug: string,
    exercise_id: string,
    score: number,
    feedback: string,
    code: string,
  ): Promise<void> {
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
    // Update best_score if higher
    const { data: prev } = await supabase
      .from("lesson_progress")
      .select("best_score, blocks_read, total_blocks")
      .eq("user_id", id)
      .eq("lesson_slug", slug)
      .maybeSingle();
    const best = Math.max(prev?.best_score ?? 0, score);
    await supabase.from("lesson_progress").upsert(
      {
        user_id: id,
        lesson_slug: slug,
        blocks_read: prev?.blocks_read ?? 0,
        total_blocks: prev?.total_blocks ?? 0,
        best_score: best,
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
};

export function rankFor(totalScore: number): { name: string; color: string; next: number | null } {
  if (totalScore >= 200) return { name: "Vàng", color: "text-primary", next: null };
  if (totalScore >= 80) return { name: "Bạc", color: "text-foreground", next: 200 };
  if (totalScore >= 20) return { name: "Đồng", color: "text-amber-700", next: 80 };
  return { name: "Tân binh", color: "text-muted-foreground", next: 20 };
}
