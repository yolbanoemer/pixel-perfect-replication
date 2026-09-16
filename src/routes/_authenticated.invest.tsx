import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { plansQuery, profileQuery, marketQuery, settingsQuery } from "@/lib/queries";
import { usd, pct, projectedTotal, num } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/invest")({
  head: () => ({
    meta: [
      { title: "Open a position — Terravest" },
      { name: "description", content: "Choose an asset, amount and lock term to start earning." },
      { property: "og:title", content: "Open a position — Terravest" },
      { property: "og:description", content: "Choose an asset, amount and lock term." },
    ],
  }),
  component: InvestPage,
});

function InvestPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: plans = [] } = useQuery(plansQuery());
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: coins = [] } = useQuery(marketQuery);
  const { data: settings } = useQuery(settingsQuery);

  const [asset, setAsset] = useState("USD");
  const [amount, setAmount] = useState(500);
  const [planId, setPlanId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const plan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);
  const balance = num(profile?.wallet_balance);
  const coin = coins.find((c) => c.symbol.toUpperCase() === asset);
  const assetUnits = coin && amount ? amount / coin.current_price : null;
  const payments = (settings?.payments ?? {}) as Record<string, string | boolean>;

  const assets = ["USD", ...coins.slice(0, 6).map((c) => c.symbol.toUpperCase())];

  async function invest() {
    if (!plan) return toast.error("Choose a lock term first");
    if (amount > balance) return toast.error("That is more than your wallet balance");
    setBusy(true);
    const { error } = await supabase.rpc("place_investment", {
      _plan_id: plan.id,
      _amount: amount,
      _asset: asset,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Position opened — your ROI starts accruing now");
    qc.invalidateQueries();
    navigate({ to: "/portfolio" });
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Open a position"
        subtitle={`Available to invest: ${usd(balance)}`}
      />

      <ol className="space-y-6">
        <li className="surface-card rounded-2xl p-5">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Step 1 · Asset</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {assets.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAsset(a)}
                className={
                  "rounded-full border px-4 py-1.5 text-sm transition-colors " +
                  (a === asset
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border text-muted-foreground hover:text-foreground")
                }
              >
                {a}
              </button>
            ))}
          </div>
          {coin && (
            <p className="mt-3 text-xs text-muted-foreground">
              {coin.name} is trading at {usd(coin.current_price)} —{" "}
              {assetUnits ? assetUnits.toFixed(6) : "0"} {asset} at this size.
            </p>
          )}
        </li>

        <li className="surface-card rounded-2xl p-5">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Step 2 · Amount</p>
          <div className="mt-3 max-w-xs space-y-2">
            <Label htmlFor="amount">Amount in USD</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            />
          </div>
          <div className="mt-3 flex gap-2">
            {[0.25, 0.5, 1].map((f) => (
              <Button
                key={f}
                variant="subtle"
                size="sm"
                onClick={() => setAmount(Math.floor(balance * f))}
              >
                {f === 1 ? "Max" : `${f * 100}%`}
              </Button>
            ))}
          </div>
        </li>

        <li className="surface-card rounded-2xl p-5">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Step 3 · Lock term
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => {
              const selected = p.id === plan?.id;
              const tooSmall = amount < num(p.min_amount);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={
                    "rounded-xl border p-4 text-left transition-colors " +
                    (selected
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-primary-glow/50")
                  }
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{p.name}</p>
                    {selected && <Check className="size-4 text-accent" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.lock_days} days · min {usd(p.min_amount)}
                  </p>
                  <p className="mt-2 font-display text-lg font-semibold text-accent">
                    {pct(p.daily_rate)}/day
                  </p>
                  {tooSmall && (
                    <p className="mt-1 text-xs text-warning">Raise your amount for this term</p>
                  )}
                </button>
              );
            })}
          </div>
        </li>

        {plan && (
          <li className="surface-card rounded-2xl p-5">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Step 4 · Confirm
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-4">
              {[
                { k: "Daily ROI", v: usd(amount * (num(plan.daily_rate) / 100)) },
                {
                  k: "Total ROI",
                  v: usd(projectedTotal(amount, num(plan.daily_rate), plan.lock_days) - amount),
                },
                {
                  k: "At unlock",
                  v: usd(projectedTotal(amount, num(plan.daily_rate), plan.lock_days)),
                },
                { k: "Unlocks in", v: `${plan.lock_days} days` },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-xs text-muted-foreground">{s.k}</dt>
                  <dd className="font-display text-lg font-semibold">{s.v}</dd>
                </div>
              ))}
            </dl>
            {Boolean(payments.live) && (
              <p className="mt-4 rounded-lg border border-border p-3 text-xs text-muted-foreground">
                Funding destination for {asset}:{" "}
                {(payments[`${asset.toLowerCase()}_address`] as string) ||
                  "contact support for a deposit address"}
              </p>
            )}
            <Button variant="hero" size="lg" className="mt-5" onClick={invest} disabled={busy}>
              {busy ? "Opening…" : `Lock ${usd(amount)} for ${plan.lock_days} days`}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Funds leave your wallet now and return with ROI at unlock.
            </p>
          </li>
        )}
      </ol>
    </div>
  );
}
