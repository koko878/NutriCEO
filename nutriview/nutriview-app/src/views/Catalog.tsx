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
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/Button";
import { PageHero } from "../components/Card";
import type { DataItem, Project } from "../lib/model";

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

function sourceBadge(source?: Project["ingestion"]["source"], locator?: string) {
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
            item.sourceRef?.locator
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
