//lessons.tsx — Production Ready (Fixed type, deduplicated fetch, clean)
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Search,
  RefreshCw,
  AlertCircle,
  X,
} from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore, type Lesson, LANGUAGE_LABELS, LEVEL_LABELS } from "@/lib/lessons-store";

export const Route = createFileRoute("/lessons")({
  head: () => ({
    meta: [
      { title: "Bài học — Code Nova" },
      {
        name: "description",
        content:
          "Danh sách tất cả bài học lập trình miễn phí tại CodeNova – lọc theo ngôn ngữ và cấp độ.",
      },
    ],
  }),
  component: LessonsPage,
});

// ─── Constants ──────────────────────────────────────
const SKELETON_COUNT = 6;
const LEVELS = ["Tất cả", "Cơ bản", "Trung cấp", "Nâng cao"] as const;

// ─── Helpers ────────────────────────────────────────
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const buildSearchIndex = (lesson: Lesson): string => {
  const parts = [
    lesson.title,
    lesson.description,
    lesson.language ? LANGUAGE_LABELS[lesson.language] || lesson.language : "",
  ];
  return normalize(parts.join(" "));
};

// ─── Types ──────────────────────────────────────────
type LessonWithIndex = Lesson & {
  searchIndex: string;
};

// ─── Sub‑components ─────────────────────────────────
const SkeletonCard = () => (
  <div className="h-72 animate-pulse rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/40" />
);

const LessonCard = ({
  lesson,
  index,
}: {
  lesson: LessonWithIndex;
  index: number;
}) => (
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
        <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
          {LEVEL_LABELS[lesson.level] || lesson.level}
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

// ─── Main Page ──────────────────────────────────────
function LessonsPage() {
  const [lessons, setLessons] = useState<LessonWithIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  // ── Debounce search ───────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch lessons (deduplicated, no fake mounted) ──
  const fetchLessons = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const data = await lessonsStore.listAsync();
      const enriched: LessonWithIndex[] = data.map((l) => ({
        ...l,
        searchIndex: buildSearchIndex(l),
      }));

      setLessons(enriched);
    } catch (err: any) {
      console.error("⚠️ Lessons load error:", err);
      setError(err?.message || "Không thể tải bài học. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial load + event listener ──────────────────
  useEffect(() => {
    fetchLessons(true);

    if (typeof window !== "undefined") {
      const handler = () => fetchLessons(false);
      window.addEventListener("codenova:lessons:changed", handler);
      return () => {
        window.removeEventListener("codenova:lessons:changed", handler);
      };
    }
  }, [fetchLessons]);

  // ── Retry ──────────────────────────────────────────
  const retry = () => {
    fetchLessons(true);
  };

  // ── Languages từ dữ liệu thật ─────────────────────
  const languages = useMemo(() => {
    const set = new Set<string>();
    lessons.forEach((l) => {
      if (l.language) set.add(l.language);
    });
    return Array.from(set).sort();
  }, [lessons]);

  // ── Filtered list ──────────────────────────────────
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
      result = result.filter((l) => l.searchIndex.includes(q));
    }

    return result;
  }, [lessons, languageFilter, levelFilter, debouncedSearch]);

  const hasFilters =
    languageFilter !== null || levelFilter !== null || debouncedSearch !== "";

  // ── Render ────────────────────────────────────────
  return (
    <CodeNovaLayout>
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-10">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại trang chủ
        </Link>

        {/* Header + Search */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              Tất cả bài học
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {loading
                ? "Đang tải..."
                : error
                  ? "Tạm thời chưa có dữ liệu"
                  : `Hiện có ${lessons.length} bài học`}
            </p>
          </div>

          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm bài học..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              disabled={loading}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Filter chips ──────────────────────────── */}
        {!error && lessons.length > 0 && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Cấp độ:</span>
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() =>
                    setLevelFilter(lvl === "Tất cả" ? null : lvl)
                  }
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    (lvl === "Tất cả" && !levelFilter) ||
                    levelFilter === lvl
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {languages.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Ngôn ngữ:
                </span>
                <button
                  onClick={() => setLanguageFilter(null)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    languageFilter === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  Tất cả
                </button>
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() =>
                      setLanguageFilter(
                        lang === languageFilter ? null : lang
                      )
                    }
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                      languageFilter === lang
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {LANGUAGE_LABELS[lang as keyof typeof LANGUAGE_LABELS] ||
                      lang}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Clear filters */}
        {hasFilters && !error && (
          <div className="mb-4">
            <button
              onClick={() => {
                setSearch("");
                setLanguageFilter(null);
                setLevelFilter(null);
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}

        {/* ── Loading ────────────────────────────────── */}
        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Error ──────────────────────────────────── */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 py-20 text-center">
            <AlertCircle className="mb-4 h-10 w-10 text-destructive/70" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={retry}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </button>
          </div>
        )}

        {/* ── Empty ──────────────────────────────────── */}
        {!loading && !error && lessons.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/50 py-20 text-center">
            <BookOpen className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <h3 className="font-medium">Chưa có bài học nào</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Quay lại sau nhé, bài học đang được thêm mỗi ngày.
            </p>
          </div>
        )}

        {/* ── No search results ──────────────────────── */}
        {!loading && !error && lessons.length > 0 && filteredLessons.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/50 py-20 text-center">
            <Search className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <h3 className="font-medium">Không tìm thấy bài học</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.
            </p>
          </div>
        )}

        {/* ── Success ────────────────────────────────── */}
        {!loading && !error && filteredLessons.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLessons.map((lesson, index) => (
              <LessonCard
                key={lesson.slug}
                lesson={lesson}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </CodeNovaLayout>
  );
        }
