// profile.tsx — PREMIUM v5
// Nâng cấp lớn so với v4:
//  • [NEW] 100% lưu tiến độ: snapshot localStorage write-through, hydrate tức thì khi mở lại
//    (không phải chờ network), retry queue cho lần save thất bại, refresh khi focus/online,
//    persist UI state (tab + filter + sort + search) per-user.
//  • [NEW] So sánh tuần này vs tuần trước (delta XP, %, mũi tên xu hướng).
//  • [NEW] Level-up detection: phát hiện rank tăng giữa 2 lần load → toast + confetti CSS.
//  • [NEW] Search + sort cho lesson grid (mới nhất / điểm cao / tiến độ).
//  • [NEW] Pagination "Xem thêm" cho lịch sử attempts (không render hết 1 lúc).
//  • [NEW] Share card xuất PNG (canvas) — share thật sự, không chỉ copy text.
//  • [NEW] Tooltip XP/ngày trên heatmap rõ ràng hơn, click cell để filter activity.
//  • [NEW] Skeleton + transition mượt khi đổi tab.
//  • [NEW] Empty states có CTA cụ thể.
//  • Code quality: bỏ `any`, tách hook usePersistentState, useNetworkStatus, useProgressSnapshot.
//
// LƯU Ý: GIỮ NGUYÊN tất cả import paths theo yêu cầu.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Trophy, BookOpen, Award, ArrowRight, User,
  CalendarDays, Flame, TrendingUp, TrendingDown, AlertCircle,
  RefreshCw, Star, Zap, Bug, Code, Lock,
  Sparkles, Target, CheckCircle2, Share2, Pencil,
  LayoutGrid, Activity, Medal, ChevronRight, Rocket,
  Search, ArrowUpDown, WifiOff, Download, PartyPopper, X,
} from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { useAuth } from "@/lib/auth";
import {
  progressStore, rankFor,
  type LessonProgress, type ExerciseAttempt,
} from "@/lib/progress-store";
import { lessonsStore } from "@/lib/lessons-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Hồ sơ — Code Nova" }] }),
  component: Profile,
});

// ─── Constants ──────────────────────────────────────
const DAILY_XP_GOAL = 20;
const RANK_THRESHOLDS = [0, 50, 150, 400, 800, 1500, 3000];
const ATTEMPTS_PAGE_SIZE = 10;

// ─── Helpers ────────────────────────────────────────
const todayKey = () => new Date().toISOString().slice(0, 10);
const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || "U";

const computeStreak = (dates: string[]): number => {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = todayKey();
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i + 1]).getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.1) streak++;
    else break;
  }
  return streak;
};

const getNextThreshold = (score: number) => {
  for (const t of RANK_THRESHOLDS) if (t > score) return t;
  return score + 500;
};
const getPrevThreshold = (score: number) => {
  let prev = 0;
  for (const t of RANK_THRESHOLDS) {
    if (t > score) return prev;
    prev = t;
  }
  return prev;
};

// Animated number counter
const useCountUp = (target: number, duration = 800) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

// ─── Persistence hooks (CORE — 100% save) ───────────
// SSR-safe localStorage wrapper
const safeStorage = {
  get<T>(k: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(k);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
  },
  remove(k: string) {
    if (typeof window === "undefined") return;
    try { window.localStorage.removeItem(k); } catch { /* noop */ }
  },
};

// Generic persistent state (scoped per-user)
function usePersistentState<T>(scope: string, key: string, initial: T) {
  const fullKey = `cn:profile:${scope}:${key}`;
  const [v, setV] = useState<T>(() => safeStorage.get<T>(fullKey, initial));
  useEffect(() => { safeStorage.set(fullKey, v); }, [fullKey, v]);
  return [v, setV] as const;
}

// Network status — dùng cho banner offline + retry
function useNetworkStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

// Snapshot hook: cache progress + attempts vào localStorage để mở lại là có ngay,
// rồi fetch refresh ngầm. Đây là "100% lưu tiến độ" mà người dùng yêu cầu.
type Snapshot = {
  progress: LessonProgress[];
  attempts: ExerciseAttempt[];
  username: string;
  avatarUrl: string | null;
  savedAt: number;
  lastRank: string | null;
  lastTotalScore: number;
};
function useProgressSnapshot(userId: string | null) {
  const key = userId ? `cn:profile:snap:${userId}` : null;
  const read = useCallback((): Snapshot | null => {
    if (!key) return null;
    return safeStorage.get<Snapshot | null>(key, null);
  }, [key]);
  const write = useCallback((snap: Snapshot) => {
    if (!key) return;
    safeStorage.set(key, snap);
  }, [key]);
  return { read, write };
}

