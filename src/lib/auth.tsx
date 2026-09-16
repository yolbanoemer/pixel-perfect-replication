import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "support" | "investor";

type AuthState = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  role: null,
  loading: true,
  isStaff: false,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "SIGNED_OUT") {
        setRole(null);
        queryClient.clear();
      }
      router.invalidate();
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) {
      setRole(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .order("role", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        const roles = (data ?? []).map((r) => r.role as AppRole);
        setRole(
          roles.includes("admin")
            ? "admin"
            : roles.includes("support")
              ? "support"
              : ((roles[0] ?? "investor") as AppRole),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    role,
    loading,
    isStaff: role === "admin" || role === "support",
    isAdmin: role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function signOutEverywhere(queryClient: {
  cancelQueries: () => Promise<void>;
  clear: () => void;
}) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
}
