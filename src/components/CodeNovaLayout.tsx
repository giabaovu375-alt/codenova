import { Link, useRouterState } from "@tanstack/react-router";
import { ReactNode } from "react";
import { LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

function NovaLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
        N
      </div>
      <span className="font-semibold tracking-tight">
        Code<span className="text-primary">Nova</span>
      </span>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const active = path === to || (to !== "/" && path.startsWith(to));
  return (
    <Link
      to={to}
      className={
        "text-sm transition-colors hover:text-foreground " +
        (active ? "text-foreground font-medium" : "text-muted-foreground")
      }
    >
      {children}
    </Link>
  );
}

export function CodeNovaLayout({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center">
            <NovaLogo />
          </Link>
          <nav className="flex items-center gap-5">
            <NavLink to="/">Trang chủ</NavLink>
            <NavLink to="/lessons">Bài học</NavLink>
            <NavLink to="/playground">AI sửa code</NavLink>
            {isAdmin && <NavLink to="/admin">Admin</NavLink>}
            {user && <NavLink to="/profile">Hồ sơ</NavLink>}
            <NavLink to="/settings">Cài đặt</NavLink>
            {user ? (
              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs hover:border-primary hover:text-primary"
                title={user.email ?? ""}
              >
                <LogOut className="h-3 w-3" /> Đăng xuất
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                <LogIn className="h-3 w-3" /> Đăng nhập
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
      <footer className="mt-16 border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-muted-foreground">
          <span>© Code Nova — học Python từ cơ bản đến nâng cao.</span>
          <span>Build with TanStack Start</span>
        </div>
      </footer>
    </div>
  );
}
