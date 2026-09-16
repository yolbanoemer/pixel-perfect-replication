import type { MarketCoin } from "@/lib/queries";
import { usd, pct } from "@/lib/format";

function Spark({ prices }: { prices: number[] }) {
  if (!prices?.length) return null;
  const slice = prices.filter((_, i) => i % 6 === 0);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const range = max - min || 1;
  const points = slice
    .map((p, i) => `${(i / (slice.length - 1)) * 100},${28 - ((p - min) / range) * 26}`)
    .join(" ");
  const up = slice[slice.length - 1] >= slice[0];
  return (
    <svg viewBox="0 0 100 28" className="h-7 w-24" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        strokeWidth="2"
        className={up ? "stroke-success" : "stroke-destructive"}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const compact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export function MarketTable({
  coins,
  loading,
  error,
}: {
  coins: MarketCoin[];
  loading?: boolean;
  error?: Error | null;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading live prices…</p>;
  if (error)
    return (
      <p className="text-sm text-destructive">
        Live prices are unavailable right now. Please try again shortly.
      </p>
    );

  return (
    <div className="surface-card overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
            <th className="px-4 py-3 font-medium">Asset</th>
            <th className="px-4 py-3 text-right font-medium">Price</th>
            <th className="px-4 py-3 text-right font-medium">24h</th>
            <th className="px-4 py-3 text-right font-medium">7d</th>
            <th className="px-4 py-3 text-right font-medium">Market cap</th>
            <th className="px-4 py-3 text-right font-medium">Trend</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((c) => {
            const d1 = c.price_change_percentage_24h ?? 0;
            const d7 = c.price_change_percentage_7d_in_currency ?? 0;
            return (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={c.image} alt="" className="size-6 rounded-full" loading="lazy" />
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground uppercase">{c.symbol}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">{usd(c.current_price)}</td>
                <td
                  className={`px-4 py-3 text-right ${d1 >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {pct(d1)}
                </td>
                <td
                  className={`px-4 py-3 text-right ${d7 >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {pct(d7)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  ${compact(c.market_cap)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Spark prices={c.sparkline_in_7d?.price ?? []} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
