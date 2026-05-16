// src/lib/practice-store.ts
import { supabase } from "@/integrations/supabase/client";
import { lessonsStore } from "@/lib/lessons-store";

// Định nghĩa type cho Practice Lesson (tạm thời để tránh phụ thuộc vào file types cũ)
type Exercise = {
  type: "mcq" | "fill-blank" | "rewrite" | "reorder";
  question: string;
  explanation?: string;
  hint?: string;
  options?: string[];
  answerIndex?: number;
  template?: string;
  answers?: string[];
  starter?: string;
  solution?: string;
  lines?: string[];
};

type PracticeLesson = {
  title: string;
  language: string;
  code: string;
  explanation: string[];
  exercises: Exercise[];
};

export async function getPracticeLesson(slug: string): Promise<PracticeLesson | null> {
  // 1. Kiểm tra xem bài học có bật Practice Mode không
  const { data: meta, error: metaError } = await supabase
    .from("practice_lessons")
    .select("*")
    .eq("lesson_slug", slug)
    .maybeSingle();

  if (metaError || !meta) return null;

  // 2. Lấy code và explanation từ bài học gốc
  const originalLesson = await lessonsStore.getAsync(slug);
  if (!originalLesson) return null;

  // Lấy code block đầu tiên làm code mẫu, nếu không có thì để chuỗi rỗng
  const sampleCode = originalLesson.blocks[0]?.code ?? "";
  const explanation = originalLesson.blocks[0]?.explanation?.split("\n") ?? [];

  // 3. Lấy danh sách bài tập
  const { data: exercises, error: exError } = await supabase
    .from("practice_exercises")
    .select("*")
    .eq("lesson_slug", slug)
    .order("order_index");

  if (exError) return null;

  // 4. Map dữ liệu thô sang dạng Exercise
  const mappedExercises: Exercise[] = (exercises ?? []).map((ex: any) => {
    const base = {
      type: ex.type as Exercise["type"],
      question: ex.question,
      explanation: ex.explanation,
      hint: ex.hint,
    };

    switch (ex.type) {
      case "mcq":
        return {
          ...base,
          options: ex.options ?? [],
          answerIndex: ex.answer_index ?? 0,
        } as Exercise;
      case "fill-blank":
        return {
          ...base,
          template: ex.template ?? "",
          answers: ex.answers ?? [],
        } as Exercise;
      case "rewrite":
        return {
          ...base,
          starter: ex.starter ?? "",
          solution: ex.solution ?? "",
        } as Exercise;
      case "reorder":
        return {
          ...base,
          lines: ex.lines ?? [],
        } as Exercise;
      default:
        return null;
    }
  }).filter(Boolean) as Exercise[];

  // 5. Trả về PracticeLesson hoàn chỉnh
  return {
    title: meta.title || originalLesson.title,
    language: meta.language || originalLesson.language || "python",
    code: sampleCode,
    explanation: explanation,
    exercises: mappedExercises,
  };
}
