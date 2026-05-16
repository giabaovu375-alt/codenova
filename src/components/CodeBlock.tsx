import { useMemo, useState } from "react";
import { Copy, Check, Code, ArrowRight, Sparkles, RotateCcw } from "lucide-react";
import { LANGUAGE_LABELS } from "@/lib/lessons-store";

/* ============================================================
 * CodeBlock — card trắng, code + giải thích nằm dưới
 * Layout hàng ngang (code chiếm hết bề rộng card, explain bên dưới)
 * ============================================================ */
export function CodeBlock({
  code,
  language = "python",
  explanation,
  title,
}: {
  code: string;
  language?: string;
  explanation?: React.ReactNode;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  const displayLabel = useMemo(() => {
    if (language && language in LANGUAGE_LABELS) {
      return LANGUAGE_LABELS[language as keyof typeof LANGUAGE_LABELS];
    }
    return language ? language.charAt(0).toUpperCase() + language.slice(1) : "Code";
  }, [language]);

  return (
    <div className="group w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      {/* Title */}
      {title && (
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-foreground">
          {title}
        </div>
      )}

      {/* Code on top */}
      <div className="relative">
        <div className="flex items-center justify-between border-b border-white/10 bg-[oklch(0.13_0_0)] px-3 py-1.5 text-xs font-medium text-[oklch(0.95_0_0)]">
          <span className="inline-flex items-center gap-1.5 text-white/70">
            <Code className="h-3.5 w-3.5 text-primary/70" />
            {displayLabel}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="inline-flex items-center gap-1 text-white/60 transition-colors hover:text-primary"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Chép</span>
              </>
            )}
          </button>
        </div>
        <pre className="overflow-x-auto bg-[oklch(0.13_0_0)] p-4 text-sm leading-relaxed text-[oklch(0.95_0_0)]">
          <code>{code}</code>
        </pre>
      </div>

      {/* Explanation below */}
      {explanation && (
        <div className="border-t border-border bg-background px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {explanation}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * CodeLessonCarousel
 * - Nhận 1 list các snippet
 * - "Tiếp theo" để nhảy qua snippet kế
 * - Mỗi `challengeEvery` snippet (mặc định 3) sẽ chèn 1 card
 *   "Thử thách bài tập?" — bấm vào để mở exercise.
 * ============================================================ */
export type CodeSnippet = {
  code: string;
  language?: string;
  title?: string;
  explanation?: React.ReactNode;
};

function ExplanationCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground shadow-sm">
      {children}
    </div>
  );
}

function ChallengeCard({
  label,
  hint,
  onStart,
}: {
  label: string;
  hint: string;
  onStart: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-3 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background p-5 shadow-sm">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        Checkpoint
      </div>
      <h3 className="text-lg font-semibold text-foreground">{label}</h3>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <button
        onClick={onStart}
        className="mt-1 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
      >
        Vào làm bài tập
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function CodeLessonCarousel({
  snippets,
  challengeEvery = 3,
  onStartChallenge,
  challengeLabel = "Thử thách bài tập?",
  challengeHint = "Áp dụng những gì vừa học để giải nhanh nha 👇",
}: {
  snippets: CodeSnippet[];
  challengeEvery?: number;
  onStartChallenge?: (checkpointIndex: number) => void;
  challengeLabel?: string;
  challengeHint?: string;
}) {
  // Sequence: snippet, snippet, snippet, CHALLENGE, snippet, snippet, snippet, CHALLENGE...
  const sequence = useMemo(() => {
    const out: Array<
      | { kind: "code"; snippet: CodeSnippet; index: number }
      | { kind: "challenge"; checkpoint: number }
    > = [];
    snippets.forEach((s, i) => {
      out.push({ kind: "code", snippet: s, index: i });
      const isCheckpoint = (i + 1) % challengeEvery === 0;
      if (isCheckpoint) {
        out.push({ kind: "challenge", checkpoint: Math.floor(i / challengeEvery) });
      }
    });
    return out;
  }, [snippets, challengeEvery]);

  const [step, setStep] = useState(0);
  const current = sequence[step];
  const isLast = step >= sequence.length - 1;

  const codeStepsTotal = snippets.length;
  const codeStepsDone =
    sequence.slice(0, step + 1).filter((s) => s.kind === "code").length;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Đoạn {Math.min(codeStepsDone, codeStepsTotal)} / {codeStepsTotal}
        </span>
        <div className="flex flex-1 mx-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((step + 1) / sequence.length) * 100}%` }}
          />
        </div>
        <span>{step + 1}/{sequence.length}</span>
      </div>

      {/* Current card */}
      {current?.kind === "code" ? (
        current.snippet.code.trim() ? (
          <CodeBlock
            code={current.snippet.code}
            language={current.snippet.language}
            title={current.snippet.title}
            explanation={current.snippet.explanation}
          />
        ) : (
          <ExplanationCard>
            {current.snippet.explanation || current.snippet.title || ""}
          </ExplanationCard>
        )
      ) : (
        <ChallengeCard
          label={challengeLabel}
          hint={challengeHint}
          onStart={() => onStartChallenge?.(current?.checkpoint ?? 0)}
        />
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(0)}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Bắt đầu lại
        </button>

        {!isLast ? (
          <button
            onClick={() => setStep((s) => Math.min(s + 1, sequence.length - 1))}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Tiếp theo
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">Hết bài rồi 🎉</span>
        )}
      </div>
    </div>
  );
}
