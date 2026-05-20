import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/roadmap")({
  component: () => <div style={{ padding: 40 }}>Hello từ Roadmap</div>,
});
