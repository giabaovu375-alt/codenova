import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { CodeNovaLayout } from "@/components/CodeNovaLayout";
import { signUp, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Đăng ký — Code Nova" }] }),
  component: Signup,
});

function Signup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (password.length < 6) {
      setErr("Mật khẩu cần ít nhất 6 ký tự.");
      return;
    }
    setBusy(true);
    try {
      await signUp(email, username, password);
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
        <h1 className="text-3xl font-semibold tracking-tight">Đăng ký</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tạo tài khoản Code Nova.</p>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">Email (Gmail)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tên đăng nhập</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              placeholder="3–24 ký tự, chữ/số/_/."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Tạo tài khoản
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-primary hover:underline">Đăng nhập</Link>
          </p>
        </form>
      </div>
    </CodeNovaLayout>
  );
}
