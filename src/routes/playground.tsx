import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  Loader2,
  Sparkles,
  Wrench,
  Play,
  Copy,
  RotateCcw,
  Terminal,
  Check,
} from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { explainCode, fixCode, hasAnyKey, PROVIDERS, getApiKey } from "@/lib/ai";
import { runPython } from "@/lib/pyodide-runner";

export const Route = createFileRoute("/playground")({
  head: () => ({ meta: [{ title: "AI Playground — Code Nova" }] }),
  component: Playground,
});

type LangId = "javascript" | "html" | "css" | "python" | "cpp" | "java";

const LANGS: { id: LangId; name: string; monaco: string; runnable: boolean }[] = [
  { id: "javascript", name: "JavaScript", monaco: "javascript", runnable: true },
  { id: "html", name: "HTML", monaco: "html", runnable: true },
  { id: "css", name: "CSS", monaco: "css", runnable: true },
  { id: "python", name: "Python", monaco: "python", runnable: true },
  { id: "cpp", name: "C++", monaco: "cpp", runnable: false },
  { id: "java", name: "Java", monaco: "java", runnable: false },
];

const STARTERS: Record<LangId, string> = {
  javascript: `// JavaScript — chạy trực tiếp trong sandbox
function greet(name) {
  console.log("Hi " + name);
}
greet("Nova");`,
  html: `<!doctype html>
<html>
  <body style="font-family:sans-serif;background:#0a0a0f;color:#fff;padding:24px">
    <h1>Hello from <span style="color:#a78bfa">Code Nova</span></h1>
    <p>Sửa HTML rồi bấm Chạy để xem preview.</p>
  </body>
</html>`,
  css: `body { background: #0a0a0f; color: white; font-family: sans-serif; }
h1 { color: #a78bfa; }`,
  python: `def greet(name):
    print(f"Hi {name}")

greet("Nova")`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++" << endl;
    return 0;
}`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java");
    }
}`,
};

