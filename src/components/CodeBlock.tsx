import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CodeBlock({ code, language = "python" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative overflow-hidden rounded-md border border-border bg-[oklch(0.13_0_0)] text-[oklch(0.95_0_0)]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs">
        <span className="text-white/60">{language}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="flex items-center gap-1 text-white/60 hover:text-primary"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Đã chép" : "Chép"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
