import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, Trophy, Wand2 } from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { CodeBlock } from "@/components/CodeBlock";
import { lessonsStore, type Lesson, LANGUAGE_LABEL } from "@/lib/lessons-store";
import { explainCode, gradeSubmission, hasAnyKey } from "@/lib/ai";
import { progressStore } from "@/lib/progress-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/lesson/$slug")({
  component: LessonPage,
});

function LessonPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const l = lessonsStore.get(slug);
    if (!l) throw notFound();
    setLesson(l);
  }, [slug]);

  // Load saved progress
  useEffect(() => {
    if (!user || !lesson) return;
    progressStore.get(slug).then(p => {
      if (!p) return;
      // We can't know which specific blocks were read, but mark first N as read
      const ids = lesson.blocks.slice(0, p.blocks_read).map(b => b.id);
      setReadSet(new Set(ids));
    });
  }, [user, lesson, slug]);

  // Persist progress when readSet changes
  useEffect(() => {
    if (!user || !lesson) return;
    progressStore.setBlocksRead(slug, readSet.size, lesson.blocks.length);
  }, [readSet, user, lesson, slug]);

  function markRead(id: string) {
    setReadSet(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  if (!lesson)
    return (
      <CodeNovaLayout>
        <div className="py-20 text-center text-muted-foreground">Đang tải…</div>
      </CodeNovaLayout>
    );

  const total = lesson.blocks.length;
  const done = readSet.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const language = lesson.language ?? "python";
  const langLabel = LANGUAGE_LABEL[language];

  return (
    <CodeNovaLayout>
      <Link to="/lessons" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tất cả bài học
      </Link>
      <header className="mb-8 border-b border-border pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-secondary px-2 py-0.5 text-xs">{lesson.level}</span>
          <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">{langLabel}</span>
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{lesson.title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{lesson.description}</p>
        {lesson.image && (
          <img src={lesson.image} alt={lesson.title} className="mt-6 max-h-80 w-full rounded-lg border border-border object-cover" />
        )}

        {/* Progress bar */}
        <div className="mt-6 rounded-md border border-border bg-card p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Tiến độ tự đánh dấu: <span className="font-medium text-foreground">{done}/{total}</span> đoạn
              {!user && <span className="ml-2 text-amber-600">(Đăng nhập để lưu)</span>}
            </span>
            <span className="font-medium">{pct}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
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

      {/* Existing exercises section */}
      {lesson.exercises.length > 0 && (
        <section className="mt-16 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold">Bài tập gợi ý</h2>
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

      {/* Final challenge — always available, success depends on user effort */}
      <FinalChallenge
        lesson={lesson}
        language={language}
        langLabel={langLabel}
        readPct={pct}
        loggedIn={!!user}
      />
    </CodeNovaLayout>
  );
}

function BlockCard({
  index,
  code,
  explanation,
  language,
  read,
  onMarkRead,
}: {
  index: number;
  code: string;
  explanation?: string;
  language: string;
  read: boolean;
  onMarkRead: () => void;
}) {
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function ask() {
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
  }

  return (
    <article>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Đoạn {index + 1}
          {read && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={ask}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI giải thích
          </button>
          <button
            onClick={onMarkRead}
            disabled={read}
            className={
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs " +
              (read
                ? "bg-secondary text-muted-foreground"
                : "bg-primary text-primary-foreground hover:opacity-90")
            }
          >
            {read ? "Đã đọc" : "Đánh dấu đã đọc"}
          </button>
        </div>
      </div>
      <CodeBlock code={code} language={language} />
      {explanation && (
        <p className="mt-3 border-l-2 border-primary/60 pl-3 text-sm text-muted-foreground">{explanation}</p>
      )}
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      {aiText && (
        <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-4 text-sm whitespace-pre-wrap">
          {aiText}
        </div>
      )}
    </article>
  );
}

function FinalChallenge({
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
}) {
  // Build a deterministic challenge prompt from the lesson topic
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

  async function submit() {
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
        await progressStore.addAttempt(lesson.slug, "final", r.score, r.feedback, code);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-lg border-2 border-primary/40 bg-card p-6">
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
        placeholder={`// Viết code ${langLabel} của bạn ở đây`}
        className="mt-4 h-56 w-full rounded-md border border-border bg-[oklch(0.13_0_0)] p-4 font-mono text-sm text-[oklch(0.95_0_0)] focus:border-primary focus:outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
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
        <div className="mt-5 space-y-4">
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
}
