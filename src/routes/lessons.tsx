import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, BookOpen, Wrench } from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore, type Lesson } from "@/lib/lessons-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Code Nova — Học lập trình từ con số 0" },
      {
        name: "description",
        content:
          "Nền tảng học lập trình miễn phí với AI hỗ trợ giải thích code và chữa lỗi tự động.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = async () => {
      setLoading(true);

      const data = await lessonsStore.listAsync();

      setLessons(data);
      setLoading(false);
    };

    refresh();

    window.addEventListener("codenova:lessons:changed", refresh);

    return () => {
      window.removeEventListener("codenova:lessons:changed", refresh);
    };
  }, []);

  return (
    <CodeNovaLayout>
      {/* Background Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      {/* Hero */}
      <section className="relative -mx-4 overflow-hidden px-4 pb-20 pt-12">
        <div className="absolute inset-0 -z-10 nova-grid-bg opacity-40" />

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 text-xs backdrop-blur">
            <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
            Nền tảng học lập trình miễn phí
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Học lập trình từ{" "}
            <span className="text-primary">con số 0</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            CodeNova giúp bạn học lập trình dễ dàng hơn với bài học trực quan,
            ví dụ thực tế và AI hỗ trợ chữa lỗi code miễn phí 24/7.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/lessons"
              className="
                inline-flex items-center gap-2 rounded-xl
                bg-primary px-5 py-3 text-sm font-medium
                text-primary-foreground transition-all
                hover:-translate-y-1
                hover:shadow-xl hover:shadow-primary/20
              "
            >
              Bắt đầu học
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              to="/playground"
              className="
                inline-flex items-center gap-2 rounded-xl
                border border-border bg-card/80
                px-5 py-3 text-sm font-medium
                backdrop-blur transition-all
                hover:bg-secondary
              "
            >
              <Sparkles className="h-4 w-4" />
              Thử AI sửa code
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mx-auto mt-16 grid max-w-5xl gap-5 sm:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: "Bài học trực quan",
              desc: "Lý thuyết ngắn gọn, dễ hiểu kèm ví dụ thực tế.",
            },
            {
              icon: Sparkles,
              title: "AI hỗ trợ",
              desc: "Giải thích code và chữa lỗi tự động bằng AI.",
            },
            {
              icon: Wrench,
              title: "Thực hành liên tục",
              desc: "Bài tập ứng dụng sau mỗi bài học giúp nhớ lâu hơn.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="
                rounded-2xl border border-border
                bg-card/80 p-6 backdrop-blur
                transition-all duration-300
                hover:-translate-y-1
                hover:border-primary
                hover:shadow-xl hover:shadow-primary/10
              "
            >
              <Icon className="mb-4 h-6 w-6 text-primary" />

              <h3 className="font-semibold">{title}</h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Lesson Section */}
      <section className="mt-6">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Bài học mới nhất
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {loading
                ? "Đang tải bài học..."
                : `${lessons.length} bài hiện có`}
            </p>
          </div>

          <Link
            to="/lessons"
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            Xem tất cả →
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="
                  h-72 animate-pulse rounded-2xl
                  border border-border bg-card
                "
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.slice(0, 6).map((l) => (
              <Link
                key={l.slug}
                to="/lesson/$slug"
                params={{ slug: l.slug }}
                className="
                  group flex flex-col overflow-hidden
                  rounded-2xl border border-border
                  bg-card/80 backdrop-blur
                  transition-all duration-300
                  hover:-translate-y-1
                  hover:border-primary
                  hover:shadow-xl hover:shadow-primary/10
                "
              >
                {l.image && (
                  <div className="overflow-hidden">
                    <img
                      src={l.image}
                      alt={l.title}
                      className="
                        aspect-[16/9] w-full object-cover
                        transition-transform duration-500
                        group-hover:scale-105
                      "
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <span className="mb-3 w-fit rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                    {l.level}
                  </span>

                  <h3 className="font-semibold transition-colors group-hover:text-primary">
                    {l.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted-foreground">
                    {l.description}
                  </p>

                  <span className="mt-4 text-xs text-muted-foreground">
                    {l.blocks.length} đoạn code ·{" "}
                    {l.exercises.length} bài tập
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </CodeNovaLayout>
  );
}
