/* ─────────────────────────────────────────────────────────────
 * types.ts — đã nâng cấp
 *  • Thêm difficulty (easy | medium | hard | challenge)
 *  • Thêm hint / nearAnswer / wrongExplanations
 *  • Thêm các loại bài tập mới: debug, predict-output, mini-project
 *  • Lesson có quickRecap (tóm tắt 30s) + badges
 * ────────────────────────────────────────────────────────────*/

export type Difficulty = "easy" | "medium" | "hard" | "challenge";

export interface BaseExercise {
  id?: string;
  difficulty?: Difficulty;
  /** Giải thích chung sau khi làm xong */
  explanation?: string;
  /** Gợi ý nhẹ — hiện sau khi sai lần 1 */
  hint?: string;
  /** Đáp án gần đúng / hint mạnh — hiện sau khi sai lần 2 */
  nearAnswer?: string;
  /** Tại sao đáp án sai — key là index option (MCQ) hoặc giá trị nhập */
  wrongExplanations?: Record<string | number, string>;
  /** Tag để gom badge: "if-else", "loop", "function"... */
  tags?: string[];
}

export interface MCQExercise extends BaseExercise {
  type: "mcq";
  question: string;
  code?: string;
  options: string[];
  answerIndex: number;
}

export interface FillBlankExercise extends BaseExercise {
  type: "fill-blank";
  question: string;
  template: string;
  answers: string[];
  caseInsensitive?: boolean;
}

export interface RewriteExercise extends BaseExercise {
  type: "rewrite";
  question: string;
  starter?: string;
  solution: string;
}

export interface ReorderExercise extends BaseExercise {
  type: "reorder";
  question: string;
  lines: string[];
}

/** Tìm và sửa lỗi trong code */
export interface DebugExercise extends BaseExercise {
  type: "debug";
  question: string;
  buggyCode: string;
  fixedCode: string;
  /** Mô tả vắn tắt bug nằm ở đâu — dùng làm gợi ý */
  bugLineHint?: string;
}

/** Đoán output của đoạn code */
export interface PredictOutputExercise extends BaseExercise {
  type: "predict-output";
  question: string;
  code: string;
  expectedOutput: string;
  caseInsensitive?: boolean;
}

/** Mini project cuối chương — kiểm bằng "must include / must not include" */
export interface MiniProjectExercise extends BaseExercise {
  type: "mini-project";
  question: string;
  brief: string;
  starter?: string;
  checks: {
    label: string;
    mustInclude?: string[];
    mustNotInclude?: string[];
  }[];
}

export type Exercise =
  | MCQExercise
  | FillBlankExercise
  | RewriteExercise
  | ReorderExercise
  | DebugExercise
  | PredictOutputExercise
  | MiniProjectExercise;

export interface LessonBadge {
  id: string;
  label: string;        // ví dụ "Master if/else"
  /** Cần tag này xuất hiện trong các câu đúng */
  requireTag?: string;
  /** Số câu đúng tối thiểu để đạt */
  minCorrect: number;
}

export interface PracticeLesson {
  title: string;
  language: string;
  code: string;
  explanation: string[];
  exercises: Exercise[];
  /** Tóm tắt nhớ nhanh 30 giây — hiển thị cuối bài */
  quickRecap?: string[];
  /** Badge có thể đạt được */
  badges?: LessonBadge[];
}

/* ────────── Helpers ────────── */
export const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle "mạnh" — đảm bảo không trùng thứ tự ban đầu (cho reorder) */
export function shuffleStrong<T>(arr: T[]): T[] {
  if (arr.length < 2) return arr.slice();
  let out = shuffle(arr);
  let tries = 0;
  while (
    tries < 30 &&
    out.every((v, i) => v === arr[i]) // identical to original
  ) {
    out = shuffle(arr);
    tries++;
  }
  // Yêu cầu thêm: ít nhất 60% phần tử lệch vị trí gốc
  const minDisplaced = Math.ceil(arr.length * 0.6);
  let displaced = out.filter((v, i) => v !== arr[i]).length;
  tries = 0;
  while (displaced < minDisplaced && tries < 30) {
    out = shuffle(arr);
    displaced = out.filter((v, i) => v !== arr[i]).length;
    tries++;
  }
  return out;
}

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard", "challenge"];

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; color: string; xp: number }
> = {
  easy:      { label: "Dễ",       color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/40", xp: 10 },
  medium:    { label: "Vừa",      color: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/40",                xp: 20 },
  hard:      { label: "Khó",      color: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/40",        xp: 35 },
  challenge: { label: "Thử thách", color: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/40", xp: 60 },
};
