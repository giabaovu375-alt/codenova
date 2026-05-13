// components/AdminEditor.tsx — Premium Editor v2
// Fix: delete target type, draft overwrite, corrupt draft cleanup, image size limit,
// AI loading state, unused imports removed
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Trash2, Image as ImageIcon, Sparkles, Save, X,
  AlertTriangle, Loader2
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  lessonsStore,
  type Lesson,
  type CodeBlock as CB,
  type Exercise,
  type LessonLanguage,
  LANGUAGE_LABELS,
  LEVEL_LABELS,
} from "@/lib/lessons-store";
import { explainCode, generateExercises, hasAnyKey } from "@/lib/ai";

type Props = {
  initial: Lesson;
  onSave: (lesson: Lesson) => Promise<void>;
  onCancel: () => void;
  showToast: (msg: string, type: "ok" | "err") => void;
};

const DRAFT_KEY = "admin:draft";
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

export function AdminEditor({ initial, onSave, onCancel, showToast }: Props) {
  const isNew = !initial.slug;

  const [title, setTitle] = useState(initial.title);
  const [level, setLevel] = useState<Lesson["level"]>(initial.level || "Cơ bản");
  const [language, setLanguage] = useState<LessonLanguage>(initial.language ?? "python");
  const [description, setDescription] = useState(initial.description);
  const [image, setImage] = useState(initial.image ?? "");
  const [blocks, setBlocks] = useState<CB[]>(initial.blocks.length ? initial.blocks : []);
  const [exercises, setExercises] = useState<Exercise[]>(initial.exercises || []);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "block" | "exercise";
    id: string;
  } | null>(null);

  const [draftLoaded, setDraftLoaded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const slug = useMemo(
    () => initial.slug || lessonsStore.slugify(title),
    [initial.slug, title]
  );

  // Khôi phục draft (chỉ cho bài mới)
  useEffect(() => {
    if (!isNew) {
      setDraftLoaded(true);
      return;
    }
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        setTitle(draft.title || "");
        setLevel(draft.level || "Cơ bản");
        setLanguage(draft.language || "python");
        setDescription(draft.description || "");
        setImage(draft.image || "");
        setBlocks(draft.blocks || []);
        setExercises(draft.exercises || []);
        showToast("Đã khôi phục bản nháp", "ok");
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY); // corrupted draft
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  // Autosave draft (chỉ khi đã load draft và là bài mới)
  useEffect(() => {
    if (!isNew || !draftLoaded) return;
    const draft = { title, level, language, description, image, blocks, exercises };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [title, level, language, description, image, blocks, exercises, isNew, draftLoaded]);

  const addBlock = () => {
    setBlocks(prev => [...prev, { id: lessonsStore.newId(), code: "", explanation: "" }]);
  };

  const confirmDelete = (type: "block" | "exercise", id: string) => {
    setDeleteTarget({ type, id });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "block") {
      setBlocks(prev => prev.filter(b => b.id !== deleteTarget.id));
    } else {
      setExercises(prev => prev.filter(e => e.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const updateBlock = (id: string, patch: Partial<CB>) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));
  };

  const handleAIExplainBlock = async (id: string, code: string) => {
    if (!hasAnyKey()) {
      showToast("Thêm API key ở Cài đặt để dùng AI.", "err");
      return;
    }
    if (!code.trim()) return;
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const explanation = await explainCode(code, "fast", language);
      updateBlock(id, { explanation });
    } catch (e: any) {
      showToast(e.message || "Lỗi AI", "err");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIGenerateExercises = async () => {
    if (!hasAnyKey()) {
      showToast("Thêm API key ở Cài đặt để dùng AI.", "err");
      return;
    }
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const topic = `${title}\n${description}\n${blocks.map(b => b.code).join('\n')}`;
      const prompts = await generateExercises(topic, 3, language);
      setExercises(prev => [
        ...prev,
        ...prompts.map(p => ({ id: lessonsStore.newId(), prompt: p })),
      ]);
      showToast("Đã thêm 3 bài tập mới!", "ok");
    } catch (e: any) {
      showToast(e.message || "Lỗi AI", "err");
    } finally {
      setAiLoading(false);
    }
  };

  const onImageFile = (file: File) => {
    if (file.size > MAX_IMAGE_SIZE) {
      showToast("Ảnh quá lớn (tối đa 2MB)", "err");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
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
      blocks: blocks.filter(b => b.code.trim()),
      exercises: exercises.filter(e => e.prompt.trim()),
      createdAt: initial.createdAt || Date.now(),
    };
    await onSave(lesson);
    localStorage.removeItem(DRAFT_KEY);
  };

  return (
    <div className="rounded-xl border border-border bg-card/80 p-6 backdrop-blur">
      {/* Header buttons */}
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onCancel} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" /> Huỷ
        </button>
        <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90">
          <Save className="h-4 w-4" /> Lưu bài học
        </button>
      </div>

      {/* Meta fields */}
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-2 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề bài học" className="w-full rounded-md border border-border bg-card px-3 py-2 text-lg font-medium focus:border-primary focus:outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <select value={level} onChange={e => setLevel(e.target.value as Lesson["level"])} className="rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none">
              {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select value={language} onChange={e => setLanguage(e.target.value as LessonLanguage)} className="rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none">
              {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả ngắn gọn" rows={3} className="w-full rounded-md border border-border bg-card p-3 text-sm focus:border-primary focus:outline-none" />
          <div className="rounded-md border border-border bg-secondary px-3 py-2 font-mono text-xs text-muted-foreground">
            Slug: <span className="text-foreground">{slug}</span>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Ảnh bài học</label>
          {image ? (
            <div className="relative overflow-hidden rounded-md border border-border">
              <img src={image} alt="" className="aspect-video w-full object-cover" />
              <button onClick={() => setImage("")} className="absolute right-2 top-2 rounded bg-background/80 p-1 hover:bg-background"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <label className="flex aspect-video w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground">
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onImageFile(e.target.files[0])} />
              <span className="flex flex-col items-center gap-1 text-xs"><ImageIcon className="h-5 w-5" /> Chọn ảnh</span>
            </label>
          )}
        </div>
      </div>

      {/* Blocks */}
      <div className="mb-8 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Đoạn code ({blocks.length})</h3>
          <button onClick={addBlock} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90">
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
                    disabled={aiLoading}
                    className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" /> AI giải thích
                  </button>
                  <button onClick={() => confirmDelete("block", b.id)} className="rounded border border-border p-0.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <textarea value={b.code} onChange={e => updateBlock(b.id, { code: e.target.value })} placeholder={`// Viết code ${LANGUAGE_LABELS[language]} ở đây`} spellCheck={false} className="block h-32 w-full bg-[oklch(0.13_0_0)] p-3 font-mono text-sm text-[oklch(0.95_0_0)] focus:outline-none" />
              <textarea value={b.explanation ?? ""} onChange={e => updateBlock(b.id, { explanation: e.target.value })} placeholder="Giải thích ngắn gọn" className="block h-16 w-full border-t border-border bg-card p-3 text-sm focus:outline-none" />
            </div>
          ))}
          {blocks.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có đoạn code. Bấm "Thêm đoạn".</p>
          )}
        </div>
      </div>

      {/* Exercises */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Bài tập cuối bài ({exercises.length})</h3>
          <div className="flex gap-2">
            <button
              onClick={handleAIGenerateExercises}
              disabled={aiLoading}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" /> AI sinh 3 bài
            </button>
            <button onClick={() => setExercises(prev => [...prev, { id: lessonsStore.newId(), prompt: "" }])} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90">
              <Plus className="h-3 w-3" /> Thêm bài
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {exercises.map((e, i) => (
            <div key={e.id} className="flex gap-2">
              <span className="mt-2 w-6 text-right text-xs text-muted-foreground">{i + 1}.</span>
              <textarea value={e.prompt} onChange={ev => setExercises(prev => prev.map(x => x.id === e.id ? { ...x, prompt: ev.target.value } : x))} placeholder="Mô tả bài tập..." className="h-16 flex-1 rounded-md border border-border bg-background p-2 text-sm focus:border-primary focus:outline-none" />
              <button onClick={() => confirmDelete("exercise", e.id)} className="self-start rounded-md border border-border p-2 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {exercises.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có bài tập. AI có thể giúp bạn tạo.</p>
          )}
        </div>
      </div>

      {/* Delete Modal (chung cho cả block và exercise) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive/70" />
            <h3 className="mt-3 font-semibold">Xác nhận xoá</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {deleteTarget.type === "block" ? "Xoá đoạn code này?" : "Xoá bài tập này?"} Hành động không thể hoàn tác.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-md border border-border px-4 py-2 text-sm">Huỷ</button>
              <button onClick={handleDelete} className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground">Xoá</button>
            </div>
          </div>
        </div>
      )}

      {!hasAnyKey() && (
        <p className="mt-4 rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
          Chưa có API key. <Link to="/settings" className="text-primary hover:underline">Thêm key ở Cài đặt</Link> để dùng các tính năng AI.
        </p>
      )}
    </div>
  );
                }
