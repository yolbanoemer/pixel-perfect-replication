import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOutEverywhere } from "@/lib/auth";
import { profileQuery } from "@/lib/queries";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Account settings — Terravest" },
      { name: "description", content: "Update your profile details and sign out." },
      { property: "og:title", content: "Account settings — Terravest" },
      { property: "og:description", content: "Update your profile details." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setCountry(profile.country ?? "");
    }
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, country })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    qc.invalidateQueries();
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title="Account" subtitle={`Signed in as ${user?.email ?? ""}`} />

      <form onSubmit={save} className="surface-card space-y-4 rounded-2xl p-5">
        <div className="space-y-2">
          <Label>Username</Label>
          <Input value={profile?.username ?? ""} readOnly className="opacity-70" />
          <p className="text-xs text-muted-foreground">
            Other members use this to send you money.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fn">Full name</Label>
          <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="co">Country</Label>
          <Input id="co" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize text-muted-foreground">
            {role ?? "investor"} · KYC {profile?.kyc_status ?? "unverified"}
          </span>
          <Button type="submit" variant="hero" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      <Button
        variant="outline"
        className="mt-6"
        onClick={async () => {
          await signOutEverywhere(qc);
          navigate({ to: "/auth", replace: true });
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
