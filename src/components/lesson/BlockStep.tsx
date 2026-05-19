import React, { useState, useEffect } from "react";
import {
  Loader2, Sparkles, CheckCircle2, BookOpen, Code2, AlertCircle
} from "lucide-react";
import { CodeBlock } from "@/components/CodeBlock";
import { explainCode, hasAnyKey } from "@/lib/ai";

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

export const BlockStep = React.memo(function BlockStep({
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

  // Tự động đánh dấu đã đọc sau 0.6 giây
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
    <article className="animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/20">
            {index + 1}
          </span>
          <div>
            <h3 className="text-sm font-medium leading-tight">
              Đoạn {index + 1} <span className="text-muted-foreground">/ {total}</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">{langLabel} · ví dụ tương tác</p>
          </div>
          {read && <CheckCircle2 className="h-4 w-4 text-primary" />}
        </div>

        <button
          onClick={ask}
          disabled={loading}
          className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium backdrop-blur transition-all hover:border-primary/60 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />}
          AI giải thích
        </button>
      </div>

      {/* Code block */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card/40 shadow-sm ring-1 ring-black/[0.02] backdrop-blur">
        <div className="flex items-center gap-2 border-b border-border/70 bg-secondary/40 px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Code2 className="h-3 w-3" /> example.{language}
          </span>
        </div>
        <CodeBlock code={code} language={language} />
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-sm leading-relaxed text-foreground/90">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <BookOpen className="h-3 w-3" /> Giải thích
          </div>
          {explanation}
        </div>
      )}

      {/* Error / AI response */}
      {err && <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {err}</p>}
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
