import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { investmentsQuery, profileQuery, transactionsQuery } from "@/lib/queries";
import { usd, pct, accruedRoi, shortDate, timeLeft, num } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Terravest" },
      { name: "description", content: "Every position you hold, what it has earned and when it unlocks." },
      { property: "og:title", content: "Portfolio — Terravest" },
      { property: "og:description", content: "Holdings, earnings and unlock dates." },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: investments = [] } = useQuery(investmentsQuery(user?.id));
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: txs = [] } = useQuery(transactionsQuery(user?.id, 200));
  const [tick, setTick] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const open = investments.filter((i) => !i.payout_credited);
  const invested = open.reduce((s, i) => s + num(i.amount_usd), 0);
  const liveRoi = open.reduce((s, i) => s + accruedRoi(i, tick), 0);
  const realised = txs
    .filter((t) => t.type === "roi")
    .reduce((s, t) => s + num(t.amount), 0);
  const matured = open.filter((i) => new Date(i.matures_at).getTime() <= tick);

  // running wallet history from transactions (oldest first)
  const history = [...txs]
    .reverse()
    .reduce<{ date: string; value: number }[]>((acc, t) => {
      const prev = acc.length ? acc[acc.length - 1]!.value : 0;
      acc.push({ date: shortDate(t.created_at), value: Number((prev + num(t.amount)).toFixed(2)) });
      return acc;
    }, []);

  async function settle() {
    setBusy(true);
    const { data, error } = await supabase.rpc("settle_matured");
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${usd(data as number)} credited to your wallet`);
    qc.invalidateQueries();
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Portfolio"
        subtitle="Positions, performance and payouts."
        action={
          matured.length > 0 ? (
            <Button variant="hero" onClick={settle} disabled={busy}>
              Claim {matured.length} matured
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Portfolio value" value={usd(invested + liveRoi + num(profile?.wallet_balance))} />
        <StatCard label="Currently locked" value={usd(invested)} />
        <StatCard label="Accruing now" value={usd(liveRoi, 4)} tone="success" />
        <StatCard label="ROI paid out" value={usd(realised)} tone="accent" />
      </div>

      {history.length > 1 && (
        <div className="surface-card mt-6 rounded-2xl p-5">
          <h2 className="text-sm font-semibold">Cash flow over time</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="roiFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={60} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-foreground)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-accent)"
                  fill="url(#roiFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <h2 className="mt-8 mb-3 text-lg font-semibold">All positions</h2>
      <div className="surface-card overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Opened</th>
              <th className="px-4 py-3 font-medium">Term</th>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">ROI</th>
              <th className="px-4 py-3 text-right font-medium">Unlock</th>
              <th className="px-4 py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {investments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No positions yet.
                </td>
              </tr>
            )}
            {investments.map((i) => (
              <tr key={i.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 text-muted-foreground">{shortDate(i.started_at)}</td>
                <td className="px-4 py-3">
                  {(i.plans as { name?: string } | null)?.name ?? `${i.lock_days} days`}
                  <span className="ml-2 text-xs text-muted-foreground">{pct(i.daily_rate)}/day</span>
                </td>
                <td className="px-4 py-3">{i.asset}</td>
                <td className="px-4 py-3 text-right">{usd(i.amount_usd)}</td>
                <td className="px-4 py-3 text-right text-success">
                  {usd(accruedRoi(i, tick), i.payout_credited ? 2 : 4)}
                </td>
                <td className="px-4 py-3 text-right">
                  {i.payout_credited ? shortDate(i.matures_at) : timeLeft(i.matures_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      "rounded-full px-2 py-1 text-xs " +
                      (i.payout_credited
                        ? "bg-muted text-muted-foreground"
                        : "bg-success/15 text-success")
                    }
                  >
                    {i.payout_credited ? "paid out" : i.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
