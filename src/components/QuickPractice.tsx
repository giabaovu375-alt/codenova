import { useState } from "react";
import { CodeBlock } from "@/components/CodeBlock";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";

type Question = {
  question: string;
  options: string[];
  answer: number; // index đáp án đúng
};

type Props = {
  code: string;
  language: string;
  questions: Question[];
};

export function QuickPractice({ code, language, questions }: Props) {
  const [step, setStep] = useState<"code" | number>("code"); // "code" hoặc index câu hỏi
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (step === "code") {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold">📘 Đoạn code mẫu</h3>
        <CodeBlock code={code} language={language} />
        <button
          onClick={() => {
            setStep(0);
            setSelected(null);
            setSubmitted(false);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Bắt đầu câu hỏi <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const q = questions[step as number];
  if (!q) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
        <p className="mt-3 font-semibold">Bạn đã hoàn thành tất cả câu hỏi!</p>
        <button
          onClick={() => setStep("code")}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Xem lại code
        </button>
      </div>
    );
  }

  const isCorrect = submitted && selected === q.answer;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Câu {(step as number) + 1} / {questions.length}</span>
        <button
          onClick={() => setStep("code")}
          className="text-primary hover:underline"
        >
          Xem lại code
        </button>
      </div>

      <p className="text-sm font-medium">{q.question}</p>

      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => {
              if (!submitted) setSelected(i);
            }}
            disabled={submitted}
            className={`w-full rounded-md border px-4 py-2 text-left text-sm transition-all ${
              submitted && i === q.answer
                ? "border-green-500/60 bg-green-500/10 text-green-700 dark:text-green-400"
                : submitted && i === selected
                  ? "border-destructive/60 bg-destructive/10 text-destructive"
                  : selected === i
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-secondary/50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {!submitted ? (
        <button
          onClick={() => setSubmitted(true)}
          disabled={selected === null}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Kiểm tra
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {isCorrect ? (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" /> Đúng!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-destructive">
              <XCircle className="h-4 w-4" /> Sai! Đáp án đúng là: {q.options[q.answer]}
            </span>
          )}
          <button
            onClick={() => {
              if ((step as number) < questions.length - 1) {
                setStep((step as number) + 1);
              } else {
                setStep("code"); // hoặc thông báo hoàn thành
              }
              setSelected(null);
              setSubmitted(false);
            }}
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            { (step as number) < questions.length - 1 ? "Câu tiếp theo" : "Hoàn thành" }
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
