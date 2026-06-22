import type { CostType, EngagementLine, Rates } from "./model";
import { PAY_LABELS } from "./model";
import { lineMAD } from "./format";

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}
function csvQ(s: unknown): string {
  return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"';
}
function download(name: string, content: string, mime: string): void {
  const b = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

const BOM = "﻿";

export function exportCSV(data: EngagementLine[], rates: Rates): string {
  const head = [
    "id", "BU", "costType", "category", "project", "vendor", "sponsor", "spoc",
    "amount", "currency", "amountMAD", "otp", "po", "payStatus", "payNote",
    "progress", "justification",
  ];
  const rows = data.map((l) =>
    [
      l.id, l.bu, l.costType, l.cat, l.project, l.vendor, l.sponsor, l.spoc,
      l.amount, l.cur, Math.round(lineMAD(l, rates)), l.otp, l.po,
      PAY_LABELS[l.pay], l.payNote, l.progress, l.justif,
    ]
      .map(csvQ)
      .join(",")
  );
  const name = `nutribudget-${stamp()}.csv`;
  download(name, BOM + head.join(",") + "\n" + rows.join("\n"), "text/csv;charset=utf-8");
  return name;
}

export function exportTaskForce(
  type: CostType,
  data: EngagementLine[],
  rates: Rates
): string {
  const arr = data.filter((l) => l.costType === type);
  const head = [
    "Projet/volet", "Fournisseur/prestataire", "BU", "Catégorie", "Montant",
    "Devise", "Montant MAD", "OTP", "PO", "Avancement %", "Statut paiement",
    "Justification du besoin",
  ];
  const rows = arr.map((l) =>
    [
      l.project, l.vendor, l.bu, l.cat, l.amount, l.cur,
      Math.round(lineMAD(l, rates)), l.otp, l.po, `${l.progress || 0}%`,
      PAY_LABELS[l.pay], l.justif,
    ]
      .map(csvQ)
      .join(",")
  );
  const name = `template-taskforce-${type}-${stamp()}.csv`;
  download(name, BOM + head.join(",") + "\n" + rows.join("\n"), "text/csv;charset=utf-8");
  return name;
}
