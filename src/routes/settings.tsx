import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, ExternalLink, Save } from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { PROVIDERS, getApiKey, setApiKey, type ProviderId } from "@/lib/ai";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Cài đặt — Code Nova" }] }),
  component: Settings,
});

function Settings() {
  const [keys, setKeys] = useState<Record<ProviderId, string>>({ groq: "", gemini: "", openrouter: "" });
  const [show, setShow] = useState<Record<ProviderId, boolean>>({ groq: false, gemini: false, openrouter: false });
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setKeys({
      groq: getApiKey("groq"),
      gemini: getApiKey("gemini"),
      openrouter: getApiKey("openrouter"),
    });
  }, []);

  function save(id: ProviderId) {
    setApiKey(id, keys[id].trim());
    setSaved(id);
    setTimeout(() => setSaved(""), 1500);
  }

  return (
    <CodeNovaLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Cài đặt API key</h1>
        <p className="mt-2 text-muted-foreground">
          Code Nova gọi thẳng tới các API AI miễn phí. Key được lưu <strong>chỉ trong trình duyệt của bạn</strong> (localStorage),
          không gửi đi đâu khác.
        </p>

        <div className="mt-8 space-y-5">
          {PROVIDERS.map(p => (
            <div key={p.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tier: <span className="text-foreground">{p.tier}</span> · model mặc định{" "}
                    <code className="text-foreground">{p.defaultModel}</code>
                  </p>
                </div>
                <a href={p.signupUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Lấy key <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={show[p.id] ? "text" : "password"}
                    value={keys[p.id]}
                    onChange={e => setKeys(k => ({ ...k, [p.id]: e.target.value }))}
                    placeholder="sk-..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 font-mono text-sm focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={() => setShow(s => ({ ...s, [p.id]: !s[p.id] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {show[p.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  onClick={() => save(p.id)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  <Save className="h-4 w-4" />
                  {saved === p.id ? "Đã lưu" : "Lưu"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-md border border-border bg-secondary/40 p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">Mẹo:</strong> Code cơ bản dùng Groq (rất nhanh). Code phức tạp ưu tiên OpenRouter (model mạnh hơn).
          Gemini cân bằng và có free tier rộng rãi.
        </div>
      </div>
    </CodeNovaLayout>
  );
}
