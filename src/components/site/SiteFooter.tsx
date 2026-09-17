import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { Logo } from "./Logo";

export function SiteFooter() {
  const { t } = useLang();

  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-sm text-xs text-muted-foreground">{t("footer.note")}</p>
        </div>
        <nav className="flex gap-5 text-sm text-muted-foreground">
          <Link to="/plans" className="hover:text-foreground">
            {t("nav.plans")}
          </Link>
          <Link to="/market" className="hover:text-foreground">
            {t("nav.markets")}
          </Link>
          <Link to="/auth" className="hover:text-foreground">
            {t("nav.signin")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
