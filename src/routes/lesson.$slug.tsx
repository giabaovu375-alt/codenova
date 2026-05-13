import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Sparkles, Loader2, CheckCircle2, Trophy,
  Wand2, BookOpen, AlertCircle, RefreshCw
} from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { CodeBlock } from "@/components/CodeBlock";
import { lessonsStore, type Lesson, LANGUAGE_LABELS } from "@/lib/lessons-store";
import { explainCode, gradeSubmission, hasAnyKey } from "@/lib/ai";
import { progressStore } from "@/lib/progress-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/lesson/$slug")({
  component: LessonPage,
});

// ─── Components ──────────────────────────────────────

const SkeletonBlock = () => (
  <div className="mb-10 animate-pulse space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-6 w-32 rounded bg-secondary" />
      <div className="h-8 w-28 rounded bg-secondary" />
    </div>
    <div className="h-40 w-full rounded-lg bg-secondary" />
    <div className="h-4 w-3/4 rounded bg-secondary" />
  </div>
);

const BlockCard = React.memo(({
  index, code, explanation, language, read, onMarkRead
}: {
  index: number; code: string; explanation?: string; language: string;
  read: boolean; onMarkRead: () => void;
}) => {
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

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
    <article className="mb-10 scroll-mt-20">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Đoạn {index + 1}
          {read && <CheckCircle2 className="h-4 w-4 text-primary" />}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={ask}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs transition-all hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI giải thích
          </button>
          <button
            onClick={onMarkRead}
            disabled={read}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all ${
              read
                ? "bg-secondary text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {read ? "Đã đọc" : "Đánh dấu đã đọc"}
          </button>
        </div>
      </div>

      <CodeBlock code={code} language={language} />

      {explanation && (
        <p className="mt-3 border-l-2 border-primary/60 pl-3 text-sm text-muted-foreground">
          {explanation}
        </p>
      )}
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      {aiText && (
        <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm whitespace-pre-wrap animate-in fade-in slide-in-from-top-2">
          {aiText}
        </div>
      )}
    </article>
  );
});

