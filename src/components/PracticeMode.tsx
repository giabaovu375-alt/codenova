/* ─────────────────────────────────────────────────────────────
 * PracticeMode.tsx — PREMIUM EDITION
 *
 *  Mọi tính năng đều tự‑contained, không thêm dependency bắt buộc.
 *  Chỉ `canvas-confetti` là optional (lazy‑load, fallback an toàn).
 *
 *  Tính năng mới so với bản trước:
 *   - Auto save / resume theo localStorage (key = lesson.id || lesson.title)
 *   - Keyboard shortcuts: ←/→, Enter, R, L, P, B (bookmark), ? (help)
 *   - Confetti khi summary (lazy import)
 *   - Adaptive 2 chiều: promote khi giỏi, downshift khi sai liên tiếp
 *   - Streak Shield: streak 10 → +1 shield, sai 1 câu tiêu shield giữ streak
 *   - Stats panel: accuracy theo độ khó, avg time, first‑try rate
 *   - Level system (XP → Level) + tier name + progress to next level
 *   - Bookmark câu để xem lại
 *   - Pause timer + Challenge countdown mode
 *   - Export JSON & Copy share text
 *   - Sticky progress header, micro‑animations, gradient XP bar
 *   - A11y: aria-live, focus management, prefers-reduced-motion
 *   - Error boundary quanh ExerciseRenderer
 * ────────────────────────────────────────────────────────────*/

import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BookOpen,
  Dumbbell,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Check,
  Flame,
  Award,
  Sparkles,
  Clock,
  RefreshCcw,
  Timer as TimerIcon,
  Shield,
  Bookmark,
  BookmarkCheck,
  Pause,
  Play,
  Download,
  Share2,
  Keyboard,
  TrendingUp,
  Zap,
  Target,
  Gauge,
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

/* ═══════════════════════ CONSTANTS ═══════════════════════ */
type Mode = "learn" | "practice" | "review" | "summary";

const STREAK_BONUS_AT = 5;
const STREAK_BONUS_XP = 25;
const CHECKPOINT_EVERY = 5;
const ADAPTIVE_PROMOTE_AFTER = 3;
const ADAPTIVE_DOWNSHIFT_AFTER = 2;
const SHIELD_AT_STREAK = 10;
const STORAGE_PREFIX = "practice-mode:v2:";
const CHALLENGE_SECONDS_PER_Q = 45;

const LEVEL_TIERS = [
  { min: 0, name: "Novice", color: "text-zinc-500" },
  { min: 100, name: "Apprentice", color: "text-emerald-500" },
  { min: 300, name: "Adept", color: "text-sky-500" },
  { min: 700, name: "Expert", color: "text-violet-500" },
  { min: 1500, name: "Master", color: "text-amber-500" },
  { min: 3000, name: "Grandmaster", color: "text-fuchsia-500" },
];

/* ═══════════════════════ TYPES ═══════════════════════ */
interface AttemptRecord {
  correct: boolean;
  attempts: number;
  timeMs?: number;
  difficulty?: Difficulty;
}

interface PersistedState {
  currentEx: number;
  results: Record<number, AttemptRecord>;
  xp: number;
  streak: number;
  bestStreak: number;
  shields: number;
  bookmarks: number[];
  timerEnabled: boolean;
  challengeMode: boolean;
  mode: Mode;
}

