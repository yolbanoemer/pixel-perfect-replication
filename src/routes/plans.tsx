import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { plansQuery } from "@/lib/queries";
import { usd, pct, projectedTotal } from "@/lib/format";

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

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-14">
        <h1 className="text-3xl font-semibold sm:text-4xl">Lock terms</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          The longer you lock, the higher the daily rate. Rates are set by the platform team and
          apply from the second your position opens.
        </p>

        {isLoading && <p className="mt-10 text-sm text-muted-foreground">Loading terms…</p>}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const example = projectedTotal(1000, Number(p.daily_rate), p.lock_days);
            return (
              <article key={p.id} className="surface-card flex flex-col rounded-2xl p-6">
                <h2 className="font-display text-lg font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{p.lock_days} day lock</p>
                <p className="brand-text mt-5 font-display text-4xl font-semibold">
                  {pct(p.daily_rate)}
                </p>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">per day</p>
                <dl className="mt-5 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Minimum</dt>
                    <dd>{usd(p.min_amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">$1,000 becomes</dt>
                    <dd className="text-success">{usd(example)}</dd>
                  </div>
                </dl>
                <Button asChild variant="hero" className="mt-6">
                  <Link to="/auth">Invest on this term</Link>
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
