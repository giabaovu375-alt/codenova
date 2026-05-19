// src/routes/lesson.$slug.tsx — Premium Stepper (Fixed Progress Saving)
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
  Loader2,
  AlertCircle,
  RefreshCw,
  Dumbbell,
  Flag,
  ChevronLeft,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore, type Lesson, LANGUAGE_LABELS } from "@/lib/lessons-store";
import { progressStore, type LessonProgress } from "@/lib/progress-store";
import { useAuth } from "@/lib/auth";
import { PracticeMode } from "@/components/PracticeMode";
import { getPracticeLesson } from "@/lib/practice-store";
import type { PracticeLesson } from "@/components/practice/types";
import { BlockStep } from "@/components/lesson/BlockStep";
import { FinalChallenge } from "@/components/lesson/FinalChallenge";

export const Route = createFileRoute("/lesson/$slug")({
  component: LessonPage,
});

const CHUNK_SIZE = 3;

type Step =
  | { kind: "block"; blockIndex: number; chunkIndex: number }
  | { kind: "checkpoint"; chunkIndex: number; afterBlockIndex: number }
  | { kind: "final" };

// ─── Skeleton Loading ───────────────────────────────
const SkeletonStep = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-2 w-full rounded-full bg-secondary" />
    <div className="h-8 w-1/3 rounded bg-secondary" />
    <div className="h-64 w-full rounded-2xl bg-secondary" />
    <div className="h-4 w-3/4 rounded bg-secondary" />
  </div>
);

