import { createFileRoute } from "@tanstack/react-router";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";

export const Route = createFileRoute("/test")({
  component: () => (
    <CodeNovaLayout>
      <div className="p-8 text-center">
        <h1 className="text-3xl font-bold">Test OK</h1>
      </div>
    </CodeNovaLayout>
  ),
});
