import { useState } from "react";
import { Plus, Trash, ArrowRight } from "@phosphor-icons/react";
import { Button } from "../components/Button";
import { Card, PageHeader, SectionLabel } from "../components/Card";
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

export function Catalog({ project, onChange, onClassify }: Props) {
  const [items, setItems] = useState<DataItem[]>(project.items);

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
  }

  return (
    <div>
      <PageHeader
        title="Catalogue des données"
        lead="Validez et complétez la liste des données du projet. Chaque ligne sera ensuite classée individuellement sur les 3 dimensions (Confidentialité, Intégrité, Disponibilité)."
      />

      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>{items.length} donnée(s)</SectionLabel>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<Plus size={16} weight="bold" />}
            onClick={addRow}
          >
            Ajouter une donnée
          </Button>
          <Button
            variant="primary"
            icon={<ArrowRight size={16} weight="bold" />}
            onClick={onClassify}
            disabled={items.length === 0}
            title={
              items.length === 0
                ? "Ajoutez au moins une donnée pour passer à la classification"
                : undefined
            }
          >
            Classer
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-zinc-500">
            Catalogue vide. Ajoutez votre première donnée ci-dessus, ou
            retournez à l'écran d'ingestion pour partir d'un brief.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Card key={it.id} className="p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <label
                    htmlFor={`name-${it.id}`}
                    className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500"
                  >
                    Nom de la donnée
                  </label>
                  <input
                    id={`name-${it.id}`}
                    type="text"
                    value={it.name}
                    onChange={(e) => updateRow(it.id, { name: e.target.value })}
                    placeholder="ex. Données géologiques de site"
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-ocp-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-6">
                  <label
                    htmlFor={`desc-${it.id}`}
                    className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500"
                  >
                    Description courte
                  </label>
                  <input
                    id={`desc-${it.id}`}
                    type="text"
                    value={it.description}
                    onChange={(e) =>
                      updateRow(it.id, { description: e.target.value })
                    }
                    placeholder="ex. Mesures issues des campagnes sismiques"
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-ocp-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2 flex sm:items-end sm:justify-end">
                  <Button
                    variant="ghost"
                    icon={<Trash size={14} weight="bold" />}
                    onClick={() => removeRow(it.id)}
                    aria-label={`Supprimer ${it.name || "la ligne"}`}
                  >
                    Supprimer
                  </Button>
                </div>
                <div className="sm:col-span-12">
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Cycle de vie
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {LIFE_STATES.map((st) => {
                      const cid = `life-${it.id}-${st}`;
                      return (
                        <label
                          key={cid}
                          htmlFor={cid}
                          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                        >
                          <input
                            id={cid}
                            type="checkbox"
                            checked={it.cycleLifeStates.includes(st)}
                            onChange={() => toggleLife(it.id, st)}
                            className="accent-ocp-600"
                          />
                          {st}
                        </label>
                      );
                    })}
                  </div>
                </div>
                {it.sourceRef && (
                  <div className="sm:col-span-12 text-[11px] text-zinc-400">
                    Source : {it.sourceRef.fileName}
                    {it.sourceRef.locator
                      ? ` (${it.sourceRef.locator})`
                      : ""}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
