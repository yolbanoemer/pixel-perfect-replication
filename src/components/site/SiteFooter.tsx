import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-sm text-xs text-muted-foreground">
            Terravest is a demonstration investment platform. Returns shown are illustrative and
            capital is at risk.
          </p>
        </div>
        <nav className="flex gap-5 text-sm text-muted-foreground">
          <Link to="/plans" className="hover:text-foreground">
            Plans
          </Link>
          <Link to="/market" className="hover:text-foreground">
            Markets
          </Link>
          <Link to="/auth" className="hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
