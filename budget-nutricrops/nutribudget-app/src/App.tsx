import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShareNetwork,
  Plus,
  Eye,
  Timer,
  Info,
} from "@phosphor-icons/react";
import type { Currency, EngagementLine, PayStatus } from "./lib/model";
import { DEFAULT_RATES } from "./lib/model";
import { isReadOnly, useEngagementData } from "./lib/store";
import { Conso } from "./views/Conso";
import { Lines } from "./views/Lines";
import type { Filters, Sort } from "./views/Lines";
import { Vendors } from "./views/Vendors";
import { Exec } from "./views/Exec";
import { Share } from "./views/Share";
import { EditLineModal } from "./components/EditLineModal";
import { Toast } from "./components/Toast";
import { ConsoSkeleton, TableSkeleton } from "./components/Skeleton";

type Tab = "conso" | "lines" | "vendors" | "exec" | "share";
const TABS: [Tab, string][] = [
  ["conso", "Consolidé"],
  ["lines", "Lignes"],
  ["vendors", "Prestataires"],
  ["exec", "Exécution & paiement"],
  ["share", "Partage & export"],
];

export default function App() {
  const readOnly = isReadOnly();
  const { data, upsert, remove } = useEngagementData();
  const [tab, setTab] = useState<Tab>("conso");
  const [cur, setCur] = useState<Currency>("MAD");
  const [filters, setFilters] = useState<Filters>({ q: "", bu: "", type: "", pay: "" });
  const [sort, setSort] = useState<Sort>({ key: "amountMAD", dir: -1 });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EngagementLine | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  function openEdit(line: EngagementLine | null) {
    setEditing(line);
    setModalOpen(true);
  }
  function drillBu(bu: string) {
    setFilters({ q: "", bu, type: "", pay: "" });
    setTab("lines");
  }
  function drillPay(pay: PayStatus) {
    setFilters({ q: "", bu: "", type: "", pay });
    setTab("lines");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-50">
      {/* Header */}
      <header className="nb-no-print sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-200 bg-white/90 px-5 py-2.5 backdrop-blur-md">
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">
            OCP · Nutricrops
          </span>
          <span className="text-lg font-semibold tracking-tight text-ocp-700">
            Nutri<span className="text-ocp-500">Budget</span>
          </span>
        </div>
        <span className="flex-1" />

        <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600">
          Exercice
          <select className="cursor-pointer bg-transparent font-bold text-ocp-700 outline-none" defaultValue="2026">
            <option>2026</option>
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600">
          Devise
          <select
            value={cur}
            onChange={(e) => setCur(e.target.value as Currency)}
            className="cursor-pointer bg-transparent font-bold text-ocp-700 outline-none"
            aria-label="Devise d’affichage"
          >
            <option value="MAD">MAD</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => setTab("share")}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98]"
        >
          <ShareNetwork size={16} /> Partager
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={() => openEdit(null)}
            className="inline-flex items-center gap-2 rounded-xl bg-ocp-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-ocp-700 active:scale-[0.98]"
          >
            <Plus size={16} weight="bold" /> Ligne
          </button>
        )}

        <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-1 pl-3 pr-1.5 md:flex">
          <div className="leading-tight">
            <div className="text-xs font-semibold text-zinc-800">{readOnly ? "Invité" : "Hamza K."}</div>
            <div className="text-[10px] text-zinc-500">{readOnly ? "Lecture seule" : "Éditeur · D²nAI"}</div>
          </div>
          <div className="grid h-7 w-7 place-items-center rounded-full bg-ocp-600 text-[11px] font-bold text-white">
            {readOnly ? <Eye size={14} weight="fill" /> : "HK"}
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav
        className="nb-no-print sticky top-[53px] z-[19] flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-4"
        role="tablist"
        aria-label="Sections NutriBudget"
      >
        {TABS.map(([id, label]) => {
          const on = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(id)}
              className={`relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${
                on ? "text-ocp-700" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {label}
              {on && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-ocp-600"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-6 sm:px-6">
        {/* Mode banner */}
        {readOnly ? (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-800">
            <Eye size={16} weight="duotone" /> Vue lecture seule partagée — édition désactivée.
          </div>
        ) : (
          <div className="nb-no-print mb-5 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
            <Timer size={16} weight="duotone" />
            Outil tactique de consolidation — pont avant Anaplan (~2 ans). Données en cache local de ce poste
            (MVP). Cible : serveur partagé + SSO.
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {data === null ? (
              tab === "conso" ? <ConsoSkeleton /> : <TableSkeleton />
            ) : tab === "conso" ? (
              <Conso data={data} cur={cur} rates={DEFAULT_RATES} onDrillBu={drillBu} onDrillPay={drillPay} />
            ) : tab === "lines" ? (
              <Lines
                data={data}
                cur={cur}
                rates={DEFAULT_RATES}
                readOnly={readOnly}
                filters={filters}
                setFilters={setFilters}
                sort={sort}
                setSort={setSort}
                onEdit={openEdit}
              />
            ) : tab === "vendors" ? (
              <Vendors data={data} cur={cur} rates={DEFAULT_RATES} />
            ) : tab === "exec" ? (
              <Exec data={data} cur={cur} rates={DEFAULT_RATES} />
            ) : (
              <Share data={data} cur={cur} rates={DEFAULT_RATES} onToast={showToast} />
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="mt-12 flex items-center gap-2 text-xs text-zinc-400">
          <Info size={13} /> NutriBudget v0.3 · D²nAI · OCP Nutricrops — consolidation budgétaire tactique.
        </footer>
      </main>

      {!readOnly && (
        <EditLineModal
          open={modalOpen}
          line={editing}
          onClose={() => setModalOpen(false)}
          onSave={(rec) => {
            upsert(rec);
            showToast(rec.id && editing ? "Ligne mise à jour" : "Ligne ajoutée");
          }}
          onDelete={(id) => {
            remove(id);
            showToast("Ligne supprimée");
          }}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}
