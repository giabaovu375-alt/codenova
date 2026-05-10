import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore, type Lesson } from "@/lib/lessons-store";

export const Route = createFileRoute("/lessons")({
  head: () => ({
    meta: [
      { title: "Tất cả bài học — Code Nova" },
      { name: "description", content: "Danh sách bài học Python từ cơ bản đến nâng cao." },
    ],
  }),
  component: Lessons,
});

function Lessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [filter, setFilter] = useState<string>("Tất cả");
  useEffect(() => {
    const r = () => setLessons(lessonsStore.list());
    r();
    window.addEventListener("codenova:lessons:changed", r);
    return () => window.removeEventListener("codenova:lessons:changed", r);
  }, []);

  const levels = ["Tất cả", "Cơ bản", "Trung cấp", "Nâng cao"];
  const filtered = filter === "Tất cả" ? lessons : lessons.filter(l => l.level === filter);

  return (
    <CodeNovaLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Bài học</h1>
        <p className="mt-2 text-muted-foreground">Chọn một chủ đề để bắt đầu.</p>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {levels.map(l => (
          <button
            key={l}
            onClick={() => setFilter(l)}
            className={
              "rounded-full border px-3 py-1 text-sm transition-colors " +
              (filter === l
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-secondary")
            }
          >
            {l}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-muted-foreground">Chưa có bài học nào.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(l => (
            <Link
              key={l.slug}
              to="/lesson/$slug"
              params={{ slug: l.slug }}
              className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary"
            >
              {l.image && <img src={l.image} alt={l.title} className="aspect-[16/9] w-full object-cover" />}
              <div className="flex flex-1 flex-col p-5">
                <span className="mb-2 w-fit rounded bg-secondary px-2 py-0.5 text-xs">{l.level}</span>
                <h3 className="font-medium group-hover:text-primary">{l.title}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{l.description}</p>
                <span className="mt-3 text-xs text-muted-foreground">
                  {l.blocks.length} đoạn · {l.exercises.length} bài tập
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </CodeNovaLayout>
  );
}
