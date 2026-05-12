import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Wrench,
} from "lucide-react";

import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore, type Lesson } from "@/lib/lessons-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Code Nova — Học lập trình từ con số 0",
      },
      {
        name: "description",
        content:
          "Nền tảng học lập trình miễn phí với AI hỗ trợ giải thích code, chữa lỗi và tạo bài tập tự động.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = () => {
      setLessons(lessonsStore.list());

      // fake loading nhẹ cho mượt UI
      setTimeout(() => {
        setLoading(false);
      }, 1200);
    };

    refresh();

    window.addEventListener("codenova:lessons:changed", refresh);

    return () => {
      window.removeEventListener("codenova:lessons:changed", refresh);
    };
  }, []);

  // Loading Screen
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="h-20 w-20 rounded-full border-4 border-primary/20"></div>

            <div className="absolute inset-0 h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-primary"></div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Code Nova
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Đang tải nền tảng học lập trình...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CodeNovaLayout>
      {/* Hero */}
      <section className="relative -mx-4 overflow-hidden px-4 pb-24 pt-14">
        <div className="absolute inset-0 -z-10 nova-grid-bg opacity-40" />

        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs shadow-sm">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
            Nền tảng học lập trình miễn phí
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            Học lập trình từ{" "}
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              con số 0
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Code Nova giúp bạn học lập trình dễ dàng hơn với hệ thống bài học
            trực quan, ví dụ thực tế và AI hỗ trợ chữa lỗi code hoàn toàn miễn phí.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/lessons"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:-translate-y-1 hover:shadow-primary/40"
            >
              Bắt đầu học
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/playground"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium transition-all hover:bg-secondary"
            >
              <Sparkles className="h-4 w-4" />
              AI sửa code
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-20 grid max-w-5xl gap-5 sm:grid-cols-3">
          {[
            {
              icon: BookOpen,
              t: "Bài học trực quan",
              d: "Lộ trình từ cơ bản đến nâng cao với ví dụ dễ hiểu.",
            },
            {
              icon: Sparkles,
              t: "AI hỗ trợ 24/7",
              d: "Giải thích code, chữa lỗi và phân tích logic tự động.",
            },
            {
              icon: Wrench,
              t: "Thực hành thực tế",
              d: "Bài tập ứng dụng giúp nhớ lâu và code tốt hơn.",
            },
          ].map(({ icon: Icon, t, d }) => (
            <div
              key={t}
              className="group rounded-2xl border border-border bg-card/80 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>

              <h3 className="text-lg font-semibold">{t}</h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Lessons */}
      <section className="mt-2">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Bài học mới nhất
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Hiện có {lessons.length} bài học trên hệ thống
            </p>
          </div>

          <Link
            to="/lessons"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Xem tất cả →
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.slice(0, 6).map((l) => (
            <Link
              key={l.slug}
              to="/lesson/$slug"
              params={{ slug: l.slug }}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary"
            >
              {l.image && (
                <div className="overflow-hidden">
                  <img
                    src={l.image}
                    alt={l.title}
                    className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              )}

              <div className="p-5">
                <span className="mb-3 inline-block rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                  {l.level}
                </span>

                <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">
                  {l.title}
                </h3>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {l.description}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{l.blocks.length} đoạn code</span>
                  <span>{l.exercises.length} bài tập</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </CodeNovaLayout>
  );
}
