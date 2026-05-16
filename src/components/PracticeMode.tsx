/* ─────────────────────────────────────────────────────────────
 * PracticeMode.tsx — bản nâng cấp (không skip câu hỏi)
 *  - Nút "Câu tiếp" chỉ hoạt động khi đã trả lời câu hiện tại
 *  - CompletionBar chỉ cho nhảy tới câu đã làm hoặc câu hiện tại
 *  - Nút "Kết thúc bài" chỉ sáng khi đã làm câu cuối
 *  - Fallback cho ExerciseRenderer
 *  - Adaptive prompt: bỏ qua -> reset easy streak
 * ────────────────────────────────────────────────────────────*/

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Dumbbell,
  ChevronRight,
  Trophy,
  Check,
  Flame,
  Award,
  Sparkles,
  Clock,
  RefreshCcw,
  Timer as TimerIcon,
} from "lucide-react";
import { CodeBlock } from "@/components/CodeBlock";
import {
  FillBlankView,
  InlineMarkdown,
  MCQView,
  ReorderView,
  RewriteView,
  DebugView,
  PredictOutputView,
  MiniProjectView,
} from "./exercises";
import {
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  type Difficulty,
  type Exercise,
  type LessonBadge,
  type PracticeLesson,
} from "./types";

type Mode = "learn" | "practice" | "review" | "summary";

const STREAK_BONUS_AT = 5;
const STREAK_BONUS_XP = 25;
const CHECKPOINT_EVERY = 5;
const ADAPTIVE_PROMOTE_AFTER = 3;

interface AttemptRecord {
  correct: boolean;
  attempts: number;
}

