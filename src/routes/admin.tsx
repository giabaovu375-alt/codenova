import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Image as ImageIcon, Sparkles, Loader2, Save, X, Lock, Wand2 } from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore, type Lesson, type CodeBlock as CB, type Exercise, type LessonLanguage, LANGUAGE_LABEL } from "@/lib/lessons-store";
import { explainCode, generateExercises, hasAnyKey, quickExplain } from "@/lib/ai";
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
        <div className="py-20 text-center text-sm text-muted-foreground">Đang tải…</div>
      </CodeNovaLayout>
    );
  }
  if (!user || !isAdmin) {
    return (
      <CodeNovaLayout>
        <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 text-xl font-semibold">Khu vực dành riêng cho Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Chỉ tài khoản <code className="text-foreground">{ADMIN_EMAIL}</code> mới truy cập được trang này.
          </p>
          {!user && (
            <Link
              to="/login"
              className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
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
  const [editing, setEditing] = useState<Lesson | null>(null);
  const refresh = () => setLessons(lessonsStore.list());
  useEffect(() => { refresh(); }, []);

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

  return (
    <CodeNovaLayout>
      {!editing && (
        <>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
              <p className="mt-2 text-muted-foreground">Tự tạo bài tài liệu mới với AI hỗ trợ.</p>
            </div>
            <button onClick={newLesson} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> Thêm bài tập
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Tiêu đề</th>
                  <th className="px-4 py-3">Cấp độ</th>
                  <th className="px-4 py-3">Đoạn</th>
                  <th className="px-4 py-3">Bài tập</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {lessons.map(l => (
                  <tr key={l.slug} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-4 py-3 font-medium">{l.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.level}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.blocks.length}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.exercises.length}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditing(l)} className="mr-2 text-primary hover:underline">Sửa</button>
                      <button
                        onClick={() => { if (confirm("Xoá bài này?")) { lessonsStore.remove(l.slug); refresh(); } }}
                        className="text-destructive hover:underline"
                      >
                        Xoá
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <Editor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={l => { lessonsStore.upsert(l); setEditing(null); refresh(); }}
        />
      )}
    </CodeNovaLayout>
  );
}

function Editor({ initial, onSave, onCancel }: { initial: Lesson; onSave: (l: Lesson) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial.title);
  const [level, setLevel] = useState<Lesson["level"]>(initial.level);
  const [language, setLanguage] = useState<LessonLanguage>(initial.language ?? "python");
  const [description, setDescription] = useState(initial.description);
  const [image, setImage] = useState(initial.image ?? "");
  const [blocks, setBlocks] = useState<CB[]>(initial.blocks);
  const [exercises, setExercises] = useState<Exercise[]>(initial.exercises);
  const [count, setCount] = useState<number>(Math.max(1, initial.blocks.length || 6));
  const [aiBusy, setAiBusy] = useState<string>("");

  const slug = useMemo(
    () => initial.slug || lessonsStore.slugify(title),
    [initial.slug, title],
  );

  function setNumBlocks(n: number) {
    const clean = Math.max(1, Math.min(50, n || 1));
    setCount(clean);
    setBlocks(prev => {
      const next = [...prev];
      while (next.length < clean) next.push({ id: lessonsStore.newId(), code: "", explanation: "" });
      while (next.length > clean) next.pop();
      return next;
    });
  }

  function setBlockCode(id: string, code: string) {
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, code } : b));
  }
  function setBlockExp(id: string, explanation: string) {
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, explanation } : b));
  }

  async function aiExplainBlock(id: string, code: string) {
    if (!hasAnyKey()) return alert("Thêm API key ở Cài đặt trước.");
    if (!code.trim()) return;
    setAiBusy(id);
    try {
      const text = await explainCode(code, "fast", language);
      setBlockExp(id, text);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy("");
    }
  }

  async function aiGenerateExercises() {
    if (!hasAnyKey()) return alert("Thêm API key ở Cài đặt trước.");
    setAiBusy("ex");
    try {
      const topic =
        (title ? `Chủ đề: ${title}.\n` : "") +
        blocks.filter(b => b.code.trim()).slice(0, 5).map(b => b.code).join("\n---\n");
      const arr = await generateExercises(topic || title || LANGUAGE_LABEL[language], 3, language);
      setExercises(prev => [
        ...prev,
        ...arr.map(p => ({ id: lessonsStore.newId(), prompt: p })),
      ]);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy("");
    }
  }

  function onImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  function save() {
    if (!title.trim()) return alert("Nhập tiêu đề bài.");
    onSave({
      slug,
      title: title.trim(),
      level,
      language,
      description: description.trim(),
      image: image || undefined,
      blocks: blocks.filter(b => b.code.trim()),
      exercises: exercises.filter(e => e.prompt.trim()),
      createdAt: initial.createdAt || Date.now(),
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onCancel} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" /> Huỷ
        </button>
        <button onClick={save} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Save className="h-4 w-4" /> Lưu bài học
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Tiêu đề bài học"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-lg font-medium focus:border-primary focus:outline-none"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={level}
              onChange={e => setLevel(e.target.value as Lesson["level"])}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option>Cơ bản</option>
              <option>Trung cấp</option>
              <option>Nâng cao</option>
            </select>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as LessonLanguage)}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {(Object.keys(LANGUAGE_LABEL) as LessonLanguage[]).map(k => (
                <option key={k} value={k}>{LANGUAGE_LABEL[k]}</option>
              ))}
            </select>
            <input
              readOnly
              value={"/lesson/" + slug}
              className="rounded-md border border-border bg-secondary px-3 py-2 font-mono text-xs text-muted-foreground"
            />
          </div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Mô tả ngắn gọn"
            className="h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Ảnh kèm (tuỳ chọn)</label>
          {image ? (
            <div className="relative overflow-hidden rounded-md border border-border">
              <img src={image} alt="" className="aspect-video w-full object-cover" />
              <button onClick={() => setImage("")} className="absolute right-2 top-2 rounded bg-background/80 p-1 hover:bg-background">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex aspect-video w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && onImageFile(e.target.files[0])}
              />
              <span className="flex flex-col items-center gap-1 text-xs">
                <ImageIcon className="h-5 w-5" /> Chọn ảnh
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-medium">Số đoạn code</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={e => setNumBlocks(parseInt(e.target.value, 10))}
              className="w-20 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
            <span className="text-xs text-muted-foreground">đoạn</span>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {blocks.map((b, i) => (
            <BlockEditor
              key={b.id}
              index={i}
              block={b}
              language={language}
              busy={aiBusy === b.id}
              onCode={c => setBlockCode(b.id, c)}
              onExplain={ex => setBlockExp(b.id, ex)}
              onAskAI={() => aiExplainBlock(b.id, b.code)}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-medium">Bài tập cuối bài</h3>
          <div className="flex gap-2">
            <button
              onClick={aiGenerateExercises}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:border-primary hover:text-primary"
            >
              {aiBusy === "ex" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AI sinh 3 bài
            </button>
            <button
              onClick={() => setExercises(es => [...es, { id: lessonsStore.newId(), prompt: "" }])}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-3 w-3" /> Thêm bài
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {exercises.map((e, i) => (
            <div key={e.id} className="flex gap-2">
              <span className="mt-2 w-6 text-right text-xs text-muted-foreground">{i + 1}.</span>
              <textarea
                value={e.prompt}
                onChange={ev => setExercises(es => es.map(x => x.id === e.id ? { ...x, prompt: ev.target.value } : x))}
                className="h-16 flex-1 rounded-md border border-border bg-background p-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => setExercises(es => es.filter(x => x.id !== e.id))}
                className="self-start rounded-md border border-border p-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {exercises.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có bài tập nào. Bấm AI để sinh tự động.</p>
          )}
        </div>
      </div>

      {!hasAnyKey() && (
        <p className="mt-6 rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
          Chưa có API key. <Link to="/settings" className="text-primary hover:underline">Thêm key ở Cài đặt</Link> để dùng các nút AI.
        </p>
      )}
    </div>
  );
}

function BlockEditor({
  index,
  block,
  language,
  busy,
  onCode,
  onExplain,
  onAskAI,
}: {
  index: number;
  block: CB;
  language: LessonLanguage;
  busy: boolean;
  onCode: (c: string) => void;
  onExplain: (e: string) => void;
  onAskAI: () => void;
}) {
  const [auto, setAuto] = useState(true);
  const [autoBusy, setAutoBusy] = useState(false);
  const lastSent = useRef("");

  // Debounced auto-explain as user types
  useEffect(() => {
    if (!auto || !hasAnyKey()) return;
    const code = block.code.trim();
    if (code.length < 5) return;
    if (code === lastSent.current) return;
    const t = setTimeout(async () => {
      lastSent.current = code;
      setAutoBusy(true);
      try {
        const text = await quickExplain(code, language);
        onExplain(text.trim());
      } catch {
        /* silent */
      } finally {
        setAutoBusy(false);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [block.code, auto, onExplain, language]);

  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">Đoạn {index + 1} · {LANGUAGE_LABEL[language]}</span>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1 text-muted-foreground">
            <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} className="h-3 w-3" />
            <Wand2 className="h-3 w-3" /> AI tự giải thích
            {autoBusy && <Loader2 className="h-3 w-3 animate-spin" />}
          </label>
          <button
            onClick={onAskAI}
            className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 hover:border-primary hover:text-primary"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Giải thích kỹ
          </button>
        </div>
      </div>
      <textarea
        value={block.code}
        onChange={e => onCode(e.target.value)}
        placeholder={`// Dán hoặc gõ đoạn code ${LANGUAGE_LABEL[language]} ở đây`}
        spellCheck={false}
        className="block h-32 w-full bg-[oklch(0.13_0_0)] p-3 font-mono text-sm text-[oklch(0.95_0_0)] focus:outline-none"
      />
      <textarea
        value={block.explanation ?? ""}
        onChange={e => onExplain(e.target.value)}
        placeholder="Giải thích ngắn 1-3 dòng (AI sẽ tự điền khi bạn gõ code)"
        className="block h-20 w-full border-t border-border bg-card p-3 text-sm focus:outline-none"
      />
    </div>
  );
}
