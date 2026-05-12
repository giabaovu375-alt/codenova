// lessons.tsx — DEBUG LEVEL
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Search, RefreshCw, AlertCircle, X } from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore, type Lesson, LANGUAGE_LABELS } from "@/lib/lessons-store";

export const Route = createFileRoute("/lessons")({
  head: () => ({
    meta: [
      { title: "Bài học — Code Nova" },
      { name: "description", content: "Danh sách bài học." },
    ],
  }),
  component: LessonsPage,
});

const SKELETON_COUNT = 6;
const LEVELS = ["Tất cả", "Cơ bản", "Trung cấp", "Nâng cao"] as const;

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const SkeletonCard = () => (
  <div className="h-72 rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 animate-pulse" />
);

const LessonCard = ({ lesson, index }: { lesson: Lesson; index: number }) => (
  <Link
    to="/lesson/$slug"
    params={{ slug: lesson.slug }}
    className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-xl hover:shadow-primary/10 animate-in fade-in slide-in-from-bottom-4"
    style={{ animationDelay: `${index * 70}ms` }}
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
      <div className="mb-3 flex items-center gap-2">
        {/* === TEST HIỂN THỊ LEVEL === */}
        <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
          LV: {lesson.level || "NULL"}
        </span>
        {lesson.language && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            {LANGUAGE_LABELS[lesson.language] || lesson.language}
          </span>
        )}
      </div>
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

function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLessons = useCallback(
    async (mounted: boolean, showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);
        const data = await lessonsStore.listAsync();
        console.log("📦 Lessons data:", data.map(l => ({ slug: l.slug, level: l.level })));
        if (mounted) setLessons([...data]);
      } catch (err: any) {
        console.error(err);
        if (mounted) setError(err?.message || "Lỗi tải bài học.");
      } finally {
        if (mounted) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    fetchLessons(mounted, true);
    if (typeof window === "undefined") return;
    const handler = () => fetchLessons(mounted, false);
    window.addEventListener("codenova:lessons:changed", handler);
    return () => {
      mounted = false;
      window.removeEventListener("codenova:lessons:changed", handler);
    };
  }, [fetchLessons]);

  const retry = () => {
    let mounted = true;
    fetchLessons(mounted, true);
  };

  const languages = useMemo(() => {
    const set = new Set<string>();
    lessons.forEach((l) => {
      if (l.language) set.add(l.language);
    });
    return Array.from(set).sort();
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    let result = lessons;
    if (languageFilter) {
      result = result.filter((l) => l.language === languageFilter);
    }
    if (levelFilter) {
      result = result.filter((l) => l.level === levelFilter);
    }
    const q = normalize(debouncedSearch.trim());
    if (q) {
      result = result.filter(
        (l) =>
          normalize(l.title).includes(q) ||
          normalize(l.description).includes(q) ||
          (LANGUAGE_LABELS[l.language] || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [lessons, languageFilter, levelFilter, debouncedSearch]);

  const hasFilters = languageFilter !== null || levelFilter !== null || debouncedSearch !== "";

  return (
    <CodeNovaLayout>
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-10">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại trang chủ
        </Link>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Tất cả bài học</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {loading ? "Đang tải..." : error ? "L��i" : `${lessons.length} bài học`}
            </p>
          </div>
          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm bài học..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm outline-none"
              disabled={loading}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        {!error && lessons.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Cấp độ:</span>
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl === "Tất cả" ? null : lvl)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  (lvl === "Tất cả" && !levelFilter) || levelFilter === lvl
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center py-20">
            <AlertCircle className="mb-4 h-10 w-10 text-destructive/70" />
            <p>{error}</p>
            <button onClick={retry} className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground">
              <RefreshCw className="inline h-4 w-4" /> Thử lại
            </button>
          </div>
        )}

        {!loading && !error && lessons.length === 0 && (
          <div className="py-20 text-center">
            <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
            <p>Chưa có bài học nào.</p>
          </div>
        )}

        {!loading && !error && filteredLessons.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLessons.map((lesson, index) => (
              <LessonCard key={lesson.slug} lesson={lesson} index={index} />
            ))}
          </div>
        )}
      </div>
    </CodeNovaLayout>
  );
}
