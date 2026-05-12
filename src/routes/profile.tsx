// profile.tsx — PREMIUM v2
// Sửa: streak thật, mini bar, avatar fallback chữ cái,
// badge achievement, memo lessons, sẵn sàng scale.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Trophy, BookOpen, Award, ArrowRight, User,
  CalendarDays, Flame, TrendingUp, AlertCircle,
  RefreshCw, Loader2, Star, Zap, Bug, Code,
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

// Tính streak thật từ mảng ngày (YYYY-MM-DD)
const computeStreak = (dates: string[]): number => {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse(); // mới nhất trước
  let streak = 1;
  const today = new Date().toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== today) {
    // Không có ngày hôm nay hoặc hôm qua thì streak = 0
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = new Date(sorted[i]);
    const next = new Date(sorted[i + 1]);
    const diffDays = (current.getTime() - next.getTime()) / 86400000;
    if (Math.abs(diffDays - 1) < 0.1) streak++;
    else break;
  }
  return streak;
};

// Badge definitions
const BADGES = [
  { id: "first_lesson", icon: BookOpen, label: "Bài đầu tiên", desc: "Hoàn thành 1 bài học" },
  { id: "score_100", icon: Trophy, label: "100 điểm", desc: "Tích lũy 100 điểm" },
  { id: "streak_7", icon: Flame, label: "7 ngày", desc: "Duy trì streak 7 ngày" },
  { id: "python_master", icon: Code, label: "Python Master", desc: "Hoàn thành 5 bài Python" },
  { id: "ai_debugger", icon: Bug, label: "AI Debugger", desc: "Dùng AI sửa code 10 lần" },
];

// ─── Sub-components ─────────────────────────────────
const StatCard = ({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
}) => (
  <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-5 transition-all hover:border-primary hover:shadow-md">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
    </div>
    <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
    {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
  </div>
);

const MiniBar = ({ current, total }: { current: number; total: number }) => {
  const percent = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-secondary">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
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

  // Memo lessons để tránh sync lại mỗi render (sau này sẽ thay bằng async cache)
  const allLessons = useMemo(() => lessonsStore.list(), []);

  const totalScore = useMemo(() => progress.reduce((s, p) => s + p.best_score, 0), [progress]);
  const completed = useMemo(() => progress.filter(p => p.completed).length, [progress]);
  const rank = useMemo(() => rankFor(totalScore), [totalScore]);

  // Streak thật: lấy danh sách ngày từ attempts
  const streakDays = useMemo(() => {
    const daySet = new Set<string>();
    attempts.forEach(a => {
      const d = new Date(a.created_at).toISOString().slice(0, 10);
      daySet.add(d);
    });
    return computeStreak(Array.from(daySet));
  }, [attempts]);

  // Badge logic
  const badges = useMemo(() => {
    const owned: string[] = [];
    if (completed >= 1) owned.push("first_lesson");
    if (totalScore >= 100) owned.push("score_100");
    if (streakDays >= 7) owned.push("streak_7");
    // Python master badge nếu có 5 bài Python đã hoàn thành
    const pythonLessons = allLessons.filter(l => l.language?.toLowerCase() === "python");
    const pythonCompleted = progress.filter(p => p.completed && pythonLessons.some(l => l.slug === p.lesson_slug)).length;
    if (pythonCompleted >= 5) owned.push("python_master");
    // AI debugger nếu dùng AI sửa code 10 lần (giả định có store riêng, hiện tại để mock)
    // owned.push("ai_debugger");
    return BADGES.filter(b => owned.includes(b.id));
  }, [completed, totalScore, streakDays, allLessons, progress]);

  // ─── Loading state ──────────────────────────────
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

  // ─── Not logged in ──────────────────────────────
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

  // ─── Error state ────────────────────────────────
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
      {/* Header */}
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar với fallback chữ cái */}
          <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-primary/30 bg-secondary flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">{getInitial(username || user.email || "U")}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{username || user.email?.split("@")[0]}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-3 backdrop-blur">
          <Award className={`h-6 w-6 ${rank.color}`} />
          <div>
            <div className="text-xs text-muted-foreground">Hạng hiện tại</div>
            <div className={`text-lg font-bold ${rank.color}`}>{rank.name}</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Trophy className="h-5 w-5 text-yellow-500" />} label="Tổng điểm" value={totalScore.toString()} sub={`${completed} bài hoàn thành`} />
        <StatCard icon={<BookOpen className="h-5 w-5 text-primary" />} label="Đã học" value={`${progress.filter(p => p.blocks_read > 0).length}/${allLessons.length}`} sub="bài học" />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-green-500" />} label="Streak" value={`${streakDays} ngày`} sub={streakDays > 0 ? "🔥 liên tục" : "Bắt đầu hôm nay!"} />
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Star className="h-5 w-5 text-yellow-500" /> Huy hiệu đã mở khóa
          </h2>
          <div className="flex flex-wrap gap-3">
            {badges.map(b => (
              <div key={b.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm">
                <b.icon className="h-4 w-4 text-primary" />
                <span className="font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lesson Progress Table */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Tiến độ bài học</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/80 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Bài học</th>
                <th className="px-4 py-3">Đọc</th>
                <th className="px-4 py-3">Điểm</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {allLessons.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Chưa có bài học nào.</td></tr>
              ) : allLessons.map(l => {
                const p = progress.find(x => x.lesson_slug === l.slug);
                return (
                  <tr key={l.slug} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{l.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <MiniBar current={p?.blocks_read ?? 0} total={l.blocks.length} />
                      <span className="text-xs ml-2">{p?.blocks_read ?? 0}/{l.blocks.length}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={p?.best_score ? "font-semibold text-primary" : "text-muted-foreground"}>
                        {p?.best_score ?? 0}/10
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p?.completed ? (
                        <span className="rounded-full bg-primary/15 px-3 py-1 text-primary">Hoàn thành</span>
                      ) : p?.blocks_read ? (
                        <span className="text-muted-foreground">Đang học</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/lesson/$slug" params={{ slug: l.slug }} className="inline-flex items-center gap-1 text-primary hover:underline">
                        Vào học <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Attempts */}
      {attempts.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Lần nộp bài gần đây</h2>
          <div className="space-y-2">
            {attempts.slice(0, 10).map(a => {
              const lesson = allLessons.find(l => l.slug === a.lesson_slug);
              return (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card/70 px-4 py-3 text-sm backdrop-blur hover:border-primary/50">
                  <div>
                    <div className="font-medium">{lesson?.title ?? a.lesson_slug}</div>
                    <div className="text-xs text-muted-foreground">
                      <CalendarDays className="mr-1 inline h-3 w-3" />
                      {new Date(a.created_at).toLocaleString("vi-VN")}
                    </div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${a.score >= 7 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
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