/* ═══════════════════════ HELPERS ═══════════════════════ */
function difficultyOf(ex: Exercise): Difficulty {
  return ex.difficulty ?? "easy";
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function getLevel(xp: number) {
  let tier = LEVEL_TIERS[0];
  let nextTier: (typeof LEVEL_TIERS)[number] | null = null;
  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (xp >= LEVEL_TIERS[i].min) {
      tier = LEVEL_TIERS[i];
      nextTier = LEVEL_TIERS[i + 1] ?? null;
    }
  }
  const level = Math.floor(xp / 50) + 1;
  const pct = nextTier
    ? Math.min(100, ((xp - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100;
  return { level, tierName: tier.name, tierColor: tier.color, progressPct: pct, nextTier };
}

function safeStorage() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadPersisted(key: string): Partial<PersistedState> | null {
  const ls = safeStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePersisted(key: string, state: PersistedState) {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(STORAGE_PREFIX + key, JSON.stringify(state));
  } catch {
    /* quota / private mode — silent */
  }
}

function clearPersisted(key: string) {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* noop */
  }
}

async function fireConfetti() {
  try {
    // @ts-ignore — optional dep
    const mod = await import(/* @vite-ignore */ "canvas-confetti");
    const confetti = mod.default ?? mod;
    const end = Date.now() + 800;
    const colors = ["#a78bfa", "#22d3ee", "#f59e0b", "#22c55e"];
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  } catch {
    /* package not installed — graceful no‑op */
  }
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/* ═══════════════════════ ERROR BOUNDARY ═══════════════════════ */
class ExerciseErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[PracticeMode] Exercise render error:", error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="mb-2 font-medium text-destructive">
            ⚠️ Bài tập này gặp lỗi khi render.
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
          <button
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset();
            }}
            className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent"
          >
            Bỏ qua câu này
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════ COMPLETION BAR ═══════════════════════ */
function CompletionBar({
  completed,
  total,
  results,
  currentIndex,
  exercises,
  bookmarks,
  onJump,
}: {
  completed: number;
  total: number;
  results: Record<number, AttemptRecord>;
  currentIndex: number;
  exercises: Exercise[];
  bookmarks: Set<number>;
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
          className="h-full bg-gradient-to-r from-primary via-fuchsia-500 to-primary/70 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {total > 0 && total <= 60 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Array.from({ length: total }).map((_, i) => {
            const r = results[i];
            const active = i === currentIndex;
            const diff = difficultyOf(exercises[i]);
            const isDone = r !== undefined;
            const isReachable = isDone || i === currentIndex;
            const isBookmarked = bookmarks.has(i);

            let cls = "border-border bg-background text-muted-foreground";
            if (r?.correct === true)
              cls = "border-green-500/60 bg-green-500/10 text-green-600 dark:text-green-400";
            else if (r?.correct === false)
              cls = "border-destructive/60 bg-destructive/10 text-destructive";
            if (active) cls += " ring-2 ring-primary/60 shadow-sm";
            if (!isReachable) cls += " opacity-40 cursor-not-allowed";

            const isCheckpoint = (i + 1) % CHECKPOINT_EVERY === 0;
            return (
              <button
                key={i}
                onClick={() => isReachable && onJump(i)}
                disabled={!isReachable}
                aria-label={`Câu ${i + 1}${r?.correct === true ? " - đúng" : r?.correct === false ? " - sai" : ""}`}
                aria-current={active ? "step" : undefined}
                className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md border text-[11px] font-medium transition-all hover:scale-110 motion-reduce:hover:scale-100 ${cls}`}
                title={`Câu ${i + 1} — ${DIFFICULTY_META[diff].label}${
                  r?.correct === true ? " — đúng" : r?.correct === false ? " — sai" : ""
                }${!isReachable ? " (chưa thể truy cập)" : ""}`}
              >
                {r?.correct === true ? <Check className="h-3 w-3" /> : i + 1}
                {isCheckpoint && (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                )}
                {isBookmarked && (
                  <Bookmark className="absolute -right-1 -top-1 h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ SMALL UI BITS ═══════════════════════ */
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

function StatPill({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2"
      title={hint}
    >
      <span className="text-primary">{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-sm font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════ EXERCISE RENDERER ═══════════════════════ */
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
          ⚠️ Loại bài tập "{(ex as Exercise).type}" không được hỗ trợ.
        </div>
      );
  }
}

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
export interface PracticeCompletePayload {
  xp: number;
  correct: number;
  total: number;
  bestStreak: number;
  timeSeconds: number;
  accuracy: number;
}

export function PracticeMode({
  lesson,
  initialMode = "learn",
  onExit,
  onComplete,
}: {
  lesson: PracticeLesson;
  /** Mode to open in. Use "practice" when launched from an in-lesson checkpoint. */
  initialMode?: Mode;
  /** If provided, a "Bài học" back button appears in the header + summary. */
  onExit?: () => void;
  /** Fires once when the user reaches the summary screen. */
  onComplete?: (payload: PracticeCompletePayload) => void;
}) {
  /* ---------- ordered exercises ---------- */
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

  /* ---------- persistence key ---------- */
  const storageKey = useMemo(
    () => (lesson as { id?: string }).id ?? lesson.title ?? "default",
    [lesson],
  );

  /* ---------- core state ---------- */
  const [mode, setMode] = useState<Mode>(initialMode);
  const completedFiredRef = useRef(false);
  const [currentEx, setCurrentEx] = useState(0);
  const [results, setResults] = useState<Record<number, AttemptRecord>>({});
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [shields, setShields] = useState(0);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [toasts, setToasts] = useState<{ id: number; text: string; kind: "bonus" | "info" | "warn" | "shield" }[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [resumeBanner, setResumeBanner] = useState<PersistedState | null>(null);
  const toastIdRef = useRef(0);

  /* ---------- adaptive ---------- */
  const [adaptivePrompt, setAdaptivePrompt] = useState<Difficulty | null>(null);
  const [adaptiveDismissed, setAdaptiveDismissed] = useState(false);
  const easyStreakRef = useRef(0);
  const wrongStreakRef = useRef(0);

  /* ---------- timer / challenge ---------- */
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [challengeMode, setChallengeMode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [exStart, setExStart] = useState<number>(() => Date.now());

  /* ---------- mounted flag (load persisted only once) ---------- */
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const persisted = loadPersisted(storageKey);
    if (persisted && persisted.results && Object.keys(persisted.results).length > 0) {
      setResumeBanner(persisted as PersistedState);
    }
  }, [storageKey]);

  /* ---------- timer tick ---------- */
  useEffect(() => {
    if (!timerEnabled || mode !== "practice" || timerPaused) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerEnabled, mode, timerPaused]);

  /* ---------- reset when lesson changes ---------- */
  useEffect(() => {
    setMode(initialMode);
    completedFiredRef.current = false;
    setCurrentEx(0);
    setResults({});
    setStreak(0);
    setBestStreak(0);
    setXp(0);
    setShields(0);
    setBookmarks(new Set());
    setElapsed(0);
    setExStart(Date.now());
    setToasts([]);
    setAdaptivePrompt(null);
    setAdaptiveDismissed(false);
    easyStreakRef.current = 0;
    wrongStreakRef.current = 0;
    initRef.current = false;
  }, [lesson]);

  /* ---------- reset exercise start time when changing question ---------- */
  useEffect(() => {
    setExStart(Date.now());
  }, [currentEx, mode]);

  /* ---------- derived ---------- */
  const total = orderedExercises.length;
  const completedCount = Object.keys(results).length;
  const correctCount = useMemo(
    () => Object.values(results).filter((r) => r.correct).length,
    [results],
  );
  const allDone = completedCount === total && total > 0;
  const ex = orderedExercises[currentEx];
  const exResult = results[currentEx];
  const canAdvance = exResult !== undefined;
  const level = useMemo(() => getLevel(xp), [xp]);
  const isBookmarked = bookmarks.has(currentEx);

  /* ---------- auto‑save ---------- */
  useEffect(() => {
    if (!initRef.current) return;
    if (completedCount === 0 && xp === 0) return;
    savePersisted(storageKey, {
      currentEx,
      results,
      xp,
      streak,
      bestStreak,
      shields,
      bookmarks: Array.from(bookmarks),
      timerEnabled,
      challengeMode,
      mode,
    });
  }, [
    storageKey,
    currentEx,
    results,
    xp,
    streak,
    bestStreak,
    shields,
    bookmarks,
    timerEnabled,
    challengeMode,
    mode,
    completedCount,
  ]);

  /* ---------- toast helper ---------- */
  const pushToast = useCallback(
    (text: string, kind: "bonus" | "info" | "warn" | "shield" = "info") => {
      const id = ++toastIdRef.current;
      setToasts((t) => [...t, { id, text, kind }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
    },
    [],
  );

  /* ---------- result handler ---------- */
  const handleResult = (correct: boolean, meta: { attempts: number }) => {
    const timeMs = Date.now() - exStart;
    const diff = difficultyOf(ex);

    setResults((prev) => ({
      ...prev,
      [currentEx]: { correct, attempts: meta.attempts, timeMs, difficulty: diff },
    }));

    if (correct) {
      wrongStreakRef.current = 0;
      const firstTryBonus = meta.attempts === 1 ? 5 : 0;
      const speedBonus =
        timerEnabled && timeMs < 8000 && meta.attempts === 1 ? 10 : 0;
      const gained = DIFFICULTY_META[diff].xp + firstTryBonus + speedBonus;
      setXp((x) => x + gained);
      if (speedBonus) pushToast(`⚡ Speed bonus +${speedBonus} XP`, "bonus");

      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((b) => Math.max(b, ns));
        if (ns > 0 && ns % STREAK_BONUS_AT === 0) {
          setXp((x) => x + STREAK_BONUS_XP);
          pushToast(`🔥 Combo x${ns}! +${STREAK_BONUS_XP} XP bonus`, "bonus");
        }
        if (ns === SHIELD_AT_STREAK || (ns > SHIELD_AT_STREAK && ns % SHIELD_AT_STREAK === 0)) {
          setShields((sh) => Math.min(sh + 1, 3));
          pushToast(`🛡️ +1 Streak Shield (max 3)`, "shield");
        }
        return ns;
      });

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
      easyStreakRef.current = 0;
      wrongStreakRef.current += 1;

      // streak shield
      if (shields > 0) {
        setShields((sh) => sh - 1);
        pushToast(`🛡️ Shield đỡ giúp — streak giữ nguyên ${streak}`, "shield");
      } else {
        setStreak(0);
      }

      // adaptive downshift
      if (
        wrongStreakRef.current >= ADAPTIVE_DOWNSHIFT_AFTER &&
        (diff === "hard" || diff === "medium")
      ) {
        const easierDiff: Difficulty = diff === "hard" ? "medium" : "easy";
        const nextEasier = orderedExercises.findIndex(
          (e, i) => difficultyOf(e) === easierDiff && !results[i] && i !== currentEx,
        );
        if (nextEasier >= 0) {
          pushToast(
            `💡 Thử lại mức ${DIFFICULTY_META[easierDiff].label} cho chắc nhé`,
            "info",
          );
        }
      }
    }
  };

  /* ---------- navigation ---------- */
  const goNext = useCallback(() => {
    if (!canAdvance) return;
    const nextIdx = currentEx + 1;
    if (nextIdx >= total) {
      setMode("summary");
      return;
    }
    if (nextIdx % CHECKPOINT_EVERY === 0) {
      const done = Object.keys(results).length;
      const right = Object.values(results).filter((r) => r.correct).length;
      pushToast(`🏁 Checkpoint! Đã làm ${done} câu — đúng ${right}`, "info");
    }
    setCurrentEx(nextIdx);
  }, [canAdvance, currentEx, total, results, pushToast]);

  const goPrev = useCallback(() => {
    setCurrentEx((i) => Math.max(0, i - 1));
  }, []);

  const toggleBookmark = useCallback(() => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(currentEx)) next.delete(currentEx);
      else next.add(currentEx);
      return next;
    });
  }, [currentEx]);

  /* ---------- keyboard shortcuts ---------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "ArrowRight":
          if (mode === "practice") {
            e.preventDefault();
            goNext();
          }
          break;
        case "ArrowLeft":
          if (mode === "practice") {
            e.preventDefault();
            goPrev();
          }
          break;
        case "Enter":
          if (mode === "practice" && canAdvance) {
            e.preventDefault();
            goNext();
          }
          break;
        case "l":
        case "L":
          setMode("learn");
          break;
        case "p":
        case "P":
          if (total > 0) setMode("practice");
          break;
        case "r":
        case "R":
          if (mode === "practice") toggleBookmark();
          break;
        case "?":
          setShowHelp((s) => !s);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, canAdvance, goNext, goPrev, toggleBookmark, total]);

  /* ---------- badges ---------- */
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

  /* ---------- wrong & review ---------- */
  const wrongIndices = useMemo(
    () =>
      Object.entries(results)
        .filter(([, r]) => !r.correct)
        .map(([k]) => Number(k))
        .sort((a, b) => results[b].attempts - results[a].attempts),
    [results],
  );

  const [reviewQueue, setReviewQueue] = useState<number[]>([]);
  const [reviewPos, setReviewPos] = useState(0);

  const startReview = (indices?: number[]) => {
    const q = indices ?? wrongIndices;
    if (q.length === 0) return;
    setReviewQueue(q);
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
      }, 500);
    } else {
      setReviewQueue((q) => {
        const cur = q[reviewPos];
        const rest = q.filter((_, i) => i !== reviewPos);
        return [...rest, cur];
      });
    }
  };

  /* ---------- summary effects ---------- */
  useEffect(() => {
    if (mode !== "summary") return;
    if (!prefersReducedMotion()) fireConfetti();
    if (!completedFiredRef.current) {
      completedFiredRef.current = true;
      onComplete?.({
        xp,
        correct: correctCount,
        total,
        bestStreak,
        timeSeconds: elapsed,
        accuracy: total ? correctCount / total : 0,
      });
    }
  }, [mode, onComplete, xp, correctCount, total, bestStreak, elapsed]);

  /* ---------- stats ---------- */
  const stats = useMemo(() => {
    const entries = Object.values(results);
    const totalTime = entries.reduce((acc, r) => acc + (r.timeMs ?? 0), 0);
    const withTime = entries.filter((r) => r.timeMs);
    const avgMs = withTime.length ? totalTime / withTime.length : 0;
    const fastest = withTime.reduce(
      (acc, r) => (r.timeMs! < acc ? r.timeMs! : acc),
      Infinity,
    );
    const firstTry = entries.filter((r) => r.correct && r.attempts === 1).length;
    const firstTryRate = entries.length ? (firstTry / entries.length) * 100 : 0;

    const byDiff: Record<Difficulty, { total: number; correct: number }> = {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 },
    };
    entries.forEach((r) => {
      const d = r.difficulty ?? "easy";
      byDiff[d].total += 1;
      if (r.correct) byDiff[d].correct += 1;
    });

    return {
      avgMs,
      fastestMs: fastest === Infinity ? 0 : fastest,
      firstTryRate,
      byDiff,
    };
  }, [results]);

  /* ---------- export & share ---------- */
  const exportJSON = () => {
    const data = {
      lesson: lesson.title,
      xp,
      level: level.level,
      tier: level.tierName,
      correct: correctCount,
      total,
      bestStreak,
      timeSeconds: elapsed,
      results,
      bookmarks: Array.from(bookmarks),
      earnedBadges: earnedBadges.map((b) => b.label),
      exportedAt: new Date().toISOString(),
    };
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `practice-${storageKey}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      pushToast("Không thể export ở môi trường này", "warn");
    }
  };

  const shareResult = async () => {
    const text = `🎯 ${lesson.title}\n✅ ${correctCount}/${total} đúng — ${xp} XP — Lv.${level.level} (${level.tierName})\n🔥 Best streak ${bestStreak}${
      timerEnabled ? ` — ⏱ ${formatTime(elapsed)}` : ""
    }`;
    try {
      if (navigator.share) {
        await navigator.share({ title: lesson.title, text });
      } else {
        await navigator.clipboard.writeText(text);
        pushToast("📋 Đã copy kết quả", "info");
      }
    } catch {
      /* user cancelled */
    }
  };

  /* ---------- resume restore ---------- */
  const restoreProgress = () => {
    if (!resumeBanner) return;
    setCurrentEx(resumeBanner.currentEx ?? 0);
    setResults(resumeBanner.results ?? {});
    setXp(resumeBanner.xp ?? 0);
    setStreak(resumeBanner.streak ?? 0);
    setBestStreak(resumeBanner.bestStreak ?? 0);
    setShields(resumeBanner.shields ?? 0);
    setBookmarks(new Set(resumeBanner.bookmarks ?? []));
    setTimerEnabled(!!resumeBanner.timerEnabled);
    setChallengeMode(!!resumeBanner.challengeMode);
    setMode(resumeBanner.mode ?? "practice");
    setResumeBanner(null);
    pushToast("✅ Đã khôi phục tiến độ", "info");
  };

  const discardProgress = () => {
    clearPersisted(storageKey);
    setResumeBanner(null);
  };

  /* ---------- challenge countdown per question ---------- */
  const [qCountdown, setQCountdown] = useState(CHALLENGE_SECONDS_PER_Q);
  useEffect(() => {
    if (!challengeMode || mode !== "practice" || canAdvance) return;
    setQCountdown(CHALLENGE_SECONDS_PER_Q);
    const id = setInterval(() => {
      setQCountdown((s) => {
        if (s <= 1) {
          clearInterval(id);
          handleResult(false, { attempts: 1 });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEx, challengeMode, mode, canAdvance]);

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div className="space-y-4">
      {/* Toasts */}
      <div
        className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-md border px-3 py-2 text-sm font-medium shadow-lg backdrop-blur transition-all animate-in fade-in slide-in-from-right ${
              t.kind === "bonus"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : t.kind === "shield"
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : t.kind === "warn"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-primary/40 bg-primary/10 text-primary"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Resume banner */}
      {resumeBanner && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span className="text-foreground">
            💾 Có tiến độ đã lưu — {Object.keys(resumeBanner.results ?? {}).length} câu, {resumeBanner.xp ?? 0} XP. Khôi phục?
          </span>
          <div className="flex gap-2">
            <button
              onClick={restoreProgress}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Khôi phục
            </button>
            <button
              onClick={discardProgress}
              className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent"
            >
              Bắt đầu mới
            </button>
          </div>
        </div>
      )}

      {/* Header — sticky */}
      <div className="sticky top-0 z-10 -mx-2 flex flex-wrap items-center justify-between gap-2 rounded-b-lg border-b border-border bg-background/85 px-2 py-2 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-lg font-semibold text-foreground">{lesson.title}</h2>
          <span
            className={`hidden sm:inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium ${level.tierColor}`}
            title={`Level ${level.level} — ${level.tierName}`}
          >
            <TrendingUp className="h-3 w-3" /> Lv.{level.level} {level.tierName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs">
            <Sparkles className="h-3 w-3 text-primary" /> {xp} XP
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs">
            <Flame className={`h-3 w-3 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
            {streak}
          </span>
          {shields > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-700 dark:text-sky-300">
              <Shield className="h-3 w-3" /> ×{shields}
            </span>
          )}

          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            <ModeBtn active={mode === "learn"} onClick={() => setMode("learn")} icon={<BookOpen className="h-3.5 w-3.5" />}>
              Học
            </ModeBtn>
            <ModeBtn
              active={mode === "practice"}
              onClick={() => setMode("practice")}
              disabled={total === 0}
              icon={<Dumbbell className="h-3.5 w-3.5" />}
              count={total}
            >
              Luyện tập
            </ModeBtn>
            <ModeBtn
              active={mode === "review"}
              onClick={() => startReview()}
              disabled={wrongIndices.length === 0}
              icon={<RefreshCcw className="h-3.5 w-3.5" />}
              count={wrongIndices.length || undefined}
            >
              Ôn tập
            </ModeBtn>
          </div>

          {onExit && (
            <button
              onClick={onExit}
              title="Quay lại bài học"
              aria-label="Quay lại bài học"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs font-medium hover:bg-accent"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Bài học
            </button>
          )}

          <button
            onClick={() => setShowHelp((s) => !s)}
            title="Phím tắt (?)"
            aria-label="Phím tắt"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card hover:bg-accent"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Level XP bar */}
      {level.nextTier && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{level.tierName}</span>
            <span>
              {xp} / {level.nextTier.min} XP → {level.nextTier.name}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 transition-all duration-700"
              style={{ width: `${level.progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Help overlay */}
      {showHelp && (
        <div className="rounded-md border border-border bg-card p-3 text-xs">
          <div className="mb-2 font-semibold text-foreground">⌨️ Phím tắt</div>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground sm:grid-cols-3">
            <span><kbd className="kbd">←</kbd> / <kbd className="kbd">→</kbd> Chuyển câu</span>
            <span><kbd className="kbd">Enter</kbd> Câu tiếp</span>
            <span><kbd className="kbd">L</kbd> Học · <kbd className="kbd">P</kbd> Luyện tập</span>
            <span><kbd className="kbd">R</kbd> Bookmark câu</span>
            <span><kbd className="kbd">?</kbd> Mở/đóng help</span>
          </div>
        </div>
      )}

      {/* Adaptive prompt */}
      {adaptivePrompt && mode === "practice" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span className="text-foreground">
            🚀 Bạn đang làm rất tốt — muốn nhảy thẳng lên mức{" "}
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
                easyStreakRef.current = 0;
              }}
              className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent"
            >
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      {/* Completion bar */}
      {total > 0 && mode !== "summary" && (
        <CompletionBar
          completed={completedCount}
          total={total}
          results={results}
          currentIndex={currentEx}
          exercises={orderedExercises}
          bookmarks={bookmarks}
          onJump={(i) => {
            if (i === currentEx || results[i] !== undefined) {
              setCurrentEx(i);
              setMode("practice");
            }
          }}
        />
      )}

      {/* ───── LEARN MODE ───── */}
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
            <div className="flex flex-wrap items-center gap-2">
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
                Bật timer
              </label>
              <label className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-foreground/80">
                <input
                  type="checkbox"
                  checked={challengeMode}
                  onChange={(e) => setChallengeMode(e.target.checked)}
                />
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Challenge mode ({CHALLENGE_SECONDS_PER_Q}s / câu)
              </label>
            </div>
          )}
        </div>
      )}

      {/* ───── PRACTICE MODE ───── */}
      {mode === "practice" && ex && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
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
              <button
                onClick={toggleBookmark}
                className="ml-1 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] hover:bg-accent"
                title="Bookmark câu (R)"
              >
                {isBookmarked ? (
                  <>
                    <BookmarkCheck className="h-3 w-3 text-amber-500" /> Đã lưu
                  </>
                ) : (
                  <>
                    <Bookmark className="h-3 w-3" /> Lưu
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {challengeMode && !canAdvance && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                    qCountdown <= 10
                      ? "border-destructive/50 bg-destructive/10 text-destructive animate-pulse"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                  }`}
                >
                  <Zap className="h-3 w-3" /> {qCountdown}s
                </span>
              )}
              {timerEnabled && (
                <button
                  onClick={() => setTimerPaused((p) => !p)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 hover:bg-accent"
                  title={timerPaused ? "Tiếp tục" : "Tạm dừng"}
                >
                  {timerPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                  <Clock className="h-3 w-3" /> {formatTime(elapsed)}
                </button>
              )}
              <span>
                Đúng: {correctCount}
                {completedCount > 0 && ` / ${completedCount}`}
              </span>
            </div>
          </div>

          <ExerciseErrorBoundary onReset={goNext}>
            <div
              key={`${currentEx}-${ex.type}`}
              className="animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
            >
              <ExerciseRenderer ex={ex} language={lesson.language} onResult={handleResult} />
            </div>
          </ExerciseErrorBoundary>

          {exResult !== undefined && ex.explanation && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground/80">
              <span className="font-medium text-primary">Giải thích: </span>
              {ex.explanation}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <button
              onClick={goPrev}
              disabled={currentEx === 0}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Trước
            </button>

            {currentEx < total - 1 ? (
              <button
                onClick={goNext}
                disabled={!canAdvance}
                className={`inline-flex items-center gap-1 rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                  canAdvance
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md"
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
                className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                  canAdvance
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-md"
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

      {/* ───── REVIEW MODE ───── */}
      {mode === "review" && reviewQueue.length > 0 && (
        <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
              <RefreshCcw className="h-3.5 w-3.5" /> Ôn tập — còn {reviewQueue.length}
            </span>
            <DifficultyChip d={difficultyOf(orderedExercises[reviewQueue[reviewPos]])} />
          </div>
          <ExerciseErrorBoundary onReset={() => setMode("practice")}>
            <ExerciseRenderer
              ex={orderedExercises[reviewQueue[reviewPos]]}
              language={lesson.language}
              onResult={handleReviewResult}
            />
          </ExerciseErrorBoundary>
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

      {/* ───── SUMMARY ───── */}
      {mode === "summary" && (
        <div className="space-y-4 rounded-lg border border-border bg-gradient-to-br from-card to-card/50 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">
              <Trophy className="mr-1.5 inline h-5 w-5 text-amber-500" />
              Hoàn thành bài học!
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full border border-border bg-background px-2 py-0.5 ${level.tierColor}`}>
                Lv.{level.level} · {level.tierName}
              </span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5">
                {correctCount}/{total} đúng
              </span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5">
                <Sparkles className="mr-1 inline h-3 w-3" /> {xp} XP
              </span>
              <span className="rounded-full border border-border bg-background px-2 py-0.5">
                <Flame className="mr-1 inline h-3 w-3 text-orange-500" /> Best {bestStreak}
              </span>
              {timerEnabled && (
                <span className="rounded-full border border-border bg-background px-2 py-0.5">
                  <Clock className="mr-1 inline h-3 w-3" /> {formatTime(elapsed)}
                </span>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill
              icon={<Target className="h-4 w-4" />}
              label="Accuracy"
              value={`${total ? Math.round((correctCount / total) * 100) : 0}%`}
            />
            <StatPill
              icon={<Zap className="h-4 w-4" />}
              label="First-try"
              value={`${Math.round(stats.firstTryRate)}%`}
            />
            <StatPill
              icon={<Gauge className="h-4 w-4" />}
              label="Avg/câu"
              value={stats.avgMs ? `${(stats.avgMs / 1000).toFixed(1)}s` : "—"}
              hint="Thời gian trung bình mỗi câu"
            />
            <StatPill
              icon={<TimerIcon className="h-4 w-4" />}
              label="Nhanh nhất"
              value={stats.fastestMs ? `${(stats.fastestMs / 1000).toFixed(1)}s` : "—"}
            />
          </div>

          {/* Accuracy by difficulty */}
          <div className="rounded-md border border-border bg-background/60 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Độ chính xác theo mức độ
            </p>
            <div className="space-y-2">
              {DIFFICULTY_ORDER.map((d) => {
                const s = stats.byDiff[d];
                if (s.total === 0) return null;
                const pct = Math.round((s.correct / s.total) * 100);
                return (
                  <div key={d} className="flex items-center gap-2 text-xs">
                    <span className={`w-16 font-medium ${DIFFICULTY_META[d].color.split(" ")[2] ?? ""}`}>
                      {DIFFICULTY_META[d].label}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-fuchsia-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-muted-foreground">
                      {s.correct}/{s.total} · {pct}%
                    </span>
                  </div>
                );
              })}
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

          {bookmarks.size > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">
                <Bookmark className="mr-1 inline h-4 w-4 text-amber-500" /> Đã bookmark ({bookmarks.size})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(bookmarks)
                  .sort((a, b) => a - b)
                  .map((i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentEx(i);
                        setMode("practice");
                      }}
                      className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                    >
                      Câu {i + 1}
                    </button>
                  ))}
                <button
                  onClick={() => startReview(Array.from(bookmarks))}
                  className="rounded-md border border-border px-2 py-0.5 text-[11px] hover:bg-accent"
                >
                  Ôn tất cả bookmark →
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {wrongIndices.length > 0 && (
              <button
                onClick={() => startReview()}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/90 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-500"
              >
                <RefreshCcw className="h-4 w-4" /> Ôn lại {wrongIndices.length} câu sai
              </button>
            )}
            <button
              onClick={() => {
                clearPersisted(storageKey);
                setCurrentEx(0);
                setResults({});
                setStreak(0);
                setXp(0);
                setShields(0);
                setBookmarks(new Set());
                setElapsed(0);
                easyStreakRef.current = 0;
                wrongStreakRef.current = 0;
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
            <button
              onClick={shareResult}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Share2 className="h-4 w-4" /> Chia sẻ
            </button>
            <button
              onClick={exportJSON}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Download className="h-4 w-4" /> Export JSON
            {onExit && (
              <button
                onClick={onExit}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-fuchsia-500 px-3 py-1.5 text-sm font-medium text-primary-foreground hover:shadow-md"
              >
                <ChevronLeft className="h-4 w-4" /> Quay lại bài học
              </button>
            )}
          </div>

          {allDone && (
            <div className="flex items-center justify-center rounded-md border border-green-500/40 bg-gradient-to-r from-green-500/10 to-emerald-500/10 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300">
              🎉 Bạn đã hoàn thành toàn bộ {total} câu — quá xịn!
            </div>
          )}
        </div>
      )}

      {/* tiny CSS for kbd */}
      <style>{`
        .kbd {
          display: inline-block;
          padding: 1px 6px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
          border: 1px solid var(--border, #e5e7eb);
          border-bottom-width: 2px;
          border-radius: 4px;
          background: var(--card, #fafafa);
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════ MODE BUTTON ═══════════════════════ */
function ModeBtn({
  active,
  onClick,
  disabled,
  icon,
  children,
  count,
}: {
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
      }`}
    >
      {icon}
      {children}
      {count !== undefined && count > 0 && (
        <span className="ml-1 rounded-full bg-background/30 px-1.5 text-[10px]">
          {count}
        </span>
      )}
    </button>
  );
}
