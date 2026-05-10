import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const ADMIN_EMAIL = "giabaovu375@gmail.com";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST, then fetch existing session
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const isAdmin = (user?.email ?? "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}

/** Sign in by email OR username + password. */
export async function signInWithIdentifier(identifier: string, password: string) {
  const id = identifier.trim();
  let email = id;
  if (!id.includes("@")) {
    const { data, error } = await supabase.rpc("email_for_username", { _username: id });
    if (error) throw error;
    if (!data) throw new Error("Không tìm thấy tên đăng nhập này.");
    email = data;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, username: string, password: string) {
  const u = username.trim();
  if (!/^[a-zA-Z0-9_.]{3,24}$/.test(u)) {
    throw new Error("Tên đăng nhập 3–24 ký tự, chỉ chữ/số/_/.");
  }
  // Pre-check unique username for friendlier error
  const { data: taken } = await supabase.rpc("email_for_username", { _username: u });
  if (taken) throw new Error("Tên đăng nhập đã được sử dụng.");

  const redirectUrl = `${window.location.origin}/`;
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: { username: u },
    },
  });
  if (error) throw error;
}
