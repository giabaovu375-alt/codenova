import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lesson/$slug")({
  component: LessonPage,
});

function LessonPage() {
  const { slug } = Route.useParams();
  
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>Bài học: {slug}</h1>
      <p>Nếu đọc được dòng này, route hoạt động bình thường.</p>
    </div>
  );
}
