// admin.tsx — Premium Admin Panel
// Fix: LANGUAGE_LABEL -> LANGUAGE_LABELS, async refresh, skeleton, AI generator...
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Trash2, Image as ImageIcon, Sparkles, Loader2,
  Save, X, Lock, Wand2, Search, AlertCircle, RefreshCw,
  Copy, ExternalLink, ChevronDown, CheckCircle, XCircle
} from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import {
  lessonsStore,
  type Lesson,
  type CodeBlock as CB,
  type Exercise,
  type LessonLanguage,
  LANGUAGE_LABELS,
  LEVEL_LABELS,
} from "@/lib/lessons-store";
import { explainCode, generateExercises, hasAnyKey, quickExplain, generateLessonContent } from "@/lib/ai";
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

// ─── Toast ──────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const show = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  const ToastUI = toast ? (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm shadow-lg ${
        toast.type === "ok" ? "bg-primary/90 text-primary-foreground" : "bg-destructive/90 text-destructive-foreground"
      }`}
    >
      {toast.type === "ok" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {toast.msg}
    </div>
  ) : null;
  return { show, ToastUI };
}

// ─── Main Admin ─────────────────────────────────
function Admin() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState<LessonLanguage | "all">("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const { show, ToastUI } = useToast();

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await lessonsStore.listAsync(true); // force refresh
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

  // Filter lessons
  const filtered = useMemo(() => {
    let result = lessons;
    if (langFilter !== "all") result = result.filter((l) => l.language === langFilter);
    if (levelFilter !== "all") result = result.filter((l) => l.level === levelFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [lessons, langFilter, levelFilter, search]);

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
      show("Đã lưu bài học thành công!", "ok");
      setEditing(null);
      await refresh();
    } catch (err: any) {
      show(err.message || "Lỗi khi lưu", "err");
    }
  }

  async function handleDelete(slug: string) {
    if (!confirm("Xoá vĩnh viễn bài học này?")) return;
    try {
      await lessonsStore.remove(slug);
      show("Đã xoá bài học", "ok");
      await refresh();
    } catch (err: any) {
      show(err.message || "Lỗi khi xoá", "err");
    }
  }

  async function handleClone(lesson: Lesson) {
    const clone: Lesson = {
      ...lesson,
      slug: lessonsStore.slugify(lesson.title + "-copy"),
      title: lesson.title + " (Copy)",
      blocks: lesson.blocks.map((b) => ({ ...b, id: lessonsStore.newId() })),
      exercises: lesson.exercises.map((e) => ({ ...e, id: lessonsStore.newId() })),
      createdAt: Date.now(),
    };
    try {
      await lessonsStore.upsert(clone);
      show("Đã nhân bản bài học", "ok");
      await refresh();
    } catch (err: any) {
      show(err.message || "Lỗi khi nhân bản", "err");
    }
  }

  return (
    <CodeNovaLayout>
      {ToastUI}
      {!editing && (
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
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition focus:border-primary"
              />
            </div>
            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value as any)}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
            >
              <option value="all">Tất cả ngôn ngữ</option>
              {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary"
            >
              <option value="all">Tất cả cấp độ</option>
              {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-card" />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 py-12">
              <AlertCircle className="mb-3 h-8 w-8 text-destructive/70" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                onClick={refresh}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                <RefreshCw className="h-4 w-4" /> Thử lại
              </button>
            </div>
          )}

          {/* Table */}
          {!loading && !error && (
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
                        {lessons.length === 0 ? "Chưa có bài học nào. Nhấn 'Thêm bài học mới' để bắt đầu." : "Không tìm thấy bài học phù hợp."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((l) => (
                      <tr key={l.slug} className="border-t border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{l.title}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                            {LANGUAGE_LABELS[l.language as LessonLanguage] || l.language}
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
                            <button
                              onClick={() => setEditing(l)}
                              className="rounded-md px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleClone(l)}
                              className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <Link
                              to="/lesson/$slug"
                              params={{ slug: l.slug }}
                              className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDelete(l.slug)}
                              className="rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
      )}

      {editing && (
        <Editor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
          showToast={show}
        />
      )}
    </CodeNovaLayout>
  );
}

// ─── Editor (sửa/mới) ────────────────────────────
function Editor({
  initial,
  onSave,
  onCancel,
  showToast,
}: {
  initial: Lesson;
  onSave: (l: Lesson) => Promise<void>;
  onCancel: () => void;
  showToast: (msg: string, type: "ok" | "err") => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [level, setLevel] = useState<Lesson["level"]>(initial.level || "Cơ bản");
  const [language, setLanguage] = useState<LessonLanguage>(initial.language ?? "python");
  const [description, setDescription] = useState(initial.description);
  const [image, setImage] = useState(initial.image ?? "");
  const [blocks, setBlocks] = useState<CB[]>(initial.blocks.length ? initial.blocks : []);
  const [exercises, setExercises] = useState<Exercise[]>(initial.exercises || []);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const slug = useMemo(() => initial.slug || lessonsStore.slugify(title), [initial.slug, title]);

  function addBlock() {
    setBlocks((prev) => [...prev, { id: lessonsStore.newId(), code: "", explanation: "" }]);
  }
  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }
  function updateBlock(id: string, patch: Partial<CB>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  async function handleAIExplainBlock(id: string, code: string) {
    if (!hasAnyKey()) {
      showToast("Thêm API key ở Cài đặt để dùng AI.", "err");
      return;
    }
    if (!code.trim()) return;
    try {
      const explanation = await explainCode(code, "fast", language);
      updateBlock(id, { explanation });
    } catch (e: any) {
      showToast(e.message || "Lỗi AI", "err");
    }
  }

  async function handleAIGenerateExercises() {
    if (!hasAnyKey()) {
      showToast("Thêm API key ở Cài đặt để dùng AI.", "err");
      return;
    }
    try {
      const topic = `${title}\n${description}\n${blocks.map(b => b.code).join('\n')}`;
      const prompts = await generateExercises(topic, 3, language);
      setExercises((prev) => [
        ...prev,
        ...prompts.map((p) => ({ id: lessonsStore.newId(), prompt: p })),
      ]);
      showToast("Đã thêm 3 bài tập mới!", "ok");
    } catch (e: any) {
      showToast(e.message || "Lỗi AI", "err");
    }
  }

  async function handleAIGenerateLesson() {
    if (!aiPrompt.trim()) {
      showToast("Nhập chủ đề để AI tạo bài học.", "err");
      return;
    }
    if (!hasAnyKey()) {
      showToast("Thêm API key ở Cài đặt.", "err");
      return;
    }
    setAiGenerating(true);
    try {
      const generated = await generateLessonContent(aiPrompt, language);
      setTitle(generated.title || title);
      setDescription(generated.description || description);
      if (generated.blocks) {
        const newBlocks = generated.blocks.map((b: any) => ({
          id: lessonsStore.newId(),
          code: b.code,
          explanation: b.explanation ?? "",
        }));
        setBlocks((prev) => [...prev, ...newBlocks]);
      }
      if (generated.exercises) {
        const newEx = generated.exercises.map((e: any) => ({
          id: lessonsStore.newId(),
          prompt: e.prompt,
        }));
        setExercises((prev) => [...prev, ...newEx]);
      }
      showToast("AI đã tạo nội dung bài học!", "ok");
    } catch (e: any) {
      showToast(e.message || "Lỗi AI", "err");
    } finally {
      setAiGenerating(false);
    }
  }

  function onImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!title.trim()) {
      showToast("Vui lòng nhập tiêu đề bài học.", "err");
      return;
    }
    const lesson: Lesson = {
      slug,
      title: title.trim(),
      level,
      language,
      description: description.trim(),
      image: image || undefined,
      blocks: blocks.filter((b) => b.code.trim()),
      exercises: exercises.filter((e) => e.prompt.trim()),
      createdAt: initial.createdAt || Date.now(),
    };
    await onSave(lesson);
  }

  return (
    <div className="rounded-xl border border-border bg-card/80 p-6 backdrop-blur">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" /> Huỷ
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
          >
            <Save className="h-4 w-4" /> Lưu bài học
          </button>
        </div>
      </div>

      {/* AI Generator */}
      <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Nhập chủ đề (VD: vòng lặp for trong Python)..."
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={handleAIGenerateLesson}
            disabled={aiGenerating}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Tạo bằng AI
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          AI sẽ tự động sinh tiêu đề, mô tả, đoạn code và bài tập.
        </p>
      </div>

      {/* Meta fields */}
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-2 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề bài học"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-lg font-medium focus:border-primary focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as Lesson["level"])}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LessonLanguage)}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn gọn về bài học"
            rows={3}
            className="w-full rounded-md border border-border bg-card p-3 text-sm focus:border-primary focus:outline-none"
          />
          <div className="rounded-md border border-border bg-secondary px-3 py-2 font-mono text-xs text-muted-foreground">
            Slug: <span className="text-foreground">{slug}</span>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Ảnh bài học</label>
          {image ? (
            <div className="relative overflow-hidden rounded-md border border-border">
              <img src={image} alt="" className="aspect-video w-full object-cover" />
              <button
                onClick={() => setImage("")}
                className="absolute right-2 top-2 rounded bg-background/80 p-1 hover:bg-background"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex aspect-video w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onImageFile(e.target.files[0])}
              />
              <span className="flex flex-col items-center gap-1 text-xs">
                <ImageIcon className="h-5 w-5" /> Chọn ảnh
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Blocks */}
      <div className="mb-8 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold">Đoạn code ({blocks.length})</h3>
          <button
            onClick={addBlock}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3 w-3" /> Thêm đoạn
          </button>
        </div>
        <div className="space-y-4">
          {blocks.map((b, i) => (
            <div key={b.id} className="rounded-md border border-border">
              <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">Đoạn {i + 1} · {LANGUAGE_LABELS[language]}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAIExplainBlock(b.id, b.code)}
                    className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 hover:border-primary hover:text-primary"
                  >
                    <Sparkles className="h-3 w-3" /> AI giải thích
                  </button>
                  <button
                    onClick={() => removeBlock(b.id)}
                    className="rounded border border-border p-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <textarea
                value={b.code}
                onChange={(e) => updateBlock(b.id, { code: e.target.value })}
                placeholder={`// Viết code ${LANGUAGE_LABELS[language]} ở đây`}
                spellCheck={false}
                className="block h-32 w-full bg-[oklch(0.13_0_0)] p-3 font-mono text-sm text-[oklch(0.95_0_0)] focus:outline-none"
              />
              <textarea
                value={b.explanation ?? ""}
                onChange={(e) => updateBlock(b.id, { explanation: e.target.value })}
                placeholder="Giải thích ngắn gọn (AI có thể điền tự động)"
                className="block h-16 w-full border-t border-border bg-card p-3 text-sm focus:outline-none"
              />
            </div>
          ))}
          {blocks.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có đoạn code nào. Bấm "Thêm đoạn".</p>
          )}
        </div>
      </div>

      {/* Exercises */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold">Bài tập cuối bài ({exercises.length})</h3>
          <div className="flex gap-2">
            <button
              onClick={handleAIGenerateExercises}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:border-primary hover:text-primary"
            >
              <Sparkles className="h-3 w-3" /> AI sinh 3 bài
            </button>
            <button
              onClick={() =>
                setExercises((prev) => [...prev, { id: lessonsStore.newId(), prompt: "" }])
              }
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-3 w-3" /> Thêm bài
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {exercises.map((e, i) => (
            <div key={e.id} className="flex gap-2">
              <span className="mt-2 w-6 text-right text-xs text-muted-foreground">{i + 1}.</span>
              <textarea
                value={e.prompt}
                onChange={(ev) =>
                  setExercises((prev) =>
                    prev.map((x) => (x.id === e.id ? { ...x, prompt: ev.target.value } : x))
                  )
                }
                placeholder="Mô tả bài tập..."
                className="h-16 flex-1 rounded-md border border-border bg-background p-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => setExercises((prev) => prev.filter((x) => x.id !== e.id))}
                className="self-start rounded-md border border-border p-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {exercises.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có bài tập. AI có thể giúp bạn tạo.</p>
          )}
        </div>
      </div>

      {!hasAnyKey() && (
        <p className="mt-4 rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
          Chưa có API key. <Link to="/settings" className="text-primary hover:underline">Thêm key ở Cài đặt</Link> để dùng các tính năng AI.
        </p>
      )}
    </div>
  );
              }