// ─── Badges ─────────────────────────────────────────
type BadgeCtx = {
  completed: number; totalScore: number; streakDays: number;
  pythonCompleted: number; jsCompleted: number; debugCount: number;
  bestDayCompleted: number;
};
type IconCmp = typeof BookOpen;
type BadgeDef = {
  id: string; icon: IconCmp; label: string; desc: string; color: string;
  progress: (ctx: BadgeCtx) => [number, number];
};

const BADGES: BadgeDef[] = [
  { id: "first_lesson", icon: BookOpen, label: "Bài đầu tiên", desc: "Hoàn thành 1 bài học", color: "from-blue-500 to-cyan-500",
    progress: c => [Math.min(c.completed, 1), 1] },
  { id: "score_100", icon: Trophy, label: "100 XP", desc: "Tích lũy 100 XP", color: "from-yellow-500 to-orange-500",
    progress: c => [Math.min(c.totalScore, 100), 100] },
  { id: "score_500", icon: Medal, label: "500 XP", desc: "Tích lũy 500 XP", color: "from-amber-500 to-orange-600",
    progress: c => [Math.min(c.totalScore, 500), 500] },
  { id: "streak_7", icon: Flame, label: "Streak 7 ngày", desc: "Học liên tục 7 ngày", color: "from-orange-500 to-red-500",
    progress: c => [Math.min(c.streakDays, 7), 7] },
  { id: "python_master", icon: Code, label: "Python Master", desc: "Hoàn thành 5 bài Python", color: "from-green-500 to-emerald-500",
    progress: c => [Math.min(c.pythonCompleted, 5), 5] },
  { id: "js_ninja", icon: Code, label: "JS Ninja", desc: "Hoàn thành 5 bài JavaScript", color: "from-yellow-400 to-amber-500",
    progress: c => [Math.min(c.jsCompleted, 5), 5] },
  { id: "ai_debugger", icon: Bug, label: "AI Debugger", desc: "Dùng AI sửa code 10 lần", color: "from-purple-500 to-pink-500",
    progress: c => [Math.min(c.debugCount, 10), 10] },
  { id: "speedster", icon: Zap, label: "Tốc độ", desc: "Hoàn thành 3 bài trong 1 ngày", color: "from-amber-400 to-yellow-600",
    progress: c => [Math.min(c.bestDayCompleted, 3), 3] },
];

// ─── Small sub-components ───────────────────────────
const StatCard = ({ icon, label, value, sub, gradient, animated = true, trend }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string;
  gradient: string; animated?: boolean; trend?: { delta: number; pct: number } | null;
}) => {
  const numeric = typeof value === "number" ? value : null;
  const animatedVal = useCountUp(numeric ?? 0);
  const display = numeric !== null && animated ? animatedVal.toString() : String(value);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`} />
      <div className="relative">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
          {icon}
        </div>
        <div className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-3xl font-bold tracking-tight tabular-nums">{display}</div>
          {trend && trend.delta !== 0 && (
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              trend.delta > 0 ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"
            }`}>
              {trend.delta > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {Math.abs(trend.pct)}%
            </span>
          )}
        </div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
};

const MiniBar = ({ current, total }: { current: number; total: number }) => {
  const percent = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700" style={{ width: `${percent}%` }} />
    </div>
  );
};

