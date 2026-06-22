import { motion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import type { Currency, EngagementLine, Rates } from "../lib/model";
import { PAY_ORDER } from "../lib/model";
import { lineMAD, money } from "../lib/format";
import { totals } from "../lib/aggregate";
import { PageHeader, PayPill } from "../components/ui";
import { listContainer, listItem } from "../lib/motion";

export function Exec({ data, cur, rates }: { data: EngagementLine[]; cur: Currency; rates: Rates }) {
  const rows = data
    .slice()
    .sort(
      (x, y) =>
        PAY_ORDER[x.pay] - PAY_ORDER[y.pay] || lineMAD(y, rates) - lineMAD(x, rates)
    );
  const t = totals(data, rates);
  const m = (v: number) => money(v, cur, rates);

  return (
    <div>
      <PageHeader
        title="Exécution & paiement"
        lead={
          <>
            Suivi de la chaîne OTP → PO → paiement. Les lignes bloquées remontent en haut.
            Bloqué : <strong className="font-mono">{m(t.blocked)}</strong> · En attente :{" "}
            <strong className="font-mono">{m(t.pending)}</strong> · Payé :{" "}
            <strong className="font-mono">{m(t.paid)}</strong>.
          </>
        }
      />

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/60 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              <th className="px-3 py-2.5 text-left">Projet</th>
              <th className="px-3 py-2.5 text-left">Prestataire</th>
              <th className="px-3 py-2.5 text-left">OTP</th>
              <th className="px-3 py-2.5 text-left">PO</th>
              <th className="px-3 py-2.5 text-right">Montant</th>
              <th className="px-3 py-2.5 text-left">Statut</th>
              <th className="px-3 py-2.5 text-left">Blocage / note</th>
            </tr>
          </thead>
          <motion.tbody variants={listContainer} initial="hidden" animate="show">
            {rows.map((l) => (
              <motion.tr key={l.id} variants={listItem} className="border-b border-zinc-100 last:border-0 hover:bg-ocp-50/40">
                <td className="px-3 py-3 align-middle">
                  <div className="font-semibold text-zinc-900">{l.project}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">{l.bu}</div>
                </td>
                <td className="px-3 py-3 align-middle text-zinc-700">{l.vendor}</td>
                <td className="px-3 py-3 align-middle font-mono text-zinc-700">
                  {l.otp || <span className="text-zinc-300">—</span>}
                </td>
                <td className="px-3 py-3 align-middle font-mono text-zinc-700">
                  {l.po || <span className="text-zinc-300">—</span>}
                </td>
                <td className="px-3 py-3 text-right align-middle font-mono font-semibold text-zinc-900">
                  {m(lineMAD(l, rates))}
                </td>
                <td className="px-3 py-3 align-middle"><PayPill status={l.pay} /></td>
                <td className="px-3 py-3 align-middle text-zinc-500">{l.payNote || "—"}</td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-zinc-200 bg-zinc-50/60 px-4 py-3.5 text-sm leading-relaxed text-zinc-600">
        <span className="font-semibold text-zinc-800">Gérer</span>
        <ArrowRight size={14} className="text-zinc-400" />
        <span className="font-semibold text-zinc-800">Consolider</span>
        <ArrowRight size={14} className="text-zinc-400" />
        <span className="font-semibold text-zinc-800">Partager</span>
        <span className="ml-1">
          — cet onglet rend visible en amont ce qui se découvrait à J-3 du paiement.
        </span>
      </div>
    </div>
  );
}
