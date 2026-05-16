// profile.tsx — PREMIUM v4
// Nâng cấp kiểu big-league app (Duolingo / LeetCode / GitHub / Strava):
//  • Hero gradient + animated mesh, share + edit profile
//  • Tabs: Tổng quan / Hoạt động / Thành tựu
//  • XP bar mượt + animated counter
//  • Weekly XP chart (mini bar chart 7 ngày)
//  • Heatmap 12 tuần (GitHub-style) thay strip 30 ngày
//  • Skeleton loader thay spinner trống
//  • Daily goal ring (XP hôm nay)
//  • Lesson grid filter (Tất cả / Đang học / Hoàn thành)
//  • Badge tier hiển thị progress (vd 3/5 bài Python)
//  • Recommend "Học tiếp" card
//  • Empty states tử tế

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Trophy, BookOpen, Award, ArrowRight, User,
  CalendarDays, Flame, TrendingUp, AlertCircle,
  RefreshCw, Loader2, Star, Zap, Bug, Code, Lock,
  Sparkles, Target, CheckCircle2, Share2, Pencil,
  LayoutGrid, Activity, Medal, ChevronRight, Rocket,
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

const RANK_THRESHOLDS = [0, 50, 150, 400, 800, 1500, 3000];
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

const DAILY_XP_GOAL = 20;

// Animated number counter
const useCountUp = (target: number, duration = 800) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