// ─── Main Lesson Page ───────────────────────────────
function LessonPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"lesson" | "practice">("lesson");
  const [practiceLesson, setPracticeLesson] = useState<PracticeLesson | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  // Cờ đánh dấu đã hoàn thành, tránh ghi đè
  const isCompletedRef = useRef(false);
  // ✅ THÊM: Lưu dữ liệu progress gốc để preserve best_score và completed_at
  const savedProgressRef = useRef<LessonProgress | null>(null);

  // ── Fetch Lesson + Practice ──────────────────────
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
        } catch { if (!cancelled) setPracticeLesson(null); }
      }
    } catch (err: any) {
      if (!cancelled) {
        if (err?.isNotFound || err?.status === 404) throw err;
        setError(err.message || "Không thể tải bài học.");
      }
    } finally { if (!cancelled) setLoading(false); }
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => { fetchLesson(); }, [fetchLesson]);

  // ── Reset state khi đổi bài ──────────────────────
  useEffect(() => {
    setStepIndex(0);
    setViewMode("lesson");
    setReadSet(new Set());
    isCompletedRef.current = false;
    savedProgressRef.current = null; // ✅ Reset ref khi đổi bài
  }, [slug]);

  // ── Load tiến độ từ Supabase ─────────────────────
  useEffect(() => {
    if (!user || !lesson) return;
    let cancelled = false;
    progressStore.get(slug).then((p) => {
      if (cancelled || !p) return;
      // ✅ LƯU vào ref để dùng sau khi save
      savedProgressRef.current = p;
      const ids = lesson.blocks.slice(0, p.blocks_read).map((b) => b.id);
      setReadSet(new Set(ids));
      if (p.completed) {
        isCompletedRef.current = true;
      }
    });
    return () => { cancelled = true; };
  }, [user, lesson, slug]);

  // ── FIXED: saveProgress — truyền preserveBestScore và preserveCompletedAt ───
  const saveProgress = useCallback(
    (size: number, total: number) => {
      if (!user || !lesson) return;
      // Guard: nếu đã hoàn thành thì không ghi đè
      if (isCompletedRef.current) return;

      // ✅ Lấy dữ liệu từ ref để preserve
      const preservedScore = savedProgressRef.current?.best_score ?? 0;
      const preservedCompletedAt = savedProgressRef.current?.completed_at ?? null;

      // ✅ Gọi API mới với opts
      progressStore.setBlocksRead(slug, size, total, {
        preserveBestScore: preservedScore,
        preserveCompletedAt: preservedCompletedAt,
      });

      // ✅ Set cờ AFTER khi đủ điều kiện
      if (size >= total) {
        isCompletedRef.current = true;
      }
    },
    [user, lesson, slug]
  );

  // ── FIX: markRead — KHÔNG gọi side-effect trong setState ──
  const markRead = useCallback(
    (id: string) => {
      setReadSet((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next; // ✅ Chỉ return state mới, không có side-effect
      });
    },
    [] // ✅ Không cần deps vì không dùng gì ngoài setter
  );

  // ── FIX: useEffect theo dõi readSet để lưu progress ──
  useEffect(() => {
    if (!user || !lesson) return;
    if (readSet.size === 0) return; // Bỏ qua lần khởi tạo rỗng
    saveProgress(readSet.size, lesson.blocks.length);
  }, [readSet]); // ✅ Chỉ fire khi readSet thực sự thay đổi

  const markAllRead = useCallback(() => {
    if (!lesson) return;
    const allIds = new Set(lesson.blocks.map((b) => b.id));
    setReadSet(allIds);
    // ✅ Lưu trực tiếp ở đây, preserve dữ liệu từ ref
    if (!isCompletedRef.current) {
      const preservedScore = savedProgressRef.current?.best_score ?? 0;
      const preservedCompletedAt = savedProgressRef.current?.completed_at ?? null;
      progressStore.setBlocksRead(slug, lesson.blocks.length, lesson.blocks.length, {
        preserveBestScore: preservedScore,
        preserveCompletedAt: preservedCompletedAt,
      });
      isCompletedRef.current = true;
    }
  }, [lesson, slug]);

  // ── Stepper Logic ────────────────────────────────
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
        out.push({ kind: "checkpoint", chunkIndex, afterBlockIndex: i });
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

  // ── Keyboard Navigation ──────────────────────────
  useEffect(() => {
    if (viewMode !== "lesson") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "ArrowRight") setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      else if (e.key === "ArrowLeft") setStepIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps.length, viewMode]);

  // ── Scroll to top when step changes ──────────────
  useEffect(() => {
    if (viewMode === "lesson") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIndex, viewMode]);

  // ── Loading State ────────────────────────────────
  if (loading) {
    return (
      <CodeNovaLayout>
        <div className="py-12"><SkeletonStep /></div>
      </CodeNovaLayout>
    );
  }

  // ── Error State ──────────────────────────────────
  if (error) {
    return (
      <CodeNovaLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive/70 mb-4" />
          <p className="text-muted-foreground">{error}</p>
          <button onClick={fetchLesson} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      </CodeNovaLayout>
    );
  }

  if (!lesson) return null;

  // ── Derived Data ─────────────────────────────────
  const totalBlocks = lesson.blocks.length;
  const completedBlocks = readSet.size;
  const progressPercent = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;
  const language = lesson.language ?? "javascript";
  const langLabel = LANGUAGE_LABELS[language] || language.toUpperCase();
  const hasPractice = practiceLesson !== null;
  const stepperPct = steps.length > 1 ? Math.round((stepIndex / (steps.length - 1)) * 100) : 0;
  const currentStep = steps[stepIndex];

  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));
  const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const openPractice = () => setViewMode("practice");

  // ── Practice Mode View ───────────────────────────
  if (viewMode === "practice" && hasPractice) {
    return (
      <CodeNovaLayout>
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => setViewMode("lesson")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
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

  // ── Main Lesson View ─────────────────────────────
  return (
    <CodeNovaLayout>
      {/* Sticky header with progress */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between gap-3">
          <Link to="/lessons" className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Tất cả bài học
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-secondary px-2 py-0.5 font-medium text-foreground">{lesson.level}</span>
            <span className="rounded bg-primary/15 px-2 py-0.5 font-medium text-primary">{langLabel}</span>
            {hasPractice && (
              <button onClick={openPractice} className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium hover:bg-secondary hover:text-foreground">
                <Dumbbell className="h-3 w-3" /> Luyện tập
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Bước <span className="font-medium text-foreground">{stepIndex + 1}</span> / {steps.length}</span>
            <span>Đã đọc {completedBlocks}/{totalBlocks} · {progressPercent}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500 ease-out" style={{ width: `${stepperPct}%` }} />
          </div>
          {/* Dots navigation */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {steps.map((s, i) => {
              const active = i === stepIndex;
              const done = i < stepIndex;
              const base = "h-2 rounded-full transition-all duration-300 cursor-pointer";
              let cls = "";
              if (s.kind === "checkpoint") {
                cls = active ? "w-6 bg-primary ring-2 ring-primary/30" : done ? "w-4 bg-primary/70" : "w-4 bg-amber-400/60 hover:bg-amber-400";
              } else if (s.kind === "final") {
                cls = active ? "w-8 bg-primary ring-2 ring-primary/30" : done ? "w-6 bg-primary/70" : "w-6 bg-secondary hover:bg-foreground/30";
              } else {
                cls = active ? "w-5 bg-primary" : done ? "w-3 bg-primary/60" : "w-3 bg-secondary hover:bg-foreground/30";
              }
              return <button key={i} aria-label={`Đi tới bước ${i + 1}`} onClick={() => setStepIndex(i)} className={`${base} ${cls}`} />;
            })}
          </div>
        </div>
      </div>

      {/* Title (only on first step) */}
      {stepIndex === 0 && (
        <header className="mb-8 animate-in fade-in slide-in-from-top-2">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{lesson.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">{lesson.description}</p>
          {lesson.image && (
            <img src={lesson.image} alt={lesson.title} loading="lazy" className="mt-5 max-h-72 w-full rounded-2xl border border-border object-cover shadow-sm" />
          )}
        </header>
      )}

      {/* Main content */}
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
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-card to-card p-8 shadow-lg">
              <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
              <div className="relative">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Flag className="h-3.5 w-3.5" /> Checkpoint {currentStep.chunkIndex + 1}/{totalChunks}
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Sẵn sàng thực hiện thử thách?</h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Bạn vừa hoàn thành một phần bài học. Hãy luyện tập ngay để khắc sâu kiến thức — vận dụng tốt hơn lý thuyết suông gấp 10 lần.</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {hasPractice ? (
                    <button onClick={openPractice} className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-95">
                      <Dumbbell className="h-4 w-4" /> Thực hiện thử thách <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
                      <AlertCircle className="h-3.5 w-3.5" /> Bài này chưa có dữ liệu luyện tập
                    </span>
                  )}
                  <button onClick={goNext} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-4 py-2.5 text-sm font-medium backdrop-blur transition-all hover:border-foreground/30">
                    Học tiếp <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep?.kind === "final" && (
          <>
            <FinalChallenge
              lesson={lesson}
              language={language}
              langLabel={langLabel}
              readPct={progressPercent}
              loggedIn={!!user}
              onMarkAllRead={markAllRead}
            />
            {lesson.exercises.length > 0 && (
              <section className="mt-10 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><BookOpen className="h-5 w-5 text-primary" /> Bài tập gợi ý</h2>
                <p className="mt-1 text-xs text-muted-foreground">Tham khảo, tự luyện ngoài giờ.</p>
                <ol className="mt-4 space-y-3">
                  {lesson.exercises.map((e, i) => (
                    <li key={e.id} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">{i + 1}</span>
                      <p className="pt-0.5 text-sm leading-relaxed">{e.prompt}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}
      </main>

      {/* Navigation buttons */}
      <nav className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
        <button onClick={goPrev} disabled={stepIndex === 0} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-2.5 text-sm font-medium backdrop-blur transition-all hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-40">
          <ArrowLeft className="h-4 w-4" /> Trước
        </button>

        <span className="hidden text-[11px] text-muted-foreground sm:block">
          Mẹo: dùng phím <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px]">←</kbd> <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px]">→</kbd> để chuyển bước
        </span>

        {stepIndex < steps.length - 1 ? (
          <button onClick={goNext} className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-95">
            Tiếp theo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        ) : (
          <Link to="/lessons" className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/15">
            <CheckCircle2 className="h-4 w-4" /> Hoàn tất bài học
          </Link>
        )}
      </nav>
    </CodeNovaLayout>
  );
}
