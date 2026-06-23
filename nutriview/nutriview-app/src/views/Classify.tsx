// =====================================================================
// Classify — split layout : sidebar données gauche, panneau classification droite.
// 3 sliders C/I/D, verdict moteur live, <Verdict density="inline">,
// justification IA placeholder (Phase 4) + mesures Annexe I graduées.
// =====================================================================

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  X,
  Sparkle,
  ListChecks,
  Database,
  ArrowUUpLeft,
  Warning,
  Quotes,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/Button";
import { PageHero } from "../components/Card";
import { ClasseBadge, SensibleBadge } from "../components/Badge";
import { Slider } from "../components/Slider";
import { Verdict } from "../components/Verdict";
import { aiClassify, aiSource, type AiClassifyCell } from "../lib/ai";
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
  return { dim, level, rationale: "", citations: [] };
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
    if (!current)
      return defaultClassification({
        id: "",
        name: "",
        description: "",
        cycleLifeStates: [],
        proposedByAI: false,
        status: "draft",
      });
    const existing = classifs[current.id];
    return existing ?? defaultClassification(current);
  }, [classifs, current]);

  if (items.length === 0 || !current) {
    return <EmptyClassify />;
  }

  function setLevel(dim: Dim, lvl: Level) {
    const updated = recompute({
      ...cls,
      cells: cls.cells.map((c) =>
        c.dim === dim ? { ...c, level: lvl } : c
      ),
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
  const classifiedCount = Object.keys(classifs).length;
  const isLast = idx === items.length - 1;

  return (
    <div>
      <PageHero
        eyebrow={`${project.title}${project.bu ? " · " + project.bu : ""}`}
        title={
          <>
            Classification CID
            <span className="block text-zinc-400">
              donnée par donnée.
            </span>
          </>
        }
        lead="Pour chaque dimension, évaluez l'impact d'une atteinte. La classe globale et le verdict cloud se calculent automatiquement — moteur déterministe, jamais IA."
        right={
          <Button
            variant="primary"
            iconRight={<ArrowRight size={16} weight="bold" />}
            onClick={onDone}
          >
            Voir la synthèse
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sidebar données */}
        <aside className="lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto lg:pr-2">
          <div className="mb-3 flex items-center justify-between text-[11.5px] font-medium text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <ListChecks
                size={14}
                weight="duotone"
                className="text-ocp-700"
              />
              <span className="tabular-nums">{classifiedCount}</span> /{" "}
              {items.length} classées
            </span>
          </div>
          <ul className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {items.map((it, i) => {
              const existing = classifs[it.id];
              const active = i === idx;
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => setIdx(i)}
                    className={`flex w-full items-center gap-2 border-b border-zinc-50 px-4 py-2.5 text-left text-[13px] transition-colors last:border-0 ${
                      active
                        ? "bg-ocp-50 text-ocp-900"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums ${
                        active
                          ? "bg-ocp-700 text-white"
                          : existing
                          ? "bg-ocp-100 text-ocp-800"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {existing ? existing.classe : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {it.name || (
                        <span className="italic text-zinc-400">
                          (sans nom)
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Panneau classification */}
        <section>
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ type: "spring", stiffness: 140, damping: 22 }}
            >
              <div className="mb-6 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-[11.5px] font-medium text-zinc-500">
                    Donnée{" "}
                    <span className="tabular-nums">{idx + 1}</span> /{" "}
                    <span className="tabular-nums">{items.length}</span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500 nv-no-print">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<CaretLeft size={14} weight="bold" />}
                      onClick={() => setIdx((i) => Math.max(0, i - 1))}
                      disabled={idx === 0}
                      aria-label="Donnée précédente"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconRight={<CaretRight size={14} weight="bold" />}
                      onClick={() =>
                        setIdx((i) => Math.min(items.length - 1, i + 1))
                      }
                      disabled={isLast}
                      aria-label="Donnée suivante"
                    />
                  </div>
                </div>
                <h2 className="font-display text-[28px] font-semibold leading-tight text-zinc-900 md:text-[32px]">
                  {current.name || (
                    <span className="italic text-zinc-400">
                      (donnée sans nom)
                    </span>
                  )}
                </h2>
                {current.description &&
                  current.description !== current.name && (
                    <p className="max-w-[65ch] text-[13.5px] text-zinc-600">
                      {current.description}
                    </p>
                  )}
              </div>

              {/* Sliders C/I/D */}
              <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-[0_20px_40px_-22px_rgba(20,59,24,0.10)]">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-zinc-100">
                  {(["C", "I", "D"] as Dim[]).map((dim, i) => (
                    <div
                      key={dim}
                      className={
                        i === 0
                          ? "lg:pr-6"
                          : i === 1
                          ? "lg:px-6"
                          : "lg:pl-6"
                      }
                    >
                      <Slider
                        dim={dim}
                        value={lvls[dim]}
                        onChange={(v2) => setLevel(dim, v2)}
                        onShowExamples={() => setPanelDim(dim)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Bandeau verdict moteur */}
              <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3.5">
                <span className="text-[11.5px] font-medium text-zinc-500">
                  Verdict moteur
                </span>
                <ClasseBadge classe={cls.classe} />
                {cls.sensible && <SensibleBadge />}
                <span className="ml-auto text-[12px] text-zinc-500">
                  MAX(C, I, D) = niveau{" "}
                  <span className="font-semibold tabular-nums text-zinc-700">
                    {Math.max(lvls.C, lvls.I, lvls.D)}
                  </span>
                </span>
              </div>

              {/* Verdict inline — expandable vers synthese (modale) */}
              <div className="mt-4">
                <Verdict
                  density="inline"
                  classe={cls.classe}
                  sensible={cls.sensible}
                  verdictCloud={cls.verdictCloud}
                />
              </div>

              {/* Suggestion IA (Phase 4) — Databricks proxy ou mock. */}
              <AiSuggestion
                key={current.id}
                itemName={current.name || ""}
                itemDescription={current.description || ""}
                onApply={(cells) => {
                  // Applique uniquement les cellules non rejetées (level ≥ 0).
                  let next = cls;
                  for (const c of cells) {
                    if (c.level < 0) continue;
                    next = recompute({
                      ...next,
                      cells: next.cells.map((x) =>
                        x.dim === c.dim
                          ? {
                              ...x,
                              level: c.level as Level,
                              rationale: c.rationale,
                              citations: c.citations.map((cit) => ({
                                section: cit.section,
                                quote: cit.quote,
                              })),
                              aiProposed: {
                                level: c.level as Level,
                                rationale: c.rationale,
                              },
                            }
                          : x
                      ),
                    });
                  }
                  onChange({
                    ...project,
                    classifications: {
                      ...project.classifications,
                      [current!.id]: next,
                    },
                  });
                }}
              />

              {/* Justifications IA visibles (lecture seule, par dimension) */}
              {cls.cells.some((c) => c.rationale) && (
                <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-6">
                  <div className="mb-3 flex items-center gap-1.5 text-[11.5px] font-medium text-zinc-500">
                    <Quotes size={14} weight="duotone" className="text-amber-vd-700" />
                    Justifications &amp; citations (Annexe&nbsp;II)
                  </div>
                  <ul className="divide-y divide-zinc-100">
                    {cls.cells
                      .filter((c) => c.rationale)
                      .map((c) => (
                        <li key={c.dim} className="py-3 text-[13px] text-zinc-700">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-zinc-700">
                              {c.dim} = {c.level}
                            </span>
                            {c.aiProposed && (
                              <span className="text-[10.5px] uppercase tracking-wide text-amber-vd-800">
                                proposé par IA
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-800">{c.rationale}</p>
                          {c.citations.map((cit, i) => (
                            <p
                              key={i}
                              className="mt-1 border-l border-amber-vd-200 pl-3 text-[12px] italic text-zinc-600"
                            >
                              <span className="font-semibold text-amber-vd-800">
                                {cit.section}
                              </span>
                              {cit.quote && <> — « {cit.quote} »</>}
                            </p>
                          ))}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Mesures Annexe I */}
              {cls.suggestedMeasures.length > 0 && (
                <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6">
                  <div className="mb-3 flex items-center gap-1.5 text-[11.5px] font-medium text-zinc-500">
                    <ListChecks
                      size={14}
                      weight="duotone"
                      className="text-ocp-700"
                    />
                    Mesures Annexe&nbsp;I — graduées
                  </div>
                  <ul className="divide-y divide-zinc-100">
                    {cls.suggestedMeasures.map((m, i) => (
                      <li
                        key={m}
                        className="flex items-start gap-3 py-2.5 text-[13.5px] text-zinc-800"
                      >
                        <span className="mt-0.5 text-[11px] font-semibold tabular-nums text-ocp-600">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer panneau : nav + CTA synthèse */}
              <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-5 nv-no-print">
                <Button
                  variant="ghost"
                  icon={<CaretLeft size={14} weight="bold" />}
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                  disabled={idx === 0}
                >
                  Donnée précédente
                </Button>
                {isLast ? (
                  <Button
                    variant="primary"
                    iconRight={<ArrowRight size={16} weight="bold" />}
                    onClick={onDone}
                  >
                    Tout est classé — voir la synthèse
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    iconRight={<CaretRight size={14} weight="bold" />}
                    onClick={() =>
                      setIdx((i) => Math.min(items.length - 1, i + 1))
                    }
                  >
                    Donnée suivante
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      <AnimatePresence>
        {panelDim && (
          <ExamplesPanel
            dim={panelDim}
            level={lvls[panelDim]}
            onClose={() => setPanelDim(null)}
          />
        )}
      </AnimatePresence>
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
    <motion.div
      className="fixed inset-0 z-40 flex justify-end bg-zinc-950/30 backdrop-blur-[2px]"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`Exemples Annexe II — ${DIM_LABELS[dim]} niveau ${level}`}
        className="flex w-full max-w-md flex-col bg-white shadow-[0_40px_80px_-20px_rgba(20,59,24,0.25)]"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400">
              Annexe II — exemples
            </div>
            <h3 className="mt-1 font-display text-2xl font-semibold text-zinc-900">
              {DIM_LABELS[dim]}
            </h3>
            <p className="mt-1 text-[12.5px] text-zinc-500">
              Niveau {level} — {LEVEL_LABELS[level]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95"
          >
            <X weight="bold" size={18} />
          </button>
        </header>
        <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto">
          {examplesFor(dim, level).map((e) => (
            <li
              key={e}
              className="px-6 py-3 text-[13.5px] text-zinc-800 transition-colors hover:bg-ocp-50/30"
            >
              {e}
            </li>
          ))}
        </ul>
        <footer className="border-t border-zinc-100 bg-zinc-50/70 px-6 py-3 text-[11.5px] text-zinc-500">
          Corpus minimal v0.2 — sera enrichi en phase 4 depuis le PDF
          intégral du guide DGSSI.
        </footer>
      </motion.aside>
    </motion.div>
  );
}

function EmptyClassify() {
  return (
    <div>
      <PageHero
        title="Classification CID"
        lead="Aucune donnée à classer — revenez au catalogue pour en ajouter."
      />
      <div className="rounded-3xl border border-dashed border-zinc-200 bg-white px-8 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ocp-50 text-ocp-700">
          <Database size={28} weight="duotone" />
        </div>
        <h2 className="mt-4 font-display text-[24px] font-semibold text-zinc-900">
          Catalogue vide.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] text-zinc-500">
          Vous ne pouvez pas classifier tant qu'il n'y a pas de donnée
          inventoriée. Retournez à l'étape Catalogue.
        </p>
        <div className="mt-5 flex justify-center">
          <Button
            variant="secondary"
            icon={<ArrowUUpLeft size={16} weight="bold" />}
            onClick={() => window.history.back()}
          >
            Retour au catalogue
          </Button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// AiSuggestion — bouton "Suggérer C/I/D" + état loading/error/done.
// Appelle aiClassify (proxy WP Databricks, ou mock local en standalone).
// Garde-fou citation déjà géré côté lib/ai.ts (cells.rejected si manquant).
// =====================================================================
function AiSuggestion({
  itemName,
  itemDescription,
  onApply,
}: {
  itemName: string;
  itemDescription: string;
  onApply: (cells: AiClassifyCell[]) => void;
}) {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "done"; rejected: number; total: number; source: string; ms: number }
  >({ kind: "idle" });

  const run = async () => {
    if (!itemName.trim()) {
      setState({ kind: "error", message: "Nommez la donnée d'abord." });
      return;
    }
    setState({ kind: "loading" });
    const r = await aiClassify({ name: itemName, description: itemDescription });
    if (!r.ok) {
      setState({ kind: "error", message: r.message });
      return;
    }
    onApply(r.data.cells);
    setState({
      kind: "done",
      rejected: r.data.cells.filter((c) => c.level < 0).length,
      total: r.data.cells.length,
      source: r.source,
      ms: r.durationMs,
    });
  };

  return (
    <div className="mt-4 rounded-3xl border border-amber-vd-200 bg-amber-vd-50/40 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[11.5px] font-medium text-amber-vd-800">
          <Sparkle size={14} weight="duotone" />
          IA · suggestion (à valider)
        </div>
        <span className="text-[11px] text-zinc-500">
          Source : <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[10.5px] text-amber-vd-800 ring-1 ring-amber-vd-200">{aiSource()}</code>
        </span>
        <div className="ml-auto">
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkle size={14} weight="duotone" />}
            onClick={run}
            disabled={state.kind === "loading"}
          >
            {state.kind === "loading" ? "Analyse en cours…" : "Suggérer C/I/D"}
          </Button>
        </div>
      </div>
      {state.kind === "error" && (
        <div className="mt-2 flex items-start gap-2 text-[12.5px] text-zinc-700">
          <Warning size={14} weight="duotone" className="mt-0.5 text-amber-vd-700" />
          <span>{state.message}</span>
        </div>
      )}
      {state.kind === "done" && (
        <div className="mt-2 text-[12.5px] text-zinc-700">
          {state.total - state.rejected} dimension(s) appliquée(s) sur {state.total}
          {state.rejected > 0 && (
            <> · <span className="text-amber-vd-800">{state.rejected} rejetée(s)</span> (citation Annexe II manquante)</>
          )}
          <span className="ml-2 text-zinc-400">— {state.ms} ms</span>
        </div>
      )}
      {state.kind === "idle" && (
        <p className="mt-1 text-[12.5px] text-zinc-600">
          Pré-remplit les 3 sliders C/I/D avec une justification citée de l'Annexe&nbsp;II. Vous gardez la décision finale.
        </p>
      )}
    </div>
  );
}
