import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Sparkles, Wrench } from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { explainCode, fixCode, hasAnyKey, PROVIDERS, getApiKey } from "@/lib/ai";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [{ title: "AI Playground — Code Nova" }],
  }),
  component: Playground,
});

function Playground() {
  const [code, setCode] = useState('def hello(name)\n    print("Hi " + name)\n\nhello("Nova")');
  const [problem, setProblem] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState<"" | "fix" | "explain">("");
  const [err, setErr] = useState("");

  async function run(kind: "fix" | "explain") {
    if (!hasAnyKey()) {
      setErr("Bạn chưa thêm API key nào. Vào Cài đặt để thêm.");
      return;
    }
    setErr("");
    setOut("");
    setLoading(kind);
    try {
      const text = kind === "fix" ? await fixCode(code, problem) : await explainCode(code, "smart");
      setOut(text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading("");
    }
  }

  return (
    <CodeNovaLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">AI Playground</h1>
        <p className="mt-2 text-muted-foreground">
          Dán code Python, AI sẽ giải thích hoặc tìm lỗi và sửa giúp bạn.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Provider khả dụng:</span>
        {PROVIDERS.map(p => {
          const ok = !!getApiKey(p.id);
          return (
            <span
              key={p.id}
              className={
                "rounded-full border px-2 py-0.5 " +
                (ok ? "border-primary text-foreground" : "border-border text-muted-foreground")
              }
            >
              {p.name} {ok ? "✓" : "—"}
            </span>
          );
        })}
        <Link to="/settings" className="ml-auto text-primary hover:underline">Quản lý API key →</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Code Python</label>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            className="h-72 w-full rounded-md border border-border bg-[oklch(0.13_0_0)] p-4 font-mono text-sm text-[oklch(0.95_0_0)] focus:border-primary focus:outline-none"
          />
          <label className="mt-4 mb-2 block text-sm font-medium">Mô tả vấn đề (tuỳ chọn)</label>
          <input
            value={problem}
            onChange={e => setProblem(e.target.value)}
            placeholder="VD: Báo SyntaxError ở dòng 1"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => run("fix")}
              disabled={loading !== ""}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading === "fix" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
              Chữa code
            </button>
            <button
              onClick={() => run("explain")}
              disabled={loading !== ""}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {loading === "explain" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Giải thích
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Phản hồi AI</label>
          <div className="h-[26rem] overflow-auto rounded-md border border-border bg-card p-4 text-sm whitespace-pre-wrap">
            {err && <span className="text-destructive">{err}</span>}
            {!err && !out && <span className="text-muted-foreground">Kết quả sẽ hiển thị ở đây…</span>}
            {out}
          </div>
        </div>
      </div>
    </CodeNovaLayout>
  );
}