const FinalChallenge = ({
  lesson, language, langLabel, readPct, loggedIn
}: {
  lesson: Lesson; language: string; langLabel: string; readPct: number; loggedIn: boolean;
}) => {
  const prompt = useMemo(
    () =>
      `Thử thách cuối bài "${lesson.title}" (${langLabel}, ${lesson.level}): Hãy viết một đoạn ${langLabel} ngắn áp dụng kiến thức vừa học. ` +
      `Yêu cầu: tự đặt một bài toán nhỏ liên quan đến chủ đề bài học, viết code giải nó, in/hiển thị kết quả. ` +
      `Code phải chạy được, có ít nhất 5 dòng, đặt tên biến rõ nghĩa.`,
    [lesson, langLabel],
  );

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string; optimized: string } | null>(null);
  const [err, setErr] = useState("");
  const submittedRef = useRef(false);

  const submit = async () => {
    if (!loggedIn) { setErr("Đăng nhập để nộp bài và cộng điểm."); return; }
    if (!hasAnyKey()) { setErr("Cần API key trong Cài đặt để AI chấm bài."); return; }
    if (code.trim().length < 10) { setErr("Code quá ngắn, hãy viết thêm."); return; }

    setErr("");
    setBusy(true);
    try {
      const r = await gradeSubmission(prompt, code, language);
      setResult(r);
      if (!submittedRef.current) {
        submittedRef.current = true;
        await progressStore.addAttempt(lesson.slug, "final", r.score, r.feedback, code);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-16 rounded-lg border-2 border-primary/40 bg-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Thử thách cuối bài</h2>
        <span className="ml-auto text-xs text-muted-foreground">Tối đa 10 điểm · {langLabel}</span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{prompt}</p>
      {readPct < 100 && (
        <p className="mt-2 text-xs text-amber-600">
          Bạn mới đọc {readPct}% bài học. Không bắt buộc, nhưng đọc kỹ trước khi làm sẽ giúp điểm cao hơn.
        </p>
      )}

      <textarea
        value={code}
        onChange={e => setCode(e.target.value)}
        spellCheck={false}
        placeholder={`// Viết code ${langLabel} của bạn ở đây...`}
        className="mt-4 h-56 w-full rounded-md border border-border bg-[oklch(0.13_0_0)] p-4 font-mono text-sm text-[oklch(0.95_0_0)] focus:border-primary focus:outline-none transition-all"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Nộp bài & AI chấm
        </button>
        {!loggedIn && (
          <Link to="/login" className="text-sm text-primary hover:underline">
            Đăng nhập để cộng điểm →
          </Link>
        )}
        {err && <span className="text-sm text-destructive">{err}</span>}
      </div>

      {result && (
        <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-baseline gap-3 rounded-md border border-primary/40 bg-primary/10 p-4">
            <span className="text-3xl font-bold text-primary">{result.score}</span>
            <span className="text-sm text-muted-foreground">/ 10 điểm</span>
            {submittedRef.current && (
              <span className="ml-auto text-xs text-muted-foreground">Đã lưu vào hồ sơ</span>
            )}
          </div>
          {result.feedback && (
            <div>
              <h4 className="mb-1 text-sm font-medium">Nhận xét của AI</h4>
              <div className="rounded-md border border-border bg-background p-3 text-sm whitespace-pre-wrap">
                {result.feedback}
              </div>
            </div>
          )}
          {result.optimized && result.optimized !== code && (
            <div>
              <h4 className="mb-1 text-sm font-medium">Bản tối ưu gợi ý</h4>
              <CodeBlock code={result.optimized} language={language} />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

// ─── Main Page ────────────────────────────────────────
function LessonPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  // Fetch bài học từ Supabase (async)
  const fetchLesson = useCallback(async () => {
    try {
      setLoading(true);
      const data = await lessonsStore.getAsync(slug);
      if (!data) throw notFound();
      setLesson(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải bài học.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  // Load tiến độ đã lưu
  useEffect(() => {
    if (!user || !lesson) return;
    progressStore.get(slug).then(p => {
      if (!p) return;
      const ids = lesson.blocks.slice(0, p.blocks_read).map(b => b.id);
      setReadSet(new Set(ids));
    });
  }, [user, lesson, slug]);

  // Lưu tiến độ
  useEffect(() => {
    if (!user || !lesson) return;
    progressStore.setBlocksRead(slug, readSet.size, lesson.blocks.length);
  }, [readSet, user, lesson, slug]);

  const markRead = (id: string) => {
    setReadSet(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // States xử lý giao diện
  if (loading) {
    return (
      <CodeNovaLayout>
        <div className="py-12 space-y-8 animate-pulse">
          <div className="h-8 w-48 rounded bg-secondary" />
          <div className="h-12 w-3/4 rounded bg-secondary" />
          <div className="h-96 w-full rounded-lg bg-secondary" />
          <SkeletonBlock /><SkeletonBlock />
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
          <button onClick={fetchLesson} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      </CodeNovaLayout>
    );
  }

  if (!lesson) return null; // Bảo vệ an toàn

  const totalBlocks = lesson.blocks.length;
  const completedBlocks = readSet.size;
  const progressPercent = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;
  const language = lesson.language ?? "javascript";
  const langLabel = LANGUAGE_LABELS[language] || language.toUpperCase();

  return (
    <CodeNovaLayout>
      <Link
        to="/lessons"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Tất cả bài học
      </Link>

      <header className="mb-10 border-b border-border pb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="rounded bg-secondary px-2.5 py-0.5 text-xs font-medium">{lesson.level}</span>
          <span className="rounded bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">{langLabel}</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight">{lesson.title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">{lesson.description}</p>

        {lesson.image && (
          <img
            src={lesson.image}
            alt={lesson.title}
            loading="lazy"
            className="mt-6 max-h-80 w-full rounded-lg border border-border object-cover shadow-sm"
          />
        )}

        {/* Progress bar */}
        <div className="mt-6 rounded-md border border-border bg-card/80 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Tiến độ tự đánh dấu: <span className="font-medium text-foreground">{completedBlocks}/{totalBlocks}</span> đoạn
              {!user && <span className="ml-2 text-amber-600">(Đăng nhập để lưu)</span>}
            </span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Tự đọc, tự đánh dấu — không bắt buộc. Quan trọng là bạn thật sự hiểu trước khi làm thử thách.
          </p>
        </div>
      </header>

      <div className="space-y-10">
        {lesson.blocks.map((b, i) => (
          <BlockCard
            key={b.id}
            index={i}
            code={b.code}
            explanation={b.explanation}
            language={language}
            read={readSet.has(b.id)}
            onMarkRead={() => markRead(b.id)}
          />
        ))}
      </div>

      {/* Bài tập gợi ý */}
      {lesson.exercises.length > 0 && (
        <section className="mt-16 rounded-lg border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <BookOpen className="h-5 w-5 text-primary" />
            Bài tập gợi ý
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Tham khảo, tự luyện ngoài giờ.</p>
          <ol className="mt-4 space-y-3">
            {lesson.exercises.map((e, i) => (
              <li key={e.id} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm">{e.prompt}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

            {/* Thử thách cuối bài */}
      <FinalChallenge
        lesson={lesson}
        language={language}
        langLabel={langLabel}
        readPct={progressPercent}
        loggedIn={!!user}
      />
    </CodeNovaLayout>
  );
}

// Đảm bảo không có dấu ngoặc nào sau dòng này
