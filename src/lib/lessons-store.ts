import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore, type Lesson } from "@/lib/lessons-store";

export const Route = createFileRoute("/lesson/$slug")({
  component: LessonPage,
});

function LessonPage() {
  const { slug } = Route.useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    lessonsStore.getAsync(slug).then(setLesson);
  }, [slug]);

  if (!lesson) return <CodeNovaLayout><div className="p-8 text-center">Đang tải...</div></CodeNovaLayout>;

  return (
    <CodeNovaLayout>
      <Link to="/lessons" className="text-sm text-muted-foreground">← Quay lại</Link>
      <h1 className="text-3xl font-bold mt-4">{lesson.title}</h1>
      <p className="mt-2 text-muted-foreground">{lesson.description}</p>
      <div className="mt-4 space-y-2">
        {lesson.blocks.map((b, i) => (
          <pre key={b.id} className="p-3 rounded bg-[oklch(0.13_0_0)] text-[oklch(0.95_0_0)] text-sm">
            {b.code}
          </pre>
        ))}
      </div>
    </CodeNovaLayout>
  );
}
