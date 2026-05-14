// src/routes/error.tsx (hoặc components/ErrorPage.tsx)
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";

export function ErrorPage({
  code = 500,
  title = "Có lỗi xảy ra",
  message = "Rất tiếc, trang này đang gặp sự cố. Bạn có thể thử lại hoặc quay về trang chủ.",
  onRetry,
}: {
  code?: number | string;
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <CodeNovaLayout>
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="text-center">
          {/* Mã lỗi lớn */}
          <div className="text-8xl font-black text-primary/20 select-none">
            {code}
          </div>

          {/* Icon cảnh báo */}
          <div className="mt-4 flex justify-center">
            <AlertTriangle className="h-16 w-16 text-destructive/70" />
          </div>

          {/* Tiêu đề */}
          <h1 className="mt-6 text-2xl font-bold tracking-tight">{title}</h1>

          {/* Mô tả */}
          <p className="mt-3 mx-auto max-w-md text-muted-foreground">
            {message}
          </p>

          {/* Nút hành động */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium transition-all hover:border-primary hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Về trang chủ
            </Link>

            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-primary/40"
              >
                <RefreshCw className="h-4 w-4" />
                Thử lại
              </button>
            )}
          </div>

          {/* Footer nhỏ */}
          <p className="mt-12 text-xs text-muted-foreground">
            Nếu lỗi vẫn tiếp diễn, hãy liên hệ với chúng tôi qua email hoặc
            Discord.
          </p>
        </div>
      </div>
    </CodeNovaLayout>
  );
}
