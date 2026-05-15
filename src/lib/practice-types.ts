/* Types & helpers thuần (không JSX) cho PracticeMode */

export type SupportedLanguage =
  | "python"
  | "javascript"
  | "typescript"
  | "cpp"
  | "java"
  | "html"
  | "css";

export interface MCQExercise {
  type: "mcq";
  question: string;
  /** Code hiển thị kèm câu hỏi (nếu khác code chính) */
  code?: string;
  options: string[];
  /** Index của đáp án đúng */
  answerIndex: number;
  explanation?: string;
}

/** Điền chỗ trống: dùng `___` (3 gạch dưới) trong template */
export interface FillBlankExercise {
  type: "fill-blank";
  question: string;
  /** Số `___` phải = answers.length */
  template: string;
  answers: string[];
  caseInsensitive?: boolean;
  hint?: string;
  explanation?: string;
}

export interface RewriteExercise {
  type: "rewrite";
  question: string;
  starter?: string;
  /** Đáp án mẫu — so sánh sau khi normalize whitespace */
  solution: string;
  hint?: string;
  explanation?: string;
}

export interface ReorderExercise {
  type: "reorder";
  question: string;
  /** Danh sách dòng theo thứ tự ĐÚNG */
  lines: string[];
  explanation?: string;
}

export type Exercise =
  | MCQExercise
  | FillBlankExercise
  | RewriteExercise
  | ReorderExercise;

export interface PracticeLesson {
  title: string;
  code: string;
  language: SupportedLanguage | string;
  /** Mỗi phần tử = 1 đoạn. Hỗ trợ ``inline code`` */
  explanation: string[];
  exercises: Exercise[];
}

/* ────── helpers thuần ────── */

export const normalize = (s: string) =>
  s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

export const shuffle = <T,>(arr: T[]): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a.length > 1 && a.every((v, i) => v === arr[i])) {
    [a[0], a[1]] = [a[1], a[0]];
  }
  return a;
};
