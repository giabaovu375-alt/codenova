// lesson.$slug.tsx — Premium Stepper Edition
// Giữ nguyên toàn bộ import/đường dẫn từ project gốc.
// UI redesign: 1 card / màn, progress bar + minimap, checkpoint mỗi 3 đoạn,
// keyboard nav (← →), animation mượt, final challenge ở cuối.

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  Trophy,
  Wand2,
  BookOpen,
  AlertCircle,
  RefreshCw,
  Dumbbell,
  Flag,
  Code2,
  ChevronLeft,
} from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { CodeBlock } from "@/components/CodeBlock";
import {
  lessonsStore,
  type Lesson,
  LANGUAGE_LABELS,
} from "@/lib/lessons-store";
import { explainCode, gradeSubmission, hasAnyKey } from "@/lib/ai";
import { progressStore } from "@/lib/progress-store";
import { useAuth } from "@/lib/auth";
import { PracticeMode } from "@/components/PracticeMode";
import { getPracticeLesson } from "@/lib/practice-store";
import type { PracticeLesson } from "@/components/practice/types";

export const Route = createFileRoute("/lesson/$slug")({
  component: LessonPage,
});

// Số đoạn code giữa hai checkpoint
const CHUNK_SIZE = 3;

// ─────────────────────────────────────────────────────
// Types nội bộ cho stepper
// ─────────────────────────────────────────────────────
type Step =
  | { kind: "block"; blockIndex: number; chunkIndex: number }
  | { kind: "checkpoint"; chunkIndex: number; afterBlockIndex: number }
  | { kind: "final" };

// ─────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────
const SkeletonStep = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-2 w-full rounded-full bg-secondary" />
    <div className="h-8 w-1/3 rounded bg-secondary" />
    <div className="h-64 w-full rounded-2xl bg-secondary" />
    <div className="h-4 w-3/4 rounded bg-secondary" />
  </div>
);

// ─────────────────────────────────────────────────────
// BlockStep — một đoạn code + giải thích, dạng card lớn
// ─────────────────────────────────────────────────────
type BlockStepProps = {
  blockId: string;
  index: number;
  total: number;
  code: string;
  explanation?: string;
  language: string;
  langLabel: string;
  read: boolean;
  onMarkRead: (id: string) => void;
};

const BlockStep = React.memo(function BlockStep({
  blockId,
  index,
  total,
  code,
  explanation,
  language,
  langLabel,
  read,
  onMarkRead,
}: BlockStepProps) {
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Auto đánh dấu đã đọc khi card được mount (xem là đã xem)
  useEffect(() => {
    const t = setTimeout(() => onMarkRead(blockId), 600);
    return () => clearTimeout(t);
  }, [blockId, onMarkRead]);

  const ask = async () => {
    if (!hasAnyKey()) {
      setErr("Chưa có API key. Vào Cài đặt để thêm.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      setAiText(await explainCode(code, "fast", language));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <article
      key={blockId}
      className="animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/20">
            {index + 1}
          </span>
          <div>
            <h3 className="text-sm font-medium leading-tight">
              Đoạn {index + 1}{" "}
              <span className="text-muted-foreground">/ {total}</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {langLabel} · ví dụ tương tác
            </p>
          </div>
          {read && (
            <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Đã đọc" />
          )}
        </div>

        <button
          onClick={ask}
          disabled={loading}
          className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium backdrop-blur transition-all hover:border-primary/60 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
          )}
          AI giải thích
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card/40 shadow-sm ring-1 ring-black/[0.02] backdrop-blur">
        <div className="flex items-center gap-2 border-b border-border/70 bg-secondary/40 px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Code2 className="h-3 w-3" />
            example.{language}
          </span>
        </div>
        <CodeBlock code={code} language={language} />
      </div>

      {explanation && (
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-sm leading-relaxed text-foreground/90">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <BookOpen className="h-3 w-3" />
            Giải thích
          </div>
          {explanation}
        </div>
      )}

      {err && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {err}
        </p>
      )}

      {aiText && (
        <div className="mt-3 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent p-4 text-sm leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-2">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <Sparkles className="h-3 w-3" /> AI
          </div>
          {aiText}
        </div>
      )}
    </article>
  );
});

