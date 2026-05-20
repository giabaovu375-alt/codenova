// src/routes/roadmap.tsx
import { createFileRoute } from "@tanstack/react-router";
import { RoadmapPage } from "@/features/roadmap";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Lộ trình học tập — CodeNova" },
      {
        name: "description",
        content:
          "Khám phá các lộ trình học lập trình từ cơ bản đến nâng cao với theo dõi tiến độ thông minh.",
      },
    ],
  }),
  component: RoadmapPage,
});
