import { useMemo, useRef, useState } from "react";
import { Check, X, RotateCcw, Lightbulb, GripVertical } from "lucide-react";
import { CodeBlock } from "@/components/CodeBlock"; // chỉnh path nếu khác
import {
  normalize,
  shuffle,
  type Exercise,
  type MCQExercise,
  type FillBlankExercise,
  type RewriteExercise,
  type ReorderExercise,
} from "./types";

/* Render `inline code` (helper có JSX, để trong file .tsx) */
export function InlineMarkdown({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed text-foreground/80">
      {text.split(/(`[^`]+`)/g).map((p, i) =>
        p.startsWith("`") && p.endsWith("`") ? (
          <code
            key={i}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-primary"
          >
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}

interface ExerciseProps<T extends Exercise> {
  exercise: T;
  language: string;
  onResult: (correct: boolean) => void;
}

/* ────────────── MCQ ────────────── */
export function MCQView({ exercise, language, onResult }: ExerciseProps<MCQExercise>) {
  const [picked, setPicked] = useState<number | null>(null);
  const submitted = picked !== null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{exercise.question}</p>
      {exercise.code && <CodeBlock code={exercise.code} language={language} />}
      <div className="grid gap-2">
        {exercise.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === exercise.answerIndex;
          let cls =
            "border-border bg-background hover:border-primary/50 hover:bg-accent";
          if (submitted && isCorrect)
            cls = "border-green-500/60 bg-green-500/10 text-foreground";
          else if (submitted && isPicked && !isCorrect)
            cls = "border-destructive/60 bg-destructive/10 text-foreground";
          else if (submitted) cls = "border-border bg-background opacity-60";

          return (
            <button
              key={i}
              disabled={submitted}
              onClick={() => {
                setPicked(i);
                onResult(i === exercise.answerIndex);
              }}
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-all ${cls}`}
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {submitted && isCorrect && (
                <Check className="h-4 w-4 shrink-0 text-green-500" />
              )}
              {submitted && isPicked && !isCorrect && (
                <X className="h-4 w-4 shrink-0 text-destructive" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────── Fill in the blank ────────────── */
export function FillBlankView({
  exercise,
  onResult,
}: ExerciseProps<FillBlankExercise>) {
  const segments = useMemo(() => exercise.template.split("___"), [exercise.template]);
  const blanksCount = segments.length - 1;
  const [values, setValues] = useState<string[]>(() => Array(blanksCount).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const correctness = useMemo(
    () =>
      values.map((v, i) => {
        const expected = exercise.answers[i] ?? "";
        return exercise.caseInsensitive
          ? v.trim().toLowerCase() === expected.trim().toLowerCase()
          : v.trim() === expected.trim();
      }),
    [values, exercise],
  );
  const allCorrect = correctness.every(Boolean);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{exercise.question}</p>

      <div className="overflow-hidden rounded-md border border-border bg-[oklch(0.13_0_0)] p-4 font-mono text-sm leading-relaxed text-[oklch(0.95_0_0)]">
        <pre className="whitespace-pre-wrap break-words">
          {segments.map((seg, i) => (
            <span key={i}>
              {seg}
              {i < blanksCount && (
                <input
                  value={values[i]}
                  disabled={submitted && allCorrect}
                  onChange={(e) => {
                    const next = values.slice();
                    next[i] = e.target.value;
                    setValues(next);
                  }}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className={`mx-1 inline-block min-w-[60px] rounded border-b-2 bg-transparent px-1 font-mono text-inherit outline-none transition-colors ${
                    submitted
                      ? correctness[i]
                        ? "border-green-500 text-green-300"
                        : "border-destructive text-red-300"
                      : "border-primary/60 focus:border-primary"
                  }`}
                  style={{ width: `${Math.max(6, values[i].length + 2)}ch` }}
                />
              )}
            </span>
          ))}
        </pre>
      </div>

      {exercise.hint && (
        <button
          onClick={() => setShowHint((s) => !s)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          {showHint ? "Ẩn gợi ý" : "Xem gợi ý"}
        </button>
      )}
      {showHint && exercise.hint && (
        <p className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          💡 {exercise.hint}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            setSubmitted(true);
            onResult(allCorrect);
          }}
          disabled={values.some((v) => !v.trim())}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          Kiểm tra
        </button>
        {submitted && !allCorrect && (
          <button
            onClick={() => {
              setValues(Array(blanksCount).fill(""));
              setSubmitted(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}

/* ────────────── Rewrite ────────────── */
export function RewriteView({
  exercise,
  language,
  onResult,
}: ExerciseProps<RewriteExercise>) {
  const [code, setCode] = useState(exercise.starter ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const isCorrect = useMemo(
    () => normalize(code) === normalize(exercise.solution),
    [code, exercise.solution],
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{exercise.question}</p>

      <textarea
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          if (submitted) setSubmitted(false);
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={Math.max(6, exercise.solution.split("\n").length + 1)}
        placeholder="Gõ code của bạn ở đây…"
        className={`w-full rounded-md border bg-[oklch(0.13_0_0)] p-3 font-mono text-sm leading-relaxed text-[oklch(0.95_0_0)] outline-none transition-colors ${
          submitted
            ? isCorrect
              ? "border-green-500/60"
              : "border-destructive/60"
            : "border-border focus:border-primary/60"
        }`}
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setSubmitted(true);
            onResult(isCorrect);
          }}
          disabled={!code.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          Kiểm tra
        </button>
        {exercise.hint && (
          <button
            onClick={() => setShowHint((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Gợi ý
          </button>
        )}
        {submitted && !isCorrect && (
          <button
            onClick={() => setShowSolution((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            {showSolution ? "Ẩn đáp án" : "Xem đáp án"}
          </button>
        )}
      </div>

      {showHint && exercise.hint && (
        <p className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          💡 {exercise.hint}
        </p>
      )}

      {submitted && (
        <div
          className={`rounded-md border p-2 text-sm ${
            isCorrect
              ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {isCorrect ? "✓ Chính xác!" : "✗ Chưa đúng — kiểm tra lại nhé."}
        </div>
      )}

      {showSolution && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Đáp án mẫu:</p>
          <CodeBlock code={exercise.solution} language={language} />
        </div>
      )}
    </div>
  );
}

/* ────────────── Reorder ────────────── */
export function ReorderView({ exercise, onResult }: ExerciseProps<ReorderExercise>) {
  const [order, setOrder] = useState<number[]>(() =>
    shuffle(exercise.lines.map((_, i) => i)),
  );
  const [submitted, setSubmitted] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const isCorrect = order.every((v, i) => v === i);

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = order.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
    if (submitted) setSubmitted(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{exercise.question}</p>
      <p className="text-xs text-muted-foreground">
        Kéo thả các dòng để sắp xếp đúng thứ tự.
      </p>

      <ol className="space-y-1.5">
        {order.map((lineIdx, pos) => (
          <li
            key={lineIdx}
            draggable
            onDragStart={() => (dragIndex.current = pos)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex.current !== null) move(dragIndex.current, pos);
              dragIndex.current = null;
            }}
            className={`flex cursor-grab items-center gap-2 rounded-md border bg-[oklch(0.13_0_0)] px-2 py-2 font-mono text-sm text-[oklch(0.95_0_0)] transition-colors active:cursor-grabbing ${
              submitted
                ? lineIdx === pos
                  ? "border-green-500/60"
                  : "border-destructive/60"
                : "border-border hover:border-primary/50"
            }`}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-white/40" />
            <span className="w-6 shrink-0 text-xs text-white/40">{pos + 1}</span>
            <pre className="flex-1 overflow-x-auto whitespace-pre">
              {exercise.lines[lineIdx]}
            </pre>
            {submitted &&
              (lineIdx === pos ? (
                <Check className="h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <X className="h-4 w-4 shrink-0 text-destructive" />
              ))}
          </li>
        ))}
      </ol>

      <div className="flex gap-2">
        <button
          onClick={() => {
            setSubmitted(true);
            onResult(isCorrect);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Kiểm tra
        </button>
        <button
          onClick={() => {
            setOrder(shuffle(exercise.lines.map((_, i) => i)));
            setSubmitted(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Trộn lại
        </button>
      </div>
    </div>
  );
}