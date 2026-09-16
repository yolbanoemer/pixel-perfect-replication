import { useMemo, useState } from "react";
import type { Plan } from "@/lib/queries";
import { usd, pct, projectedTotal } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RoiCalculator({ plans }: { plans: Plan[] }) {
  const [amount, setAmount] = useState(2500);
  const [planId, setPlanId] = useState<string | null>(null);
  const plan = useMemo(
    () => plans.find((p) => p.id === planId) ?? plans[2] ?? plans[0],
    [plans, planId],
  );

  if (!plan) return null;

  const daily = amount * (Number(plan.daily_rate) / 100);
  const total = projectedTotal(amount, Number(plan.daily_rate), plan.lock_days);

  return (
    <div className="surface-card rounded-2xl p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="calc-amount">Amount (USD)</Label>
          <Input
            id="calc-amount"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
          />
        </div>
        <div className="space-y-2">
          <Label>Lock term</Label>
          <div className="flex flex-wrap gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                className={
                  "rounded-full border px-3 py-1 text-xs transition-colors " +
                  (p.id === plan.id
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border text-muted-foreground hover:text-foreground")
                }
              >
                {p.lock_days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { k: "Daily rate", v: pct(plan.daily_rate) },
          { k: "Per day", v: usd(daily) },
          { k: "Total ROI", v: usd(total - amount) },
          { k: "At unlock", v: usd(total) },
        ].map((s) => (
          <div key={s.k}>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">{s.k}</p>
            <p className="font-display text-lg font-semibold">{s.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
