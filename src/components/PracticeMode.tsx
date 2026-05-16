import { useEffect, useMemo, useState } from "react";
import { BookOpen, Dumbbell, ChevronRight, Trophy, Check } from "lucide-react";
import { CodeLessonCarousel } from "@/components/CodeBlock";
import {
  FillBlankView,
  InlineMarkdown,
  MCQView,
  ReorderView,
  RewriteView,
} from "./exercises";
import type { PracticeLesson } from "./types";

type Mode = "learn" | "practice";

/* ────────── Thanh tổng tiến độ "Hoàn thành X/Y bài tập" ────────── */
function CompletionBar({
  completed,
  total,
  results,
  currentIndex,
  onJump,
}: {
  completed: number;
  total: number;
  results: Record<number, boolean>;
  currentIndex: number;
  onJump: (i: number) => void;
}) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Hoàn thành {completed}/{total} bài tập
          </span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
      </div>

      {/* Thanh chính */}
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Dấu chấm từng câu (click để nhảy tới) */}
      {total > 0 && total <= 30 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Array.from({ length: total }).map((_, i) => {
            const r = results[i];
            const active = i === currentIndex;
            let cls = "border-border bg-background text-muted-foreground";
            if (r === true)
              cls = "border-green-500/60 bg-green-500/10 text-green-600 dark:text-green-400";
            else if (r === false)
              cls = "border-destructive/60 bg-destructive/10 text-destructive";
            if (active) cls += " ring-2 ring-primary/50";

            return (
              <button
                key={i}
                onClick={() => onJump(i)}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-medium transition-all hover:scale-110 ${cls}`}
                title={`Câu ${i + 1}${r === true ? " — đúng" : r === false ? " — sai" : ""}`}
              >
                {r === true ? <Check className="h-3 w-3" /> : i + 1}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ────────── Component chính ────────── */
export function PracticeMode({ lesson }: { lesson: PracticeLesson }) {
  const [mode, setMode] = useState<Mode>("learn");
  const [currentEx, setCurrentEx] = useState(0);
  const [results, setResults] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setMode("learn");
    setCurrentEx(0);
    setResults({});
  }, [lesson]);

  const total = lesson.exercises.length;
  const completedCount = Object.keys(results).length;
  const correctCount = useMemo(
    () => Object.values(results).filter(Boolean).length,
    [results],
  );
  const allDone = completedCount === total && total > 0;

  const handleResult = (correct: boolean) =>
    setResults((prev) => ({ ...prev, [currentEx]: correct }));

  const ex = lesson.exercises[currentEx];
  const exResult = results[currentEx];

  // Tạo snippets cho CodeLessonCarousel
  const snippets = useMemo(() => {
    const list: Array<{
      code: string;
      language?: string;
      title?: string;
      explanation?: React.ReactNode;
    }> = [];

    // Nếu PracticeLesson có blocks (kiểu từ database) thì dùng blocks
    const blocks = (lesson as any).blocks;
    if (blocks && Array.isArray(blocks) && blocks.length > 0) {
      blocks.forEach((block: any) => {
        list.push({
          code: block.code || "",
          language: lesson.language,
          explanation: block.explanation || undefined,
        });
      });
    } else {
      // Fallback: dùng code + explanation array
      if (lesson.code) {
        list.push({
          code: lesson.code,
          language: lesson.language,
          explanation: lesson.explanation[0] || undefined,
        });
      }
      for (let i = lesson.code ? 1 : 0; i < lesson.explanation.length; i++) {
        list.push({
          code: "",
          language: lesson.language,
          explanation: lesson.explanation[i],
        });
      }
    }
    return list;
  }, [lesson]);

  const handleStartChallenge = () => {
    setMode("practice");
    setCurrentEx(0);
  };

  return (
    <div className="space-y-4">
      {/* Header: tên bài + toggle Học/Luyện tập */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{lesson.title}</h2>
        <div className="inline-flex rounded-md border border-border bg-background p-0.5">
          <button
            onClick={() => setMode("learn")}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${
              mode === "learn"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Học
          </button>
          <button
            onClick={() => setMode("practice")}
            disabled={total === 0}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              mode === "practice"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Dumbbell className="h-3.5 w-3.5" />
            Luyện tập
            {total > 0 && (
              <span className="ml-0.5 rounded bg-background/30 px-1 text-[10px]">
                {total}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Thanh tiến độ tổng — luôn hiển thị nếu có bài tập */}
      {total > 0 && (
        <CompletionBar
          completed={completedCount}
          total={total}
          results={results}
          currentIndex={currentEx}
          onJump={(i) => {
            setCurrentEx(i);
            setMode("practice");
          }}
        />
      )}

      {/* LEARN MODE với carousel */}
      {mode === "learn" && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          {snippets.length > 0 ? (
            <CodeLessonCarousel
              snippets={snippets}
              challengeEvery={3}
              onStartChallenge={handleStartChallenge}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Không có nội dung học.</p>
          )}
        </div>
      )}

      {/* PRACTICE MODE */}
      {mode === "practice" && ex && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Câu {currentEx + 1} / {total}
            </span>
            <span>
              Đúng: {correctCount}
              {completedCount > 0 && ` / ${completedCount} đã làm`}
            </span>
          </div>

          <div key={currentEx}>
            {ex.type === "mcq" && (
              <MCQView exercise={ex} language={lesson.language} onResult={handleResult} />
            )}
            {ex.type === "fill-blank" && (
              <FillBlankView
                exercise={ex}
                language={lesson.language}
                onResult={handleResult}
              />
            )}
            {ex.type === "rewrite" && (
              <RewriteView
                exercise={ex}
                language={lesson.language}
                onResult={handleResult}
              />
            )}
            {ex.type === "reorder" && (
              <ReorderView
                exercise={ex}
                language={lesson.language}
                onResult={handleResult}
              />
            )}
          </div>

          {exResult !== undefined && ex.explanation && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground/80">
              <span className="font-medium text-primary">Giải thích: </span>
              {ex.explanation}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <button
              onClick={() => setCurrentEx((i) => Math.max(0, i - 1))}
              disabled={currentEx === 0}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-40"
            >
              ← Trước
            </button>

            {currentEx < total - 1 ? (
              <button
                onClick={() => setCurrentEx((i) => i + 1)}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Câu tiếp <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              allDone && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-green-500/15 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300">
                  <Trophy className="h-4 w-4" />
                  Hoàn thành! {correctCount}/{total}
                </span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────── Lesson mẫu ────────── */
export const SAMPLE_LESSON: PracticeLesson = {
  title: "Hàm tính giai thừa (Python)",
  language: "python",
  code: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))`,
  explanation: [
    "Đoạn code định nghĩa hàm `factorial(n)` tính giai thừa của `n` bằng đệ quy.",
    "Điều kiện dừng là khi `n <= 1`, hàm trả về `1`.",
    "Ngược lại, hàm trả về `n * factorial(n - 1)`.",
    "Kết quả `factorial(5)` = `120`.",
  ],
  exercises: [
    {
      type: "mcq",
      question: "Đoạn code này làm gì?",
      options: [
        "Tính tổng các số từ 1 đến n",
        "Tính giai thừa của n bằng đệ quy",
        "Kiểm tra n có phải số nguyên tố",
        "In ra n lần chữ 'factorial'",
      ],
      answerIndex: 1,
      explanation: "Hàm tự gọi chính nó với n-1 và nhân với n — định nghĩa đệ quy của giai thừa.",
    },
    {
      type: "fill-blank",
      question: "Điền vào chỗ trống để hoàn thành hàm:",
      template: `def factorial(n):
    if n <= ___:
        return ___
    return n * factorial(n - ___)`,
      answers: ["1", "1", "1"],
      hint: "Cả 3 chỗ đều là cùng một con số.",
    },
    {
      type: "rewrite",
      question: "Viết lại hàm dùng vòng lặp `for` thay vì đệ quy.",
      starter: `def factorial(n):\n    `,
      solution: `def factorial(n):
    result = 1
    for i in range(2, n + 1):
        result = result * i
    return result`,
      hint: "Khởi tạo result = 1, lặp i từ 2 đến n, nhân dồn vào result.",
    },
    {
      type: "reorder",
      question: "Sắp xếp các dòng sau theo đúng thứ tự:",
      lines: [
        "def factorial(n):",
        "    if n <= 1:",
        "        return 1",
        "    return n * factorial(n - 1)",
      ],
    },
  ],
};
