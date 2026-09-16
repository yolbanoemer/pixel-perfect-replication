import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { marketQuery } from "@/lib/queries";
import { MarketTable } from "@/components/site/MarketTable";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_authenticated/markets")({
  head: () => ({
    meta: [
      { title: "Markets — Terravest" },
      { name: "description", content: "Live crypto prices to size your next locked position." },
      { property: "og:title", content: "Markets — Terravest" },
      { property: "og:description", content: "Live crypto prices for Terravest investors." },
    ],
  }),
  component: MarketsPage,
});

function MarketsPage() {
  const { data, isLoading, error } = useQuery(marketQuery);
  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader title="Markets" subtitle="Prices refresh every minute." />
      <MarketTable coins={data ?? []} loading={isLoading} error={error as Error | null} />
    </div>
  );
}
