// profile.tsx — PREMIUM v3
// UI nâng cấp kiểu app lớn (Duolingo / LeetCode / GitHub):
// hero gradient, avatar có ring + level, XP bar tới rank kế tiếp,
// stat card có icon nền gradient, badge locked/unlocked,
// lesson grid thay table, activity dots 30 ngày.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Trophy, BookOpen, Award, ArrowRight, User,
  CalendarDays, Flame, TrendingUp, AlertCircle,
  RefreshCw, Loader2, Star, Zap, Bug, Code, Lock,
  Sparkles, Target, CheckCircle2,
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
const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || "U";

const computeStreak = (dates: string[]): number => {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i + 1]).getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.1) streak++;
    else break;
  }
  return streak;
};

// XP thresholds cho từng rank (giả định, fallback nếu rankFor không trả)
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

const BADGES = [
  { id: "first_lesson", icon: BookOpen, label: "Bài đầu tiên", desc: "Hoàn thành 1 bài học", color: "from-blue-500 to-cyan-500" },
  { id: "score_100", icon: Trophy, label: "100 điểm", desc: "Tích lũy 100 điểm", color: "from-yellow-500 to-orange-500" },
  { id: "streak_7", icon: Flame, label: "7 ngày", desc: "Streak 7 ngày liên tục", color: "from-orange-500 to-red-500" },
  { id: "python_master", icon: Code, label: "Python Master", desc: "Hoàn thành 5 bài Python", color: "from-green-500 to-emerald-500" },
  { id: "ai_debugger", icon: Bug, label: "AI Debugger", desc: "Dùng AI sửa code 10 lần", color: "from-purple-500 to-pink-500" },
  { id: "speedster", icon: Zap, label: "Tốc độ", desc: "Hoàn thành 3 bài trong 1 ngày", color: "from-amber-400 to-yellow-600" },
];

// ─── Sub-components ─────────────────────────────────
const StatCard = ({ icon, label, value, sub, gradient }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; gradient: string;
}) => (
  <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl">
    <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />
    <div className="relative">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
        {icon}
      </div>
      <div className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  </div>
);

const MiniBar = ({ current, total }: { current: number; total: number }) => {
  const percent = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500" style={{ width: `${percent}%` }} />
    </div>
  );
};

