// =====================================================================
// PrintReport — document opposable imprimable / exportable PDF.
// Caché à l'écran (.nv-print-only), seul rendu visible en @media print.
//
// C'est LE livrable du produit : la classification DGSSI complète qu'un
// chef de projet emmène en réunion d'arbitrage cloud. En-tête institutionnel,
// verdict cloud net, inventaire tracé ligne par ligne (citations Annexe II),
// mesures Annexe I, bloc signature (hash SHA-256 + horodatage + identité),
// mentions légales + souveraineté.
//
// Aucune dépendance lib externe (jsPDF & co) : on s'appuie sur window.print()
// du navigateur → PDF natif, fidèle, sans embarquer 2 Mo de plus dans le bundle.
// =====================================================================

import { useMemo } from "react";
import type { Classe, Classification, Project } from "../lib/model";
import { CLASSE_LABELS, DIM_LABELS, LEVEL_LABELS } from "../lib/model";
import { graduatedMeasures } from "../lib/engine";
import { formatHashShort } from "../lib/signature";
import {
  isSignedDeliverable,
  itemCitations,
  reportSummary,
  reportVerdictKind,
} from "../lib/report";

const CLASSES: Classe[] = ["I", "II", "III", "IV", "V"];

interface Props {
  project: Project;
  /** Date d'édition du document (ISO). Injectable pour les tests. */
  editedAt?: string;
}