function difficultyOf(ex: Exercise): Difficulty {
  return ex.difficulty ?? "easy";
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ────────── CompletionBar (đã sửa: khoá nhảy tới câu chưa làm) ────────── */
function CompletionBar({
  completed,
  total,
  results,
  currentIndex,
  exercises,
  onJump,
}: {
  completed: number;
  total: number;
  results: Record<number, AttemptRecord>;
  currentIndex: number;
  exercises: Exercise[];
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

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {total > 0 && total <= 40 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Array.from({ length: total }).map((_, i) => {
            const r = results[i];
            const active = i === currentIndex;
            const diff = difficultyOf(exercises[i]);
            const isDone = r !== undefined; // đã làm
            const isReachable = isDone || i === currentIndex; // chỉ cho phép nhảy tới câu đã làm hoặc câu hiện tại

            let cls = "border-border bg-background text-muted-foreground";
            if (r?.correct === true)
              cls = "border-green-500/60 bg-green-500/10 text-green-600 dark:text-green-400";
            else if (r?.correct === false)
              cls = "border-destructive/60 bg-destructive/10 text-destructive";
            if (active) cls += " ring-2 ring-primary/50";
            if (!isReachable) cls += " opacity-40 cursor-not-allowed";

            const isCheckpoint = (i + 1) % CHECKPOINT_EVERY === 0;
            return (
              <button
                key={i}
                onClick={() => isReachable && onJump(i)}
                disabled={!isReachable}
                className={`relative inline-flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-medium transition-all hover:scale-110 ${cls} ${
                  isCheckpoint ? "ring-1 ring-primary/30" : ""
                }`}
                title={`Câu ${i + 1} — ${DIFFICULTY_META[diff].label}${
                  r?.correct === true ? " — đúng" : r?.correct === false ? " — sai" : ""
                }${!isReachable ? " (chưa thể truy cập)" : ""}`}
              >
                {r?.correct === true ? <Check className="h-3 w-3" /> : i + 1}
                {isCheckpoint && (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ────────── DifficultyChip ────────── */
function DifficultyChip({ d }: { d: Difficulty }) {
  const meta = DIFFICULTY_META[d];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.color}`}
    >
      {meta.label} · {meta.xp} XP
    </span>
  );
}

/* ────────── ExerciseRenderer (có fallback) ────────── */
function ExerciseRenderer({
  ex,
  language,
  onResult,
}: {
  ex: Exercise;
  language: string;
  onResult: (correct: boolean, meta: { attempts: number }) => void;
}) {
  switch (ex.type) {
    case "mcq":
      return <MCQView exercise={ex} language={language} onResult={onResult} />;
    case "fill-blank":
      return <FillBlankView exercise={ex} language={language} onResult={onResult} />;
    case "rewrite":
      return <RewriteView exercise={ex} language={language} onResult={onResult} />;
    case "reorder":
      return <ReorderView exercise={ex} language={language} onResult={onResult} />;
    case "debug":
      return <DebugView exercise={ex} language={language} onResult={onResult} />;
    case "predict-output":
      return <PredictOutputView exercise={ex} language={language} onResult={onResult} />;
    case "mini-project":
      return <MiniProjectView exercise={ex} language={language} onResult={onResult} />;
    default:
      return (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          ⚠️ Loại bài tập "{ex.type}" không được hỗ trợ.
        </div>
      );
  }
}

/* ────────── Component chính ────────── */
export function PracticeMode({ lesson }: { lesson: PracticeLesson }) {
  // Sắp xếp bài tập theo độ khó (mini-project luôn cuối)
  const orderedExercises = useMemo(() => {
    const indexed = lesson.exercises.map((ex, idx) => ({ ex, idx }));
    indexed.sort((a, b) => {
      const da = a.ex.type === "mini-project" ? 99 : DIFFICULTY_ORDER.indexOf(difficultyOf(a.ex));
      const db = b.ex.type === "mini-project" ? 99 : DIFFICULTY_ORDER.indexOf(difficultyOf(b.ex));
      if (da !== db) return da - db;
      return a.idx - b.idx;
    });
    return indexed.map((x) => x.ex);
  }, [lesson]);

  const [mode, setMode] = useState<Mode>("learn");
  const [currentEx, setCurrentEx] = useState(0);
  const [results, setResults] = useState<Record<number, AttemptRecord>>({});
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [bonusToast, setBonusToast] = useState<string | null>(null);
  const [checkpointToast, setCheckpointToast] = useState<string | null>(null);

  // Adaptive
  const [adaptivePrompt, setAdaptivePrompt] = useState<Difficulty | null>(null);
  const [adaptiveDismissed, setAdaptiveDismissed] = useState(false);
  const easyStreakRef = useRef(0);

  // Timer
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!timerEnabled || mode !== "practice") return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerEnabled, mode]);

  // Reset khi đổi bài học
  useEffect(() => {
    setMode("learn");
    setCurrentEx(0);
    setResults({});
    setStreak(0);
    setBestStreak(0);
    setXp(0);
    setElapsed(0);
    setBonusToast(null);
    setCheckpointToast(null);
    setAdaptivePrompt(null);
    setAdaptiveDismissed(false);
    easyStreakRef.current = 0;
  }, [lesson]);

  const total = orderedExercises.length;
  const completedCount = Object.keys(results).length;
  const correctCount = useMemo(
    () => Object.values(results).filter((r) => r.correct).length,
    [results],
  );
  const allDone = completedCount === total && total > 0;
  const ex = orderedExercises[currentEx];
  const exResult = results[currentEx];
  const canAdvance = exResult !== undefined; // đã trả lời câu hiện tại

  /* ────────── Xử lý kết quả 1 câu ────────── */
  const handleResult = (correct: boolean, meta: { attempts: number }) => {
    setResults((prev) => ({
      ...prev,
      [currentEx]: { correct, attempts: meta.attempts },
    }));

    if (correct) {
      const diff = difficultyOf(ex);
      const gained = DIFFICULTY_META[diff].xp + (meta.attempts === 1 ? 5 : 0);
      setXp((x) => x + gained);
      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((b) => Math.max(b, ns));
        if (ns > 0 && ns % STREAK_BONUS_AT === 0) {
          setXp((x) => x + STREAK_BONUS_XP);
          setBonusToast(`🔥 Combo x${ns}! +${STREAK_BONUS_XP} XP bonus`);
          setTimeout(() => setBonusToast(null), 2500);
        }
        return ns;
      });
      // Adaptive
      if (diff === "easy" && !adaptiveDismissed) {
        easyStreakRef.current += 1;
        if (easyStreakRef.current >= ADAPTIVE_PROMOTE_AFTER && !adaptivePrompt) {
          const nextMedium = orderedExercises.findIndex(
            (e, i) => difficultyOf(e) === "medium" && !results[i] && i !== currentEx,
          );
          if (nextMedium >= 0) setAdaptivePrompt("medium");
        }
      } else {
        easyStreakRef.current = 0;
      }
    } else {
      setStreak(0);
      easyStreakRef.current = 0;
    }
  };

  /* ────────── Chuyển câu (có checkpoint) ────────── */
  const goNext = () => {
    if (!canAdvance) return; // không cho skip
    const nextIdx = currentEx + 1;
    if (nextIdx >= total) {
      setMode("summary");
      return;
    }
    if (nextIdx % CHECKPOINT_EVERY === 0) {
      const done = Object.keys(results).length;
      const right = Object.values(results).filter((r) => r.correct).length;
      setCheckpointToast(`🏁 Checkpoint! Đã làm ${done} câu — đúng ${right}. Tiếp tục nào!`);
      setTimeout(() => setCheckpointToast(null), 3500);
    }
    setCurrentEx(nextIdx);
  };

  /* ────────── Badges ────────── */
  const earnedBadges = useMemo<LessonBadge[]>(() => {
    const badges = lesson.badges ?? [];
    return badges.filter((b) => {
      const matches = orderedExercises.filter((e, i) => {
        const okTag = b.requireTag ? (e.tags ?? []).includes(b.requireTag) : true;
        return okTag && results[i]?.correct;
      });
      return matches.length >= b.minCorrect;
    });
  }, [lesson.badges, orderedExercises, results]);

  /* ────────── Câu sai (cho ôn tập) ────────── */
  const wrongIndices = useMemo(
    () =>
      Object.entries(results)
        .filter(([, r]) => !r.correct)
        .map(([k]) => Number(k))
        .sort((a, b) => results[b].attempts - results[a].attempts),
    [results],
  );

  /* ────────── Review mode ────────── */
  const [reviewQueue, setReviewQueue] = useState<number[]>([]);
  const [reviewPos, setReviewPos] = useState(0);

  const startReview = () => {
    if (wrongIndices.length === 0) return;
    setReviewQueue(wrongIndices);
    setReviewPos(0);
    setMode("review");
  };

  const handleReviewResult = (correct: boolean, meta: { attempts: number }) => {
    const idx = reviewQueue[reviewPos];
    if (correct) {
      setResults((prev) => ({ ...prev, [idx]: { correct: true, attempts: meta.attempts } }));
      const next = reviewQueue.filter((_, i) => i !== reviewPos);
      setTimeout(() => {
        setReviewQueue(next);
        if (next.length === 0) setMode("summary");
        else setReviewPos((p) => Math.min(p, next.length - 1));
      }, 600);
    } else {
      setReviewQueue((q) => {
        const cur = q[reviewPos];
        const rest = q.filter((_, i) => i !== reviewPos);
        return [...rest, cur];
      });
    }
  };

  /* ────────── Render ────────── */
  return (
    <div className="space-y-4">
      {/* Toasts */}
      {bonusToast && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-300">
          {bonusToast}
        </div>
      )}
      {checkpointToast && (
        <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
          {checkpointToast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{lesson.title}</h2>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs">
            <Sparkles className="h-3 w-3 text-primary" /> {xp} XP
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs">
            <Flame className="h-3 w-3 text-orange-500" /> Streak {streak}
          </span>

          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            <button
              onClick={() => setMode("learn")}
              className={`...`} // giữ nguyên className
            >
              <BookOpen className="h-3.5 w-3.5" /> Học
            </button>
            <button
              onClick={() => setMode("practice")}
              disabled={total === 0}
              className={`...`}
            >
              <Dumbbell className="h-3.5 w-3.5" /> Luyện tập
              {total > 0 && <span className="...">{total}</span>}
            </button>
            <button
              onClick={startReview}
              disabled={wrongIndices.length === 0}
              className={`...`}
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Ôn tập
              {wrongIndices.length > 0 && <span className="...">{wrongIndices.length}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Adaptive prompt */}
      {adaptivePrompt && mode === "practice" && (
        <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span className="text-foreground">
            🚀 Bạn đang làm rất tốt với câu dễ — muốn nhảy thẳng lên mức{" "}
            <strong>{DIFFICULTY_META[adaptivePrompt].label}</strong>?
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const nextIdx = orderedExercises.findIndex(
                  (e, i) => difficultyOf(e) === adaptivePrompt && !results[i],
                );
                if (nextIdx >= 0) setCurrentEx(nextIdx);
                setAdaptivePrompt(null);
                setAdaptiveDismissed(true);
              }}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Nhảy lên
            </button>
            <button
              onClick={() => {
                setAdaptivePrompt(null);
                setAdaptiveDismissed(true);
                easyStreakRef.current = 0; // reset streak
              }}
              className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent"
            >
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      {/* Thanh tiến độ tổng */}
      {total > 0 && mode !== "summary" && (
        <CompletionBar
          completed={completedCount}
          total={total}
          results={results}
          currentIndex={currentEx}
          exercises={orderedExercises}
          onJump={(i) => {
            if (i === currentEx || results[i] !== undefined) {
              setCurrentEx(i);
              setMode("practice");
            }
          }}
        />
      )}

      {/* ────────── LEARN MODE ────────── */}
      {mode === "learn" && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <CodeBlock code={lesson.code} language={lesson.language} />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Giải thích</h3>
            {lesson.explanation.map((p, i) => (
              <InlineMarkdown key={i} text={p} />
            ))}
          </div>

          {total > 0 && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Lộ trình {total} câu — dễ tới khó:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTY_ORDER.map((d) => {
                  const count = orderedExercises.filter(
                    (e) => e.type !== "mini-project" && difficultyOf(e) === d,
                  ).length;
                  if (count === 0) return null;
                  return (
                    <span
                      key={d}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_META[d].color}`}
                    >
                      {DIFFICULTY_META[d].label} × {count}
                    </span>
                  );
                })}
                {orderedExercises.some((e) => e.type === "mini-project") && (
                  <span className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-0.5 text-[11px] font-medium text-fuchsia-600 dark:text-fuchsia-300">
                    Mini project cuối
                  </span>
                )}
              </div>
            </div>
          )}

          {total > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMode("practice")}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Bắt đầu luyện tập <ChevronRight className="h-4 w-4" />
              </button>
              <label className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-foreground/80">
                <input
                  type="checkbox"
                  checked={timerEnabled}
                  onChange={(e) => {
                    setTimerEnabled(e.target.checked);
                    setElapsed(0);
                  }}
                />
                <TimerIcon className="h-3.5 w-3.5" />
                Bật timer (mode Thử thách)
              </label>
            </div>
          )}
        </div>
      )}

      {/* ────────── PRACTICE MODE ────────── */}
      {mode === "practice" && ex && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>
                Câu {currentEx + 1} / {total}
              </span>
              <DifficultyChip d={difficultyOf(ex)} />
              {ex.type === "debug" && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                  Debug
                </span>
              )}
              {ex.type === "predict-output" && (
                <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-300">
                  Đoán output
                </span>
              )}
              {ex.type === "mini-project" && (
                <span className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-medium text-fuchsia-600 dark:text-fuchsia-300">
                  Mini project
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {timerEnabled && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {formatTime(elapsed)}
                </span>
              )}
              <span>
                Đúng: {correctCount}
                {completedCount > 0 && ` / ${completedCount} đã làm`}
              </span>
            </div>
          </div>

          <div key={`${currentEx}-${ex.type}`}>
            <ExerciseRenderer ex={ex} language={lesson.language} onResult={handleResult} />
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
                onClick={goNext}
                disabled={!canAdvance}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  canAdvance
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {canAdvance ? (
                  <>
                    Câu tiếp <ChevronRight className="h-4 w-4" />
                  </>
                ) : (
                  "Hãy trả lời câu hỏi"
                )}
              </button>
            ) : (
              <button
                onClick={() => setMode("summary")}
                disabled={!canAdvance}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  canAdvance
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                <Trophy className="h-4 w-4" />
                {canAdvance ? "Kết thúc bài" : "Hãy trả lời câu hỏi"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ────────── REVIEW MODE ────────── */}
      {mode === "review" && reviewQueue.length > 0 && (
        <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
              <RefreshCcw className="h-3.5 w-3.5" /> Ôn tập câu sai — còn {reviewQueue.length}
            </span>
            <DifficultyChip d={difficultyOf(orderedExercises[reviewQueue[reviewPos]])} />
          </div>
          <ExerciseRenderer
            ex={orderedExercises[reviewQueue[reviewPos]]}
            language={lesson.language}
            onResult={handleReviewResult}
          />
          <div className="flex justify-end">
            <button
              onClick={() => setMode("practice")}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Thoát ôn tập
            </button>
          </div>
        </div>
      )}

      {/* ────────── SUMMARY ────────── */}
      {mode === "summary" && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">
              <Trophy className="mr-1.5 inline h-4 w-4 text-primary" />
              Hoàn thành bài học!
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full border border-border bg-background px-2 py-0.5">
                {correctCount}/{total} đúng
              </span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5">
                <Sparkles className="mr-1 inline h-3 w-3" /> {xp} XP
              </span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5">
                <Flame className="mr-1 inline h-3 w-3 text-orange-500" /> Best streak {bestStreak}
              </span>
              {timerEnabled && (
                <span className="rounded-full border border-border bg-background px-2 py-0.5">
                  <Clock className="mr-1 inline h-3 w-3" /> {formatTime(elapsed)}
                </span>
              )}
            </div>
          </div>

          {lesson.quickRecap && lesson.quickRecap.length > 0 && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="mb-1 text-sm font-semibold text-primary">
                ⚡ Tóm tắt nhớ nhanh 30 giây
              </p>
              <ul className="ml-5 list-disc space-y-1 text-sm text-foreground/80">
                {lesson.quickRecap.map((line, i) => (
                  <li key={i}>
                    <InlineMarkdown text={line} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {earnedBadges.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">
                <Award className="mr-1 inline h-4 w-4 text-amber-500" /> Badge đã đạt
              </p>
              <div className="flex flex-wrap gap-2">
                {earnedBadges.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                  >
                    <Award className="h-3 w-3" /> {b.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {wrongIndices.length > 0 && (
              <button
                onClick={startReview}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/90 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-500"
              >
                <RefreshCcw className="h-4 w-4" /> Ôn lại {wrongIndices.length} câu sai
              </button>
            )}
            <button
              onClick={() => {
                setCurrentEx(0);
                setMode("practice");
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Làm lại từ đầu
            </button>
            <button
              onClick={() => setMode("learn")}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <BookOpen className="h-4 w-4" /> Xem lại lý thuyết
            </button>
          </div>

          {allDone && (
            <div className="flex items-center justify-center rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300">
              🎉 Bạn đã hoàn thành toàn bộ {total} câu — quá xịn!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
