import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useLang, type TKey } from "@/lib/i18n";
import { Logo } from "./Logo";
import { LanguageToggle } from "./LanguageToggle";

const links = [
  { to: "/", label: "nav.home" },
  { to: "/plans", label: "nav.plans" },
  { to: "/market", label: "nav.markets" },
] as const satisfies ReadonlyArray<{ to: string; label: TKey }>;

export function SiteHeader() {
  const { session } = useAuth();
  const { t } = useLang();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {t(l.label)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle />

          {session ? (
            <Button asChild variant="hero" size="sm">
              <Link to="/dashboard">{t("nav.dashboard")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">{t("nav.signin")}</Link>
              </Button>
              <Button asChild variant="hero" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">{t("nav.open")}</Link>
              </Button>
            </>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("nav.menu")}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 bg-card">
              <nav className="mt-10 flex flex-col gap-1">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="rounded-md px-3 py-3 text-base text-muted-foreground hover:bg-muted hover:text-foreground"
                    activeProps={{ className: "text-foreground" }}
                    activeOptions={{ exact: l.to === "/" }}
                  >
                    {t(l.label)}
                  </Link>
                ))}
                <Link
                  to={session ? "/dashboard" : "/auth"}
                  className="rounded-md px-3 py-3 text-base text-foreground"
                >
                  {session ? t("nav.dashboard") : t("nav.signin")}
                </Link>
                <LanguageToggle className="mt-4 w-full justify-center" />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
