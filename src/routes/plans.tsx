import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { plansQuery } from "@/lib/queries";
import { usd, pct, projectedTotal } from "@/lib/format";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Lock terms & daily rates — Terravest" },
      {
        name: "description",
        content:
          "Compare every Terravest lock term from one day to two years, with the daily ROI rate and minimum for each.",
      },
      { property: "og:title", content: "Lock terms & daily rates — Terravest" },
      {
        property: "og:description",
        content: "Every Terravest lock term, daily rate and minimum in one place.",
      },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { data: plans = [], isLoading } = useQuery(plansQuery());
  const { t } = useLang();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-14">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("plans.h1")}</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">{t("plans.lead")}</p>

        {isLoading && <p className="mt-10 text-sm text-muted-foreground">{t("plans.loading")}</p>}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const example = projectedTotal(1000, Number(p.daily_rate), p.lock_days);
            return (
              <article key={p.id} className="surface-card flex flex-col rounded-2xl p-6">
                <h2 className="font-display text-lg font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {p.lock_days} {t("plans.dayLock")}
                </p>
                <p className="brand-text mt-5 font-display text-4xl font-semibold">
                  {pct(p.daily_rate)}
                </p>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  {t("plans.perDay")}
                </p>
                <dl className="mt-5 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("plans.min")}</dt>
                    <dd>{usd(p.min_amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("plans.becomes")}</dt>
                    <dd className="text-success">{usd(example)}</dd>
                  </div>
                </dl>
                <Button asChild variant="hero" className="mt-6">
                  <Link to="/auth">{t("plans.cta")}</Link>
                </Button>
              </article>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
