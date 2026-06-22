import { motion } from "framer-motion";
import { Briefcase, Buildings, ArrowsClockwise, Prohibit } from "@phosphor-icons/react";
import type { Currency, EngagementLine, PayStatus, Rates } from "../lib/model";
import { PAY_LABELS } from "../lib/model";
import { money } from "../lib/format";
import { groupBy, payBreakdown, totals } from "../lib/aggregate";
import { Bar } from "../components/Bar";
import { PageHeader, PayPill } from "../components/ui";
import { listContainer, listItem, spring } from "../lib/motion";

interface Props {
  data: EngagementLine[];
  cur: Currency;
  rates: Rates;
  onDrillBu: (bu: string) => void;
  onDrillPay: (pay: PayStatus) => void;
}

export function Conso({ data, cur, rates, onDrillBu, onDrillPay }: Props) {
  const t = totals(data, rates);
  const capexPct = t.total ? Math.round((t.capex / t.total) * 100) : 0;
  const byBu = groupBy(data, "bu", rates);
  const byCat = groupBy(data, "cat", rates);
  const maxBu = Math.max(1, ...byBu.map((x) => x[1]));
  const maxCat = Math.max(1, ...byCat.map((x) => x[1]));
  const pay = payBreakdown(data, rates);

  const m = (v: number) => money(v, cur, rates);

  return (
    <div>
      <PageHeader
        title={`Budget consolidé ${new Date().getFullYear()} — Nutricrops`}
        lead={
          <>
            Vue unique de toutes les lignes d’engagement, toutes BU et prestataires.
            Conversion en <strong className="text-zinc-800">{cur}</strong> au taux courant.{" "}
            {data.length} lignes.
          </>
        }
      />

      {/* Bento — row 1: 3 KPI tiles + a tall blocked tile (asymmetric). */}
      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiTile
          icon={<Briefcase size={16} weight="duotone" />}
          label="Budget total"
          value={m(t.total)}
          sub={`${data.length} lignes · ${byBu.length} BU`}
        />
        <KpiTile
          icon={<Buildings size={16} weight="duotone" />}
          label="CAPEX"
          value={m(t.capex)}
          sub={`${capexPct}% du total`}
          accent="sky"
          barPct={capexPct}
        />
        <KpiTile
          icon={<ArrowsClockwise size={16} weight="duotone" />}
          label="OPEX"
          value={m(t.opex)}
          sub={`${100 - capexPct}% du total`}
          accent="amber"
          barPct={100 - capexPct}
        />
        <KpiTile
          icon={<Prohibit size={16} weight="duotone" />}
          label="Bloqué en paiement"
          value={m(t.blocked)}
          sub={`${t.nBlocked} ligne(s) bloquée(s) — SAP / Procurement`}
          accent="rose"
          alert={t.nBlocked > 0}
        />
      </motion.div>

      {/* Row 2: CAPEX/OPEX split (full width). */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.15 }}
        className="mt-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_40px_-30px_rgba(20,59,24,0.25)]"
      >
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Répartition CAPEX / OPEX</h2>
          <span className="text-xs italic text-zinc-400">visuel = part du budget</span>
        </div>
        <div className="flex h-9 overflow-hidden rounded-xl ring-1 ring-zinc-200">
          <motion.div
            className="flex items-center justify-center bg-sky-600 text-xs font-semibold text-white"
            initial={{ width: 0 }}
            animate={{ width: `${capexPct}%` }}
            transition={spring}
          >
            {capexPct > 8 ? `CAPEX ${capexPct}%` : ""}
          </motion.div>
          <motion.div
            className="flex items-center justify-center bg-amber-700 text-xs font-semibold text-white"
            initial={{ width: 0 }}
            animate={{ width: `${100 - capexPct}%` }}
            transition={spring}
          >
            {100 - capexPct > 8 ? `OPEX ${100 - capexPct}%` : ""}
          </motion.div>
        </div>
        <div className="mt-3 flex flex-wrap gap-5 text-xs font-medium text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-sky-600" />CAPEX <span className="font-mono text-zinc-700">{m(t.capex)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-amber-600" />OPEX <span className="font-mono text-zinc-700">{m(t.opex)}</span>
          </span>
        </div>
      </motion.section>

      {/* Row 3: 70/30 split — by BU (drill-down) + by category. */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[7fr_3fr]">
        <Panel title="Par Business Unit" hint="clic pour filtrer les lignes">
          <motion.div variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-1.5">
            {byBu.map(([k, v]) => (
              <motion.div key={k} variants={listItem}>
                <Bar
                  label={k}
                  pct={(v / maxBu) * 100}
                  value={m(v)}
                  onClick={() => onDrillBu(k)}
                  ariaLabel={`Filtrer les lignes sur la BU ${k} — ${m(v)}`}
                />
              </motion.div>
            ))}
          </motion.div>
        </Panel>

        <Panel title="Par catégorie de coût">
          <motion.div variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-1.5">
            {byCat.map(([k, v]) => (
              <motion.div key={k} variants={listItem}>
                <Bar label={k} pct={(v / maxCat) * 100} value={m(v)} />
              </motion.div>
            ))}
          </motion.div>
        </Panel>
      </div>

      {/* Row 4: payment status (drill-down). */}
      <Panel className="mt-4" title="Statut de paiement" hint="clic pour filtrer les lignes">
        <div className="flex flex-col gap-1.5">
          {pay.map(({ status, sum, count }) => (
            <Bar
              key={status}
              label={<PayPill status={status} />}
              pct={t.total ? (sum / t.total) * 100 : 0}
              value={
                <>
                  {m(sum)} <span className="text-zinc-400">· {count}</span>
                </>
              }
              fill={PAY_FILL[status]}
              onClick={() => onDrillPay(status)}
              ariaLabel={`Filtrer sur statut ${PAY_LABELS[status]} — ${m(sum)}, ${count} ligne(s)`}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}

const PAY_FILL: Record<PayStatus, string> = {
  blocked: "bg-rose-500",
  pending: "bg-amber-500",
  draft: "bg-zinc-400",
  paid: "bg-ocp-500",
};

const ACCENT: Record<string, string> = {
  sky: "text-sky-700",
  amber: "text-amber-800",
  rose: "text-rose-700",
  ocp: "text-ocp-700",
};
const ACCENT_BAR: Record<string, string> = {
  sky: "bg-sky-600",
  amber: "bg-amber-600",
  rose: "bg-rose-500",
  ocp: "bg-ocp-500",
};

function KpiTile({
  icon,
  label,
  value,
  sub,
  accent = "ocp",
  barPct,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: string;
  barPct?: number;
  alert?: boolean;
}) {
  return (
    <motion.div
      variants={listItem}
      className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_40px_-30px_rgba(20,59,24,0.2)]"
    >
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
        <span className={alert ? "text-rose-600" : "text-zinc-400"}>{icon}</span>
        {label}
      </div>
      <div className={`font-mono text-3xl font-semibold leading-none ${ACCENT[accent]}`}>{value}</div>
      <div className="mt-2.5 text-xs font-medium text-zinc-500">{sub}</div>
      {typeof barPct === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <motion.div
            className={`h-full rounded-full ${ACCENT_BAR[accent]}`}
            initial={{ width: 0 }}
            animate={{ width: `${barPct}%` }}
            transition={spring}
          />
        </div>
      )}
    </motion.div>
  );
}

function Panel({
  title,
  hint,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_40px_-30px_rgba(20,59,24,0.22)] ${className}`}
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">{title}</h2>
        {hint && <span className="text-xs italic text-zinc-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
