import { useMemo } from "react";
import { Warning, CheckCircle, PaperPlaneTilt } from "@phosphor-icons/react";
import { Button } from "../components/Button";
import { Card, PageHeader, SectionLabel } from "../components/Card";
import { ClasseBadge } from "../components/Badge";
import type { Classe, Classification, Project } from "../lib/model";
import { CLASSE_LABELS } from "../lib/model";

const CLASSES: Classe[] = ["I", "II", "III", "IV", "V"];

const BAR_BG: Record<Classe, string> = {
  I: "bg-red-700",
  II: "bg-orange-600",
  III: "bg-amber-500",
  IV: "bg-lime-600",
  V: "bg-zinc-400",
};

interface Props {
  project: Project;
}

export function Synthesis({ project }: Props) {
  const summary = useMemo(() => {
    const all = Object.values(project.classifications) as Classification[];
    const classified = all.length;
    const total = project.items.length;
    const sensibles = all.filter((c) => c.sensible).length;
    const distribution: Record<Classe, number> = {
      I: 0,
      II: 0,
      III: 0,
      IV: 0,
      V: 0,
    };
    for (const c of all) distribution[c.classe]++;
    const maxBar = Math.max(1, ...Object.values(distribution));
    return { all, classified, total, sensibles, distribution, maxBar };
  }, [project]);

  const projectSensible = summary.sensibles > 0;

  return (
    <div>
      <PageHeader
        title="Synthèse du projet"
        lead="Vue d'ensemble de la classification. Le verdict cloud global hérite du plus contraignant : une seule donnée sensible suffit à imposer la résidence MA pour l'ensemble du projet."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <SectionLabel>Données</SectionLabel>
          <div className="font-display text-3xl text-zinc-900">
            {summary.total}
          </div>
          <div className="text-xs text-zinc-500">au catalogue</div>
        </Card>
        <Card>
          <SectionLabel>Classées</SectionLabel>
          <div className="font-display text-3xl text-zinc-900">
            {summary.classified}
            <span className="ml-1 text-base text-zinc-400">
              / {summary.total}
            </span>
          </div>
          <div className="text-xs text-zinc-500">
            {summary.total > 0
              ? `${Math.round((summary.classified / summary.total) * 100)} %`
              : "—"}
          </div>
        </Card>
        <Card>
          <SectionLabel>Sensibles</SectionLabel>
          <div
            className={`font-display text-3xl ${
              summary.sensibles > 0 ? "text-rose-700" : "text-zinc-900"
            }`}
          >
            {summary.sensibles}
          </div>
          <div className="text-xs text-zinc-500">
            C ≥ 3 ET classe ∈ {"{I, II}"}
          </div>
        </Card>
        <Card>
          <SectionLabel>Verdict global</SectionLabel>
          {projectSensible ? (
            <div className="flex items-center gap-2 text-rose-700">
              <Warning size={20} weight="fill" />
              <span className="font-medium">Résidence MA</span>
            </div>
          ) : summary.classified > 0 ? (
            <div className="flex items-center gap-2 text-ocp-700">
              <CheckCircle size={20} weight="fill" />
              <span className="font-medium">Cloud éligible</span>
            </div>
          ) : (
            <div className="text-zinc-400">—</div>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <SectionLabel>Distribution par classe</SectionLabel>
        <div className="space-y-2">
          {CLASSES.map((c) => {
            const n = summary.distribution[c];
            const pct = (n / summary.maxBar) * 100;
            return (
              <div key={c} className="flex items-center gap-3">
                <div className="w-32 shrink-0">
                  <ClasseBadge classe={c} />
                </div>
                <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`absolute inset-y-0 left-0 ${BAR_BG[c]}`}
                    style={{ width: `${pct}%` }}
                    aria-label={`${n} données en classe ${c}`}
                  />
                </div>
                <div className="w-14 shrink-0 text-right text-sm tabular-nums text-zinc-700">
                  {n}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          {CLASSE_LABELS.I} · {CLASSE_LABELS.II} · {CLASSE_LABELS.III} ·{" "}
          {CLASSE_LABELS.IV} · {CLASSE_LABELS.V}
        </p>
      </Card>

      <Card
        className={`mt-6 ${
          projectSensible ? "ring-rose-200 bg-rose-50/60" : ""
        }`}
      >
        <SectionLabel>Verdict cloud projet</SectionLabel>
        {projectSensible ? (
          <div className="flex items-start gap-3 text-rose-800">
            <Warning size={22} weight="fill" className="mt-0.5" />
            <div>
              <div className="font-semibold">
                Résidence Maroc obligatoire — loi 05-20.
              </div>
              <p className="mt-1 text-sm">
                Au moins une donnée du projet est classée sensible (C ≥ 3
                et classe I/II). Le projet hérite du verdict le plus
                contraignant : aucun cloud étranger n'est éligible.
              </p>
            </div>
          </div>
        ) : summary.classified > 0 ? (
          <div className="flex items-start gap-3 text-ocp-700">
            <CheckCircle size={22} weight="fill" className="mt-0.5" />
            <div>
              <div className="font-semibold">Cloud éligible.</div>
              <p className="mt-1 text-sm text-zinc-700">
                Aucune donnée sensible identifiée. Respecter les mesures
                Annexe I associées à chaque classe (chiffrement, MFA,
                journalisation, etc.).
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Classez d'abord les données du catalogue pour obtenir le
            verdict cloud du projet.
          </p>
        )}
      </Card>

      <Card className="mt-6">
        <SectionLabel>Prochaines étapes suggérées</SectionLabel>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
          <li>
            Compléter les classifications restantes (
            {summary.total - summary.classified} donnée
            {summary.total - summary.classified > 1 ? "s" : ""} à classer).
          </li>
          <li>
            Faire revoir les niveaux par le propriétaire des données (
            {project.dataOwner || "à désigner"}).
          </li>
          <li>
            En cas de donnée sensible, instruire la résidence Maroc avec
            le RSSI avant tout choix de plateforme.
          </li>
        </ul>
        <div className="mt-5 flex justify-end">
          <Button
            variant="primary"
            icon={<PaperPlaneTilt size={16} weight="bold" />}
            disabled
            title="Workflow Phase 5"
          >
            Envoyer en validation
          </Button>
        </div>
      </Card>
    </div>
  );
}