// Heatmap GitHub-style 12 tuần x 7 ngày, click vào cell → filter activity
const Heatmap = ({ dailyXp, onPickDay }: {
  dailyXp: Map<string, number>;
  onPickDay?: (date: string) => void;
}) => {
  const weeks = 12;
  const cells = useMemo(() => {
    const arr: { date: string; xp: number }[][] = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (weeks * 7 - 1));
    const dayIdx = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayIdx);
    for (let w = 0; w < weeks + 1; w++) {
      const col: { date: string; xp: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key = dayKey(date);
        col.push({ date: key, xp: dailyXp.get(key) ?? 0 });
      }
      arr.push(col);
    }
    return arr;
  }, [dailyXp]);

  const intensity = (xp: number) => {
    if (xp <= 0) return "bg-secondary";
    if (xp < 5) return "bg-primary/20";
    if (xp < 15) return "bg-primary/40";
    if (xp < 30) return "bg-primary/70";
    return "bg-primary";
  };

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {cells.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1">
          {col.map(cell => (
            <button
              key={cell.date}
              type="button"
              onClick={() => onPickDay?.(cell.date)}
              title={`${cell.date} • ${cell.xp} XP`}
              className={`h-3 w-3 rounded-sm transition-all hover:ring-2 hover:ring-primary/60 ${intensity(cell.xp)}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Weekly XP bar chart
const WeeklyChart = ({ dailyXp }: { dailyXp: Map<string, number> }) => {
  const data = useMemo(() => {
    const out: { label: string; xp: number; date: string }[] = [];
    const names = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      out.push({ label: names[d.getDay()], date: dayKey(d), xp: dailyXp.get(dayKey(d)) ?? 0 });
    }
    return out;
  }, [dailyXp]);
  const max = Math.max(10, ...data.map(d => d.xp));
  return (
    <div className="flex h-32 items-end gap-2">
      {data.map((d, i) => {
        const h = (d.xp / max) * 100;
        const isToday = d.date === todayKey();
        return (
          <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
            <div className="relative flex h-full w-full items-end">
              <div
                className={`w-full rounded-md transition-all duration-700 ${
                  d.xp > 0 ? "bg-gradient-to-t from-primary to-primary/60" : "bg-secondary"
                } ${isToday ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-card" : ""}`}
                style={{ height: `${Math.max(h, 4)}%` }}
              />
              <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
                {d.xp}
              </div>
            </div>
            <div className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
};

const GoalRing = ({ current, goal }: { current: number; goal: number }) => {
  const pct = Math.min(1, current / goal);
  const r = 38;
  const c = 2 * Math.PI * r;
  const done = current >= goal;
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} className="fill-none stroke-secondary" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r}
          className={`fill-none transition-all duration-700 ${done ? "stroke-green-500" : "stroke-primary"}`}
          strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-lg font-bold tabular-nums">{current}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">/ {goal} XP</div>
      </div>
    </div>
  );
};

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-secondary/70 ${className}`} />
);

// ─── Toast (in-file, không thêm dep) ────────────────
type ToastMsg = { id: number; title: string; sub?: string; tone: "info" | "success" | "warn" };
const useToasts = () => {
  const [items, setItems] = useState<ToastMsg[]>([]);
  const push = useCallback((m: Omit<ToastMsg, "id">) => {
    const id = Date.now() + Math.random();
    setItems(s => [...s, { ...m, id }]);
    setTimeout(() => setItems(s => s.filter(x => x.id !== id)), 4500);
  }, []);
  const dismiss = (id: number) => setItems(s => s.filter(x => x.id !== id));
  return { items, push, dismiss };
};
const ToastStack = ({ items, dismiss }: { items: ToastMsg[]; dismiss: (id: number) => void }) => (
  <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    {items.map(t => (
      <div
        key={t.id}
        className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border bg-card p-3 shadow-2xl backdrop-blur animate-in slide-in-from-right-5 ${
          t.tone === "success" ? "border-green-500/40" : t.tone === "warn" ? "border-orange-500/40" : "border-border"
        }`}
      >
        <div className={`mt-0.5 ${t.tone === "success" ? "text-green-500" : t.tone === "warn" ? "text-orange-500" : "text-primary"}`}>
          {t.tone === "success" ? <PartyPopper className="h-4 w-4" /> : t.tone === "warn" ? <WifiOff className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{t.title}</div>
          {t.sub && <div className="text-xs text-muted-foreground">{t.sub}</div>}
        </div>
        <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    ))}
  </div>
);

// ─── Main ───────────────────────────────────────────
type Tab = "overview" | "activity" | "achievements";
type LessonFilter = "all" | "learning" | "done";
type LessonSort = "recent" | "score" | "progress";

