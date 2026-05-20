import React, { useEffect, useState } from "react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { lessonsStore } from "@/lib/lessons-store";
import { progressStore } from "@/lib/progress-store";
import { useAuth } from "@/lib/auth";
import { RoadmapCard } from "./roadmap-card";
import { ModuleTimeline } from "./module-timeline";
import { RoadmapSidebar } from "./roadmap-sidebar";
import { RoadmapHeader } from "./roadmap-header";
import { buildRoadmaps } from "./roadmap-utils";

export function RoadmapPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [allLessons, userProgress, userAttempts] = await Promise.all([
          lessonsStore.listAsync(true),
          user ? progressStore.listMine() : [],
          user ? progressStore.listAttempts() : [],
        ]);
        if (!cancelled) {
          setLessons(allLessons);
          setProgress(userProgress);
          setAttempts(userAttempts);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Lỗi tải dữ liệu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) return <CodeNovaLayout><div className="p-8">Đang tải...</div></CodeNovaLayout>;
  if (error) return <CodeNovaLayout><div className="p-8 text-red-500">Lỗi: {error}</div></CodeNovaLayout>;

  const roadmaps = buildRoadmaps(lessons, progress, attempts);
  if (roadmaps.length === 0) return <CodeNovaLayout><div className="p-8">Chưa có lộ trình nào.</div></CodeNovaLayout>;

  const activeRoadmap = roadmaps[0];
  return (
    <CodeNovaLayout>
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-24">
        <RoadmapHeader
          searchTerm=""
          setSearchTerm={() => {}}
          difficultyFilter="all"
          setDifficultyFilter={() => {}}
          sortMode="default"
          setSortMode={() => {}}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {roadmaps.map((r, i) => (
            <RoadmapCard key={r.id} roadmap={r} isActive={r.id === activeRoadmap.id} onClick={() => {}} index={i} />
          ))}
        </div>
        <div className="rounded-2xl border p-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <ModuleTimeline modules={activeRoadmap.modules} />
            </div>
            <RoadmapSidebar
              activeRoadmap={activeRoadmap}
              nextRecommendation={null}
              stats={{ totalCompleted: 0, streak: 0, xp: 0, todayCount: 0, activeDates: new Set(), level: 1, percent: 0 }}
              achievements={[]}
              recentActivity={[]}
              dailyPercent={0}
            />
          </div>
        </div>
      </div>
    </CodeNovaLayout>
  );
}
