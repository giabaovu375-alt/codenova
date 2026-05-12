import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Wrench,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore, type Lesson } from "@/lib/lessons-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Code Nova — Học lập trình từ con số 0" },
      {
        name: "description",
        content:
          "Nền tảng học lập trình miễn phí với AI hỗ trợ giải thích code, chữa lỗi và tạo bài tập tự động.",
      },
    ],
  }),
  component: Index,
});

// ─── Constants ──────────────────────────────────────
const FEATURES = [
  {
    icon: BookOpen,
    title: "Bài học trực quan",
    desc: "Lộ trình từ cơ bản đến nâng cao với ví dụ dễ hiểu.",
  },
  {
    icon: Sparkles,
    title: "AI hỗ trợ 24/7",
    desc: "Giải thích code, chữa lỗi và phân tích logic tự động.",
  },
  {
    icon: Wrench,
    title: "Thực hành thực tế",
    desc: "Bài tập ứng dụng giúp nhớ lâu và code tốt hơn.",
  },
] as const;

const SKELETON_COUNT = [1, 2, 3] as const;

// ─── Sub-components ─────────────────────────────────
const SkeletonCard = () => (
  <div className="h-72 rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 animate-pulse" />
);

const LessonCard = ({
  lesson,
  index,
}: {
  lesson: Lesson;
  index: number;
}) => (
  <Link
    to="/lesson/$slug"
    params={{ slug: lesson.slug }}
    className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl hover:shadow-primary/10 animate-in fade-in slide-in-from-bottom-4"
    style={{ animationDelay: `${index * 80}ms` }}
  >
    {lesson.image && (
      <div className="overflow-hidden">
        <img
          src={lesson.image}
          alt={lesson.title}
          loading="lazy"
          className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
    )}

    <div className="flex flex-1 flex-col p-5">
      <span className="mb-3 w-fit rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
        {lesson.level}
      </span>

      <h3 className="font-semibold transition-colors group-hover:text-primary">
        {lesson.title}
      </h3>

      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted-foreground">
        {lesson.description}
      </p>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{lesson.blocks.length} đoạn code</span>
        <span>{lesson.exercises.length} bài tập</span>
      </div>
    </div>
  </Link>
);

// ─── Main Component ─────────────────────────────────
function Index() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLessons = useCallback(async (mounted: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const data = await lessonsStore.listAsync();
      if (mounted) {
        setLessons([...data]);
      }
    } catch (err: any) {
      console.error("⚠️ Lỗi load bài học:", err);
      if (mounted) {
        setError(err?.message || "Không thể tải bài học. Vui lòng thử lại.");
        setLessons([]);
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  }, []);

  const retry = useCallback(() => {
    let mounted = true;
    fetchLessons(mounted);
  }, [fetchLessons]);

  useEffect(() => {
    let mounted = true;

    fetchLessons(mounted);

    const handler = () => {
      fetchLessons(mounted);
    };
    window.addEventListener("codenova:lessons:changed", handler);

    return () => {
      mounted = false;
      window.removeEventListener("codenova:lessons:changed", handler);
    };
  }, [fetchLessons]);

  const latestLessons = useMemo(
    () => lessons.slice(0, 6),
    [lessons],
  );

  return (
    <CodeNovaLayout>
      {/* ========== HERO ========== */}
      <section className="relative -mx-4 overflow-hidden px-4 pb-24 pt-14">
        <div className="absolute inset-0 -z-10 nova-grid-bg opacity-40" />
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

        {/* Background terminal chỉ desktop */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 select-none pointer-events-none hidden lg:block">
          <pre className="text-sm text-primary">
{`# CodeNova
print("Hello, learner!")

def learn():
    while True:
        read()
        practice()
        grow()`}
          </pre>
        </div>

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

        {/* ========== FEATURES ========== */}
        <div className="mx-auto mt-20 grid max-w-5xl gap-5 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-card/80 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== LESSONS SECTION ========== */}
      <section className="mt-2">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Bài học mới nhất
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {loading
                ? "Đang tải..."
                : error
                  ? "Tạm thời chưa có dữ liệu"
                  : `Hiện có ${lessons.length} bài học trên hệ thống`}
            </p>
          </div>

          <Link
            to="/lessons"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Xem tất cả →
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SKELETON_COUNT.map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 py-16 text-center">
            <AlertCircle className="mb-4 h-10 w-10 text-destructive/70" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={retry}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && lessons.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/50 py-16 text-center">
            <BookOpen className="mb-4 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Chưa có bài học nào. Hãy quay lại sau nhé!
            </p>
          </div>
        )}

        {/* Success */}
        {!loading && !error && latestLessons.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latestLessons.map((lesson, index) => (
              <LessonCard
                key={lesson.slug}
                lesson={lesson}
                index={index}
              />
            ))}
          </div>
        )}
      </section>
    </CodeNovaLayout>
  );
            }
