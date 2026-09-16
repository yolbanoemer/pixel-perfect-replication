import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ticketsQuery } from "@/lib/queries";
import { shortDate } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: "Support — Terravest" },
      { name: "description", content: "Raise a complaint or question and track the reply." },
      { property: "og:title", content: "Support — Terravest" },
      { property: "og:description", content: "Raise a question and track the reply." },
    ],
  }),
  component: Support,
});

const categories = ["general", "withdrawal", "roi_query", "complaint", "security"];

function Support() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: tickets = [] } = useQuery(ticketsQuery(user?.id));
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(categories[0]!);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("support_tickets")
      .insert({ user_id: user.id, subject, category, description });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Ticket opened — our team will reply here");
    setSubject("");
    setDescription("");
    qc.invalidateQueries();
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader title="Support" subtitle="Questions, complaints and payout chasing." />

      <form onSubmit={submit} className="surface-card grid gap-4 rounded-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs capitalize transition-colors " +
                    (c === category
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-muted-foreground hover:text-foreground")
                  }
                >
                  {c.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">What happened?</Label>
          <Textarea
            id="desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="hero" disabled={busy}>
          {busy ? "Sending…" : "Open ticket"}
        </Button>
      </form>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Your tickets</h2>
      <div className="space-y-3">
        {tickets.length === 0 && (
          <p className="surface-card rounded-2xl p-5 text-sm text-muted-foreground">
            No tickets yet.
          </p>
        )}
        {tickets.map((t) => (
          <article key={t.id} className="surface-card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{t.subject}</h3>
              <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize text-muted-foreground">
                {t.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
            {t.staff_reply && (
              <p className="mt-3 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm">
                <span className="font-medium text-accent">Terravest team:</span> {t.staff_reply}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{shortDate(t.created_at)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
