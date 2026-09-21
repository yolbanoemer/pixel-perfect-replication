import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  allInvestmentsQuery,
  allTransactionsQuery,
  allProfilesQuery,
  allRolesQuery,
  allTicketsQuery,
  allWithdrawalsQuery,
  allDepositsQuery,
  announcementsQuery,
  plansQuery,
  settingsQuery,
} from "@/lib/queries";
import { usd, pct, shortDate, num } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/app/DatePicker";

export const Route = createFileRoute("/_authenticated/rbac")({
  head: () => ({
    meta: [
      { title: "Control room — Terravest" },
      { name: "description", content: "Staff tools for rates, members, payouts and announcements." },
      { property: "og:title", content: "Control room — Terravest" },
      { property: "og:description", content: "Staff tools for Terravest operations." },
    ],
  }),
  component: ControlRoom,
});

const tabs = [
  "Overview",
  "Rates & terms",
  "Members",
  "Member history",
  "Positions",
  "Deposits",
  "Payouts",
  "Announcements",
  "Tickets",
  "Payments",
] as const;
type Tab = (typeof tabs)[number];

function ControlRoom() {
  const { isStaff, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("Overview");

  if (!isStaff) {
    return (
      <div className="surface-card mx-auto mt-10 max-w-md rounded-2xl p-8 text-center">
        <h1 className="text-lg font-semibold">Staff only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is reserved for the Terravest operations team.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Control room"
        subtitle={isAdmin ? "Full admin access." : "Support access — some tools are limited."}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t}
            onClick={() => setTab(t)}
            variant="ghost"
            size="sm"
            className={
              "rounded-full border px-3 py-1.5 text-xs transition-colors " +
              (t === tab
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            {t}
          </Button>
        ))}
      </div>

      {tab === "Overview" && <Overview />}
      {tab === "Rates & terms" && <Rates isAdmin={isAdmin} />}
      {tab === "Members" && <Members isAdmin={isAdmin} />}
      {tab === "Member history" && <MemberHistory isAdmin={isAdmin} />}
      {tab === "Positions" && <Positions />}
      {tab === "Deposits" && <Deposits />}
      {tab === "Payouts" && <Payouts />}
      {tab === "Announcements" && <Announcements />}
      {tab === "Tickets" && <Tickets />}
      {tab === "Payments" && <Payments isAdmin={isAdmin} />}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="surface-card rounded-2xl p-5">{children}</div>;
}

function Overview() {
  const { data: profiles = [] } = useQuery(allProfilesQuery);
  const { data: investments = [] } = useQuery(allInvestmentsQuery);
  const { data: withdrawals = [] } = useQuery(allWithdrawalsQuery);
  const { data: tickets = [] } = useQuery(allTicketsQuery);

  const locked = investments
    .filter((i) => !i.payout_credited)
    .reduce((s, i) => s + num(i.amount_usd), 0);
  const pending = withdrawals.filter((w) => w.status === "pending");
  const openTickets = tickets.filter((t) => t.status !== "closed");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Members" value={String(profiles.length)} />
      <StatCard label="Capital locked" value={usd(locked)} tone="accent" />
      <StatCard
        label="Pending payouts"
        value={usd(pending.reduce((s, w) => s + num(w.amount), 0))}
        hint={`${pending.length} request(s)`}
      />
      <StatCard label="Open tickets" value={String(openTickets.length)} />
    </div>
  );
}

