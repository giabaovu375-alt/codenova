// src/features/roadmap/ui-atoms.tsx
import React, { useState, useCallback, useEffect } from "react";
import { Sparkles } from "lucide-react";

export const ProgressBar = ({
  percent,
  accent = "bg-primary",
}: {
  percent: number;
  accent?: string;
}) => (
  <div className="w-full bg-secondary rounded-full h-2 mt-1 overflow-hidden">
    <div
      className={`h-2 rounded-full transition-all duration-700 ease-out ${accent}`}
      style={{ width: `${percent}%` }}
    />
  </div>
);

export const CircularProgress = ({
  percent,
  size = 56,
  stroke = 5,
  accentClass = "stroke-primary",
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  accentClass?: string;
  children?: React.ReactNode;
}) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percent / 100) * circ;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="stroke-secondary fill-none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={`${accentClass} fill-none transition-all duration-700 ease-out`}
          style={{
            strokeDasharray: circ,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
        {children ?? `${percent}%`}
      </div>
    </div>
  );
};

export const SkeletonCard = () => (
  <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-secondary" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-secondary" />
        <div className="h-3 w-48 rounded bg-secondary" />
      </div>
    </div>
    <div className="mt-4 h-2 w-full rounded bg-secondary" />
  </div>
);

export const useToast = () => {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const show = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, show };
};

export const ToastView = ({ message }: { message: string }) => (
  <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
    <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-card/95 backdrop-blur px-4 py-3 shadow-2xl shadow-primary/20">
      <Sparkles className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  </div>
);

export const Confetti = () => {
  const pieces = Array.from({ length: 60 });
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 2 + Math.random() * 1.5;
        const colors = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#ec4899", "#3b82f6"];
        const bg = colors[i % colors.length];
        return (
          <span
            key={i}
            className="absolute top-[-10px] block h-2 w-2 rounded-sm"
            style={{
              left: `${left}%`,
              backgroundColor: bg,
              animation: `confetti-fall ${duration}s ${delay}s linear forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          to { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
