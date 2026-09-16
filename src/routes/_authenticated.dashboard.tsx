import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpRight, Megaphone, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  profileQuery,
  investmentsQuery,
  transactionsQuery,
  announcementsQuery,
  settingsQuery,
} from "@/lib/queries";
import { usd, pct, accruedRoi, timeLeft, shortDate, num } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Terravest" },
      { name: "description", content: "Your wallet, live ROI and active positions at a glance." },
      { property: "og:title", content: "Dashboard — Terravest" },
      { property: "og:description", content: "Your wallet, live ROI and active positions." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: investments = [] } = useQuery(investmentsQuery(user?.id));
  const { data: txs = [] } = useQuery(transactionsQuery(user?.id, 8));
  const { data: announcements = [] } = useQuery(announcementsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const [tick, setTick] = useState(Date.now());
  const [topupAmount, setTopupAmount] = useState(1000);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const active = investments.filter((i) => i.status === "active" && !i.payout_credited);
  const matured = active.filter((i) => new Date(i.matures_at).getTime() <= tick);
  const totalLocked = active.reduce((s, i) => s + num(i.amount_usd), 0);
  const liveRoi = active.reduce((s, i) => s + accruedRoi(i, tick), 0);
  const dailyRate = active.reduce((s, i) => s + num(i.amount_usd) * (num(i.daily_rate) / 100), 0);
  const paymentsLive = Boolean((settings?.payments as { live?: boolean } | undefined)?.live);

  async function topUp() {
    setBusy(true);
    const { error } = await supabase.rpc("demo_topup", { _amount: topupAmount });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${usd(topupAmount)} added to your practice wallet`);
    qc.invalidateQueries();
  }

  async function settle() {
    setBusy(true);
    const { data, error } = await supabase.rpc("settle_matured");
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${usd(data as number)} credited to your wallet`);
    qc.invalidateQueries();
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title={`Welcome back, ${profile?.full_name?.split(" ")[0] ?? profile?.username ?? "investor"}`}
        subtitle="Your capital is working. Here is where it stands right now."
        action={
          matured.length > 0 ? (
            <Button variant="hero" onClick={settle} disabled={busy}>
              <Sparkles className="size-4" /> Claim {matured.length} matured
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Wallet balance" value={usd(profile?.wallet_balance)} />
        <StatCard
          label="Locked capital"
          value={usd(totalLocked)}
          hint={`${active.length} active position${active.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="ROI accruing"
          value={usd(liveRoi, 4)}
          tone="success"
          hint="Updates every second"
        />
        <StatCard label="Earning per day" value={usd(dailyRate)} tone="accent" />
      </div>

      {!paymentsLive && (
        <div className="surface-card mt-6 flex flex-wrap items-center gap-3 rounded-xl p-4">
          <div className="flex-1 min-w-52">
            <p className="text-sm font-medium">Practice mode</p>
            <p className="text-xs text-muted-foreground">
              Real payments are switched off, so you can fund a practice wallet and test the full
              flow. An admin turns real funding on in the control room.
            </p>
          </div>
          <Input
            type="number"
            className="w-32"
            value={topupAmount}
            min={1}
            onChange={(e) => setTopupAmount(Number(e.target.value))}
          />
          <Button variant="glass" onClick={topUp} disabled={busy}>
            Add funds
          </Button>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active positions</h2>
            <Link to="/portfolio" className="text-sm text-accent hover:underline">
              Full portfolio
            </Link>
          </div>

          {active.length === 0 ? (
            <div className="surface-card rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">
                You have no open positions. Choose a lock term to start earning.
              </p>
              <Button asChild variant="hero" className="mt-4">
                <Link to="/invest">
                  Open a position <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="surface-card overflow-x-auto rounded-xl">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="px-4 py-3 font-medium">Term</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-right font-medium">ROI</th>
                    <th className="px-4 py-3 text-right font-medium">Unlocks</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((i) => (
                    <tr key={i.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {(i.plans as { name?: string } | null)?.name ?? `${i.lock_days} days`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {i.asset} · {pct(i.daily_rate)}/day
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">{usd(i.amount_usd)}</td>
                      <td className="px-4 py-3 text-right text-success">
                        {usd(accruedRoi(i, tick), 4)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p>{timeLeft(i.matures_at)}</p>
                        <p className="text-xs text-muted-foreground">{shortDate(i.matures_at)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="mt-8 mb-3 text-lg font-semibold">Recent activity</h2>
          <div className="surface-card rounded-xl">
            {txs.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">Nothing here yet.</p>
            )}
            <ul className="divide-y divide-border">
              {txs.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{t.type.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.note ?? shortDate(t.created_at)}
                    </p>
                  </div>
                  <span
                    className={`text-sm ${num(t.amount) >= 0 ? "text-success" : "text-foreground"}`}
                  >
                    {num(t.amount) >= 0 ? "+" : ""}
                    {usd(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="space-y-4">
          <h2 className="text-lg font-semibold">Announcements</h2>
          {announcements.length === 0 && (
            <p className="text-sm text-muted-foreground">No announcements.</p>
          )}
          {announcements.map((a) => (
            <article key={a.id} className="surface-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-accent">
                <Megaphone className="size-4" />
                <h3 className="text-sm font-semibold">{a.title}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">{shortDate(a.created_at)}</p>
            </article>
          ))}
        </aside>
      </div>
    </div>
  );
}
