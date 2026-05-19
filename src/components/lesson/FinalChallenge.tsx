import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Trophy, Wand2, Loader2, Sparkles, CheckCircle2,
  Star, AlertCircle, Zap, BookOpen, Code2, ArrowRight
} from "lucide-react";
import { CodeBlock } from "@/components/CodeBlock";
import { gradeSubmission, hasAnyKey } from "@/lib/ai";
import { progressStore } from "@/lib/progress-store";
import type { Lesson } from "@/lib/lessons-store";

type Props = {
  lesson: Lesson;
  language: string;
  langLabel: string;
  readPct: number;
  loggedIn: boolean;
  onMarkAllRead?: () => void;
};

export const FinalChallenge = ({
  lesson,
  language,
  langLabel,
  readPct,
  loggedIn,
  onMarkAllRead,
}: Props) => {
  const prompt = useMemo(
    () => `Thử thách cuối bài "${lesson.title}" (${langLabel}, ${lesson.level}): Hãy viết một đoạn ${langLabel} ngắn áp dụng kiến thức vừa học. Yêu cầu: tự đặt một bài toán nhỏ liên quan đến chủ đề bài học, viết code giải nó, in/hiển thị kết quả. Code phải chạy được, có ít nhất 5 dòng, đặt tên biến rõ nghĩa.`,
    [lesson, langLabel]
  );

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string; optimized: string } | null>(null);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    submittedRef.current = false;
    setSaved(false);
    setResult(null);
    setCode("");
    setErr("");
  }, [lesson.slug]);

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
        await Promise.all([
          progressStore.addAttempt(lesson.slug, "final", r.score, r.feedback, code),
          progressStore.setBlocksRead(lesson.slug, lesson.blocks.length, lesson.blocks.length),
        ]);
        setSaved(true);
        onMarkAllRead?.();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const scoreColor = result?.score && result.score >= 8 ? "text-emerald-500" : result?.score && result.score >= 5 ? "text-amber-500" : "text-destructive";

  return (
    <section className="animate-in fade-in zoom-in-95 duration-300 overflow-hidden rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 md:p-8 shadow-xl">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><Trophy className="h-5 w-5" /></div>
        <h2 className="text-2xl font-bold tracking-tight">Thử thách cuối bài</h2>
        <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">Tối đa 10 điểm · {langLabel}</span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{prompt}</p>
      {readPct < 100 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-600">
          <Zap className="h-3.5 w-3.5 shrink-0" /> Bạn mới đọc {readPct}% bài học. Đọc kỹ trước khi làm sẽ giúp điểm cao hơn — nhưng không bắt buộc.
        </div>
      )}

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        placeholder={`// Viết code ${langLabel} của bạn ở đây...`}
        className="mt-5 h-64 w-full resize-y rounded-xl border border-border bg-[oklch(0.13_0_0)] p-4 font-mono text-sm leading-relaxed text-[oklch(0.95_0_0)] shadow-inner outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-95 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {busy ? "AI đang chấm..." : "Nộp bài & AI chấm"}
        </button>
        {!loggedIn && <Link to="/login" className="text-sm text-primary hover:underline">Đăng nhập để cộng điểm →</Link>}
        {err && <span className="inline-flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {err}</span>}
      </div>

      {result && (
        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 to-primary/5 p-5">
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-black ${scoreColor}`}>{result.score}</span>
              <span className="text-sm text-muted-foreground">/ 10</span>
            </div>
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className={`h-full rounded-full transition-all duration-700 ${result.score >= 8 ? "bg-emerald-500" : result.score >= 5 ? "bg-amber-500" : "bg-destructive"}`} style={{ width: `${result.score * 10}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {result.score >= 8 ? "🎉 Xuất sắc! Bạn đã nắm vững bài học." : result.score >= 5 ? "👍 Khá tốt! Tiếp tục luyện thêm nhé." : "💪 Cố gắng hơn lần sau nhé!"}
              </p>
            </div>
            {saved && (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" /> Đã lưu
              </div>
            )}
          </div>

          {result.feedback && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Star className="h-4 w-4 text-amber-500" /> Nhận xét của AI</h4>
              <div className="rounded-xl border border-border bg-background p-4 text-sm leading-relaxed whitespace-pre-wrap">{result.feedback}</div>
            </div>
          )}
          {result.optimized && result.optimized !== code && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Bản tối ưu gợi ý</h4>
              <CodeBlock code={result.optimized} language={language} />
            </div>
          )}
        </div>
      )}
    </section>
  );
};