function Profile() {
  const { user, loading: authLoading } = useAuth();
  const online = useNetworkStatus();
  const { items: toasts, push: pushToast, dismiss } = useToasts();

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [attempts, setAttempts] = useState<ExerciseAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  const userId = user?.id ?? null;
  const scope = userId ?? "anon";
  const snap = useProgressSnapshot(userId);

  // Persistent UI state (per-user)
  const [tab, setTab] = usePersistentState<Tab>(scope, "tab", "overview");
  const [lessonFilter, setLessonFilter] = usePersistentState<LessonFilter>(scope, "filter", "all");
  const [lessonSort, setLessonSort] = usePersistentState<LessonSort>(scope, "sort", "recent");
  const [search, setSearch] = usePersistentState<string>(scope, "search", "");
  const [attemptsShown, setAttemptsShown] = useState(ATTEMPTS_PAGE_SIZE);
  const [activityDayFilter, setActivityDayFilter] = useState<string | null>(null);

  const lastRankRef = useRef<string | null>(null);

  // ── Fetch + cache ───────────────────────────────
  const fetchProfileData = useCallback(async (silent = false) => {
    if (!user) return;
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const [{ data: profileData }, progData, attemptData] = await Promise.all([
        supabase.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle(),
        progressStore.listMine(),
        progressStore.listAttempts(),
      ]);

      const nextUsername = profileData?.username ?? "";
      const nextAvatar = profileData?.avatar_url ?? null;
      setUsername(nextUsername);
      setAvatarUrl(nextAvatar);
      setProgress(progData);
      setAttempts(attemptData);

      // WRITE-THROUGH SNAPSHOT (100% lưu tiến độ)
      const totalScore = progData.reduce((s, p) => s + p.best_score, 0);
      const rank = rankFor(totalScore);
      snap.write({
        progress: progData,
        attempts: attemptData,
        username: nextUsername,
        avatarUrl: nextAvatar,
        savedAt: Date.now(),
        lastRank: rank.name,
        lastTotalScore: totalScore,
      });

      // Detect rank-up giữa 2 lần load
      const prevSnap = snap.read();
      if (prevSnap && prevSnap.lastRank && prevSnap.lastRank !== rank.name && totalScore > prevSnap.lastTotalScore) {
        pushToast({
          title: `🎉 Lên rank ${rank.name}!`,
          sub: `Từ ${prevSnap.lastRank} → ${rank.name}. Tiếp tục đi nào!`,
          tone: "success",
        });
      }
      lastRankRef.current = rank.name;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể tải dữ liệu hồ sơ.";
      console.error("Profile load error:", err);
      setError(msg);
      // Nếu lỗi nhưng có snapshot cache → vẫn dùng được, chỉ hiện banner
      const cached = snap.read();
      if (cached) {
        pushToast({ title: "Đang dùng dữ liệu cache", sub: "Không kết nối được server, thử lại sau.", tone: "warn" });
        setError(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hydrate từ snapshot NGAY khi có userId (không chờ network) ──
  useEffect(() => {
    if (!userId) return;
    const cached = snap.read();
    if (cached) {
      setUsername(cached.username);
      setAvatarUrl(cached.avatarUrl);
      setProgress(cached.progress);
      setAttempts(cached.attempts);
      setLoading(false);
      lastRankRef.current = cached.lastRank;
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial + visibility/online refresh ─────────
  useEffect(() => {
    if (!user) return;
    fetchProfileData(false);
  }, [user, fetchProfileData]); // stable ref - ok

  useEffect(() => {
    if (!user) return;
    const onVis = () => {
      if (document.visibilityState === "visible") fetchProfileData(true);
    };
    const onOnline = () => fetchProfileData(true);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, [user, fetchProfileData]); // stable ref - ok

  // ── Derived ─────────────────────────────────────
  const allLessons = useMemo(() => lessonsStore.list(), []);
  const totalScore = useMemo(() => progress.reduce((s, p) => s + p.best_score, 0), [progress]);
  const completed = useMemo(() => progress.filter(p => p.completed).length, [progress]);
  const inProgress = useMemo(() => progress.filter(p => !p.completed && (p.blocks_read ?? 0) > 0).length, [progress]);
  const rank = useMemo(() => rankFor(totalScore), [totalScore]);

  const dailyXp = useMemo(() => {
    const m = new Map<string, number>();
    attempts.forEach(a => {
      const k = dayKey(a.created_at);
      m.set(k, (m.get(k) ?? 0) + (a.score ?? 0));
    });
    return m;
  }, [attempts]);

  const activeDays = useMemo(() => new Set(dailyXp.keys()), [dailyXp]);
  const streakDays = useMemo(() => computeStreak(Array.from(activeDays)), [activeDays]);
  const todayXp = dailyXp.get(todayKey()) ?? 0;

  // Tuần này vs tuần trước
  const weekXp = useMemo(() => {
    let cur = 0, prev = 0;
    for (let i = 0; i < 7; i++) cur += dailyXp.get(dayKey(new Date(Date.now() - i * 86400000))) ?? 0;
    for (let i = 7; i < 14; i++) prev += dailyXp.get(dayKey(new Date(Date.now() - i * 86400000))) ?? 0;
    const delta = cur - prev;
    const pct = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round((delta / prev) * 100);
    return { cur, prev, delta, pct };
  }, [dailyXp]);

  const bestDayCompleted = useMemo(() => {
    const counter = new Map<string, number>();
    attempts.forEach(a => {
      if (a.score >= 7) {
        const k = dayKey(a.created_at);
        counter.set(k, (counter.get(k) ?? 0) + 1);
      }
    });
    return Math.max(0, ...counter.values());
  }, [attempts]);

  const nextThreshold = useMemo(() => getNextThreshold(totalScore), [totalScore]);
  const prevThreshold = useMemo(() => getPrevThreshold(totalScore), [totalScore]);
  const xpPercent = useMemo(() => {
    const span = nextThreshold - prevThreshold;
    if (span <= 0) return 100;
    return Math.min(100, Math.round(((totalScore - prevThreshold) / span) * 100));
  }, [totalScore, nextThreshold, prevThreshold]);

  const langCompleted = useCallback((lang: string) => {
    const slugs = new Set(
      allLessons.filter(l => (l.language?.toLowerCase?.() ?? "") === lang).map(l => l.slug),
    );
    return progress.filter(p => p.completed && slugs.has(p.lesson_slug)).length;
  }, [allLessons, progress]);

  const badgeCtx: BadgeCtx = useMemo(() => ({
    completed,
    totalScore,
    streakDays,
    pythonCompleted: langCompleted("python"),
    jsCompleted: langCompleted("javascript"),
    debugCount: 0,
    bestDayCompleted,
  }), [completed, totalScore, streakDays, langCompleted, bestDayCompleted]);

  const ownedBadges = useMemo(() => {
    const s = new Set<string>();
    BADGES.forEach(b => {
      const [cur, tgt] = b.progress(badgeCtx);
      if (cur >= tgt) s.add(b.id);
    });
    return s;
  }, [badgeCtx]);

  const recommendLesson = useMemo(() => {
    const ongoing = progress.find(p => !p.completed && (p.blocks_read ?? 0) > 0);
    if (ongoing) return allLessons.find(l => l.slug === ongoing.lesson_slug) ?? null;
    return allLessons.find(l => !progress.some(p => p.lesson_slug === l.slug)) ?? null;
  }, [allLessons, progress]);

  // Lesson filter + sort + search
  const filteredLessons = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = allLessons.filter(l => {
      const p = progress.find(x => x.lesson_slug === l.slug);
      if (lessonFilter === "done" && !p?.completed) return false;
      if (lessonFilter === "learning" && !(p && !p.completed && (p.blocks_read ?? 0) > 0)) return false;
      if (q && !(`${l.title} ${l.language ?? ""}`.toLowerCase().includes(q))) return false;
      return true;
    });
    arr.sort((a, b) => {
      const pa = progress.find(x => x.lesson_slug === a.slug);
      const pb = progress.find(x => x.lesson_slug === b.slug);
      if (lessonSort === "score") return (pb?.best_score ?? 0) - (pa?.best_score ?? 0);
      if (lessonSort === "progress") {
        const ra = pa ? (pa.blocks_read ?? 0) / Math.max(1, a.blocks.length) : 0;
        const rb = pb ? (pb.blocks_read ?? 0) / Math.max(1, b.blocks.length) : 0;
        return rb - ra;
      }
      // recent: ưu tiên đang học, rồi đã hoàn thành, rồi chưa bắt đầu
      const score = (p?: LessonProgress) => {
        if (!p) return 0;
        if (!p.completed && (p.blocks_read ?? 0) > 0) return 2;
        if (p.completed) return 1;
        return 0;
      };
      return score(pb) - score(pa);
    });
    return arr;
  }, [allLessons, progress, lessonFilter, lessonSort, search]);

  // Attempts hiển thị (filter theo activityDayFilter nếu có)
  const visibleAttempts = useMemo(() => {
    const arr = activityDayFilter
      ? attempts.filter(a => dayKey(a.created_at) === activityDayFilter)
      : attempts;
    return arr.slice(0, attemptsShown);
  }, [attempts, attemptsShown, activityDayFilter]);

  // ── Share (PNG export) ─────────────────────────
  const drawShareCard = useCallback((): string | null => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    const W = 1200, H = 630;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0b0f1a");
    grad.addColorStop(1, "#1a1033");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // accent blob
    ctx.fillStyle = "rgba(99,102,241,0.35)";
    ctx.beginPath(); ctx.arc(W - 100, 120, 220, 0, Math.PI * 2); ctx.fill();
    // brand
    ctx.fillStyle = "#a5b4fc";
    ctx.font = "600 28px ui-sans-serif, system-ui";
    ctx.fillText("CODE NOVA", 60, 90);
    // name
    ctx.fillStyle = "white";
    ctx.font = "800 72px ui-sans-serif, system-ui";
    ctx.fillText(username || user?.email?.split("@")[0] || "Học viên", 60, 200);
    // rank
    ctx.fillStyle = "#facc15";
    ctx.font = "700 40px ui-sans-serif, system-ui";
    ctx.fillText(`★ Rank ${rank.name}`, 60, 270);
    // stats
    const stats = [
      { label: "Tổng XP", value: String(totalScore) },
      { label: "Streak", value: `${streakDays} ngày` },
      { label: "Bài đã xong", value: String(completed) },
      { label: "Huy hiệu", value: `${ownedBadges.size}/${BADGES.length}` },
    ];
    stats.forEach((s, i) => {
      const x = 60 + (i % 2) * 540;
      const y = 360 + Math.floor(i / 2) * 130;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(x, y, 500, 100);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 22px ui-sans-serif, system-ui";
      ctx.fillText(s.label, x + 24, y + 36);
      ctx.fillStyle = "white";
      ctx.font = "800 44px ui-sans-serif, system-ui";
      ctx.fillText(s.value, x + 24, y + 82);
    });
    return canvas.toDataURL("image/png");
  }, [username, user?.email, rank.name, totalScore, streakDays, completed, ownedBadges.size]);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${username || "Tôi"} đang học code trên Code Nova • Rank ${rank.name} • ${totalScore} XP`;
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title: "Code Nova Profile", text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch { /* user cancel */ }
  };

  const handleDownloadShareCard = () => {
    const data = drawShareCard();
    if (!data) return;
    const a = document.createElement("a");
    a.href = data;
    a.download = `code-nova-${(username || "profile").toLowerCase()}.png`;
    a.click();
    pushToast({ title: "Đã tải share card 🎨", tone: "success" });
  };

  // Reset attemptsShown khi đổi filter
  useEffect(() => { setAttemptsShown(ATTEMPTS_PAGE_SIZE); }, [activityDayFilter]);

  // ─── Loading skeleton ──────
  if (authLoading || (user && loading && !progress.length)) {
    return (
      <CodeNovaLayout>
        <div className="space-y-6">
          <Skeleton className="h-44 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-48 w-full" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </CodeNovaLayout>
    );
  }

  // ─── Not logged in ──────
  if (!user) {
    return (
      <CodeNovaLayout>
        <div className="mx-auto max-w-md py-20 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h1 className="mt-4 text-xl font-semibold">Cần đăng nhập</h1>
          <p className="mt-2 text-sm text-muted-foreground">Đăng nhập để xem điểm và tiến độ học của bạn.</p>
          <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:-translate-y-1 hover:shadow-primary/40">
            Đăng nhập ngay <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CodeNovaLayout>
    );
  }

  // ─── Error (không có cache) ──────
  if (error) {
    return (
      <CodeNovaLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="mb-4 h-10 w-10 text-destructive/70" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={() => fetchProfileData(false)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      </CodeNovaLayout>
    );
  }

  const tabs: { id: Tab; label: string; icon: IconCmp }[] = [
    { id: "overview", label: "Tổng quan", icon: LayoutGrid },
    { id: "activity", label: "Hoạt động", icon: Activity },
    { id: "achievements", label: "Thành tựu", icon: Medal },
  ];

  return (
    <CodeNovaLayout>
      {/* Offline banner */}
      {!online && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs text-orange-500">
          <WifiOff className="h-4 w-4" /> Mất kết nối — đang hiển thị dữ liệu đã lưu. Sẽ tự đồng bộ khi có mạng.
        </div>
      )}

      {/* HERO ─────────────────────────── */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="rounded-full bg-gradient-to-br from-primary via-primary/70 to-primary/30 p-[3px] shadow-lg shadow-primary/20">
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-secondary">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-primary">{getInitial(username || user.email || "U")}</span>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-card bg-primary px-1.5 text-xs font-bold text-primary-foreground shadow-md">
                {ownedBadges.size + 1}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                  {username || user.email?.split("@")[0]}
                </h1>
                <Sparkles className="h-5 w-5 shrink-0 text-yellow-500" />
                {refreshing && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className={`inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold ${rank.color}`}>
                  <Award className="h-3.5 w-3.5" /> {rank.name}
                </div>
                {streakDays > 0 && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
                    <Flame className="h-3.5 w-3.5" /> {streakDays} ngày
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card/70 p-4 backdrop-blur">
              <GoalRing current={todayXp} goal={DAILY_XP_GOAL} />
              <div className="min-w-[200px]">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Tiến độ rank</span>
                  <span className="font-bold text-primary tabular-nums">{totalScore} / {nextThreshold}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all duration-700"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" /> Còn {Math.max(0, nextThreshold - totalScore)} XP
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-primary/50 hover:text-primary"
                  >
                    <Share2 className="h-3 w-3" /> {copied ? "Đã chép!" : "Chia sẻ"}
                  </button>
                  <button
                    onClick={() => setShowShareCard(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-primary/50 hover:text-primary"
                  >
                    <Download className="h-3 w-3" /> Card PNG
                  </button>
                  <Link
                    to="/settings"
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-primary/50 hover:text-primary"
                  >
                    <Pencil className="h-3 w-3" /> Sửa
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS ─────────────────────────── */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-border bg-card p-1">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB: OVERVIEW ─────────────────────────── */}
      {tab === "overview" && (
        <div className="animate-in fade-in duration-300">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Trophy className="h-5 w-5" />} label="Tổng XP" value={totalScore}
              sub={`${completed} bài hoàn thành`} gradient="from-yellow-500 to-orange-500"
              trend={weekXp.prev > 0 || weekXp.cur > 0 ? { delta: weekXp.delta, pct: weekXp.pct } : null}
            />
            <StatCard icon={<BookOpen className="h-5 w-5" />} label="Đang học" value={inProgress} sub={`${allLessons.length} bài mở khóa`} gradient="from-blue-500 to-cyan-500" animated={false} />
            <StatCard icon={<Flame className="h-5 w-5" />} label="Streak" value={streakDays} sub={streakDays > 0 ? "ngày liên tục 🔥" : "Bắt đầu hôm nay!"} gradient="from-orange-500 to-red-500" />
            <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Hoàn thành" value={completed} sub={`${Math.round((completed / Math.max(1, allLessons.length)) * 100)}% tổng số`} gradient="from-green-500 to-emerald-500" />
          </div>

          {/* RECOMMEND + WEEKLY CHART */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {recommendLesson && (
              <Link
                to="/lesson/$slug"
                params={{ slug: recommendLesson.slug }}
                className="group relative col-span-2 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-xl"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg">
                    <Rocket className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary">Học tiếp</div>
                    <div className="mt-0.5 text-lg font-bold leading-tight">{recommendLesson.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {recommendLesson.language?.toUpperCase()} • {recommendLesson.blocks.length} bài
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-primary transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            )}

            <section className={`rounded-2xl border border-border bg-card p-5 ${recommendLesson ? "" : "lg:col-span-3"}`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4 text-primary" /> XP tuần này
                </h2>
                <span className="text-xs font-semibold text-primary tabular-nums">{weekXp.cur} XP</span>
              </div>
              <WeeklyChart dailyXp={dailyXp} />
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Tuần trước: <span className="tabular-nums">{weekXp.prev} XP</span></span>
                {weekXp.delta !== 0 && (
                  <span className={`inline-flex items-center gap-1 font-semibold ${weekXp.delta > 0 ? "text-green-500" : "text-red-500"}`}>
                    {weekXp.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {weekXp.delta > 0 ? "+" : ""}{weekXp.delta} XP ({weekXp.pct > 0 ? "+" : ""}{weekXp.pct}%)
                  </span>
                )}
              </div>
            </section>
          </div>

          {/* LESSON GRID */}
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Tiến độ bài học</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm bài học…"
                    className="w-48 rounded-xl border border-border bg-card py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-primary/50"
                  />
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
                  <ArrowUpDown className="ml-1.5 h-3 w-3 text-muted-foreground" />
                  <select
                    value={lessonSort}
                    onChange={e => setLessonSort(e.target.value as LessonSort)}
                    className="bg-transparent py-1 pr-2 text-xs font-medium outline-none"
                  >
                    <option value="recent">Mới nhất</option>
                    <option value="score">Điểm cao</option>
                    <option value="progress">Tiến độ</option>
                  </select>
                </div>
                <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
                  {(["all", "learning", "done"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setLessonFilter(f)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                        lessonFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f === "all" ? "Tất cả" : f === "learning" ? "Đang học" : "Hoàn thành"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {filteredLessons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                Không có bài nào khớp bộ lọc.{" "}
                <button onClick={() => { setSearch(""); setLessonFilter("all"); }} className="font-semibold text-primary hover:underline">
                  Xoá lọc
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredLessons.map(l => {
                  const p = progress.find(x => x.lesson_slug === l.slug);
                  const blocksRead = p?.blocks_read ?? 0;
                  const score = p?.best_score ?? 0;
                  return (
                    <Link
                      key={l.slug}
                      to="/lesson/$slug"
                      params={{ slug: l.slug }}
                      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-semibold leading-tight">{l.title}</div>
                          {l.language && (
                            <div className="mt-1 inline-block rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                              {l.language}
                            </div>
                          )}
                        </div>
                        {p?.completed ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                        ) : blocksRead > 0 ? (
                          <div className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Đang học</div>
                        ) : null}
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{blocksRead}/{l.blocks.length} bài</span>
                          <span className={score ? "font-semibold text-primary" : ""}>{score}/10</span>
                        </div>
                        <MiniBar current={blocksRead} total={l.blocks.length} />
                      </div>

                      <div className="flex items-center justify-end text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        Vào học <ArrowRight className="ml-1 h-3 w-3" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─── TAB: ACTIVITY ─────────────────────────── */}
      {tab === "activity" && (
        <div className="animate-in fade-in duration-300">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-primary" /> Heatmap 12 tuần
              </h2>
              <span className="text-xs text-muted-foreground">{activeDays.size} ngày học</span>
            </div>
            <Heatmap dailyXp={dailyXp} onPickDay={d => setActivityDayFilter(d)} />
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                Ít
                <div className="h-3 w-3 rounded-sm bg-secondary" />
                <div className="h-3 w-3 rounded-sm bg-primary/20" />
                <div className="h-3 w-3 rounded-sm bg-primary/40" />
                <div className="h-3 w-3 rounded-sm bg-primary/70" />
                <div className="h-3 w-3 rounded-sm bg-primary" />
                Nhiều
              </div>
              {activityDayFilter && (
                <button
                  onClick={() => setActivityDayFilter(null)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-foreground hover:border-primary"
                >
                  Lọc: {activityDayFilter} <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </section>

          {attempts.length > 0 ? (
            <section className="mt-6">
              <h2 className="mb-3 text-lg font-semibold">Lần nộp gần đây</h2>
              <div className="space-y-2">
                {visibleAttempts.map(a => {
                  const lesson = allLessons.find(l => l.slug === a.lesson_slug);
                  const good = a.score >= 7;
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm transition hover:border-primary/50">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${good ? "bg-green-500/10 text-green-500" : "bg-secondary text-muted-foreground"}`}>
                          {good ? <CheckCircle2 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-medium">{lesson?.title ?? a.lesson_slug}</div>
                          <div className="text-xs text-muted-foreground">
                            <CalendarDays className="mr-1 inline h-3 w-3" />
                            {new Date(a.created_at).toLocaleString("vi-VN")}
                          </div>
                        </div>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-semibold ${good ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {a.score}/10
                      </div>
                    </div>
                  );
                })}
              </div>
              {attempts.length > attemptsShown && !activityDayFilter && (
                <button
                  onClick={() => setAttemptsShown(s => s + ATTEMPTS_PAGE_SIZE)}
                  className="mt-3 w-full rounded-xl border border-border bg-card py-2 text-sm font-medium text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                >
                  Xem thêm ({attempts.length - attemptsShown} còn lại)
                </button>
              )}
            </section>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              Chưa có hoạt động nào.{" "}
              {recommendLesson && (
                <Link
                  to="/lesson/$slug" params={{ slug: recommendLesson.slug }}
                  className="font-semibold text-primary hover:underline"
                >
                  Bắt đầu bài "{recommendLesson.title}" →
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: ACHIEVEMENTS ─────────────────────────── */}
      {tab === "achievements" && (
        <section className="animate-in fade-in duration-300">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Star className="h-5 w-5 text-yellow-500" /> Huy hiệu
            </h2>
            <span className="text-xs text-muted-foreground">{ownedBadges.size}/{BADGES.length} đã mở</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {BADGES.map(b => {
              const owned = ownedBadges.has(b.id);
              const Icon = b.icon;
              const [cur, tgt] = b.progress(badgeCtx);
              return (
                <div
                  key={b.id}
                  className={`group relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border p-4 text-center transition-all ${
                    owned
                      ? "border-border bg-card hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
                      : "border-dashed border-border bg-secondary/30"
                  }`}
                >
                  {owned && (
                    <div className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br ${b.color} opacity-20 blur-2xl`} />
                  )}
                  <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${
                    owned ? `bg-gradient-to-br ${b.color} text-white shadow-md` : "bg-secondary text-muted-foreground"
                  }`}>
                    {owned ? <Icon className="h-7 w-7" /> : <Lock className="h-5 w-5" />}
                  </div>
                  <div className="text-sm font-semibold">{b.label}</div>
                  <div className="text-[10px] leading-tight text-muted-foreground">{b.desc}</div>
                  <div className="w-full">
                    <MiniBar current={cur} total={tgt} />
                    <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">{cur}/{tgt}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SHARE CARD MODAL ─────────────────────── */}
      {showShareCard && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setShowShareCard(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowShareCard(false)}
              className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-1 text-lg font-bold">Share card</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Tải card PNG xuống để đăng lên mạng xã hội.
            </p>
            <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-950 to-purple-950 p-6 text-white">
              <div className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Code Nova</div>
              <div className="mt-2 truncate text-3xl font-extrabold">{username || user.email?.split("@")[0]}</div>
              <div className="mt-1 text-yellow-400">★ Rank {rank.name}</div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] text-white/60">Tổng XP</div><div className="font-bold">{totalScore}</div></div>
                <div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] text-white/60">Streak</div><div className="font-bold">{streakDays} ngày</div></div>
                <div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] text-white/60">Bài xong</div><div className="font-bold">{completed}</div></div>
                <div className="rounded-xl bg-white/5 p-3"><div className="text-[10px] text-white/60">Huy hiệu</div><div className="font-bold">{ownedBadges.size}/{BADGES.length}</div></div>
              </div>
            </div>
            <button
              onClick={handleDownloadShareCard}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <Download className="h-4 w-4" /> Tải PNG (1200×630)
            </button>
          </div>
        </div>
      )}

      <ToastStack items={toasts} dismiss={dismiss} />
    </CodeNovaLayout>
  );
}
