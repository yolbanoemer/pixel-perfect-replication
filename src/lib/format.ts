export const usd = (value: number | string | null | undefined, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value ?? 0));

export const pct = (value: number | string | null | undefined, digits = 2) =>
  `${Number(value ?? 0).toFixed(digits)}%`;

export const num = (value: number | string | null | undefined) => Number(value ?? 0);

export function shortDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function timeLeft(target: string | Date) {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "Unlocked";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export type InvestmentLike = {
  amount_usd: number | string;
  daily_rate: number | string;
  started_at: string;
  matures_at: string;
};

/** Live ROI accrued, matching the database calculation. */
export function accruedRoi(inv: InvestmentLike, at: number = Date.now()) {
  const start = new Date(inv.started_at).getTime();
  const end = new Date(inv.matures_at).getTime();
  const elapsedDays = (Math.min(at, end) - start) / 86400000;
  if (elapsedDays <= 0) return 0;
  return num(inv.amount_usd) * (num(inv.daily_rate) / 100) * elapsedDays;
}

export function projectedTotal(amount: number, dailyRate: number, days: number) {
  return amount + amount * (dailyRate / 100) * days;
}
