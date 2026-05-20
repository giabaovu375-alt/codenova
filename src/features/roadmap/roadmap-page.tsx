// src/features/roadmap/roadmap-page.tsx – TEST FETCH DATA RAW
import React, { useEffect, useState } from "react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore } from "@/lib/lessons-store";
import { progressStore } from "@/lib/progress-store";
import { useAuth } from "@/lib/auth";

export function RoadmapPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<any[] | null>(null);
  const [progress, setProgress] = useState<any[] | null>(null);
  const [attempts, setAttempts] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [l, p, a] = await Promise.all([
          lessonsStore.listAsync(true),
          user ? progressStore.listMine() : [],
          user ? progressStore.listAttempts() : [],
        ]);
        if (!cancelled) {
          setLessons(l);
          setProgress(p);
          setAttempts(a);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Lỗi fetch");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) return <CodeNovaLayout><div className="p-8">Đang tải dữ liệu...</div></CodeNovaLayout>;
  if (error) return <CodeNovaLayout><div className="p-8 text-red-500">Lỗi: {error}</div></CodeNovaLayout>;

  return (
    <CodeNovaLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dữ liệu thô từ Supabase</h1>
        <h2 className="text-lg font-semibold mt-4">Lessons ({lessons?.length ?? 0})</h2>
        <pre className="text-xs bg-secondary p-2 rounded overflow-auto max-h-40">{JSON.stringify(lessons, null, 2)}</pre>
        <h2 className="text-lg font-semibold mt-4">Progress ({progress?.length ?? 0})</h2>
        <pre className="text-xs bg-secondary p-2 rounded overflow-auto max-h-40">{JSON.stringify(progress, null, 2)}</pre>
        <h2 className="text-lg font-semibold mt-4">Attempts ({attempts?.length ?? 0})</h2>
        <pre className="text-xs bg-secondary p-2 rounded overflow-auto max-h-40">{JSON.stringify(attempts, null, 2)}</pre>
      </div>
    </CodeNovaLayout>
  );
}
