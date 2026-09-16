import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { profileQuery, transactionsQuery } from "@/lib/queries";
import { usd, shortDate, num } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/transfers")({
  head: () => ({
    meta: [
      { title: "Transfers — Terravest" },
      { name: "description", content: "Send money to another Terravest member by username." },
      { property: "og:title", content: "Transfers — Terravest" },
      { property: "og:description", content: "Send money to another member instantly." },
    ],
  }),
  component: Transfers,
});

function Transfers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: txs = [] } = useQuery(transactionsQuery(user?.id, 100));
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState(100);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const transfers = txs.filter((t) => t.type === "transfer_in" || t.type === "transfer_out");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("send_transfer", {
      _username: username,
      _amount: amount,
      _note: note || undefined,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${usd(amount)} sent to @${username}`);
    setUsername("");
    setNote("");
    qc.invalidateQueries();
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Transfers"
        subtitle={`Send instantly to any member. Wallet: ${usd(profile?.wallet_balance)}`}
      />

      <form onSubmit={send} className="surface-card grid gap-4 rounded-2xl p-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient username</Label>
          <Input
            id="recipient"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ada"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-amount">Amount (USD)</Label>
          <Input
            id="t-amount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For the shared position"
          />
        </div>
        <Button type="submit" variant="hero" className="sm:col-span-2" disabled={busy}>
          {busy ? "Sending…" : `Send ${usd(amount)}`}
        </Button>
      </form>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Transfer history</h2>
      <div className="surface-card rounded-2xl">
        {transfers.length === 0 && (
          <p className="p-5 text-sm text-muted-foreground">No transfers yet.</p>
        )}
        <ul className="divide-y divide-border">
          {transfers.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {t.type === "transfer_in" ? "Received" : "Sent"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.note ? `${t.note} · ` : ""}
                  {shortDate(t.created_at)}
                </p>
              </div>
              <span className={num(t.amount) >= 0 ? "text-success" : "text-foreground"}>
                {num(t.amount) >= 0 ? "+" : ""}
                {usd(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
