import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { signInWithIdentifier, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Đăng nhập — Code Nova" }] }),
  component: Login,
});

function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await signInWithIdentifier(identifier, password);
      navigate({ to: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <CodeNovaLayout>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">Đăng nhập</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dùng email <strong>hoặc</strong> tên đăng nhập + mật khẩu.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">Email hoặc tên đăng nhập</label>
            <input
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              autoComplete="username"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Đăng nhập
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link to="/signup" className="text-primary hover:underline">Đăng ký</Link>
          </p>
        </form>
      </div>
    </CodeNovaLayout>
  );
}