function getLvl(cls: Classification, dim: "C" | "I" | "D"): number {
  return cls.cells.find((x) => x.dim === dim)?.level ?? 0;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PrintReport({ project, editedAt }: Props) {
  const summary = useMemo(() => reportSummary(project), [project]);
  const verdictKind = reportVerdictKind(summary);
  const measures =
    summary.classified > 0 ? graduatedMeasures(summary.projectClasse) : [];
  const signed = isSignedDeliverable(project);
  const edited = editedAt ?? new Date().toISOString();

  return (
    <div className="nv-print-only" aria-hidden="true">
      <article className="mx-auto max-w-[820px] bg-white px-2 py-2 font-body text-[12px] leading-relaxed text-zinc-900">
        {/* ============ En-tête institutionnel ============ */}
        <header className="nv-print-avoid mb-6 border-b-2 border-ocp-800 pb-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="font-display text-[20px] font-semibold leading-none text-ocp-800">
                OCP Nutricrops
              </div>
              <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                D²nAI · Data, Digital &amp; AI
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-700">
                Classification DGSSI
              </div>
              <div className="mt-0.5 text-[10.5px] text-zinc-500">
                Édité le {fmtDateTime(edited)}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-zinc-400">
                Réf. {project.id}
              </div>
            </div>
          </div>

          <h1 className="mt-4 font-display text-[30px] font-semibold leading-[1.05] text-zinc-900">
            {project.title || "(projet sans titre)"}
          </h1>
          {project.description && (
            <p className="mt-1.5 max-w-[68ch] text-[11.5px] text-zinc-600">
              {project.description}
            </p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-[11px] sm:grid-cols-3">
            <Meta label="Chef de projet" value={project.owner} />
            <Meta label="Propriétaire des données" value={project.dataOwner} />
            <Meta label="Entité / BU" value={project.bu} />
            <Meta label="Région" value={project.region} />
            <Meta
              label="Source"
              value={
                project.ingestion?.fileName
                  ? `${project.ingestion.source} · ${project.ingestion.fileName}`
                  : project.ingestion?.source
              }
            />
            <Meta
              label="Statut"
              value={
                signed
                  ? "Signé"
                  : project.status === "in_review"
                    ? "En revue"
                    : project.status === "rejected"
                      ? "Rejeté"
                      : "Brouillon"
              }
            />
            <Meta
              label="Couverture"
              value={`${summary.classified} / ${summary.total} données classées`}
            />
          </dl>
        </header>

        {/* ============ Verdict cloud — le moment ============ */}
        <section className="nv-print-avoid mb-6">
          <SectionTitle n="1" title="Verdict cloud" />
          {verdictKind === "none" ? (
            <p className="mt-2 text-[12px] italic text-zinc-500">
              Aucune donnée classée — verdict indisponible.
            </p>
          ) : verdictKind === "sensible" ? (
            <div className="mt-2 rounded-lg border-2 border-amber-vd-300 bg-amber-vd-50 p-4">
              <div className="font-display text-[19px] font-semibold text-amber-vd-900">
                Non éligible au cloud étranger — résidence territoriale Maroc
                obligatoire.
              </div>
              <p className="mt-1 text-[11.5px] text-amber-vd-800">
                Le projet comporte{" "}
                <strong className="tabular-nums">{summary.sensibles}</strong>{" "}
                donnée(s) sensible(s) au sens de la loi 05-20 (confidentialité
                ≥ 3 et classe I ou II). Leur hébergement et leur traitement
                doivent rester sur le territoire national.
              </p>
            </div>
          ) : (
            <div className="mt-2 rounded-lg border-2 border-ocp-200 bg-ocp-50 p-4">
              <div className="font-display text-[19px] font-semibold text-ocp-900">
                Éligible au cloud étranger, sous conditions.
              </div>
              <p className="mt-1 text-[11.5px] text-ocp-800">
                Aucune donnée sensible au sens de la loi 05-20. L'hébergement
                hors territoire est admis sous réserve des mesures de protection
                de la classe{" "}
                <strong>{summary.projectClasse}</strong> (cf. section 3).
              </p>
            </div>
          )}

          {summary.classified > 0 && (
            <dl className="mt-3 grid grid-cols-3 gap-4 text-[11px]">
              <Kpi label="Données classées" value={summary.classified} />
              <Kpi label="Sensibles (résidence MA)" value={summary.sensibles} />
              <Kpi
                label="Classe globale projet"
                text={CLASSE_LABELS[summary.projectClasse]}
              />
            </dl>
          )}
        </section>

        {/* ============ Inventaire tracé ============ */}
        <section className="mb-6">
          <SectionTitle n="2" title="Inventaire classifié & traçabilité" />
          {project.items.length === 0 ? (
            <p className="mt-2 text-[12px] italic text-zinc-500">
              Catalogue vide.
            </p>
          ) : (
            <table className="mt-2 w-full border-collapse text-left text-[10.5px]">
              <thead>
                <tr className="border-b border-zinc-300 text-[9.5px] uppercase tracking-[0.06em] text-zinc-500">
                  <th className="py-1.5 pr-2 font-semibold">Donnée</th>
                  <th className="px-1 py-1.5 text-center font-semibold" title={DIM_LABELS.C}>C</th>
                  <th className="px-1 py-1.5 text-center font-semibold" title={DIM_LABELS.I}>I</th>
                  <th className="px-1 py-1.5 text-center font-semibold" title={DIM_LABELS.D}>D</th>
                  <th className="px-2 py-1.5 font-semibold">Classe</th>
                  <th className="px-2 py-1.5 font-semibold">Cloud</th>
                  <th className="py-1.5 pl-2 font-semibold">Citations DGSSI</th>
                </tr>
              </thead>
              <tbody>
                {project.items.map((it) => {
                  const cls = project.classifications[it.id];
                  const cites = cls ? itemCitations(cls) : [];
                  return (
                    <tr
                      key={it.id}
                      className="nv-print-avoid border-b border-zinc-100 align-top"
                    >
                      <td className="py-1.5 pr-2">
                        <div className="font-semibold text-zinc-900">
                          {it.name || "(sans nom)"}
                        </div>
                        {it.description && it.description !== it.name && (
                          <div className="text-[9.5px] text-zinc-500">
                            {it.description}
                          </div>
                        )}
                      </td>
                      {cls ? (
                        <>
                          <Cell v={getLvl(cls, "C")} />
                          <Cell v={getLvl(cls, "I")} />
                          <Cell v={getLvl(cls, "D")} />
                          <td className="px-2 py-1.5 whitespace-nowrap font-medium text-zinc-800">
                            {cls.classe}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            {cls.sensible ? (
                              <span className="font-medium text-amber-vd-800">
                                Résidence MA
                              </span>
                            ) : (
                              <span className="text-ocp-700">Éligible</span>
                            )}
                          </td>
                          <td className="py-1.5 pl-2 text-[9.5px] text-zinc-600">
                            {cites.length ? cites.join(" · ") : (
                              <span className="italic text-zinc-400">—</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <td colSpan={6} className="px-2 py-1.5 italic text-zinc-400">
                          non classée
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Distribution synthétique en texte (jamais de pie) */}
          {summary.classified > 0 && (
            <p className="mt-2.5 text-[10px] text-zinc-500">
              Répartition :{" "}
              {CLASSES.filter((c) => summary.distribution[c] > 0)
                .map((c) => `${summary.distribution[c]} × ${c}`)
                .join(" · ")}
              .
            </p>
          )}
        </section>

        {/* ============ Mesures Annexe I ============ */}
        {measures.length > 0 && (
          <section className="nv-print-avoid mb-6">
            <SectionTitle n="3" title="Mesures de protection (Annexe I)" />
            <p className="mt-1 text-[10.5px] text-zinc-500">
              Mesures cumulatives applicables à la classe globale du projet
              ({summary.projectClasse}).
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-zinc-700">
              {measures.map((m) => (
                <li key={m} className="flex gap-1.5">
                  <span className="text-ocp-600">▪</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ============ Signature ============ */}
        <section className="nv-print-avoid mb-6 break-inside-avoid">
          <SectionTitle n="4" title="Signature du propriétaire des données" />
          {signed && project.signature ? (
            <div className="mt-2 rounded-lg border border-ocp-200 bg-ocp-50/60 p-4">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                    Signé par
                  </div>
                  <div className="font-display text-[16px] font-semibold text-ocp-900">
                    {project.signature.signedBy}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                    Le
                  </div>
                  <div className="text-[11.5px] font-medium text-zinc-800">
                    {fmtDateTime(project.signature.signedAt)}
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-ocp-200 pt-2.5">
                <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                  Empreinte d'intégrité SHA-256
                </div>
                <code className="mt-1 block break-all font-mono text-[10px] leading-snug text-zinc-700">
                  {project.signature.contentHash}
                </code>
                <p className="mt-2 text-[9.5px] text-zinc-500">
                  Validation horodatée scellée par empreinte cryptographique du
                  contenu classifié (traçabilité documentaire DGSSI v1 — hors
                  signature électronique qualifiée eIDAS). Toute modification
                  ultérieure de la classification invalide cette empreinte.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-2 rounded-lg border border-dashed border-amber-vd-300 bg-amber-vd-50/50 p-4">
              <div className="font-display text-[15px] font-semibold text-amber-vd-900">
                Document non signé — non opposable en l'état.
              </div>
              <p className="mt-1 text-[10.5px] text-amber-vd-800">
                Cette classification est au statut «{" "}
                {project.status === "in_review"
                  ? "en revue"
                  : project.status === "rejected"
                    ? "rejeté"
                    : "brouillon"}{" "}
                ». Elle doit être validée puis signée par le propriétaire des
                données ({project.dataOwner || "à désigner"}) pour devenir un
                livrable opposable.
              </p>
            </div>
          )}
        </section>

        {/* ============ Mentions légales / souveraineté ============ */}
        <footer className="nv-print-avoid border-t border-zinc-200 pt-3 text-[9px] leading-relaxed text-zinc-500">
          <p>
            Référentiel : loi 05-20 sur la cybersécurité · décret 2-21-406 ·
            Guide DGSSI de classification des données v1.0 (08/07/2025).
          </p>
          <p className="mt-0.5">
            Souveraineté : brief projet traité dans le tenant Nutricrops,
            inférence IA Databricks Model Serving (France Central) — aucune
            sortie de tenant. NutriView · D²nAI · OCP Nutricrops.
          </p>
          {signed && project.signature && (
            <p className="mt-0.5 font-mono">
              Empreinte : {formatHashShort(project.signature.contentHash)}
            </p>
          )}
        </footer>
      </article>
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-[0.07em] text-zinc-500">
        {label}
      </dt>
      <dd className="font-medium text-zinc-800">{value?.trim() || "—"}</dd>
    </div>
  );
}

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="flex items-baseline gap-2 border-b border-zinc-200 pb-1 font-display text-[16px] font-semibold text-zinc-900">
      <span className="tabular-nums text-ocp-600">{n}.</span>
      {title}
    </h2>
  );
}

function Kpi({
  label,
  value,
  text,
}: {
  label: string;
  value?: number;
  text?: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50/60 px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.06em] text-zinc-500">
        {label}
      </div>
      {text ? (
        <div className="mt-0.5 text-[12px] font-semibold text-zinc-900">
          {text}
        </div>
      ) : (
        <div className="mt-0.5 font-display text-[20px] font-semibold tabular-nums leading-none text-zinc-900">
          {value}
        </div>
      )}
    </div>
  );
}

function Cell({ v }: { v: number }) {
  return (
    <td
      className={`px-1 py-1.5 text-center tabular-nums ${
        v >= 3 ? "font-semibold text-amber-vd-800" : "text-zinc-600"
      }`}
      title={LEVEL_LABELS[v as 0 | 1 | 2 | 3 | 4]}
    >
      {v}
    </td>
  );
}
