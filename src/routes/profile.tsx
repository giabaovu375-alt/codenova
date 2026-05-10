import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, BookOpen, Award, ArrowRight } from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { useAuth } from "@/lib/auth";
import { progressStore, rankFor, type LessonProgress, type ExerciseAttempt } from "@/lib/progress-store";
import { lessonsStore } from "@/lib/lessons-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Hồ sơ — Code Nova" }] }),
  component: Profile,
});

function Profile() {
  const { user, loading } = useAuth();
  const [username, setUsername] = useState<string>("");
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [attempts, setAttempts] = useState<ExerciseAttempt[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? ""));
    progressStore.listMine().then(setProgress);
    progressStore.listAttempts().then(setAttempts);
  }, [user]);

  if (loading) {
    return <CodeNovaLayout><div className="py-20 text-center text-sm text-muted-foreground">Đang tải…</div></CodeNovaLayout>;
  }
  if (!user) {
    return (
      <CodeNovaLayout>
        <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">Cần đăng nhập</h1>
          <p className="mt-2 text-sm text-muted-foreground">Đăng nhập để xem điểm và tiến độ học của bạn.</p>
          <Link to="/login" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Đăng nhập
          </Link>
        </div>
      </CodeNovaLayout>
    );
  }

  const totalScore = progress.reduce((s, p) => s + p.best_score, 0);
  const completed = progress.filter(p => p.completed).length;
  const rank = rankFor(totalScore);
  const allLessons = lessonsStore.list();

  return (
    <CodeNovaLayout>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{username || user.email}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-2">
          <Award className={"h-5 w-5 " + rank.color} />
          <div>
            <div className="text-xs text-muted-foreground">Hạng</div>
            <div className={"text-sm font-semibold " + rank.color}>{rank.name}</div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Trophy className="h-5 w-5 text-primary" />} label="Tổng điểm" value={totalScore.toString()} />
        <Stat icon={<BookOpen className="h-5 w-5 text-primary" />} label="Bài hoàn thành" value={`${completed}/${allLessons.length}`} />
        <Stat
          icon={<Award className="h-5 w-5 text-primary" />}
          label={rank.next ? `Tới hạng tiếp` : "Đỉnh cao"}
          value={rank.next ? `${rank.next - totalScore} điểm` : "—"}
        />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Tiến độ bài học</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Bài học</th>
                <th className="px-4 py-3">Đã đọc</th>
                <th className="px-4 py-3">Điểm cao nhất</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {allLessons.map(l => {
                const p = progress.find(x => x.lesson_slug === l.slug);
                return (
                  <tr key={l.slug} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{l.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p?.blocks_read ?? 0}/{l.blocks.length}
                    </td>
                    <td className="px-4 py-3">
                      <span className={p?.best_score ? "font-semibold text-primary" : "text-muted-foreground"}>
                        {p?.best_score ?? 0}/10
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p?.completed ? (
                        <span className="rounded bg-primary/15 px-2 py-0.5 text-primary">Hoàn thành</span>
                      ) : p?.blocks_read ? (
                        <span className="text-muted-foreground">Đang học</span>
                      ) : (
                        <span className="text-muted-foreground">Chưa bắt đầu</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/lesson/$slug" params={{ slug: l.slug }} className="inline-flex items-center gap-1 text-primary hover:underline">
                        Mở <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {attempts.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Lần nộp bài gần đây</h2>
          <div className="space-y-2">
            {attempts.slice(0, 10).map(a => {
              const lesson = allLessons.find(l => l.slug === a.lesson_slug);
              return (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">{lesson?.title ?? a.lesson_slug}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("vi-VN")}
                    </div>
                  </div>
                  <span className={"font-semibold " + (a.score >= 7 ? "text-primary" : "text-muted-foreground")}>
                    {a.score}/10
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </CodeNovaLayout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
