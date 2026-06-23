// =====================================================================
// Catalog — densité divide-y, pas une card par ligne.
// Édition inline (toggle row → form).
// =====================================================================

import { useState } from "react";
import {
  Plus,
  Trash,
  ArrowRight,
  PencilSimple,
  Check,
  X,
  Database,
  Tag,
  FileXls,
  FilePdf,
  FileDoc,
  TextAlignLeft,
  Sparkle,
  Warning,
  CaretDown,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/Button";
import { PageHero } from "../components/Card";
import type { DataItem, Project } from "../lib/model";
import { aiExtractCatalog, aiSource, type AiExtractedItem } from "../lib/ai";
import { useGov } from "../lib/useGov";
import { domainById } from "../lib/refs";

interface Props {
  project: Project;
  onChange: (p: Project) => void;
  onClassify: () => void;
}

const LIFE_STATES: DataItem["cycleLifeStates"][number][] = [
  "création",
  "traitement",
  "stockage",
  "transit",
  "archivage",
];

function uid() {
  return `item_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function sourceBadge(
  source: Project["ingestion"]["source"] | undefined,
  locator: string | undefined,
  proposedByAI: boolean
) {
  // Item ajouté manuellement (aucun sourceRef, aucun flag IA) — pas de badge.
  if (!source && !proposedByAI) return null;

  // Priorité au flag IA — c'est lui qui décrit le mode réel d'apparition.
  if (proposedByAI) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-vd-50 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-vd-800 ring-1 ring-inset ring-amber-vd-200">
        <Sparkle size={11} weight="duotone" className="text-amber-vd-700" />
        IA · proposé
        {locator && (
          <span className="text-amber-vd-700/70 tabular-nums">· {locator}</span>
        )}
      </span>
    );
  }

  // Sinon, badge selon la source du brief (ingestion file).
  const baseCls =
    "inline-flex items-center gap-1 rounded-md bg-zinc-50 px-1.5 py-0.5 text-[10.5px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200";
  const tone = (icon: React.ReactNode, label: string) => (
    <span className={baseCls}>
      <span className="text-zinc-500">{icon}</span>
      {label}
      {locator && (
        <span className="text-zinc-400 tabular-nums">· {locator}</span>
      )}
    </span>
  );
  switch (source) {
    case "excel":
      return tone(<FileXls size={11} weight="duotone" />, "Excel");
    case "pdf":
      return tone(<FilePdf size={11} weight="duotone" />, "PDF");
    case "word":
      return tone(<FileDoc size={11} weight="duotone" />, "Word");
    case "email":
      return tone(<TextAlignLeft size={11} weight="duotone" />, "Email");
    default:
      return tone(<PencilSimple size={11} weight="duotone" />, "Manuel");
  }
}

export function Catalog({ project, onChange, onClassify }: Props) {
  const [items, setItems] = useState<DataItem[]>(project.items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  function persist(next: DataItem[]) {
    setItems(next);
    onChange({ ...project, items: next });
  }

  function addRow() {
    const fresh: DataItem = {
      id: uid(),
      name: "",
      description: "",
      cycleLifeStates: [],
      proposedByAI: false,
      status: "draft",
    };
    persist([fresh, ...items]);
    setEditingId(fresh.id);
  }

  function updateRow(id: string, patch: Partial<DataItem>) {
    persist(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function toggleLife(id: string, st: DataItem["cycleLifeStates"][number]) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const has = it.cycleLifeStates.includes(st);
    updateRow(id, {
      cycleLifeStates: has
        ? it.cycleLifeStates.filter((s) => s !== st)
        : [...it.cycleLifeStates, st],
    });
  }

  function removeRow(id: string) {
    persist(items.filter((it) => it.id !== id));
    if (editingId === id) setEditingId(null);
  }

  const totalLabel = items.length > 0
    ? `${items.length} donnée${items.length > 1 ? "s" : ""} prête${items.length > 1 ? "s" : ""} à classifier`
    : "Catalogue vide";

  return (
    <div>
      <PageHero
        eyebrow={`${project.title}${project.bu ? " · " + project.bu : ""}`}
        title={
          <>
            Catalogue des données
            <span className="block text-zinc-400">à classifier.</span>
          </>
        }
        lead="Validez et complétez la liste des données du projet. Chaque ligne sera ensuite classée individuellement sur les trois dimensions C/I/D."
        right={
          <>
            <Button
              variant="ghost"
              icon={<Sparkle size={16} weight="duotone" />}
              onClick={() => setAiPanelOpen((o) => !o)}
              aria-expanded={aiPanelOpen}
            >
              Extraire avec IA
            </Button>
            <Button
              variant="secondary"
              icon={<Plus size={16} weight="bold" />}
              onClick={addRow}
            >
              Ajouter
            </Button>
            <Button
              variant="primary"
              iconRight={<ArrowRight size={16} weight="bold" />}
              onClick={onClassify}
              disabled={items.length === 0}
              title={
                items.length === 0
                  ? "Ajoutez au moins une donnée pour passer à la classification"
                  : undefined
              }
            >
              Classifier toutes
            </Button>
          </>
        }
      />

      <AnimatePresence initial={false}>
        {aiPanelOpen && (
          <AiExtractPanel
            existingNames={items.map((it) => it.name.toLowerCase().trim())}
            onImport={(newItems) => {
              persist([...newItems, ...items]);
              setAiPanelOpen(false);
            }}
            onClose={() => setAiPanelOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="mb-4 flex items-center gap-2 text-[12.5px] text-zinc-500">
        <Database size={14} weight="duotone" className="text-ocp-700" />
        <span className="tabular-nums font-medium text-zinc-700">
          {totalLabel}
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState onAdd={addRow} />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            <AnimatePresence initial={false}>
              {items.map((it) => (
                <motion.li
                  key={it.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 24 }}
                  className="px-6 py-4 transition-colors hover:bg-zinc-50/60"
                >
                  {editingId === it.id ? (
                    <EditRow
                      item={it}
                      onUpdate={(patch) => updateRow(it.id, patch)}
                      onToggleLife={(st) => toggleLife(it.id, st)}
                      onDone={() => setEditingId(null)}
                      onDelete={() => removeRow(it.id)}
                    />
                  ) : (
                    <ReadRow
                      item={it}
                      source={project.ingestion.source}
                      onEdit={() => setEditingId(it.id)}
                      onDelete={() => removeRow(it.id)}
                    />
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </div>
  );
}

function ReadRow({
  item,
  source,
  onEdit,
  onDelete,
}: {
  item: DataItem;
  source?: Project["ingestion"]["source"];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { state } = useGov();
  const domain = domainById(state.refs, item.dataDomainId);
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="text-left font-display text-[18px] font-semibold leading-tight text-zinc-900 transition-colors hover:text-ocp-800"
          >
            {item.name || (
              <span className="italic text-zinc-400">(donnée sans nom)</span>
            )}
          </button>
          {sourceBadge(
            item.sourceRef ? source : undefined,
            item.sourceRef?.locator,
            item.proposedByAI
          )}
          {domain && (
            <span className="inline-flex items-center gap-1 rounded-md bg-ocp-50 px-1.5 py-0.5 text-[10.5px] font-medium text-ocp-800 ring-1 ring-inset ring-ocp-200">
              <Database size={11} weight="duotone" />
              {domain.name}
            </span>
          )}
        </div>
        {item.description && item.description !== item.name && (
          <p className="mt-1 max-w-[65ch] text-[13px] text-zinc-600">
            {item.description}
          </p>
        )}
        {item.cycleLifeStates.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
            <Tag size={12} weight="duotone" />
            {item.cycleLifeStates.map((s) => (
              <span
                key={s}
                className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10.5px] text-zinc-600"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          icon={<PencilSimple size={14} weight="duotone" />}
          onClick={onEdit}
          aria-label={`Éditer ${item.name || "la ligne"}`}
        >
          Éditer
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash size={14} weight="duotone" />}
          onClick={onDelete}
          aria-label={`Supprimer ${item.name || "la ligne"}`}
        />
      </div>
    </div>
  );
}

function EditRow({
  item,
  onUpdate,
  onToggleLife,
  onDone,
  onDelete,
}: {
  item: DataItem;
  onUpdate: (patch: Partial<DataItem>) => void;
  onToggleLife: (st: DataItem["cycleLifeStates"][number]) => void;
  onDone: () => void;
  onDelete: () => void;
}) {
  const { state } = useGov();
  const domains = state.refs.dataDomains.filter((d) => d.active);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="sm:col-span-5">
          <label
            htmlFor={`name-${item.id}`}
            className="mb-1 block text-[11.5px] font-medium text-zinc-500"
          >
            Nom de la donnée
          </label>
          <input
            id={`name-${item.id}`}
            type="text"
            value={item.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="ex. Données géologiques de site"
            autoFocus
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-[14px] focus:border-ocp-500 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-7">
          <label
            htmlFor={`desc-${item.id}`}
            className="mb-1 block text-[11.5px] font-medium text-zinc-500"
          >
            Description courte
          </label>
          <input
            id={`desc-${item.id}`}
            type="text"
            value={item.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="ex. Mesures issues des campagnes sismiques"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-[14px] focus:border-ocp-500 focus:outline-none"
          />
        </div>
      </div>
      {domains.length > 0 && (
        <div className="sm:max-w-xs">
          <label
            htmlFor={`domain-${item.id}`}
            className="mb-1 block text-[11.5px] font-medium text-zinc-500"
          >
            Data domain
          </label>
          <select
            id={`domain-${item.id}`}
            value={item.dataDomainId ?? ""}
            onChange={(e) =>
              onUpdate({ dataDomainId: e.target.value || undefined })
            }
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-[14px] focus:border-ocp-500 focus:outline-none"
          >
            <option value="">— aucun —</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <span className="mb-1.5 block text-[11.5px] font-medium text-zinc-500">
          Cycle de vie
        </span>
        <div className="flex flex-wrap gap-2">
          {LIFE_STATES.map((st) => {
            const active = item.cycleLifeStates.includes(st);
            const cid = `life-${item.id}-${st}`;
            return (
              <label
                key={cid}
                htmlFor={cid}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                  active
                    ? "border-ocp-300 bg-ocp-50 text-ocp-900"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                }`}
              >
                <input
                  id={cid}
                  type="checkbox"
                  checked={active}
                  onChange={() => onToggleLife(st)}
                  className="sr-only"
                />
                {st}
              </label>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash size={14} weight="duotone" />}
          onClick={onDelete}
        >
          Supprimer
        </Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<X size={14} weight="bold" />}
            onClick={onDone}
          >
            Fermer
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Check size={14} weight="bold" />}
            onClick={onDone}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-200 bg-white px-8 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ocp-50 text-ocp-700">
        <Database size={28} weight="duotone" />
      </div>
      <h2 className="mt-4 font-display text-[24px] font-semibold text-zinc-900">
        Aucune donnée détectée.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] text-zinc-500">
        Le découpage heuristique n'a rien trouvé. Ajoutez vos données
        manuellement — vous pourrez les classer ensuite.
      </p>
      <div className="mt-5 flex justify-center">
        <Button
          variant="primary"
          icon={<Plus size={16} weight="bold" />}
          onClick={onAdd}
        >
          Ajouter ma première donnée
        </Button>
      </div>
    </div>
  );
}