function Rates({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery(plansQuery(true));
  const [draft, setDraft] = useState({ name: "", lock_days: 30, daily_rate: 0.7, min_amount: 100 });

  async function update(
    id: string,
    patch: Partial<{
      lock_days: number;
      daily_rate: number;
      min_amount: number;
      is_active: boolean;
    }>,
  ) {
    const { error } = await supabase.from("plans").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Term updated");
    qc.invalidateQueries();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("plans").insert({
      ...draft,
      sort_order: plans.length + 1,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Term created");
    setDraft({ name: "", lock_days: 30, daily_rate: 0.7, min_amount: 100 });
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-3 py-2 font-medium">Term</th>
                <th className="px-3 py-2 font-medium">Lock days</th>
                <th className="px-3 py-2 font-medium">Daily rate %</th>
                <th className="px-3 py-2 font-medium">Minimum</th>
                <th className="px-3 py-2 font-medium">Live</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8 w-24"
                      type="number"
                      defaultValue={p.lock_days}
                      disabled={!isAdmin}
                      onBlur={(e) => update(p.id, { lock_days: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8 w-24"
                      type="number"
                      step="0.01"
                      defaultValue={p.daily_rate}
                      disabled={!isAdmin}
                      onBlur={(e) => update(p.id, { daily_rate: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8 w-28"
                      type="number"
                      defaultValue={p.min_amount}
                      disabled={!isAdmin}
                      onBlur={(e) => update(p.id, { min_amount: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant={p.is_active ? "secondary" : "outline"}
                      disabled={!isAdmin}
                      onClick={() => update(p.id, { is_active: !p.is_active })}
                    >
                      {p.is_active ? "Active" : "Hidden"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Rate changes apply to new positions only — open positions keep the rate they were opened
          at.
        </p>
      </Panel>

      {isAdmin && (
        <Panel>
          <h3 className="mb-3 text-sm font-semibold">Add a term</h3>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-5">
            <Input
              placeholder="Name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
            />
            <Input
              type="number"
              placeholder="Lock days"
              value={draft.lock_days}
              onChange={(e) => setDraft({ ...draft, lock_days: Number(e.target.value) })}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Daily %"
              value={draft.daily_rate}
              onChange={(e) => setDraft({ ...draft, daily_rate: Number(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="Minimum"
              value={draft.min_amount}
              onChange={(e) => setDraft({ ...draft, min_amount: Number(e.target.value) })}
            />
            <Button type="submit" variant="hero">
              Create
            </Button>
          </form>
        </Panel>
      )}
    </div>
  );
}

function Members({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: profiles = [] } = useQuery(allProfilesQuery);
  const { data: roles = [] } = useQuery(allRolesQuery);
  const [q, setQ] = useState("");

  const roleOf = (id: string) => roles.find((r) => r.user_id === id)?.role ?? "investor";
  const list = profiles.filter(
    (p) =>
      !q ||
      (p.username ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (p.full_name ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  async function setRole(userId: string, role: string) {
    const { error } = await supabase.rpc("set_user_role", { _user_id: userId, _role: role as never });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Role updated");
    qc.invalidateQueries();
  }

  async function adjust(userId: string) {
    const raw = window.prompt("Adjust wallet by (use a minus sign to deduct):", "100");
    if (raw === null) return;
    const { error } = await supabase.rpc("admin_adjust_balance", {
      _user_id: userId,
      _amount: Number(raw),
      _note: "Manual adjustment by admin",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Balance adjusted");
    qc.invalidateQueries();
  }

  async function toggleSuspend(userId: string, next: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: next })
      .eq("id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries();
  }

  return (
    <Panel>
      <Input
        placeholder="Search members…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-4 max-w-sm"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="px-3 py-2 font-medium">Member</th>
              <th className="px-3 py-2 font-medium">Joined</th>
              <th className="px-3 py-2 text-right font-medium">Wallet</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2">
                  <div className="font-medium">@{p.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.full_name ?? "—"}
                    {p.is_suspended ? " · suspended" : ""}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{shortDate(p.created_at)}</td>
                <td className="px-3 py-2 text-right">{usd(p.wallet_balance)}</td>
                <td className="px-3 py-2">
                  {isAdmin ? (
                    <select
                      value={roleOf(p.id)}
                      onChange={(e) => setRole(p.id, e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    >
                      <option value="investor">investor</option>
                      <option value="support">support</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground">{roleOf(p.id)}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {isAdmin && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => adjust(p.id)}>
                        Adjust
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleSuspend(p.id, !p.is_suspended)}
                      >
                        {p.is_suspended ? "Restore" : "Suspend"}
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Positions() {
  const { data: investments = [] } = useQuery(allInvestmentsQuery);
  return (
    <Panel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="px-3 py-2 font-medium">Member</th>
              <th className="px-3 py-2 font-medium">Term</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 text-right font-medium">Daily</th>
              <th className="px-3 py-2 font-medium">Opened</th>
              <th className="px-3 py-2 font-medium">Unlocks</th>
              <th className="px-3 py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {investments.map((i) => (
              <tr key={i.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2">
                  @{(i.profiles as { username?: string } | null)?.username ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {(i.plans as { name?: string } | null)?.name ?? `${i.lock_days}d`}
                </td>
                <td className="px-3 py-2 text-right">{usd(i.amount_usd)}</td>
                <td className="px-3 py-2 text-right">{pct(i.daily_rate)}</td>
                <td className="px-3 py-2 text-muted-foreground">{shortDate(i.started_at)}</td>
                <td className="px-3 py-2 text-muted-foreground">{shortDate(i.matures_at)}</td>
                <td className="px-3 py-2 text-right">
                  {i.payout_credited ? "paid out" : i.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Deposits() {
  const qc = useQueryClient();
  const { data: deposits = [] } = useQuery(allDepositsQuery);

  async function resolve(id: string, status: "confirmed" | "rejected") {
    const note =
      status === "rejected" ? window.prompt("Reason for rejection:", "") : window.prompt("Note (optional):", "");
    if (status === "rejected" && note === null) return;
    const { error } = await supabase.rpc("resolve_deposit", {
      _id: id,
      _status: status,
      ...(note ? { _note: note } : {}),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "confirmed" ? "Deposit credited" : "Deposit rejected");
    qc.invalidateQueries();
  }

  return (
    <Panel>
      {deposits.length === 0 && (
        <p className="text-sm text-muted-foreground">No deposit requests yet.</p>
      )}
      <ul className="divide-y divide-border">
        {deposits.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {usd(d.amount)} · @{(d.profiles as { username?: string } | null)?.username ?? "—"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {d.method} · {d.asset} · {d.reference ?? "no reference"} · {shortDate(d.created_at)}
              </p>
            </div>
            {d.status === "pending" ? (
              <div className="flex gap-2">
                <Button size="sm" variant="hero" onClick={() => resolve(d.id, "confirmed")}>
                  Confirm & credit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => resolve(d.id, "rejected")}>
                  Reject
                </Button>
              </div>
            ) : (
              <span className="rounded-full bg-muted px-2 py-1 text-xs">{d.status}</span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Payouts() {
  const qc = useQueryClient();
  const { data: withdrawals = [] } = useQuery(allWithdrawalsQuery);

  async function resolve(id: string, status: string) {
    const note = status === "rejected" ? window.prompt("Reason for rejection:", "") : null;
    if (status === "rejected" && note === null) return;
    const { error } = await supabase.rpc("resolve_withdrawal", {
      _id: id,
      _status: status as never,
      ...(note ? { _note: note } : {}),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Request ${status}`);
    qc.invalidateQueries();
  }

  return (
    <Panel>
      {withdrawals.length === 0 && (
        <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>
      )}
      <ul className="divide-y divide-border">
        {withdrawals.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium">
                {usd(w.amount)} · @{(w.profiles as { username?: string } | null)?.username ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {w.method} · {w.destination} · {shortDate(w.created_at)}
              </p>
            </div>
            {w.status === "pending" ? (
              <div className="flex gap-2">
                <Button size="sm" variant="hero" onClick={() => resolve(w.id, "paid")}>
                  Mark paid
                </Button>
                <Button size="sm" variant="outline" onClick={() => resolve(w.id, "approved")}>
                  Approve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => resolve(w.id, "rejected")}>
                  Reject
                </Button>
              </div>
            ) : (
              <span className="rounded-full bg-muted px-2 py-1 text-xs">{w.status}</span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Announcements() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery(announcementsQuery);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("announcements").insert({ title, content });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Announcement published");
    setTitle("");
    setContent("");
    qc.invalidateQueries();
  }

  async function toggle(id: string, next: boolean) {
    await supabase.from("announcements").update({ is_active: next }).eq("id", id);
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-4">
      <Panel>
        <form onSubmit={post} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="a-title">Title</Label>
            <Input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-body">Message</Label>
            <Textarea
              id="a-body"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="hero">
            Publish
          </Button>
        </form>
      </Panel>
      <Panel>
        <ul className="divide-y divide-border">
          {items.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.content}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => toggle(a.id, !a.is_active)}>
                {a.is_active ? "Hide" : "Show"}
              </Button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Tickets() {
  const qc = useQueryClient();
  const { data: tickets = [] } = useQuery(allTicketsQuery);

  async function reply(id: string) {
    const text = window.prompt("Reply to member:", "");
    if (!text) return;
    const { error } = await supabase
      .from("support_tickets")
      .update({ staff_reply: text, status: "resolved" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Reply sent");
    qc.invalidateQueries();
  }

  return (
    <Panel>
      {tickets.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
      <ul className="divide-y divide-border">
        {tickets.map((t) => (
          <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="max-w-xl">
              <p className="text-sm font-medium">
                {t.subject}{" "}
                <span className="text-xs text-muted-foreground">
                  @{(t.profiles as { username?: string } | null)?.username ?? "—"} · {t.category}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
              {t.staff_reply && <p className="mt-1 text-xs text-accent">↳ {t.staff_reply}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-1 text-xs">{t.status}</span>
              <Button size="sm" variant="outline" onClick={() => reply(t.id)}>
                Reply
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Payments({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);
  const payments = (settings?.["payments"] ?? {}) as Record<string, unknown>;
  const platform = (settings?.["platform"] ?? {}) as Record<string, unknown>;

  const [form, setForm] = useState<Record<string, string>>({});
  const value = (k: string, fallback: unknown) =>
    form[k] ?? String(fallback ?? "");

  async function saveKey(key: string, val: Record<string, unknown>) {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key, value: val as never }, { onConflict: "key" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Real money mode</h3>
            <p className="text-xs text-muted-foreground">
              While this is off, deposits are still submitted and reviewed here before any wallet is credited.
            </p>
          </div>
          <Button
            variant={payments["live"] ? "secondary" : "hero"}
            disabled={!isAdmin}
            onClick={() => saveKey("payments", { ...payments, live: !payments["live"] })}
          >
            {payments["live"] ? "Live — switch off" : "Switch on live payments"}
          </Button>
        </div>
      </Panel>

      <Panel>
        <h3 className="mb-3 text-sm font-semibold">Deposit destinations</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["btc_address", "Bitcoin address"],
            ["eth_address", "Ethereum address"],
            ["usdt_address", "USDT (TRC20) address"],
            ["paypal_email", "PayPal email"],
          ].map(([k, label]) => (
            <div key={k} className="space-y-2">
              <Label htmlFor={k}>{label}</Label>
              <Input
                id={k}
                disabled={!isAdmin}
                value={value(k!, payments[k!])}
                onChange={(e) => setForm({ ...form, [k!]: e.target.value })}
              />
            </div>
          ))}
        </div>
        {isAdmin && (
          <Button
            className="mt-4"
            variant="hero"
            onClick={() => saveKey("payments", { ...payments, ...form })}
          >
            Save destinations
          </Button>
        )}
      </Panel>

      <Panel>
        <h3 className="mb-3 text-sm font-semibold">Platform economics</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fee">Platform fee on ROI (%)</Label>
            <Input
              id="fee"
              type="number"
              step="0.1"
              disabled={!isAdmin}
              defaultValue={String(platform["fee_percent"] ?? 3)}
              onBlur={(e) =>
                saveKey("platform", { ...platform, fee_percent: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minw">Minimum withdrawal (USD)</Label>
            <Input
              id="minw"
              type="number"
              disabled={!isAdmin}
              defaultValue={String(platform["min_withdrawal"] ?? 50)}
              onBlur={(e) =>
                saveKey("platform", { ...platform, min_withdrawal: Number(e.target.value) })
              }
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}
