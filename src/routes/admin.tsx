// routes/admin.tsx — Premium Admin (không dùng useToast, toast inline)
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Sparkles, Loader2, Save, X, Lock, Wand2,
  Search, AlertCircle, RefreshCw, Copy, ExternalLink,
} from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { AdminEditor } from "@/components/AdminEditor";
import {
  lessonsStore,
  type Lesson,
  type LessonLanguage,
  LANGUAGE_LABELS,
  LEVEL_LABELS,
} from "@/lib/lessons-store";
import { hasAnyKey } from "@/lib/ai";
import { ADMIN_EMAIL, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Code Nova" }] }),
  component: AdminGate,
});

function AdminGate() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) {
    return (
      <CodeNovaLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CodeNovaLayout>
    );
  }
  if (!user || !isAdmin) {
    return (
      <CodeNovaLayout>
        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-semibold">Admin chỉ dành riêng</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Chỉ tài khoản <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">{ADMIN_EMAIL}</code> mới truy cập được.
          </p>
          {!user && (
            <Link
              to="/login"
              className="mt-5 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </CodeNovaLayout>
    );
  }
  return <Admin />;
}

function Admin() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState<LessonLanguage | "all">("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  // Toast đơn giản không cần hook riêng
  const [toast, setToast] = useState<string | null>(null);
  const show = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await lessonsStore.listAsync(true);
      setLessons(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let result = lessons;
    if (langFilter !== "all") result = result.filter(l => l.language === langFilter);
    if (levelFilter !== "all") result = result.filter(l => l.level === levelFilter);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        l =>
          l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [lessons, langFilter, levelFilter, debouncedSearch]);

  function newLesson() {
    setEditing({
      slug: "",
      title: "",
      level: "Cơ bản",
      language: "python",
      description: "",
      image: "",
      blocks: [],
      exercises: [],
      createdAt: Date.now(),
    });
  }

  async function handleSave(lesson: Lesson) {
    try {
      await lessonsStore.upsert(lesson);
      show("Đã lưu bài học thành công!");
      setEditing(null);
      await refresh();
    } catch (err: any) {
      show(err.message || "Lỗi khi lưu");
    }
  }

  async function handleDelete(slug: string) {
    if (!confirm("Xoá vĩnh viễn bài học này?")) return;
    try {
      await lessonsStore.remove(slug);
      show("Đã xoá bài học");
      await refresh();
    } catch (err: any) {
      show(err.message || "Lỗi khi xoá");
    }
  }

  async function handleClone(lesson: Lesson) {
    const clone: Lesson = {
      ...lesson,
      slug: lessonsStore.slugify(lesson.title + "-copy"),
      title: lesson.title + " (Copy)",
      blocks: lesson.blocks.map(b => ({ ...b, id: lessonsStore.newId() })),
      exercises: lesson.exercises.map(e => ({ ...e, id: lessonsStore.newId() })),
      createdAt: Date.now(),
    };
    try {
      await lessonsStore.upsert(clone);
      show("Đã nhân bản bài học");
      await refresh();
    } catch (err: any) {
      show(err.message || "Lỗi khi nhân bản");
    }
  }

  return (
    <CodeNovaLayout>
      {/* Toast inline */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-primary/90 px-4 py-3 text-sm text-primary-foreground shadow-lg">
          {toast}
        </div>
      )}

      {!editing ? (
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Quản lý bài học</h1>
              <p className="mt-1 text-sm text-muted-foreground">{lessons.length} bài học trên hệ thống</p>
            </div>
            <button
              onClick={newLesson}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:-translate-y-0.5 hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Thêm bài học mới
            </button>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm bài học..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition focus:border-primary"
              />
            </div>
            <select
              value={langFilter}
              onChange={e => setLangFilter(e.target.value as any)}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
            >
              <option value="all">Tất cả ngôn ngữ</option>
              {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
            >
              <option value="all">Tất cả cấp độ</option>
              {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Loading / Error / Table */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-card" />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 py-12">
              <AlertCircle className="mb-3 h-8 w-8 text-destructive/70" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <button onClick={refresh} className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
                <RefreshCw className="h-4 w-4" /> Thử lại
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/80 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Tiêu đề</th>
                    <th className="px-4 py-3">Ngôn ngữ</th>
                    <th className="px-4 py-3">Cấp độ</th>
                    <th className="px-4 py-3">Đoạn / BT</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground">
                        {lessons.length === 0 ? "Chưa có bài học nào." : "Không tìm thấy bài học."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(l => (
                      <tr key={l.slug} className="border-t border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{l.title}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                            {LANGUAGE_LABELS[l.language as LessonLanguage] ?? l.language ?? "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">
                            {LEVEL_LABELS[l.level] || l.level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {l.blocks.length} đoạn · {l.exercises.length} BT
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setEditing(l)} className="rounded-md px-3 py-1.5 text-xs text-primary hover:bg-primary/10">Sửa</button>
                            <button onClick={() => handleClone(l)} className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                            <Link to="/lesson/$slug" params={{ slug: l.slug }} className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></Link>
                            <button onClick={() => handleDelete(l.slug)} className="rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <AdminEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
          showToast={show}
        />
      )}
    </CodeNovaLayout>
  );
}
