// =====================================================================
// Synthesis — vue projet finale. Hero asymétrique : titre Cormorant gauche,
// KPIs droite (tabular-nums). <Verdict density="synthese"> pleine largeur.
// Distribution par classe en bar chart horizontal (jamais pie).
// Liste données : divide-y, badge classe + verdict cloud par ligne.
// =====================================================================

import { useMemo, useState } from "react";
import {
  MapPinLine,
  ShieldCheck,
  Database,
  ChartBarHorizontal,
  PaperPlaneTilt,
  Tray,
  PenNib,
  Warning,
  FilePdf,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { ClasseBadge, ProjectStatusBadge, SensibleBadge } from "../components/Badge";
import { Verdict } from "../components/Verdict";
import { Button } from "../components/Button";
import type { Classe, Classification, Project } from "../lib/model";
import { CLASSE_LABELS } from "../lib/model";
import { graduatedMeasures } from "../lib/engine";
import {
  allItemsClassified,
  computeProjectHash,
  formatHashShort,
} from "../lib/signature";
import { notifySubmitForReview } from "../lib/validation";
import { buildPerimeters, effectivePerimeters } from "../lib/perimeters";
import { useGov } from "../lib/useGov";

const CLASSES: Classe[] = ["I", "II", "III", "IV", "V"];

const BAR_BG: Record<Classe, string> = {
  I: "bg-amber-vd-700",
  II: "bg-amber-vd-500",
  III: "bg-zinc-400",
  IV: "bg-ocp-500",
  V: "bg-zinc-300",
};

interface Props {
  project: Project;
  currentUser?: string;
  /** Phase 5 — chef de projet envoie la classification en validation. */
  onSubmitForReview?: (p: Project) => void;
}

export function Synthesis({ project, currentUser, onSubmitForReview }: Props) {
  const { state: gov } = useGov();
  const [submitOpen, setSubmitOpen] = useState(false);
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
    // Classe globale projet = max des classes individuelles (max niveau atteint).
    const projectMaxLevel = all.reduce<number>((acc, c) => {
      const lc = c.cells.find((x) => x.dim === "C")?.level ?? 0;
      const li = c.cells.find((x) => x.dim === "I")?.level ?? 0;
      const ld = c.cells.find((x) => x.dim === "D")?.level ?? 0;
      return Math.max(acc, lc, li, ld);
    }, 0);
    const projectClasse = (["V", "IV", "III", "II", "I"] as Classe[])[
      projectMaxLevel
    ];
    return {
      all,
      classified,
      total,
      sensibles,
      distribution,
      maxBar,
      projectClasse,
    };
  }, [project]);

  const projectSensible = summary.sensibles > 0;

  // Verdict cloud du projet — propagation du plus contraignant.
  const projectVerdict = useMemo(() => {
    if (projectSensible) {
      return {
        eligible: false as const,
        reason:
          "données sensibles loi 05-20 — résidence MA obligatoire" as const,
      };
    }
    if (summary.classified === 0) return null;
    return {
      eligible: true as const,
      conditions: graduatedMeasures(summary.projectClasse),
    };
  }, [projectSensible, summary.classified, summary.projectClasse]);

  const projectMeasures =
    !projectSensible && summary.classified > 0
      ? graduatedMeasures(summary.projectClasse)
      : [];

  return (
    <div>
      {/* Hero asymétrique : titre serif gauche · KPIs droite */}
      <header className="mb-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span>
              Synthèse · {project.bu ?? "Nutricrops"}
              {project.region ? ` · ${project.region}` : ""} · classification
              DGSSI
            </span>
            <ProjectStatusBadge status={project.status} />
          </div>
          <h1 className="font-display text-[40px] font-semibold leading-[1.04] text-zinc-900 md:text-[48px]">
            {project.title || "(projet sans titre)"}
          </h1>
          {project.description && (
            <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-zinc-600">
              {project.description}
            </p>
          )}
          <p className="mt-3 text-[13px] text-zinc-500">
            Chef de projet :{" "}
            <span className="font-medium text-zinc-700">
              {project.owner || "—"}
            </span>{" "}
            · propriétaire :{" "}
            <span className="font-medium text-zinc-700">
              {project.dataOwner || "—"}
            </span>
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-6 sm:gap-8">
          <Kpi label="Données" value={summary.total} />
          <Kpi
            label="Classées"
            value={summary.classified}
            sub={
              summary.total > 0
                ? `${Math.round((summary.classified / summary.total) * 100)} %`
                : "—"
            }
          />
          <Kpi
            label="Sensibles"
            value={summary.sensibles}
            tone={summary.sensibles > 0 ? "amber" : "neutral"}
          />
        </dl>
      </header>

      {/* Barre d'action — export du livrable opposable (PDF via print natif) */}
      {summary.classified > 0 && (
        <div className="mb-8 flex justify-end nv-no-print">
          <Button
            variant="secondary"
            size="sm"
            icon={<FilePdf size={16} weight="duotone" />}
            onClick={() => window.print()}
            title="Imprimer ou exporter en PDF le livrable de classification"
          >
            Export PDF
          </Button>
        </div>
      )}

      {/* Verdict projet — hero moment */}
      {projectVerdict && (
        <section className="mb-10">
          <Verdict
            density="synthese"
            classe={summary.projectClasse}
            sensible={projectSensible}
            verdictCloud={projectVerdict}
            sensibleCount={summary.sensibles}
            totalCount={summary.total}
            measures={projectMeasures}
          />
        </section>
      )}

      {/* Workflow Phase 5 — envoi en validation OU rappel d'état OU signature affichée */}
      {project.status === "drafting" && projectVerdict && (
        <SubmitForReviewBlock
          project={project}
          allReady={allItemsClassified(project)}
          opened={submitOpen}
          onOpen={() => setSubmitOpen(true)}
          onClose={() => setSubmitOpen(false)}
          onConfirm={async () => {
            setSubmitOpen(false);
            const next: Project = {
              ...project,
              status: "in_review",
              submission: {
                submittedAt: new Date().toISOString(),
                submittedBy: currentUser || project.owner || "anonyme",
              },
              // Fan-out multi-owners : un périmètre par data domain owner touché.
              perimeters: buildPerimeters(project, gov.refs),
            };
            onSubmitForReview?.(next);
            // Best-effort notify backend (no-op silent en standalone).
            try {
              const hash = await computeProjectHash(next);
              void notifySubmitForReview(next, hash);
            } catch {
              /* silencieux — la transition front a déjà eu lieu */
            }
          }}
        />
      )}

      {project.status === "in_review" && (
        <section className="mb-10 rounded-3xl border border-ocp-200 bg-ocp-50/40 px-7 py-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ocp-100 text-ocp-700">
              <Tray size={22} weight="duotone" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-[22px] font-semibold leading-tight text-ocp-900">
                En attente de validation des propriétaires.
              </h3>
              <p className="mt-0.5 text-[13px] text-zinc-700">
                Envoyé pour validation
                {project.submission?.submittedAt && (
                  <>
                    {" "}le{" "}
                    {new Date(project.submission.submittedAt).toLocaleString(
                      "fr-FR",
                      { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
                    )}
                  </>
                )}
                . Chaque propriétaire valide les données de son périmètre ; le
                projet sera signé quand tous auront tranché.
              </p>
              <ul className="mt-4 space-y-2">
                {effectivePerimeters(project).map((p, i) => (
                  <li
                    key={p.ownerLogin + i}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-2.5 ring-1 ring-zinc-200"
                  >
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium text-zinc-900">
                        {p.ownerName}
                      </div>
                      <div className="text-[11.5px] text-zinc-500">
                        {p.domainNames.length
                          ? p.domainNames.join(" · ")
                          : "Données transverses"}{" "}
                        · <span className="tabular-nums">{p.itemIds.length}</span>{" "}
                        donnée{p.itemIds.length > 1 ? "s" : ""}
                      </div>
                    </div>
                    {p.status === "signed" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-ocp-50 px-2 py-1 text-[11px] font-medium text-ocp-800 ring-1 ring-inset ring-ocp-200">
                        <ShieldCheck size={12} weight="duotone" />
                        Signé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-vd-50 px-2 py-1 text-[11px] font-medium text-amber-vd-800 ring-1 ring-inset ring-amber-vd-200">
                        <Tray size={12} weight="duotone" />
                        En attente
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {project.status === "signed" && project.signature && (
        <section className="mb-10 rounded-3xl border border-ocp-200 bg-ocp-50/40 px-7 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ocp-100 text-ocp-700">
                <ShieldCheck size={22} weight="duotone" />
              </div>
              <div>
                <h3 className="font-display text-[22px] font-semibold leading-tight text-ocp-900">
                  Classification signée.
                </h3>
                <p className="mt-0.5 text-[13px] text-zinc-700">
                  Par{" "}
                  <span className="font-medium">{project.signature.signedBy}</span>{" "}
                  · le{" "}
                  {new Date(project.signature.signedAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="flex flex-col items-start md:items-end">
                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
                  Hash SHA-256
                </span>
                <code className="mt-1 rounded-lg bg-white px-3 py-1.5 font-mono text-[12px] text-zinc-800 ring-1 ring-zinc-200">
                  {formatHashShort(project.signature.contentHash)}
                </code>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={<FilePdf size={16} weight="duotone" />}
                onClick={() => window.print()}
                title="Exporter le livrable signé en PDF"
              >
                Exporter le livrable signé
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Distribution par classe — bar chart horizontal */}
      <section className="mb-10 rounded-3xl border border-zinc-200 bg-white p-7 shadow-[0_20px_40px_-22px_rgba(20,59,24,0.10)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-zinc-500">
              <ChartBarHorizontal size={14} weight="duotone" />
              Distribution par classe
            </div>
            <h2 className="mt-1 font-display text-2xl font-semibold text-zinc-900">
              Profil de classification
            </h2>
          </div>
          <span className="text-[12px] text-zinc-500">
            <span className="tabular-nums font-medium text-zinc-700">
              {summary.classified}
            </span>{" "}
            / <span className="tabular-nums">{summary.total}</span> données
          </span>
        </div>
        <ul className="space-y-2.5">
          {CLASSES.map((c, i) => {
            const n = summary.distribution[c];
            const pct = (n / summary.maxBar) * 100;
            return (
              <li
                key={c}
                className="grid grid-cols-[170px_1fr_40px] items-center gap-4"
                aria-label={`${CLASSE_LABELS[c]} : ${n} données`}
              >
                <ClasseBadge classe={c} />
                <div className="relative h-5 overflow-hidden rounded-full bg-zinc-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{
                      type: "spring",
                      stiffness: 80,
                      damping: 18,
                      delay: i * 0.05,
                    }}
                    className={`absolute inset-y-0 left-0 ${BAR_BG[c]} ${
                      n === 0 ? "opacity-30" : ""
                    }`}
                  />
                </div>
                <div className="text-right text-[13.5px] tabular-nums font-medium text-zinc-700">
                  {n}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Liste données — divide-y, badge classe + verdict cloud icon */}
      <section className="mb-10 overflow-hidden rounded-3xl border border-zinc-200 bg-white">
        <header className="border-b border-zinc-100 px-7 py-5">
          <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-zinc-500">
            <Database size={14} weight="duotone" />
            Détail par donnée
          </div>
          <h2 className="mt-1 font-display text-2xl font-semibold text-zinc-900">
            Inventaire classifié
          </h2>
        </header>
        {project.items.length === 0 ? (
          <p className="px-7 py-10 text-center text-[13.5px] text-zinc-500">
            Aucune donnée au catalogue.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {project.items.map((it) => {
              const cls = project.classifications[it.id];
              return (
                <li
                  key={it.id}
                  className="flex items-start justify-between gap-6 px-7 py-4 transition-colors hover:bg-zinc-50/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[17px] font-semibold leading-tight text-zinc-900">
                      {it.name || (
                        <span className="italic text-zinc-400">
                          (sans nom)
                        </span>
                      )}
                    </div>
                    {it.description && it.description !== it.name && (
                      <p className="mt-0.5 max-w-[65ch] text-[12.5px] text-zinc-500">
                        {it.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {cls ? (
                      <>
                        <DimChip label="C" value={getLvl(cls, "C")} />
                        <DimChip label="I" value={getLvl(cls, "I")} />
                        <DimChip label="D" value={getLvl(cls, "D")} />
                        <ClasseBadge classe={cls.classe} size="sm" />
                        {cls.sensible ? (
                          <span title="Résidence Maroc obligatoire">
                            <MapPinLine
                              size={16}
                              weight="duotone"
                              className="text-amber-vd-700"
                            />
                          </span>
                        ) : (
                          <span title="Cloud éligible">
                            <ShieldCheck
                              size={16}
                              weight="duotone"
                              className="text-ocp-600"
                            />
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[11.5px] italic text-zinc-400">
                        non classée
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {summary.classified === 0 && (
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-white px-8 py-12 text-center">
          <SensibleBadge />
          <p className="mx-auto mt-3 max-w-md text-[13.5px] text-zinc-500">
            Classez au moins une donnée du catalogue pour obtenir le
            verdict cloud du projet et la distribution par classe.
          </p>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "neutral" | "amber";
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
        {label}
      </dt>
      <dd
        className={`mt-1 font-display text-[40px] font-semibold leading-none tabular-nums ${
          tone === "amber" ? "text-amber-vd-800" : "text-zinc-900"
        }`}
      >
        {value}
      </dd>
      {sub && (
        <dd className="mt-0.5 text-[11.5px] text-zinc-500">{sub}</dd>
      )}
    </div>
  );
}

function getLvl(cls: Classification, dim: "C" | "I" | "D"): number {
  return cls.cells.find((x) => x.dim === dim)?.level ?? 0;
}

function DimChip({ label, value }: { label: string; value: number }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums ${
        value >= 3
          ? "bg-amber-vd-50 text-amber-vd-800 ring-1 ring-inset ring-amber-vd-200"
          : "bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-200"
      }`}
      aria-label={`Dimension ${label} : niveau ${value}`}
    >
      <span className="font-display font-semibold">{label}</span>
      <span>{value}</span>
    </span>
  );
}

// ---------------------------------------------------------------------
// SubmitForReviewBlock — CTA "Envoyer en validation" + confirmation inline.
// Bloque si toutes les données ne sont pas encore classifiées.
// ---------------------------------------------------------------------
function SubmitForReviewBlock({
  project,
  allReady,
  opened,
  onOpen,
  onClose,
  onConfirm,
}: {
  project: Project;
  allReady: boolean;
  opened: boolean;
  onOpen: () => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dataOwner = project.dataOwner || "(propriétaire à renseigner)";
  const total = project.items.length;
  const classified = Object.keys(project.classifications).length;
  return (
    <section className="mb-10 overflow-hidden rounded-3xl border border-zinc-200 bg-white">
      {!opened ? (
        <div className="flex flex-col items-start gap-4 px-7 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-vd-50 text-amber-vd-700">
              <PenNib size={22} weight="duotone" />
            </div>
            <div>
              <h3 className="font-display text-[22px] font-semibold leading-tight text-zinc-900">
                Prêt à envoyer pour signature.
              </h3>
              <p className="mt-0.5 text-[13.5px] text-zinc-600">
                {allReady ? (
                  <>
                    Le propriétaire des données{" "}
                    <span className="font-medium text-zinc-900">{dataOwner}</span>{" "}
                    sera notifié pour valider ligne par ligne, puis signer.
                  </>
                ) : (
                  <>
                    Classifiez les{" "}
                    <span className="tabular-nums font-medium text-amber-vd-800">
                      {total - classified}
                    </span>{" "}
                    donnée(s) restante(s) avant de pouvoir envoyer en validation.
                  </>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            icon={<PaperPlaneTilt size={16} weight="duotone" />}
            onClick={onOpen}
            disabled={!allReady}
            title={
              allReady
                ? "Envoyer la classification au propriétaire"
                : "Toutes les données doivent être classifiées"
            }
          >
            Envoyer en validation
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
          className="px-7 py-6"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-vd-50 text-amber-vd-700">
              <Warning size={18} weight="duotone" />
            </div>
            <div className="flex-1">
              <h4 className="font-display text-[18px] font-semibold text-zinc-900">
                Confirmer l'envoi en validation
              </h4>
              <p className="mt-1 text-[13px] text-zinc-600">
                Le projet passera en statut <strong>En revue</strong>. Vous
                pourrez encore consulter la classification mais plus la
                modifier tant que le propriétaire n'a pas tranché (validation
                ou retour en brouillon).
              </p>
              <ul className="mt-3 space-y-1.5 text-[12.5px] text-zinc-600">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ocp-500" />
                  Destinataire :{" "}
                  <span className="font-medium text-zinc-900">{dataOwner}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ocp-500" />
                  Données classifiées :{" "}
                  <span className="tabular-nums font-medium text-zinc-900">
                    {classified} / {total}
                  </span>
                </li>
              </ul>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<PaperPlaneTilt size={14} weight="duotone" />}
                  onClick={onConfirm}
                >
                  Confirmer l'envoi
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}
