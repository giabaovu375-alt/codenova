import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/lesson/$slug")({
  component: LessonPage,
});

function LessonPage() {
  const { slug } = Route.useParams();
  const [status, setStatus] = useState("Đang tải...");
  const [debugInfo, setDebugInfo] = useState("");

  const checkLesson = useCallback(async () => {
    setStatus("Đang gọi Supabase...");
    setDebugInfo(`Slug yêu cầu: ${slug}`);

    try {
      // Gọi thẳng Supabase thay vì qua store
      const { data, error } = await supabase
        .from("lessons")
        .select("slug, title")
        .eq("slug", slug)
        .single();

      if (error) {
        setStatus(`Lỗi Supabase: ${error.message} (mã: ${error.code})`);
        setDebugInfo(prev => prev + `\nLỗi chi tiết: ${JSON.stringify(error)}`);
        return;
      }

      if (!data) {
        setStatus(`Không tìm thấy bài học với slug "${slug}"`);
        setDebugInfo(prev => prev + "\nDữ liệu trả về rỗng.");
        return;
      }

      setStatus(`Thành công! Tìm thấy bài: "${data.title}"`);
      setDebugInfo(prev => prev + `\nDữ liệu: ${JSON.stringify(data)}`);
    } catch (err: any) {
      setStatus(`Lỗi không xác định: ${err.message}`);
      setDebugInfo(prev => prev + `\nStack: ${err.stack}`);
    }
  }, [slug]);

  useEffect(() => {
    checkLesson();
  }, [checkLesson]);

  return (
    <CodeNovaLayout>
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Trang Debug Bài Học</h1>
        
        <div className="rounded-lg border border-border bg-card p-4 mb-4">
          <h2 className="font-semibold mb-2">Trạng thái:</h2>
          <p className="text-lg">{status}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-semibold mb-2">Thông tin debug:</h2>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{debugInfo}</pre>
        </div>

        <button 
          onClick={checkLesson}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Thử lại
        </button>
      </div>
    </CodeNovaLayout>
  );
}
