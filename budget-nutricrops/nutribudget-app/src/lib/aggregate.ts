import type { EngagementLine, PayStatus, Rates } from "./model";
import { lineMAD } from "./format";

export interface Totals {
  total: number;
  capex: number;
  opex: number;
  paid: number;
  blocked: number;
  pending: number;
  nBlocked: number;
}

export function totals(data: EngagementLine[], rates: Rates): Totals {
  const t: Totals = { total: 0, capex: 0, opex: 0, paid: 0, blocked: 0, pending: 0, nBlocked: 0 };
  for (const l of data) {
    const m = lineMAD(l, rates);
    t.total += m;
    if (l.costType === "CAPEX") t.capex += m;
    else t.opex += m;
    if (l.pay === "paid") t.paid += m;
    if (l.pay === "blocked") { t.blocked += m; t.nBlocked++; }
    if (l.pay === "pending") t.pending += m;
  }
  return t;
}

export function groupBy(
  data: EngagementLine[],
  key: "bu" | "cat",
  rates: Rates
): [string, number][] {
  const g: Record<string, number> = {};
  for (const l of data) {
    const k = l[key] || "—";
    g[k] = (g[k] || 0) + lineMAD(l, rates);
  }
  return Object.entries(g).sort((a, b) => b[1] - a[1]);
}

export interface VendorRollup { amount: number; count: number }
export function groupVendor(
  data: EngagementLine[],
  rates: Rates
): [string, VendorRollup][] {
  const g: Record<string, VendorRollup> = {};
  for (const l of data) {
    if (!g[l.vendor]) g[l.vendor] = { amount: 0, count: 0 };
    g[l.vendor].amount += lineMAD(l, rates);
    g[l.vendor].count++;
  }
  return Object.entries(g).sort((a, b) => b[1].amount - a[1].amount);
}

export function payBreakdown(
  data: EngagementLine[],
  rates: Rates
): { status: PayStatus; sum: number; count: number }[] {
  const order: PayStatus[] = ["blocked", "pending", "draft", "paid"];
  return order.map((status) => {
    const arr = data.filter((l) => l.pay === status);
    return {
      status,
      sum: arr.reduce((s, l) => s + lineMAD(l, rates), 0),
      count: arr.length,
    };
  });
}

export function pctComplete(data: EngagementLine[]): number {
  if (!data.length) return 0;
  return Math.round((data.filter((l) => l.otp && l.po).length / data.length) * 100);
}
export function pctJustif(data: EngagementLine[]): number {
  if (!data.length) return 0;
  return Math.round(
    (data.filter((l) => l.justif && l.justif.length > 10).length / data.length) * 100
  );
}
