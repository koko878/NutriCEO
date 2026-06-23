import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Warning,
  CaretLeft,
  CaretRight,
  X,
} from "@phosphor-icons/react";
import { Button } from "../components/Button";
import { Card, PageHeader, SectionLabel } from "../components/Card";
import { ClasseBadge, SensibleBadge } from "../components/Badge";
import { Slider } from "../components/Slider";
import type {
  Classification,
  ClassificationCell,
  DataItem,
  Dim,
  Level,
  Project,
} from "../lib/model";
import { DIM_LABELS, LEVEL_LABELS } from "../lib/model";
import { classeOf, isSensible, verdictCloud } from "../lib/engine";
import { examplesFor } from "../lib/annexe2";

interface Props {
  project: Project;
  initialItemId?: string;
  onChange: (p: Project) => void;
  onDone: () => void;
}

function makeCell(dim: Dim, level: Level): ClassificationCell {
  return {
    dim,
    level,
    rationale: "",
    citations: [],
  };
}

function defaultClassification(item: DataItem): Classification {
  return {
    itemId: item.id,
    cells: [makeCell("C", 0), makeCell("I", 0), makeCell("D", 0)],
    classe: "V",
    sensible: false,
    verdictCloud: { eligible: true, conditions: [] },
    suggestedMeasures: [],
    history: [],
  };
}

function levelsOf(cls: Classification): { C: Level; I: Level; D: Level } {
  const get = (d: Dim): Level =>
    (cls.cells.find((c) => c.dim === d)?.level ?? 0) as Level;
  return { C: get("C"), I: get("I"), D: get("D") };
}

function recompute(cls: Classification): Classification {
  const lvls = levelsOf(cls);
  const cl = classeOf(lvls);
  const v = verdictCloud(lvls);
  const measures = v.eligible ? v.conditions : [];
  return {
    ...cls,
    classe: cl,
    sensible: isSensible(lvls),
    verdictCloud: v,
    suggestedMeasures: measures,
  };
}

export function Classify({
  project,
  initialItemId,
  onChange,
  onDone,
}: Props) {
  const items = project.items;
  const [idx, setIdx] = useState(() => {
    if (initialItemId) {
      const i = items.findIndex((it) => it.id === initialItemId);
      if (i >= 0) return i;
    }
    return 0;
  });
  const [panelDim, setPanelDim] = useState<Dim | null>(null);

  const current: DataItem | undefined = items[idx];
  const classifs = project.classifications;
  const cls = useMemo<Classification>(() => {
    if (!current) return defaultClassification({ id: "", name: "", description: "", cycleLifeStates: [], proposedByAI: false, status: "draft" });
    const existing = classifs[current.id];
    return existing ?? defaultClassification(current);
  }, [classifs, current]);

  if (!current) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-zinc-500">
          Aucune donnée à classer. Retournez au catalogue pour en ajouter.
        </p>
      </Card>
    );
  }

  function setLevel(dim: Dim, lvl: Level) {
    const updated = recompute({
      ...cls,
      cells: cls.cells.map((c) => (c.dim === dim ? { ...c, level: lvl } : c)),
    });
    onChange({
      ...project,
      classifications: {
        ...project.classifications,
        [current!.id]: updated,
      },
    });
  }

  const lvls = levelsOf(cls);
  const v = cls.verdictCloud;

  return (
    <div>
      <PageHeader
        title={`Classification — ${current.name || "(donnée sans nom)"}`}
        lead="Pour chaque dimension (C, I, D), évaluez l'impact d'une atteinte sur l'organisation. La classe globale et le verdict cloud se calculent automatiquement."
      />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Button
            variant="ghost"
            icon={<CaretLeft size={14} weight="bold" />}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
          >
            Précédent
          </Button>
          <span className="font-medium text-zinc-700">
            {idx + 1} / {items.length}
          </span>
          <Button
            variant="ghost"
            icon={<CaretRight size={14} weight="bold" />}
            onClick={() => setIdx((i) => Math.min(items.length - 1, i + 1))}
            disabled={idx >= items.length - 1}
          >
            Suivant
          </Button>
        </div>
        <Button
          variant="primary"
          icon={<ArrowRight size={16} weight="bold" />}
          onClick={onDone}
        >
          Voir la synthèse
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {(["C", "I", "D"] as Dim[]).map((dim) => (
          <Slider
            key={dim}
            dim={dim}
            value={lvls[dim]}
            onChange={(v2) => setLevel(dim, v2)}
            onShowExamples={() => setPanelDim(dim)}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <SectionLabel>Verdict moteur</SectionLabel>
          <div className="flex flex-wrap items-center gap-2">
            <ClasseBadge classe={cls.classe} />
            {cls.sensible && <SensibleBadge />}
          </div>
          <p className="mt-3 text-sm text-zinc-700">
            Niveaux : C={lvls.C} · I={lvls.I} · D={lvls.D} → MAX ={" "}
            <span className="font-semibold">{Math.max(lvls.C, lvls.I, lvls.D)}</span>
          </p>
        </Card>

        <Card className={v.eligible ? "" : "ring-rose-200 bg-rose-50/70"}>
          <SectionLabel>Verdict cloud</SectionLabel>
          {v.eligible ? (
            <div className="flex items-start gap-2 text-sm text-zinc-700">
              <CheckCircle
                size={18}
                weight="fill"
                className="mt-0.5 text-ocp-600"
              />
              <span>
                Éligible cloud sous réserve des mesures Annexe I listées
                ci-contre.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm font-medium text-rose-800">
              <Warning size={18} weight="fill" className="mt-0.5" />
              <span>
                Résidence Maroc obligatoire — {v.reason}.
              </span>
            </div>
          )}
        </Card>

        <Card>
          <SectionLabel>Mesures Annexe I (graduées)</SectionLabel>
          <ul className="space-y-1 text-sm text-zinc-700">
            {cls.suggestedMeasures.length === 0 ? (
              <li className="text-zinc-500">
                Aucune mesure additionnelle (donnée sensible — résidence
                MA obligatoire prime).
              </li>
            ) : (
              cls.suggestedMeasures.map((m) => (
                <li key={m} className="flex items-start gap-2">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-none rounded-full bg-ocp-600" />
                  {m}
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      {panelDim && (
        <ExamplesPanel
          dim={panelDim}
          level={lvls[panelDim]}
          onClose={() => setPanelDim(null)}
        />
      )}
    </div>
  );
}

function ExamplesPanel({
  dim,
  level,
  onClose,
}: {
  dim: Dim;
  level: Level;
  onClose: () => void;
}) {
  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label={`Exemples Annexe II — ${DIM_LABELS[dim]} niveau ${level}`}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">
            Exemples Annexe II
          </div>
          <h3 className="text-lg text-zinc-900">
            {DIM_LABELS[dim]} — niveau {level} ({LEVEL_LABELS[level]})
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <X weight="bold" size={18} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="mb-3 text-xs text-zinc-500">
          Exemples extraits / inspirés du guide DGSSI v1.0 (Annexe II).
          Corpus minimal — sera enrichi en phase 4.
        </p>
        <ul className="space-y-2 text-sm text-zinc-800">
          {examplesFor(dim, level).map((e) => (
            <li
              key={e}
              className="rounded-md border border-zinc-100 bg-zinc-50/40 px-3 py-2"
            >
              {e}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