// ─── Badges (tier hỗ trợ progress) ──────────────────
type BadgeDef = {
  id: string; icon: any; label: string; desc: string; color: string;
  // progress fn trả về [current, target]
  progress: (ctx: BadgeCtx) => [number, number];
};
type BadgeCtx = {
  completed: number; totalScore: number; streakDays: number;
  pythonCompleted: number; jsCompleted: number; debugCount: number;
  bestDayCompleted: number;
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

// ─── Sub-components ─────────────────────────────────
const StatCard = ({ icon, label, value, sub, gradient, animated = true }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; gradient: string; animated?: boolean;
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
        <div className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{display}</div>
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

// Heatmap GitHub-style: 12 tuần x 7 ngày
const Heatmap = ({ dailyXp }: { dailyXp: Map<string, number> }) => {
  const weeks = 12;
  const cells = useMemo(() => {
    const arr: { date: string; xp: number }[][] = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (weeks * 7 - 1));
    // align to Monday
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
            <div
              key={cell.date}
              title={`${cell.date} • ${cell.xp} XP`}
              className={`h-3 w-3 rounded-sm transition-all hover:ring-2 hover:ring-primary/60 ${intensity(cell.xp)}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Weekly XP bar chart (7 ngày gần nhất)
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

// Daily goal ring (SVG)
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

// Skeleton block
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-secondary/70 ${className}`} />
);

// ─── Main Component ─────────────────────────────────
type Tab = "overview" | "activity" | "achievements";

function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [attempts, setAttempts] = useState<ExerciseAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [lessonFilter, setLessonFilter] = useState<"all" | "learning" | "done">("all");
  const [copied, setCopied] = useState(false);

  const fetchProfileData = useCallback(async (mounted: boolean) => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const [{ data: profileData }, progData, attemptData] = await Promise.all([
        supabase.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle(),
        progressStore.listMine(),
        progressStore.listAttempts(),
      ]);
      if (!mounted) return;
      setUsername(profileData?.username ?? "");
      setAvatarUrl(profileData?.avatar_url ?? null);
      setProgress(progData);
      setAttempts(attemptData);
    } catch (err: any) {
      console.error("Profile load error:", err);
      if (mounted) setError(err?.message || "Không thể tải dữ liệu hồ sơ.");
    } finally {
      if (mounted) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    if (user) fetchProfileData(mounted);
    return () => { mounted = false; };
  }, [user, fetchProfileData]);

  const allLessons = useMemo(() => lessonsStore.list(), []);
  const totalScore = useMemo(() => progress.reduce((s, p) => s + p.best_score, 0), [progress]);
  const completed = useMemo(() => progress.filter(p => p.completed).length, [progress]);
  const inProgress = useMemo(() => progress.filter(p => !p.completed && (p.blocks_read ?? 0) > 0).length, [progress]);
  const rank = useMemo(() => rankFor(totalScore), [totalScore]);

  // Daily XP map: gộp score theo ngày từ attempts
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

  // best ngày làm nhiều bài nhất (đếm số attempts/ngày)
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
    const slugs = new Set(allLessons.filter(l => l.language?.toLowerCase() === lang).map(l => l.slug));
    return progress.filter(p => p.completed && slugs.has(p.lesson_slug)).length;
  }, [allLessons, progress]);

  const badgeCtx: BadgeCtx = useMemo(() => ({
    completed,
    totalScore,
    streakDays,
    pythonCompleted: langCompleted("python"),
    jsCompleted: langCompleted("javascript"),
    debugCount: 0, // hook lên debug store nếu có
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

  // Recommend: bài đang học có blocks_read > 0 chưa completed, hoặc bài đầu tiên chưa làm
  const recommendLesson = useMemo(() => {
    const ongoing = progress.find(p => !p.completed && (p.blocks_read ?? 0) > 0);
    if (ongoing) return allLessons.find(l => l.slug === ongoing.lesson_slug) ?? null;
    return allLessons.find(l => !progress.some(p => p.lesson_slug === l.slug)) ?? null;
  }, [allLessons, progress]);

  const filteredLessons = useMemo(() => {
    return allLessons.filter(l => {
      const p = progress.find(x => x.lesson_slug === l.slug);
      if (lessonFilter === "done") return !!p?.completed;
      if (lessonFilter === "learning") return !!p && !p.completed && (p.blocks_read ?? 0) > 0;
      return true;
    });
  }, [allLessons, progress, lessonFilter]);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${username || "Tôi"} đang học code trên Code Nova • Rank ${rank.name} • ${totalScore} XP`;
    try {
      if (navigator.share) await navigator.share({ title: "Code Nova Profile", text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {}
  };

  // ─── Loading skeleton ──────
  if (authLoading || (user && loading)) {
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

  // ─── Error ──────
  if (error) {
    return (
      <CodeNovaLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="mb-4 h-10 w-10 text-destructive/70" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={() => fetchProfileData(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      </CodeNovaLayout>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Tổng quan", icon: LayoutGrid },
    { id: "activity", label: "Hoạt động", icon: Activity },
    { id: "achievements", label: "Thành tựu", icon: Medal },
  ];

  return (
    <CodeNovaLayout>
      {/* HERO ─────────────────────────── */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8">
        {/* glow decor */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
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

          {/* Right side: XP bar + actions + goal ring */}
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
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleShare}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-primary/50 hover:text-primary"
                  >
                    <Share2 className="h-3 w-3" /> {copied ? "Đã chép!" : "Chia sẻ"}
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
        <>
          {/* STATS */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Trophy className="h-5 w-5" />} label="Tổng XP" value={totalScore} sub={`${completed} bài hoàn thành`} gradient="from-yellow-500 to-orange-500" />
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
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {Array.from({ length: 7 }).reduce<number>((s, _, i) => s + (dailyXp.get(dayKey(new Date(Date.now() - i * 86400000))) ?? 0), 0)} XP
                </span>
              </div>
              <WeeklyChart dailyXp={dailyXp} />
            </section>
          </div>

          {/* LESSON GRID with filter */}
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Tiến độ bài học</h2>
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
            {filteredLessons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                Không có bài nào ở mục này.
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
        </>
      )}

      {/* ─── TAB: ACTIVITY ─────────────────────────── */}
      {tab === "activity" && (
        <>
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-primary" /> Heatmap 12 tuần
              </h2>
              <span className="text-xs text-muted-foreground">{activeDays.size} ngày học</span>
            </div>
            <Heatmap dailyXp={dailyXp} />
            <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
              Ít
              <div className="h-3 w-3 rounded-sm bg-secondary" />
              <div className="h-3 w-3 rounded-sm bg-primary/20" />
              <div className="h-3 w-3 rounded-sm bg-primary/40" />
              <div className="h-3 w-3 rounded-sm bg-primary/70" />
              <div className="h-3 w-3 rounded-sm bg-primary" />
              Nhiều
            </div>
          </section>

          {attempts.length > 0 ? (
            <section className="mt-6">
              <h2 className="mb-3 text-lg font-semibold">Lần nộp gần đây</h2>
              <div className="space-y-2">
                {attempts.slice(0, 15).map(a => {
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
            </section>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              Chưa có hoạt động nào. Vào học bài đầu tiên đi!
            </div>
          )}
        </>
      )}

      {/* ─── TAB: ACHIEVEMENTS ─────────────────────────── */}
      {tab === "achievements" && (
        <section>
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
              const pct = Math.min(100, Math.round((cur / tgt) * 100));
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
    </CodeNovaLayout>
  );
}
