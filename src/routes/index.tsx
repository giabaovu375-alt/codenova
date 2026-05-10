import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, BookOpen, Wrench } from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore, type Lesson } from "@/lib/lessons-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Code Nova — Học Python từ cơ bản đến nâng cao" },
      { name: "description", content: "Thư viện tài liệu Python tối giản, có AI hỗ trợ chữa code và sinh bài tập tự động." },
    ],
  }),
  component: Index,
});

function Index() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  useEffect(() => {
    const refresh = () => setLessons(lessonsStore.list());
    refresh();
    window.addEventListener("codenova:lessons:changed", refresh);
    return () => window.removeEventListener("codenova:lessons:changed", refresh);
  }, []);

  return (
    <CodeNovaLayout>
      {/* Hero */}
      <section className="relative -mx-4 px-4 pb-20 pt-10">
        <div className="absolute inset-0 -z-10 nova-grid-bg opacity-50" />
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            Phiên bản tài liệu Python
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Chào mừng bạn đến <span className="text-primary">Code Nova</span>
          </h1>
          <p className="mt-5 text-base text-muted-foreground sm:text-lg">
            Tài liệu lập trình Python tối giản, mạch lạc — đi kèm AI giúp bạn{" "}
            <span className="text-foreground">giải thích, chữa lỗi và sinh bài tập</span> ngay khi học.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/lessons"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Bắt đầu học <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/playground"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              <Sparkles className="h-4 w-4" /> Thử AI sửa code
            </Link>
          </div>
        </div>

        {/* Feature trio */}
        <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { icon: BookOpen, t: "Tài liệu sạch", d: "Mỗi bài hơn 15 đoạn code ngắn, có giải thích & bài tập." },
            { icon: Sparkles, t: "AI giải thích", d: "Click 1 nút để AI giải thích từng đoạn code." },
            { icon: Wrench, t: "AI chữa code", d: "Dán code, AI tìm lỗi và sửa — qua nhiều API miễn phí." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-lg border border-border bg-card p-5">
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <h3 className="font-medium">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lesson grid */}
      <section className="mt-4">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Bài học mới nhất</h2>
            <p className="mt-1 text-sm text-muted-foreground">{lessons.length} bài hiện có</p>
          </div>
          <Link to="/lessons" className="text-sm text-muted-foreground hover:text-foreground">
            Xem tất cả →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.slice(0, 6).map(l => (
            <Link
              key={l.slug}
              to="/lesson/$slug"
              params={{ slug: l.slug }}
              className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary"
            >
              {l.image && (
                <img src={l.image} alt={l.title} className="aspect-[16/9] w-full object-cover" />
              )}
              <div className="flex flex-1 flex-col p-5">
                <span className="mb-2 w-fit rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {l.level}
                </span>
                <h3 className="font-medium group-hover:text-primary">{l.title}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{l.description}</p>
                <span className="mt-3 text-xs text-muted-foreground">
                  {l.blocks.length} đoạn code · {l.exercises.length} bài tập
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </CodeNovaLayout>
  );
}
