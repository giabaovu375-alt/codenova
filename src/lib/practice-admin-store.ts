// src/lib/practice-admin-store.ts
import { supabase } from "@/integrations/supabase/client";

export type PracticeExerciseRow = {
  id?: string;
  lesson_slug: string;
  type: "mcq" | "fill-blank" | "rewrite" | "reorder";
  question: string;
  options?: string[];       // jsonb -> array
  answer_index?: number;
  template?: string;
  answers?: string[];
  starter?: string;
  solution?: string;
  lines?: string[];
  hint?: string;
  explanation?: string;
  order_index: number;
};

export async function fetchPracticeExercises(slug: string) {
  const { data, error } = await supabase
    .from("practice_exercises")
    .select("*")
    .eq("lesson_slug", slug)
    .order("order_index");
  if (error) throw error;
  return (data ?? []).map((ex: any) => ({
    ...ex,
    options: ex.options ?? [],
    answers: ex.answers ?? [],
    lines: ex.lines ?? [],
  })) as PracticeExerciseRow[];
}

export async function savePracticeExercise(ex: PracticeExerciseRow) {
  // Nếu có id thì update, không thì insert
  if (ex.id) {
    const { error } = await supabase
      .from("practice_exercises")
      .update({
        type: ex.type,
        question: ex.question,
        options: ex.options ?? [],
        answer_index: ex.answer_index ?? null,
        template: ex.template ?? null,
        answers: ex.answers ?? [],
        starter: ex.starter ?? null,
        solution: ex.solution ?? null,
        lines: ex.lines ?? [],
        hint: ex.hint ?? null,
        explanation: ex.explanation ?? null,
        order_index: ex.order_index,
      })
      .eq("id", ex.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("practice_exercises")
      .insert({
        lesson_slug: ex.lesson_slug,
        type: ex.type,
        question: ex.question,
        options: ex.options ?? [],
        answer_index: ex.answer_index ?? null,
        template: ex.template ?? null,
        answers: ex.answers ?? [],
        starter: ex.starter ?? null,
        solution: ex.solution ?? null,
        lines: ex.lines ?? [],
        hint: ex.hint ?? null,
        explanation: ex.explanation ?? null,
        order_index: ex.order_index,
      });
    if (error) throw error;
  }
}

export async function deletePracticeExercise(id: string) {
  const { error } = await supabase
    .from("practice_exercises")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function upsertPracticeLesson(slug: string, title: string, language: string) {
  const { error } = await supabase
    .from("practice_lessons")
    .upsert({ lesson_slug: slug, title, language }, { onConflict: "lesson_slug" });
  if (error) throw error;
}

export async function removePracticeLesson(slug: string) {
  const { error } = await supabase
    .from("practice_lessons")
    .delete()
    .eq("lesson_slug", slug);
  if (error) throw error;
}
