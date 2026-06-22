import { motion } from "framer-motion";
import { Warning } from "@phosphor-icons/react";
import type { Currency, EngagementLine, Rates } from "../lib/model";
import { money } from "../lib/format";
import { groupVendor } from "../lib/aggregate";
import { PageHeader } from "../components/ui";
import { listContainer, listItem } from "../lib/motion";

export function Vendors({ data, cur, rates }: { data: EngagementLine[]; cur: Currency; rates: Rates }) {
  const g = groupVendor(data, rates);
  const tot = g.reduce((s, x) => s + x[1].amount, 0);
  const m = (v: number) => money(v, cur, rates);

  return (
    <div>
      <PageHeader
        title="Prestataires"
        lead={
          <>
            Vue consolidée par prestataire — montant total engagé et nombre de lignes. {g.length} prestataires.
          </>
        }
      />

      <section className="rounded-3xl border border-zinc-200 bg-white p-2 shadow-[0_20px_40px_-30px_rgba(20,59,24,0.22)]">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.05em] text-zinc-400">
          <div>Prestataire</div>
          <div className="w-28 text-right">Engagé</div>
          <div className="w-16 text-right">Part</div>
        </div>
        <motion.div variants={listContainer} initial="hidden" animate="show" className="divide-y divide-zinc-100">
          {g.map(([v, o]) => (
            <motion.div
              key={v}
              variants={listItem}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3.5"
            >
              <div className="text-sm font-medium text-zinc-800">
                {v} <span className="font-normal text-zinc-400">· {o.count} ligne(s)</span>
              </div>
              <div className="w-28 text-right font-mono text-sm text-zinc-900">{m(o.amount)}</div>
              <div className="w-16 text-right font-mono text-sm text-zinc-500">
                {tot ? Math.round((o.amount / tot) * 100) : 0}%
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-800">
        <Warning size={18} weight="duotone" className="mt-0.5 shrink-0" />
        <p>
          Pensez à normaliser les variantes d’un même prestataire (ex. « BI new vision » / « BI NewVision » /
          « BINewVision ») et à rattacher contrats + avenants. Master prestataire = besoin #9 du tableau.
        </p>
      </div>
    </div>
  );
}
