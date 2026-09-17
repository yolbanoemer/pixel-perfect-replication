import { Languages } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useLang();

  return (
    <button
      type="button"
      onClick={() => setLang(lang === "de" ? "en" : "de")}
      aria-label={t("lang.switchToEn")}
      title={t("lang.switchToEn")}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border-2 border-accent/60 bg-accent/10 px-4 py-2 text-sm font-semibold tracking-wide text-accent uppercase transition-colors hover:bg-accent/20",
        className,
      )}
    >
      <Languages className="size-4" />
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs",
          lang === "de" ? "bg-accent text-accent-foreground" : "text-muted-foreground",
        )}
      >
        DE
      </span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs",
          lang === "en" ? "bg-accent text-accent-foreground" : "text-muted-foreground",
        )}
      >
        EN
      </span>
    </button>
  );
}
