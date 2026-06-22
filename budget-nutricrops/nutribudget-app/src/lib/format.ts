import type { Currency, EngagementLine, Rates } from "./model";

const SYM: Record<Currency, string> = { MAD: "MAD", USD: "$", EUR: "€" };

export function toMAD(amount: number, cur: Currency, rates: Rates): number {
  return amount * (rates[cur] || 1);
}
export function lineMAD(l: EngagementLine, rates: Rates): number {
  return toMAD(l.amount, l.cur, rates);
}
export function inCur(mad: number, cur: Currency, rates: Rates): number {
  return mad / (rates[cur] || 1);
}
export function fmt(n: number): string {
  return Math.round(n).toLocaleString("fr-FR");
}

// Compact money in the active display currency, MAD-consolidated input.
export function money(mad: number, cur: Currency, rates: Rates): string {
  const v = inCur(mad, cur, rates);
  const sym = SYM[cur];
  if (Math.abs(v) >= 1e6) {
    const m = (v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    return cur === "MAD" ? `${m} M MAD` : `${sym} ${m} M`;
  }
  return cur === "MAD" ? `${fmt(v)} MAD` : `${sym} ${fmt(v)}`;
}
