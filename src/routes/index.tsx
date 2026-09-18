import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Lock, LineChart, Send, ShieldCheck } from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { plansQuery, marketQuery } from "@/lib/queries";
import { usd, pct } from "@/lib/format";
import { RoiCalculator } from "@/components/site/RoiCalculator";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Terravest — Lock capital, earn daily ROI" },
      {
        name: "description",
        content:
          "Lock crypto or cash from one day to two years and watch daily returns accrue second by second, with transparent rates set in the open.",
      },
      { property: "og:title", content: "Terravest — Lock capital, earn daily ROI" },
      {
        property: "og:description",
        content: "Transparent daily ROI on locked crypto and fiat investments.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data: plans = [] } = useQuery(plansQuery());
  const { data: coins = [] } = useQuery(marketQuery);
  const top = coins.slice(0, 5);
  const { t } = useLang();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden">
          <div className="halo pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-success" />
                {t("home.badge")}
              </span>
              <h1 className="mt-5 text-4xl leading-[1.05] font-semibold sm:text-5xl md:text-6xl">
                {t("home.h1a")} <span className="brand-text">{t("home.h1b")}</span>
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted-foreground">{t("home.lead")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="lg">
                  <Link to="/auth">
                    {t("home.cta")} <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="glass" size="lg">
                  <Link to="/plans">{t("home.rates")}</Link>
                </Button>
              </div>

              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
                {[
                  { k: t("home.stat.terms"), v: t("home.stat.termsV") },
                  { k: t("home.stat.top"), v: t("home.stat.topV") },
                  { k: t("home.stat.payout"), v: t("home.stat.payoutV") },
                ].map((s) => (
                  <div key={s.k}>
                    <dt className="text-xs tracking-wide text-muted-foreground uppercase">{s.k}</dt>
                    <dd className="font-display text-lg font-semibold">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <img
                src={heroImage}
                alt={t("home.heroAlt")}
                width={1600}
                height={1104}
                className="elevated w-full rounded-2xl border border-border object-cover"
              />
            </div>
          </div>
        </section>

        {top.length > 0 && (
          <section className="border-y border-border/70 bg-card/40">
            <div className="mx-auto flex w-full max-w-6xl gap-6 overflow-x-auto px-4 py-4">
              {top.map((c) => {
                const ch = c.price_change_percentage_24h ?? 0;
                return (
                  <div key={c.id} className="flex shrink-0 items-center gap-2 text-sm">
                    <img src={c.image} alt="" className="size-5 rounded-full" loading="lazy" />
                    <span className="font-medium uppercase">{c.symbol}</span>
                    <span className="text-muted-foreground">{usd(c.current_price)}</span>
                    <span className={ch >= 0 ? "text-success" : "text-destructive"}>{pct(ch)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t("home.how")}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Lock, title: t("home.f1.t"), body: t("home.f1.b") },
              { icon: LineChart, title: t("home.f2.t"), body: t("home.f2.b") },
              { icon: Send, title: t("home.f3.t"), body: t("home.f3.b") },
              { icon: ShieldCheck, title: t("home.f4.t"), body: t("home.f4.b") },
            ].map((f) => (
              <article key={f.title} className="surface-card rounded-xl p-5">
                <f.icon className="size-5 text-accent" />
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-16 md:pb-20">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">{t("home.calc.h")}</h2>
              <p className="mt-3 max-w-lg text-sm text-muted-foreground">{t("home.calc.b")}</p>
              <div className="mt-6">
                <RoiCalculator plans={plans} />
              </div>
            </div>

            <div className="surface-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-semibold">Current terms</h3>
              <ul className="mt-4 divide-y divide-border">
                {plans.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                    <span>{p.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground">{p.lock_days}d</span>
                      <span className="font-medium text-accent">{pct(p.daily_rate)}/day</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="hero" className="mt-6 w-full">
                <Link to="/auth">Start with any amount</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
