import { useMemo, useState } from "react";
import { Copy, Check, Code } from "lucide-react";
import { LANGUAGE_LABELS } from "@/lib/lessons-store";

export function CodeBlock({ code, language = "python" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const displayLabel = useMemo(() => {
    if (language && language in LANGUAGE_LABELS) {
      return LANGUAGE_LABELS[language as keyof typeof LANGUAGE_LABELS];
    }
    // Fallback: nếu không map được, viết hoa chữ cái đầu
    return language ? language.charAt(0).toUpperCase() + language.slice(1) : "Code";
  }, [language]);

  return (
    <div className="group relative overflow-hidden rounded-md border border-border bg-[oklch(0.13_0_0)] text-[oklch(0.95_0_0)] transition-all hover:border-primary/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs font-medium">
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

      {/* Code */}
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