// =====================================================================
// AiExtractPanel — colle un brief texte, IA extrait les DataItem[] candidats,
// utilisateur sélectionne ce qu'il importe.
// Appelle aiExtractCatalog (proxy WP Databricks ou mock standalone).
// =====================================================================
function AiExtractPanel({
  existingNames,
  onImport,
  onClose,
}: {
  existingNames: string[];
  onImport: (items: DataItem[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | {
        kind: "ready";
        items: AiExtractedItem[];
        selected: Set<number>;
        source: string;
        ms: number;
      }
  >({ kind: "idle" });

  const minText = 40;

  async function run() {
    const trimmed = text.trim();
    if (trimmed.length < minText) {
      setState({
        kind: "error",
        message: `Collez un brief plus consistant (≥ ${minText} caractères).`,
      });
      return;
    }
    setState({ kind: "loading" });
    const r = await aiExtractCatalog({ text: trimmed, maxItems: 20 });
    if (!r.ok) {
      setState({ kind: "error", message: r.message });
      return;
    }
    if (!r.data.items || r.data.items.length === 0) {
      setState({
        kind: "error",
        message:
          "Aucune donnée détectée dans ce brief. Reformulez ou ajoutez manuellement.",
      });
      return;
    }
    setState({
      kind: "ready",
      items: r.data.items,
      selected: new Set(r.data.items.map((_, i) => i)),
      source: r.source,
      ms: r.durationMs,
    });
  }

  function toggleSelected(idx: number) {
    if (state.kind !== "ready") return;
    const next = new Set(state.selected);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setState({ ...state, selected: next });
  }

  function importNow() {
    if (state.kind !== "ready") return;
    const picked: DataItem[] = state.items
      .map((it, i) => ({ it, i }))
      .filter(({ i }) => state.selected.has(i))
      .filter(
        ({ it }) =>
          !existingNames.includes(it.name.toLowerCase().trim())
      )
      .map(({ it }) => ({
        id: `item_${Date.now().toString(36)}_${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        name: it.name,
        description: it.description,
        cycleLifeStates: [],
        sourceRef: it.locator
          ? { fileName: "(brief IA)", locator: it.locator }
          : undefined,
        proposedByAI: true,
        status: "draft",
      }));
    onImport(picked);
  }

  return (
    <motion.section
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 150, damping: 22 }}
      className="mb-6 overflow-hidden rounded-3xl border border-amber-vd-200 bg-amber-vd-50/40"
    >
      <div className="px-6 py-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-[11.5px] font-medium text-amber-vd-800">
            <Sparkle size={14} weight="duotone" />
            Extraction IA · à valider
          </div>
          <span className="text-[11px] text-zinc-500">
            Source :{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[10.5px] text-amber-vd-800 ring-1 ring-amber-vd-200">
              {aiSource()}
            </code>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<X size={14} weight="bold" />}
            aria-label="Fermer le panneau d'extraction IA"
            className="ml-auto"
          />
        </div>

        {state.kind !== "ready" && (
          <>
            <label
              htmlFor="ai-extract-text"
              className="mb-1 block text-[11.5px] font-medium text-zinc-500"
            >
              Collez le brief projet (Word, PDF, slide deck, mail…)
            </label>
            <textarea
              id="ai-extract-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="Ex. Le projet COO Cockpit consolide les données financières mensuelles, les indicateurs de production, la liste des contrats fournisseurs et la base des clients institutionnels…"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[13.5px] focus:border-amber-vd-500 focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11.5px] text-zinc-500 tabular-nums">
                {text.trim().length} / {minText} caractères minimum
              </span>
              <Button
                variant="secondary"
                size="sm"
                icon={<Sparkle size={14} weight="duotone" />}
                onClick={run}
                disabled={state.kind === "loading"}
              >
                {state.kind === "loading"
                  ? "Analyse en cours…"
                  : "Analyser le brief"}
              </Button>
            </div>
            {state.kind === "error" && (
              <div className="mt-3 flex items-start gap-2 text-[12.5px] text-amber-vd-900">
                <Warning
                  size={14}
                  weight="duotone"
                  className="mt-0.5 text-amber-vd-700"
                />
                <span>{state.message}</span>
              </div>
            )}
          </>
        )}

        {state.kind === "ready" && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3 text-[12.5px]">
              <span className="text-zinc-700">
                <span className="tabular-nums font-medium">
                  {state.items.length}
                </span>{" "}
                donnée(s) détectée(s) ·{" "}
                <span className="tabular-nums font-medium">
                  {state.selected.size}
                </span>{" "}
                sélectionnée(s)
              </span>
              <span className="text-[11px] text-zinc-400 tabular-nums">
                {state.ms} ms
              </span>
            </div>
            <ul className="divide-y divide-amber-vd-100 overflow-hidden rounded-2xl border border-amber-vd-100 bg-white">
              {state.items.map((it, idx) => {
                const dup = existingNames.includes(
                  it.name.toLowerCase().trim()
                );
                const checked = state.selected.has(idx);
                return (
                  <li key={idx} className="px-4 py-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked && !dup}
                        disabled={dup}
                        onChange={() => toggleSelected(idx)}
                        className="mt-1 h-4 w-4 accent-ocp-600"
                        aria-label={`Importer ${it.name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-zinc-900">
                            {it.name}
                          </span>
                          {it.locator && (
                            <span className="text-[10.5px] text-zinc-400 tabular-nums">
                              {it.locator}
                            </span>
                          )}
                          {dup && (
                            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                              déjà présent
                            </span>
                          )}
                        </div>
                        {it.description && (
                          <p className="mt-1 text-[12.5px] text-zinc-600">
                            {it.description}
                          </p>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<CaretDown size={14} weight="bold" />}
                onClick={() =>
                  setState({ kind: "idle" })
                }
              >
                Modifier le brief
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} weight="bold" />}
                onClick={importNow}
                disabled={state.selected.size === 0}
              >
                Importer {state.selected.size} donnée
                {state.selected.size > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
