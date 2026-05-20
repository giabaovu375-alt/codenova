import React from "react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { RoadmapCard } from "./roadmap-card";
import { ModuleTimeline } from "./module-timeline";
import { RoadmapSidebar } from "./roadmap-sidebar";
import { RoadmapHeader } from "./roadmap-header";
import type { Roadmap } from "./roadmap-types";

// Dữ liệu giả – không cần API, không cần auth
const fakeRoadmaps: Roadmap[] = [
  {
    id: "python",
    title: "Python Developer",
    description: "Từ cú pháp cơ bản đến OOP và AI/ML",
    icon: () => null, // icon rỗng nhưng không null
    difficulty: "Cơ bản - Trung cấp",
    difficultyLevel: 1,
    estimatedTime: "3 bài học",
    modules: [
      {
        id: "python-intro",
        title: "Giới thiệu Python",
        completed: false,
        locked: false,
        estimatedTime: "1 tuần",
        lessonCount: 5,
        level: "Cơ bản",
        slug: "python-intro",
        bestScore: 0,
        attemptsCount: 0,
      },
    ],
    accent: "from-amber-400 via-yellow-400 to-emerald-400",
  },
];

export function RoadmapPage() {
  const activeRoadmap = fakeRoadmaps[0];
  return (
    <CodeNovaLayout>
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-24">
        <h1 className="text-3xl font-bold mb-6">Test fake roadmap</h1>
        <RoadmapHeader
          searchTerm=""
          setSearchTerm={() => {}}
          difficultyFilter="all"
          setDifficultyFilter={() => {}}
          sortMode="default"
          setSortMode={() => {}}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {fakeRoadmaps.map((r, i) => (
            <RoadmapCard
              key={r.id}
              roadmap={r}
              isActive={true}
              onClick={() => {}}
              index={i}
            />
          ))}
        </div>
        {activeRoadmap && (
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
        )}
      </div>
    </CodeNovaLayout>
  );
}
