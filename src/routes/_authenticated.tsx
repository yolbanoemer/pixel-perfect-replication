import { createFileRoute, redirect, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  PiggyBank,
  Wallet,
  Send,
  Banknote,
  PlusCircle,
  LifeBuoy,
  Shield,
  LogOut,
  LineChart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOutEverywhere } from "@/lib/auth";
import { profileQuery } from "@/lib/queries";
import { usd } from "@/lib/format";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: AppShell,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invest", label: "Invest", icon: PiggyBank },
  { to: "/portfolio", label: "Portfolio", icon: Wallet },
  { to: "/deposit", label: "Add funds", icon: PlusCircle },
  { to: "/markets", label: "Markets", icon: LineChart },
  { to: "/transfers", label: "Transfers", icon: Send },
  { to: "/withdraw", label: "Withdraw", icon: Banknote },
  { to: "/support", label: "Support", icon: LifeBuoy },
] as const;

function AppShell() {
  const { user, isStaff } = useAuth();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOutEverywhere(queryClient);
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 items-center px-5">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "bg-sidebar-accent text-foreground" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          {isStaff && (
            <Link
              to="/rbac"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-accent transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent" }}
            >
              <Shield className="size-4" />
              Control room
            </Link>
          )}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/settings"
            className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            @{profile?.username ?? "account"}
          </Link>
          <Button variant="ghost" size="sm" className="mt-1 w-full justify-start" onClick={handleSignOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
          <Link to="/dashboard" className="lg:hidden">
            <Logo compact />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Wallet</p>
              <p className="font-display text-sm font-semibold">{usd(profile?.wallet_balance)}</p>
            </div>
            <Button asChild variant="hero" size="sm">
              <Link to="/invest">Invest</Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 pt-6 pb-24 lg:px-8 lg:pb-10">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border bg-card/95 py-2 backdrop-blur lg:hidden">
          {nav.slice(0, 5).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground"
              activeProps={{ className: "text-accent" }}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