function Playground() {
  const [lang, setLang] = useState<LangId>("javascript");
  const [codeMap, setCodeMap] = useState<Record<LangId, string>>(STARTERS);
  const [problem, setProblem] = useState("");
  const [aiOut, setAiOut] = useState("");
  const [runOut, setRunOut] = useState("");
  const [runErr, setRunErr] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [loading, setLoading] = useState<"" | "fix" | "explain" | "run">("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [pyReady, setPyReady] = useState(false);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const code = codeMap[lang];
  const setCode = (v: string) => setCodeMap((m) => ({ ...m, [lang]: v }));
  const langMeta = useMemo(() => LANGS.find((l) => l.id === lang)!, [lang]);

  // Khởi động Pyodide ngầm khi chọn Python
  useState(() => {
    if (lang === "python" && !pyReady) {
      import("@/lib/pyodide-runner")
        .then((m) => m.getPyodide())
        .then(() => setPyReady(true))
        .catch(() => setRunErr("Không thể tải Python runtime."));
    }
  });

  const handleMount: OnMount = (_editor, monaco) => {
    monaco.editor.defineTheme("nova-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "keyword", foreground: "c084fc" },
        { token: "string", foreground: "86efac" },
        { token: "number", foreground: "fbbf24" },
      ],
      colors: {
        "editor.background": "#0a0a0f",
        "editor.lineHighlightBackground": "#16161f",
        "editorLineNumber.foreground": "#3f3f46",
        "editorLineNumber.activeForeground": "#a78bfa",
        "editorCursor.foreground": "#a78bfa",
        "editor.selectionBackground": "#3b3b5c",
      },
    });
    monaco.editor.setTheme("nova-dark");
  };

  async function handleRun() {
    setLoading("run");
    setRunOut("");
    setRunErr("");
    setPreviewSrc("");
    try {
      if (lang === "javascript") {
        const logs: string[] = [];
        const orig = console.log;
        console.log = (...a) => {
          logs.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
          orig(...a);
        };
        try {
          const fn = new Function(code);
          const ret = await fn();
          if (ret !== undefined) logs.push(String(ret));
          setRunOut(logs.join("\n") || "(không có output)");
        } catch (e) {
          setRunOut(logs.join("\n"));
          setRunErr(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
        } finally {
          console.log = orig;
        }
      } else if (lang === "html") {
        setPreviewSrc(code);
      } else if (lang === "css") {
        setPreviewSrc(
          `<!doctype html><html><head><style>${code}</style></head><body><h1>Heading</h1><p>Paragraph text để xem CSS của bạn.</p><button>Button</button></body></html>`,
        );
      } else if (lang === "python") {
        const { stdout, error } = await runPython(code);
        setRunOut(stdout || "(không có output)");
        if (error) setRunErr(error);
      } else {
        setRunErr(
          `Chạy ${langMeta.name} cần backend compiler. Hãy dùng "Chữa code" / "Giải thích" để AI hỗ trợ.`,
        );
      }
    } finally {
      setLoading("");
    }
  }

  async function runAi(kind: "fix" | "explain") {
    if (!hasAnyKey()) {
      setErr("Bạn chưa thêm API key nào. Vào Cài đặt để thêm.");
      return;
    }
    setErr("");
    setAiOut("");
    setLoading(kind);
    try {
      const ctx =
        `[Ngôn ngữ: ${langMeta.name}]\n` +
        (problem || (runErr ? `Khi chạy báo lỗi:\n${runErr}` : ""));
      const text = kind === "fix" ? await fixCode(code, ctx) : await explainCode(code, "smart");
      setAiOut(text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading("");
    }
  }

  function applyFix() {
    const re = new RegExp("```(?:" + langMeta.monaco + "|\\w+)?\\n([\\s\\S]*?)```");
    const m = aiOut.match(re);
    if (m) setCode(m[1].trim());
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <CodeNovaLayout>
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3 w-3" /> Premium Playground
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            AI{" "}
            <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
              Playground
            </span>
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Viết code, chạy trực tiếp và để AI giải thích hoặc sửa lỗi cho bạn.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Provider:</span>
          {PROVIDERS.map((p: { id: string; name: string }) => {
            const ok = !!getApiKey(p.id);
            return (
              <span
                key={p.id}
                className={
                  "rounded-full border px-2 py-0.5 transition " +
                  (ok
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground")
                }
              >
                {p.name} {ok ? "✓" : "—"}
              </span>
            );
          })}
          <Link to="/settings" className="ml-1 text-primary hover:underline">
            Quản lý →
          </Link>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {LANGS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLang(l.id)}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium transition " +
              (lang === l.id
                ? "border-primary/60 bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground")
            }
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-gradient-to-b from-card to-background p-1 shadow-2xl shadow-primary/5">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-green-500/80" />
            <span className="ml-3 text-xs font-mono text-muted-foreground">
              main.{lang === "javascript" ? "js" : lang === "python" ? "py" : lang === "cpp" ? "cpp" : lang === "java" ? "java" : lang}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Copy"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setCode(STARTERS[lang])}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleRun}
              disabled={loading !== ""}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-fuchsia-500 px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50"
            >
              {loading === "run" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Chạy
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-b-xl">
          <Editor
            height="380px"
            language={langMeta.monaco}
            path={`main.${lang}`}
            value={code}
            onChange={(v) => setCode(v ?? "")}
            onMount={handleMount}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              renderLineHighlight: "all",
              tabSize: 2,
            }}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-[oklch(0.10_0_0)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" /> Output
            {!langMeta.runnable && (
              <span className="ml-2 rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-400">
                cần backend
              </span>
            )}
          </div>
          {(runOut || runErr || previewSrc) && (
            <button
              onClick={() => {
                setRunOut("");
                setRunErr("");
                setPreviewSrc("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {previewSrc ? (
          <iframe
            title="preview"
            sandbox="allow-scripts"
            srcDoc={previewSrc}
            className="h-72 w-full bg-white"
          />
        ) : (
          <pre className="max-h-72 min-h-[8rem] overflow-auto p-4 text-sm font-mono whitespace-pre-wrap">
            {!runOut && !runErr && (
              <span className="text-muted-foreground">▸ Bấm Chạy để thực thi code.</span>
            )}
            {runOut && <span className="text-[oklch(0.92_0_0)]">{runOut}</span>}
            {runErr && <span className="text-red-400">{(runOut ? "\n" : "") + runErr}</span>}
          </pre>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> AI Assistant
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl border border-border bg-card p-5">
            <label className="mb-2 block text-sm font-medium">Mô tả vấn đề (tuỳ chọn)</label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder={`VD: Báo lỗi compile, hoặc mô tả hành vi mong muốn cho ${langMeta.name}…`}
              className="h-28 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            {runErr && (
              <p className="mt-2 text-xs text-muted-foreground">
                💡 AI sẽ tự đọc lỗi runtime ở trên nếu bạn để trống.
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => runAi("fix")}
                disabled={loading !== ""}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-fuchsia-500 px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50"
              >
                {loading === "fix" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                Chữa code
              </button>
              <button
                onClick={() => runAi("explain")}
                disabled={loading !== ""}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                {loading === "explain" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Giải thích
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <span className="text-sm font-medium">Phản hồi AI</span>
              {aiOut && /```/.test(aiOut) && (
                <button
                  onClick={applyFix}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  Áp dụng vào editor →
                </button>
              )}
            </div>
            <div className="h-[22rem] overflow-auto p-5 text-sm whitespace-pre-wrap leading-relaxed">
              {err && <span className="text-destructive">{err}</span>}
              {!err && !aiOut && loading !== "fix" && loading !== "explain" && (
                <span className="text-muted-foreground">
                  Kết quả từ AI sẽ hiển thị ở đây. Hãy chạy code trước, rồi bấm <b>Chữa code</b> để AI sửa lỗi tự động.
                </span>
              )}
              {(loading === "fix" || loading === "explain") ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> AI đang suy nghĩ…
                </div>
              ) : (
                aiOut
              )}
            </div>
          </div>
        </div>
      </div>
    </CodeNovaLayout>
  );
}