// ─────────────────────────────────────────────────────
// CheckpointStep — chèn giữa lesson, mời làm thử thách
// ─────────────────────────────────────────────────────
const CheckpointStep = ({
  chunkIndex,
  totalChunks,
  hasPractice,
  onOpenPractice,
  onContinue,
}: {
  chunkIndex: number;
  totalChunks: number;
  hasPractice: boolean;
  onOpenPractice: () => void;
  onContinue: () => void;
}) => (
  <div className="animate-in fade-in zoom-in-95 duration-300">
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-card to-card p-8 shadow-lg">
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Flag className="h-3.5 w-3.5" />
          Checkpoint {chunkIndex + 1}/{totalChunks}
        </div>

        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          Sẵn sàng thực hiện thử thách?
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Bạn vừa hoàn thành một phần bài học. Hãy luyện tập ngay để khắc sâu
          kiến thức — vận dụng tốt hơn lý thuyết suông gấp 10 lần.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {hasPractice ? (
            <button
              onClick={onOpenPractice}
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-95"
            >
              <Dumbbell className="h-4 w-4" />
              Thực hiện thử thách
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              Bài này chưa có dữ liệu luyện tập
            </span>
          )}
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-4 py-2.5 text-sm font-medium backdrop-blur transition-all hover:border-foreground/30"
          >
            Học tiếp
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────
// FinalChallenge — giữ logic gốc, repackage UI
// ─────────────────────────────────────────────────────
const FinalChallenge = ({
  lesson,
  language,
  langLabel,
  readPct,
  loggedIn,
}: {
  lesson: Lesson;
  language: string;
  langLabel: string;
  readPct: number;
  loggedIn: boolean;
}) => {
  const prompt = useMemo(
    () =>
      `Thử thách cuối bài "${lesson.title}" (${langLabel}, ${lesson.level}): Hãy viết một đoạn ${langLabel} ngắn áp dụng kiến thức vừa học. ` +
      `Yêu cầu: tự đặt một bài toán nhỏ liên quan đến chủ đề bài học, viết code giải nó, in/hiển thị kết quả. ` +
      `Code phải chạy được, có ít nhất 5 dòng, đặt tên biến rõ nghĩa.`,
    [lesson, langLabel]
  );

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    feedback: string;
    optimized: string;
  } | null>(null);
  const [err, setErr] = useState("");
  const submittedRef = useRef(false);

  useEffect(() => {
    submittedRef.current = false;
  }, [lesson.slug]);

  const submit = async () => {
    if (!loggedIn) {
      setErr("Đăng nhập để nộp bài và cộng điểm.");
      return;
    }
    if (!hasAnyKey()) {
      setErr("Cần API key trong Cài đặt để AI chấm bài.");
      return;
    }
    if (code.trim().length < 10) {
      setErr("Code quá ngắn, hãy viết thêm.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const r = await gradeSubmission(prompt, code, language);
      setResult(r);
      if (!submittedRef.current) {
        submittedRef.current = true;
        await progressStore.addAttempt(
          lesson.slug,
          "final",
          r.score,
          r.feedback,
          code
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="animate-in fade-in zoom-in-95 duration-300 overflow-hidden rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 md:p-8 shadow-xl">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Trophy className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          Thử thách cuối bài
        </h2>
        <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
          Tối đa 10 điểm · {langLabel}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {prompt}
      </p>
      {readPct < 100 && (
        <p className="mt-2 text-xs text-amber-600">
          Bạn mới đọc {readPct}% bài học. Không bắt buộc, nhưng đọc kỹ trước
          khi làm sẽ giúp điểm cao hơn.
        </p>
      )}

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        placeholder={`// Viết code ${langLabel} của bạn ở đây...`}
        className="mt-5 h-64 w-full resize-y rounded-xl border border-border bg-[oklch(0.13_0_0)] p-4 font-mono text-sm leading-relaxed text-[oklch(0.95_0_0)] shadow-inner outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-95 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          Nộp bài & AI chấm
        </button>
        {!loggedIn && (
          <Link to="/login" className="text-sm text-primary hover:underline">
            Đăng nhập để cộng điểm →
          </Link>
        )}
        {err && (
          <span className="inline-flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {err}
          </span>
        )}
      </div>

      {result && (
        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-baseline gap-3 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 to-primary/5 p-5">
            <span className="text-4xl font-bold text-primary">
              {result.score}
            </span>
            <span className="text-sm text-muted-foreground">/ 10 điểm</span>
            {submittedRef.current && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Đã lưu vào hồ sơ
              </span>
            )}
          </div>
          {result.feedback && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Nhận xét của AI</h4>
              <div className="rounded-xl border border-border bg-background p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {result.feedback}
              </div>
            </div>
          )}
          {result.optimized && result.optimized !== code && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Bản tối ưu gợi ý</h4>
              <CodeBlock code={result.optimized} language={language} />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

// ─────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────
function LessonPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"lesson" | "practice">("lesson");
  const [practiceLesson, setPracticeLesson] =
    useState<PracticeLesson | null>(null);

  const [stepIndex, setStepIndex] = useState(0);

  // Fetch
  const fetchLesson = useCallback(async () => {
    let cancelled = false;
    try {
      setLoading(true);
      setError(null);
      const data = await lessonsStore.getAsync(slug);
      if (!cancelled) {
        if (!data) throw notFound();
        setLesson(data);
        try {
          const practice = await getPracticeLesson(slug);
          if (!cancelled) setPracticeLesson(practice);
        } catch {
          if (!cancelled) setPracticeLesson(null);
        }
      }
    } catch (err: any) {
      if (!cancelled) {
        if (err?.isNotFound || err?.status === 404) throw err;
        setError(err.message || "Không thể tải bài học.");
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  // Reset step khi đổi slug
  useEffect(() => {
    setStepIndex(0);
    setViewMode("lesson");
  }, [slug]);

  // Load tiến độ
  useEffect(() => {
    if (!user || !lesson) return;
    let cancelled = false;
    progressStore.get(slug).then((p) => {
      if (cancelled || !p) return;
      const ids = lesson.blocks.slice(0, p.blocks_read).map((b) => b.id);
      setReadSet(new Set(ids));
    });
    return () => {
      cancelled = true;
    };
  }, [user, lesson, slug]);

  // Lưu tiến độ (debounce 500ms)
  const saveProgress = useCallback(
    (size: number, total: number) => {
      if (!user || !lesson) return;
      progressStore.setBlocksRead(slug, size, total);
    },
    [user, lesson, slug]
  );

  useEffect(() => {
    if (!user || !lesson) return;
    const timer = setTimeout(() => {
      saveProgress(readSet.size, lesson.blocks.length);
    }, 500);
    return () => clearTimeout(timer);
  }, [readSet, user, lesson, saveProgress]);

  const markRead = useCallback((id: string) => {
    setReadSet((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Build steps (block + checkpoint + final)
  const steps = useMemo<Step[]>(() => {
    if (!lesson) return [];
    const out: Step[] = [];
    const total = lesson.blocks.length;
    let chunkIndex = 0;
    for (let i = 0; i < total; i++) {
      out.push({ kind: "block", blockIndex: i, chunkIndex });
      const isChunkEnd = (i + 1) % CHUNK_SIZE === 0;
      const isLast = i === total - 1;
      if (isChunkEnd && !isLast) {
        out.push({
          kind: "checkpoint",
          chunkIndex,
          afterBlockIndex: i,
        });
        chunkIndex++;
      }
    }
    out.push({ kind: "final" });
    return out;
  }, [lesson]);

  const totalChunks = useMemo(
    () => steps.filter((s) => s.kind === "checkpoint").length,
    [steps]
  );

  // Keyboard nav
  useEffect(() => {
    if (viewMode !== "lesson") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      if (e.key === "ArrowRight")
        setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      else if (e.key === "ArrowLeft")
        setStepIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps.length, viewMode]);

  // Scroll lên đầu mỗi khi đổi step
  useEffect(() => {
    if (viewMode === "lesson") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIndex, viewMode]);

  // ── Render states ───────────────────────────────────
  if (loading) {
    return (
      <CodeNovaLayout>
        <div className="py-12">
          <SkeletonStep />
        </div>
      </CodeNovaLayout>
    );
  }

  if (error) {
    return (
      <CodeNovaLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive/70 mb-4" />
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={fetchLesson}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      </CodeNovaLayout>
    );
  }

  if (!lesson) return null;

  const totalBlocks = lesson.blocks.length;
  const completedBlocks = readSet.size;
  const progressPercent =
    totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;
  const language = lesson.language ?? "javascript";
  const langLabel = LANGUAGE_LABELS[language] || language.toUpperCase();
  const hasPractice = practiceLesson !== null;

  // Stepper progress (theo vị trí step)
  const stepperPct =
    steps.length > 1 ? Math.round((stepIndex / (steps.length - 1)) * 100) : 0;
  const currentStep = steps[stepIndex];

  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));
  const goNext = () =>
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const openPractice = () => setViewMode("practice");

  // ── Practice Mode toàn màn hình ─────────────────────
  if (viewMode === "practice" && hasPractice) {
    return (
      <CodeNovaLayout>
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setViewMode("lesson")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Quay lại bài học
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Dumbbell className="h-3.5 w-3.5" /> Đang luyện tập
          </span>
        </div>
        <PracticeMode lesson={practiceLesson!} />
      </CodeNovaLayout>
    );
  }

  return (
    <CodeNovaLayout>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/lessons"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Tất cả bài học
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-secondary px-2 py-0.5 font-medium text-foreground">
              {lesson.level}
            </span>
            <span className="rounded bg-primary/15 px-2 py-0.5 font-medium text-primary">
              {langLabel}
            </span>
            {hasPractice && (
              <button
                onClick={openPractice}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium hover:bg-secondary hover:text-foreground"
              >
                <Dumbbell className="h-3 w-3" /> Luyện tập
              </button>
            )}
          </div>
        </div>

        {/* Progress bar stepper */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Bước{" "}
              <span className="font-medium text-foreground">
                {stepIndex + 1}
              </span>{" "}
              / {steps.length}
            </span>
            <span>
              Đã đọc {completedBlocks}/{totalBlocks} · {progressPercent}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500 ease-out"
              style={{ width: `${stepperPct}%` }}
            />
          </div>

          {/* Minimap chấm */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {steps.map((s, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              const base =
                "h-2 rounded-full transition-all duration-300 cursor-pointer";
              let cls = "";
              if (s.kind === "checkpoint") {
                cls = active
                  ? "w-6 bg-primary ring-2 ring-primary/30"
                  : done
                  ? "w-4 bg-primary/70"
                  : "w-4 bg-amber-400/60 hover:bg-amber-400";
              } else if (s.kind === "final") {
                cls = active
                  ? "w-8 bg-primary ring-2 ring-primary/30"
                  : done
                  ? "w-6 bg-primary/70"
                  : "w-6 bg-secondary hover:bg-foreground/30";
              } else {
                cls = active
                  ? "w-5 bg-primary"
                  : done
                  ? "w-3 bg-primary/60"
                  : "w-3 bg-secondary hover:bg-foreground/30";
              }
              return (
                <button
                  key={i}
                  aria-label={`Đi tới bước ${i + 1}`}
                  onClick={() => setStepIndex(i)}
                  className={`${base} ${cls}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Tiêu đề bài (chỉ hiện ở step đầu) */}
      {stepIndex === 0 && (
        <header className="mb-8 animate-in fade-in slide-in-from-top-2">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {lesson.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {lesson.description}
          </p>
          {lesson.image && (
            <img
              src={lesson.image}
              alt={lesson.title}
              loading="lazy"
              className="mt-5 max-h-72 w-full rounded-2xl border border-border object-cover shadow-sm"
            />
          )}
        </header>
      )}

      {/* Step content */}
      <main className="min-h-[420px]">
        {currentStep?.kind === "block" && (
          <BlockStep
            key={lesson.blocks[currentStep.blockIndex].id}
            blockId={lesson.blocks[currentStep.blockIndex].id}
            index={currentStep.blockIndex}
            total={totalBlocks}
            code={lesson.blocks[currentStep.blockIndex].code}
            explanation={lesson.blocks[currentStep.blockIndex].explanation}
            language={language}
            langLabel={langLabel}
            read={readSet.has(lesson.blocks[currentStep.blockIndex].id)}
            onMarkRead={markRead}
          />
        )}

        {currentStep?.kind === "checkpoint" && (
          <CheckpointStep
            chunkIndex={currentStep.chunkIndex}
            totalChunks={totalChunks}
            hasPractice={hasPractice}
            onOpenPractice={openPractice}
            onContinue={goNext}
          />
        )}

        {currentStep?.kind === "final" && (
          <FinalChallenge
            lesson={lesson}
            language={language}
            langLabel={langLabel}
            readPct={progressPercent}
            loggedIn={!!user}
          />
        )}
      </main>

      {/* Bài tập gợi ý — chỉ hiện ở step cuối */}
      {currentStep?.kind === "final" && lesson.exercises.length > 0 && (
        <section className="mt-10 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="h-5 w-5 text-primary" />
            Bài tập gợi ý
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Tham khảo, tự luyện ngoài giờ.
          </p>
          <ol className="mt-4 space-y-3">
            {lesson.exercises.map((e, i) => (
              <li key={e.id} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed">{e.prompt}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Nav buttons dưới */}
      <nav className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
        <button
          onClick={goPrev}
          disabled={stepIndex === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-2.5 text-sm font-medium backdrop-blur transition-all hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Trước
        </button>

        <span className="hidden text-[11px] text-muted-foreground sm:block">
          Mẹo: dùng phím <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px]">←</kbd>{" "}
          <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px]">→</kbd>{" "}
          để chuyển bước
        </span>

        {stepIndex < steps.length - 1 ? (
          <button
            onClick={goNext}
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-95"
          >
            Tiếp theo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        ) : (
          <Link
            to="/lessons"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/15"
          >
            <CheckCircle2 className="h-4 w-4" /> Hoàn tất bài học
          </Link>
        )}
      </nav>
    </CodeNovaLayout>
  );
}
