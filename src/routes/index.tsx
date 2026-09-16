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
                Daily ROI accrues every second
              </span>
              <h1 className="mt-5 text-4xl leading-[1.05] font-semibold sm:text-5xl md:text-6xl">
                Lock your capital. <span className="brand-text">Watch it work.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted-foreground">
                Terravest turns a fixed lock period into a visible, second-by-second return. Choose
                a term from one day to two years, fund in crypto or cash, and follow every cent as
                it accrues.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="hero" size="lg">
                  <Link to="/auth">
                    Open an account <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="glass" size="lg">
                  <Link to="/plans">See the rates</Link>
                </Button>
              </div>

              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
                {[
                  { k: "Terms", v: "1d – 2y" },
                  { k: "Top rate", v: "0.90%/day" },
                  { k: "Payout", v: "At unlock" },
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
                alt="Sculpted walnut and brushed-steel waves forming a rising market chart"
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
          <h2 className="text-2xl font-semibold sm:text-3xl">How a Terravest position works</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Lock,
                title: "Pick a lock term",
                body: "Longer locks carry a higher daily rate, published openly and set by the platform team.",
              },
              {
                icon: LineChart,
                title: "Watch it accrue",
                body: "Your position ticks up live — no waiting for a nightly batch to tell you where you stand.",
              },
              {
                icon: Send,
                title: "Move value freely",
                body: "Send funds to any other member by username, instantly, with a receipt on both sides.",
              },
              {
                icon: ShieldCheck,
                title: "Withdraw on review",
                body: "Requests are held and reviewed by the team, then paid to your chosen destination.",
              },
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
              <h2 className="text-2xl font-semibold sm:text-3xl">Run the numbers first</h2>
              <p className="mt-3 max-w-lg text-sm text-muted-foreground">
                Every rate on this page is the same rate applied to a live position. Try an amount
                and a term to see the unlock value before you commit anything.
              </p>
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
