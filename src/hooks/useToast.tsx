import { useCallback, useRef, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

export function useToast() {
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);

  const timeoutRef = useRef<number>();

  const show = useCallback(
    (msg: string, type: "ok" | "err" = "ok") => {
      setToast({ msg, type });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setToast(null);
      }, 3000);
    },
    []
  );

  const ToastUI = toast ? (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm shadow-lg ${
        toast.type === "ok"
          ? "bg-primary/90 text-primary-foreground"
          : "bg-destructive/90 text-destructive-foreground"
      }`}
    >
      {toast.type === "ok" ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}

      {toast.msg}
    </div>
  ) : null;

  return { show, ToastUI };
        }
