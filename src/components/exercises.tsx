/* ─────────────────────────────────────────────────────────────
 * exercises.tsx — đã nâng cấp
 *  • onResult(correct, { attempts }) để PracticeMode tính streak/spaced-rep
 *  • Sai lần 1 → hint nhẹ; sai lần 2 → nearAnswer / "why wrong"
 *  • MCQ random thứ tự options mỗi lần mount
 *  • Reorder dùng shuffleStrong (không trùng vị trí gốc nhiều)
 *  • Thêm DebugView, PredictOutputView, MiniProjectView
 * ────────────────────────────────────────────────────────────*/

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X, RotateCcw, Lightbulb, GripVertical, Bug, Eye, Rocket } from "lucide-react";
import { CodeBlock } from "@/components/CodeBlock"; // chỉnh path nếu khác
import {
  normalize,
  shuffle,
  shuffleStrong,
  type Exercise,
  type MCQExercise,
  type FillBlankExercise,
  type RewriteExercise,
  type ReorderExercise,
  type DebugExercise,
  type PredictOutputExercise,
  type MiniProjectExercise,
} from "./types";

/* ────────────── Render inline `code` markdown ────────────── */
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

/* ────────────── Props chung ────────────── */
export interface ExerciseProps<T extends Exercise> {
  exercise: T;
  language: string;
  /** correct: đúng hay không; attempts: tổng số lần kiểm tra (kể cả lần này) */
  onResult: (correct: boolean, meta: { attempts: number }) => void;
}

/* ────────────── Hint block dùng chung ────────────── */
function HintStack({
  attempts,
  hint,
  nearAnswer,
  whyWrong,
}: {
  attempts: number;
  hint?: string;
  nearAnswer?: string;
  whyWrong?: string;
}) {
  return (
    <div className="space-y-2">
      {whyWrong && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          <span className="font-semibold">Vì sao sai: </span>
          {whyWrong}
        </div>
      )}
      {attempts >= 1 && hint && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
          <Lightbulb className="mr-1 inline h-3.5 w-3.5" />
          <span className="font-semibold">Gợi ý nhẹ: </span>
          {hint}
        </div>
      )}
      {attempts >= 2 && nearAnswer && (
        <div className="rounded-md border border-primary/40 bg-primary/10 p-2 text-xs text-primary">
          <span className="font-semibold">Đáp án gần đúng: </span>
          {nearAnswer}
        </div>
      )}
    </div>
  );
}

