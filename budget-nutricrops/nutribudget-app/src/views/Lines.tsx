import { useMemo } from "react";
import { motion } from "framer-motion";
import { MagnifyingGlass, PencilSimple, Plus, X, Tray, CaretUp, CaretDown } from "@phosphor-icons/react";
import type { Currency, EngagementLine, PayStatus, Rates } from "../lib/model";
import { BUS, PAY_LABELS } from "../lib/model";
import { fmt, lineMAD, money } from "../lib/format";
import { CostPill, PageHeader, PayPill } from "../components/ui";
import { listContainer, listItem } from "../lib/motion";

export interface Filters {
  q: string;
  bu: string;
  type: "" | "CAPEX" | "OPEX";
  pay: "" | PayStatus;
}
export interface Sort {
  key: SortKey;
  dir: 1 | -1;
}
type SortKey = "project" | "bu" | "costType" | "vendor" | "amountMAD" | "pay" | "progress";

interface Props {
  data: EngagementLine[];
  cur: Currency;
  rates: Rates;
  readOnly: boolean;
  filters: Filters;
  setFilters: (f: Filters) => void;
  sort: Sort;
  setSort: (s: Sort) => void;
  onEdit: (line: EngagementLine | null) => void;
}

export function Lines({ data, cur, rates, readOnly, filters, setFilters, sort, setSort, onEdit }: Props) {
  const rows = useMemo(() => {
    let a = data.slice();
    if (filters.q) {
      const q = filters.q.toLowerCase();
      a = a.filter((l) =>
        (l.project + l.vendor + l.bu + l.sponsor + l.spoc).toLowerCase().includes(q)
      );
    }
    if (filters.bu) a = a.filter((l) => l.bu === filters.bu);
    if (filters.type) a = a.filter((l) => l.costType === filters.type);
    if (filters.pay) a = a.filter((l) => l.pay === filters.pay);
    const { key, dir } = sort;
    a.sort((x, y) => {
      const xv = key === "amountMAD" ? lineMAD(x, rates) : x[key];
      const yv = key === "amountMAD" ? lineMAD(y, rates) : y[key];
      if (typeof xv === "string") return xv.localeCompare(yv as string) * dir;
      return ((xv as number) - (yv as number)) * dir;
    });
    return a;
  }, [data, filters, sort, rates]);

  const sum = rows.reduce((s, l) => s + lineMAD(l, rates), 0);
  const m = (v: number) => money(v, cur, rates);

  const chips: { label: string; clear: () => void }[] = [];
  if (filters.bu) chips.push({ label: `BU: ${filters.bu}`, clear: () => setFilters({ ...filters, bu: "" }) });
  if (filters.type) chips.push({ label: filters.type, clear: () => setFilters({ ...filters, type: "" }) });
  if (filters.pay) chips.push({ label: PAY_LABELS[filters.pay], clear: () => setFilters({ ...filters, pay: "" }) });

  function toggleSort(key: SortKey) {
    if (sort.key === key) setSort({ key, dir: (sort.dir * -1) as 1 | -1 });
    else setSort({ key, dir: 1 });
  }

  return (
    <div>
      <PageHeader
        title="Lignes d’engagement"
        lead={
          <>
            {rows.length} ligne(s) · total filtré <strong className="font-mono text-zinc-800">{m(sum)}</strong>.
            Clique un en-tête pour trier.{readOnly ? "" : " Clic ✎ pour éditer."}
          </>
        }
      />

      <div className="nb-no-print mb-4 flex flex-wrap items-center gap-2">
        <label htmlFor="q" className="sr-only">Rechercher une ligne</label>
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 sm:flex-none">
          <MagnifyingGlass size={16} className="text-zinc-400" />
          <input
            id="q"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="Projet, prestataire, BU, sponsor…"
            className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
        </div>
        <select
          aria-label="Filtrer par Business Unit"
          value={filters.bu}
          onChange={(e) => setFilters({ ...filters, bu: e.target.value })}
          className={ctrlCls}
        >
          <option value="">Toutes BU</option>
          {BUS.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select
          aria-label="Filtrer par type CAPEX ou OPEX"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value as Filters["type"] })}
          className={ctrlCls}
        >
          <option value="">CAPEX + OPEX</option>
          <option value="CAPEX">CAPEX</option>
          <option value="OPEX">OPEX</option>
        </select>
        <select
          aria-label="Filtrer par statut de paiement"
          value={filters.pay}
          onChange={(e) => setFilters({ ...filters, pay: e.target.value as Filters["pay"] })}
          className={ctrlCls}
        >
          <option value="">Tout statut</option>
          {(Object.keys(PAY_LABELS) as PayStatus[]).map((k) => (
            <option key={k} value={k}>{PAY_LABELS[k]}</option>
          ))}
        </select>
        {chips.length > 0 && (
          <button
            type="button"
            onClick={() => setFilters({ ...filters, bu: "", type: "", pay: "" })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 active:scale-[0.98]"
          >
            <X size={14} /> Filtres
          </button>
        )}
        <span className="flex-1" />
        {!readOnly && (
          <button
            type="button"
            onClick={() => onEdit(null)}
            className="inline-flex items-center gap-2 rounded-xl bg-ocp-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ocp-700 active:scale-[0.98]"
          >
            <Plus size={16} weight="bold" /> Ligne
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState readOnly={readOnly} hasFilters={chips.length > 0 || Boolean(filters.q)} onAdd={() => onEdit(null)} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <Th label="Projet" k="project" sort={sort} onSort={toggleSort} />
                <Th label="BU" k="bu" sort={sort} onSort={toggleSort} />
                <Th label="Type" k="costType" sort={sort} onSort={toggleSort} />
                <Th label="Prestataire" k="vendor" sort={sort} onSort={toggleSort} />
                <Th label="Montant" k="amountMAD" sort={sort} onSort={toggleSort} align="right" />
                <Th label="Paiement" k="pay" sort={sort} onSort={toggleSort} />
                <Th label="Avanc." k="progress" sort={sort} onSort={toggleSort} align="right" />
                <th className="w-12" />
              </tr>
            </thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="show">
              {rows.map((l) => (
                <motion.tr
                  key={l.id}
                  variants={listItem}
                  className="border-b border-zinc-100 last:border-0 hover:bg-ocp-50/40"
                >
                  <td className="px-3 py-3 align-middle">
                    <div className="font-semibold text-zinc-900">{l.project}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {l.cat}{l.otp ? ` · OTP ${l.otp}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-middle text-zinc-700">{l.bu}</td>
                  <td className="px-3 py-3 align-middle"><CostPill type={l.costType} /></td>
                  <td className="px-3 py-3 align-middle">
                    <div className="text-zinc-800">{l.vendor}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">{l.sponsor}</div>
                  </td>
                  <td className="px-3 py-3 text-right align-middle">
                    <div className="font-mono font-semibold text-zinc-900">{m(lineMAD(l, rates))}</div>
                    <div className="mt-0.5 font-mono text-xs text-zinc-500">{fmt(l.amount)} {l.cur}</div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <PayPill status={l.pay} />
                    {l.payNote && <div className="mt-1 max-w-[180px] text-xs text-zinc-500">{l.payNote}</div>}
                  </td>
                  <td className="px-3 py-3 text-right align-middle font-mono text-zinc-700">{l.progress || 0}%</td>
                  <td className="px-3 py-3 align-middle">
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onEdit(l)}
                        aria-label={`Éditer la ligne ${l.project}`}
                        className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-ocp-700 active:scale-95"
                      >
                        <PencilSimple size={16} />
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const ctrlCls =
  "nb-no-print cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50";

function Th({
  label,
  k,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  k: SortKey;
  sort: Sort;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const on = sort.key === k;
  const ariaSort = on ? (sort.dir < 0 ? "descending" : "ascending") : "none";
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`bg-zinc-50/60 px-3 py-2.5 ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        aria-label={`Trier par ${label}`}
        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide transition ${
          on ? "text-ocp-700" : "text-zinc-500 hover:text-ocp-700"
        } ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        {on && (sort.dir < 0 ? <CaretDown size={11} weight="bold" /> : <CaretUp size={11} weight="bold" />)}
      </button>
    </th>
  );
}

function EmptyState({ readOnly, hasFilters, onAdd }: { readOnly: boolean; hasFilters: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ocp-50 text-ocp-600">
        <Tray size={26} weight="duotone" />
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-zinc-900">
        {hasFilters ? "Aucune ligne ne correspond" : "Aucune ligne d’engagement"}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">
        {hasFilters
          ? "Ajustez la recherche ou les filtres pour retrouver vos lignes."
          : "Commencez par saisir une ligne d’engagement — typée CAPEX/OPEX, montant, devise, OTP/PO et justification."}
      </p>
      {!readOnly && !hasFilters && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ocp-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ocp-700 active:scale-[0.98]"
        >
          <Plus size={16} weight="bold" /> Nouvelle ligne
        </button>
      )}
    </div>
  );
}
