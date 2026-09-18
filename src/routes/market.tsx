import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MarketTable } from "@/components/site/MarketTable";
import { marketQuery } from "@/lib/queries";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Live crypto market — Terravest" },
      {
        name: "description",
        content:
          "Live prices, 24-hour and 7-day moves, volume and market cap for the assets you can lock on Terravest.",
      },
      { property: "og:title", content: "Live crypto market — Terravest" },
      {
        property: "og:description",
        content: "Live crypto prices and movement for Terravest investors.",
      },
    ],
  }),
  component: MarketPage,
});

function MarketPage() {
  const { data, isLoading, error } = useQuery(marketQuery);
  const { t } = useLang();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-14">
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("market.h1")}</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">{t("market.lead")}</p>
        <div className="mt-8">
          <MarketTable coins={data ?? []} loading={isLoading} error={error as Error | null} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