/* ────────────── MCQ (options shuffled) ────────────── */
export function MCQView({ exercise, language, onResult }: ExerciseProps<MCQExercise>) {
  // Shuffle order — lưu mapping displayIndex -> originalIndex
  const order = useMemo(
    () => shuffle(exercise.options.map((_, i) => i)),
    // re-shuffle khi exercise thay đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercise],
  );

  const [picked, setPicked] = useState<number | null>(null); // displayIndex
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  const handlePick = (displayIdx: number) => {
    if (locked) return;
    const originalIdx = order[displayIdx];
    const correct = originalIdx === exercise.answerIndex;
    const nextAttempts = attempts + 1;
    setPicked(displayIdx);
    setAttempts(nextAttempts);
    if (correct || nextAttempts >= 3) setLocked(true);
    onResult(correct, { attempts: nextAttempts });
  };

  const retry = () => {
    setPicked(null);
  };

  const pickedOriginal = picked === null ? null : order[picked];
  const wasWrong = picked !== null && pickedOriginal !== exercise.answerIndex;
  const whyWrong =
    wasWrong && pickedOriginal !== null
      ? exercise.wrongExplanations?.[pickedOriginal]
      : undefined;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{exercise.question}</p>
      {exercise.code && <CodeBlock code={exercise.code} language={language} />}
      <div className="grid gap-2">
        {order.map((origIdx, displayIdx) => {
          const opt = exercise.options[origIdx];
          const isPicked = picked === displayIdx;
          const isCorrect = origIdx === exercise.answerIndex;
          const reveal = locked || (picked !== null && isPicked);
          let cls = "border-border bg-background hover:border-primary/50 hover:bg-accent";
          if (reveal && isCorrect)
            cls = "border-green-500/60 bg-green-500/10 text-foreground";
          else if (reveal && isPicked && !isCorrect)
            cls = "border-destructive/60 bg-destructive/10 text-foreground";
          else if (locked) cls = "border-border bg-background opacity-60";

          return (
            <button
              key={displayIdx}
              disabled={locked}
              onClick={() => handlePick(displayIdx)}
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-all ${cls}`}
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium">
                {String.fromCharCode(65 + displayIdx)}
              </span>
              <span className="flex-1">{opt}</span>
              {reveal && isCorrect && <Check className="h-4 w-4 shrink-0 text-green-500" />}
              {reveal && isPicked && !isCorrect && (
                <X className="h-4 w-4 shrink-0 text-destructive" />
              )}
            </button>
          );
        })}
      </div>

      <HintStack
        attempts={wasWrong ? attempts : 0}
        hint={exercise.hint}
        nearAnswer={exercise.nearAnswer}
        whyWrong={whyWrong}
      />

      {wasWrong && !locked && (
        <button
          onClick={retry}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Thử lại
        </button>
      )}
    </div>
  );
}

/* ────────────── Fill in the blank ────────────── */
export function FillBlankView({ exercise, onResult }: ExerciseProps<FillBlankExercise>) {
  const segments = useMemo(() => exercise.template.split("___"), [exercise.template]);
  const blanksCount = segments.length - 1;
  const [values, setValues] = useState<string[]>(() => Array(blanksCount).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);

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

  const submit = () => {
    const next = attempts + 1;
    setSubmitted(true);
    setAttempts(next);
    onResult(allCorrect, { attempts: next });
  };

  const wrongAttempts = submitted && !allCorrect ? attempts : 0;

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

      <HintStack
        attempts={wrongAttempts}
        hint={exercise.hint}
        nearAnswer={
          exercise.nearAnswer ??
          (wrongAttempts >= 2
            ? `Các đáp án đúng: ${exercise.answers.map((a) => `\`${a}\``).join(", ")}`
            : undefined)
        }
      />

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={values.some((v) => !v.trim()) || (submitted && allCorrect)}
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
            <RotateCcw className="h-3.5 w-3.5" /> Thử lại
          </button>
        )}
      </div>
    </div>
  );
}

/* ────────────── Rewrite ────────────── */
export function RewriteView({ exercise, language, onResult }: ExerciseProps<RewriteExercise>) {
  const [code, setCode] = useState(exercise.starter ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const isCorrect = useMemo(
    () => normalize(code) === normalize(exercise.solution),
    [code, exercise.solution],
  );

  const submit = () => {
    const next = attempts + 1;
    setSubmitted(true);
    setAttempts(next);
    onResult(isCorrect, { attempts: next });
  };

  const wrongAttempts = submitted && !isCorrect ? attempts : 0;

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

      <HintStack
        attempts={wrongAttempts}
        hint={exercise.hint}
        nearAnswer={exercise.nearAnswer}
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={submit}
          disabled={!code.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          Kiểm tra
        </button>
        {submitted && !isCorrect && attempts >= 2 && (
          <button
            onClick={() => setShowSolution((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            {showSolution ? "Ẩn đáp án" : "Xem đáp án"}
          </button>
        )}
      </div>

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

/* ────────────── Reorder (shuffle MẠNH) ────────────── */
export function ReorderView({ exercise, onResult }: ExerciseProps<ReorderExercise>) {
  const original = useMemo(() => exercise.lines.map((_, i) => i), [exercise.lines]);
  const [order, setOrder] = useState<number[]>(() => shuffleStrong(original));
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const dragIndex = useRef<number | null>(null);

  // Reshuffle nếu user nhấn "trộn lại" hoặc đổi bài
  useEffect(() => {
    setOrder(shuffleStrong(original));
    setSubmitted(false);
    setAttempts(0);
  }, [exercise]);

  const isCorrect = order.every((v, i) => v === i);

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = order.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
    if (submitted) setSubmitted(false);
  };

  const submit = () => {
    const next = attempts + 1;
    setSubmitted(true);
    setAttempts(next);
    onResult(isCorrect, { attempts: next });
  };

  const wrongAttempts = submitted && !isCorrect ? attempts : 0;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{exercise.question}</p>
      <p className="text-xs text-muted-foreground">Kéo thả các dòng để sắp xếp đúng thứ tự.</p>

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
            <pre className="flex-1 overflow-x-auto whitespace-pre">{exercise.lines[lineIdx]}</pre>
            {submitted &&
              (lineIdx === pos ? (
                <Check className="h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <X className="h-4 w-4 shrink-0 text-destructive" />
              ))}
          </li>
        ))}
      </ol>

      <HintStack attempts={wrongAttempts} hint={exercise.hint} nearAnswer={exercise.nearAnswer} />

      <div className="flex gap-2">
        <button
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Kiểm tra
        </button>
        <button
          onClick={() => {
            setOrder(shuffleStrong(original));
            setSubmitted(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Trộn lại
        </button>
      </div>
    </div>
  );
}

/* ────────────── Debug code (tìm & sửa lỗi) ────────────── */
export function DebugView({ exercise, language, onResult }: ExerciseProps<DebugExercise>) {
  const [code, setCode] = useState(exercise.buggyCode);
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const isCorrect = useMemo(
    () => normalize(code) === normalize(exercise.fixedCode),
    [code, exercise.fixedCode],
  );

  const submit = () => {
    const next = attempts + 1;
    setSubmitted(true);
    setAttempts(next);
    onResult(isCorrect, { attempts: next });
  };

  const wrongAttempts = submitted && !isCorrect ? attempts : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bug className="h-4 w-4 text-amber-500" />
        <p className="text-sm font-medium text-foreground">{exercise.question}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Sửa trực tiếp đoạn code bên dưới cho đúng rồi nhấn "Kiểm tra".
      </p>

      <textarea
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          if (submitted) setSubmitted(false);
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={Math.max(6, exercise.fixedCode.split("\n").length + 1)}
        className={`w-full rounded-md border bg-[oklch(0.13_0_0)] p-3 font-mono text-sm leading-relaxed text-[oklch(0.95_0_0)] outline-none transition-colors ${
          submitted
            ? isCorrect
              ? "border-green-500/60"
              : "border-destructive/60"
            : "border-border focus:border-primary/60"
        }`}
      />

      <HintStack
        attempts={wrongAttempts}
        hint={exercise.hint ?? exercise.bugLineHint}
        nearAnswer={exercise.nearAnswer}
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={submit}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Kiểm tra
        </button>
        <button
          onClick={() => setCode(exercise.buggyCode)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
        {submitted && !isCorrect && attempts >= 2 && (
          <button
            onClick={() => setShowSolution((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            {showSolution ? "Ẩn đáp án" : "Xem đáp án"}
          </button>
        )}
      </div>

      {showSolution && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Code đúng:</p>
          <CodeBlock code={exercise.fixedCode} language={language} />
        </div>
      )}
    </div>
  );
}

/* ────────────── Predict output (đoán output) ────────────── */
export function PredictOutputView({
  exercise,
  language,
  onResult,
}: ExerciseProps<PredictOutputExercise>) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const isCorrect = useMemo(() => {
    const a = value.replace(/\r/g, "").trimEnd();
    const b = exercise.expectedOutput.replace(/\r/g, "").trimEnd();
    return exercise.caseInsensitive
      ? a.toLowerCase() === b.toLowerCase()
      : a === b;
  }, [value, exercise]);

  const submit = () => {
    const next = attempts + 1;
    setSubmitted(true);
    setAttempts(next);
    onResult(isCorrect, { attempts: next });
  };

  const wrongAttempts = submitted && !isCorrect ? attempts : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-sky-500" />
        <p className="text-sm font-medium text-foreground">{exercise.question}</p>
      </div>

      <CodeBlock code={exercise.code} language={language} />

      <label className="block text-xs font-medium text-muted-foreground">
        Output bạn dự đoán:
      </label>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (submitted) setSubmitted(false);
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={Math.max(3, exercise.expectedOutput.split("\n").length + 1)}
        placeholder="Gõ chính xác output (kể cả khoảng trắng, xuống dòng)…"
        className={`w-full rounded-md border bg-[oklch(0.13_0_0)] p-3 font-mono text-sm leading-relaxed text-[oklch(0.95_0_0)] outline-none transition-colors ${
          submitted
            ? isCorrect
              ? "border-green-500/60"
              : "border-destructive/60"
            : "border-border focus:border-primary/60"
        }`}
      />

      <HintStack
        attempts={wrongAttempts}
        hint={exercise.hint}
        nearAnswer={
          exercise.nearAnswer ??
          (wrongAttempts >= 2
            ? `Số dòng output đúng: ${exercise.expectedOutput.split("\n").length}`
            : undefined)
        }
      />

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          Kiểm tra
        </button>
      </div>

      {submitted && !isCorrect && attempts >= 2 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Output đúng:</p>
          <pre className="overflow-x-auto rounded-md border border-border bg-[oklch(0.13_0_0)] p-3 font-mono text-xs text-[oklch(0.95_0_0)]">
            {exercise.expectedOutput}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ────────────── Mini project ────────────── */
export function MiniProjectView({
  exercise,
  onResult,
}: ExerciseProps<MiniProjectExercise>) {
  const [code, setCode] = useState(exercise.starter ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const checkResults = useMemo(
    () =>
      exercise.checks.map((c) => {
        const inOk = (c.mustInclude ?? []).every((s) => code.includes(s));
        const outOk = (c.mustNotInclude ?? []).every((s) => !code.includes(s));
        return inOk && outOk;
      }),
    [code, exercise.checks],
  );
  const passed = checkResults.filter(Boolean).length;
  const allPass = passed === exercise.checks.length && exercise.checks.length > 0;

  const submit = () => {
    const next = attempts + 1;
    setSubmitted(true);
    setAttempts(next);
    onResult(allPass, { attempts: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Rocket className="h-4 w-4 text-fuchsia-500" />
        <p className="text-sm font-medium text-foreground">{exercise.question}</p>
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground/80">
        <span className="font-semibold text-primary">Yêu cầu: </span>
        {exercise.brief}
      </div>

      <textarea
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          if (submitted) setSubmitted(false);
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={Math.max(8, (exercise.starter?.split("\n").length ?? 0) + 4)}
        placeholder="Bắt đầu viết mini project của bạn…"
        className={`w-full rounded-md border bg-[oklch(0.13_0_0)] p-3 font-mono text-sm leading-relaxed text-[oklch(0.95_0_0)] outline-none transition-colors ${
          submitted
            ? allPass
              ? "border-green-500/60"
              : "border-destructive/60"
            : "border-border focus:border-primary/60"
        }`}
      />

      <ul className="space-y-1.5 text-sm">
        {exercise.checks.map((c, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                submitted
                  ? checkResults[i]
                    ? "border-green-500 bg-green-500/20 text-green-500"
                    : "border-destructive bg-destructive/20 text-destructive"
                  : "border-border"
              }`}
            >
              {submitted ? (
                checkResults[i] ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )
              ) : null}
            </span>
            <span className={submitted && checkResults[i] ? "text-foreground" : "text-foreground/80"}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>

      <HintStack
        attempts={submitted && !allPass ? attempts : 0}
        hint={exercise.hint}
        nearAnswer={exercise.nearAnswer}
      />

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!code.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          Chấm bài ({passed}/{exercise.checks.length})
        </button>
      </div>
    </div>
  );
}