// Activity dots 30 ngày gần nhất (kiểu GitHub mini)
const ActivityStrip = ({ dates }: { dates: Set<string> }) => {
  const days = useMemo(() => {
    const arr: { date: string; active: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      arr.push({ date: d, active: dates.has(d) });
    }
    return arr;
  }, [dates]);
  return (
    <div className="flex items-end gap-1">
      {days.map(d => (
        <div
          key={d.date}
          title={d.date}
          className={`h-6 flex-1 rounded-sm transition-all ${
            d.active ? "bg-gradient-to-t from-primary to-primary/60" : "bg-secondary"
          }`}
        />
      ))}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────
function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [attempts, setAttempts] = useState<ExerciseAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const rank = useMemo(() => rankFor(totalScore), [totalScore]);

  const activeDays = useMemo(() => {
    const set = new Set<string>();
    attempts.forEach(a => set.add(new Date(a.created_at).toISOString().slice(0, 10)));
    return set;
  }, [attempts]);

  const streakDays = useMemo(() => computeStreak(Array.from(activeDays)), [activeDays]);

  // XP progress tới rank tiếp theo
  const nextThreshold = useMemo(() => getNextThreshold(totalScore), [totalScore]);
  const prevThreshold = useMemo(() => getPrevThreshold(totalScore), [totalScore]);
  const xpPercent = useMemo(() => {
    const span = nextThreshold - prevThreshold;
    if (span <= 0) return 100;
    return Math.min(100, Math.round(((totalScore - prevThreshold) / span) * 100));
  }, [totalScore, nextThreshold, prevThreshold]);

  const ownedBadges = useMemo(() => {
    const owned = new Set<string>();
    if (completed >= 1) owned.add("first_lesson");
    if (totalScore >= 100) owned.add("score_100");
    if (streakDays >= 7) owned.add("streak_7");
    const pythonLessons = allLessons.filter(l => l.language?.toLowerCase() === "python");
    const pythonCompleted = progress.filter(p => p.completed && pythonLessons.some(l => l.slug === p.lesson_slug)).length;
    if (pythonCompleted >= 5) owned.add("python_master");
    return owned;
  }, [completed, totalScore, streakDays, allLessons, progress]);

  // ─── Loading ──────
  if (authLoading || (user && loading)) {
    return (
      <CodeNovaLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Đang tải hồ sơ...</p>
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

  return (
    <CodeNovaLayout>
      {/* HERO ─────────────────────────── */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        {/* glow decor */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            {/* Avatar với ring + level badge */}
            <div className="relative">
              <div className="rounded-full bg-gradient-to-br from-primary via-primary/70 to-primary/40 p-[3px]">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-card bg-secondary flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-primary">{getInitial(username || user.email || "U")}</span>
                  )}
                </div>
              </div>
              {/* Level chip */}
              <div className="absolute -bottom-1 -right-1 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-card bg-primary px-1.5 text-xs font-bold text-primary-foreground shadow-md">
                {ownedBadges.size + 1}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{username || user.email?.split("@")[0]}</h1>
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold ${rank.color}`}>
                <Award className="h-3.5 w-3.5" /> {rank.name}
              </div>
            </div>
          </div>

          {/* XP bar tới rank tiếp theo */}
          <div className="min-w-[260px] rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Tiến độ rank</span>
              <span className="font-bold text-primary">{totalScore} / {nextThreshold} XP</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all duration-700"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3" /> Còn {Math.max(0, nextThreshold - totalScore)} XP tới rank mới
            </div>
          </div>
        </div>
      </div>

      {/* STATS ─────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="Tổng XP"
          value={totalScore.toString()}
          sub={`${completed} bài hoàn thành`}
          gradient="from-yellow-500 to-orange-500"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Đã học"
          value={`${progress.filter(p => p.blocks_read > 0).length}/${allLessons.length}`}
          sub="bài học mở khóa"
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          icon={<Flame className="h-5 w-5" />}
          label="Streak"
          value={`${streakDays}`}
          sub={streakDays > 0 ? "ngày liên tục 🔥" : "Bắt đầu hôm nay!"}
          gradient="from-orange-500 to-red-500"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Hoàn thành"
          value={`${completed}`}
          sub={`${Math.round((completed / Math.max(1, allLessons.length)) * 100)}% tổng số`}
          gradient="from-green-500 to-emerald-500"
        />
      </div>

      {/* ACTIVITY ─────────────────────────── */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" /> Hoạt động 30 ngày
          </h2>
          <span className="text-xs text-muted-foreground">{activeDays.size} ngày học</span>
        </div>
        <ActivityStrip dates={activeDays} />
      </section>

      {/* BADGES ─────────────────────────── */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Star className="h-5 w-5 text-yellow-500" /> Huy hiệu
          </h2>
          <span className="text-xs text-muted-foreground">{ownedBadges.size}/{BADGES.length} đã mở</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BADGES.map(b => {
            const owned = ownedBadges.has(b.id);
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                title={b.desc}
                className={`group relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                  owned
                    ? "border-border bg-card hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
                    : "border-dashed border-border bg-secondary/30 opacity-60"
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  owned ? `bg-gradient-to-br ${b.color} text-white shadow-md` : "bg-secondary text-muted-foreground"
                }`}>
                  {owned ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </div>
                <div className="text-xs font-semibold">{b.label}</div>
                <div className="text-[10px] leading-tight text-muted-foreground">{b.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* LESSON PROGRESS GRID ─────────────────────────── */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Tiến độ bài học</h2>
        {allLessons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Chưa có bài học nào.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allLessons.map(l => {
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

      {/* RECENT ATTEMPTS ─────────────────────────── */}
      {attempts.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Lần nộp gần đây</h2>
          <div className="space-y-2">
            {attempts.slice(0, 10).map(a => {
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
      )}
    </CodeNovaLayout>
  );
}
