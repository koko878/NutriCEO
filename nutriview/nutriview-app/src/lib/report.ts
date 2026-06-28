// =====================================================================
// report.ts — modèle pur du livrable de classification (sans JSX).
// Sépare la logique d'agrégation du rendu (PrintReport.tsx) pour qu'elle
// soit testable en environnement node, et réutilisable (Synthesis, dashboards).
// =====================================================================

import type { Classe, Classification, Project } from "./model";

export interface ReportSummary {
  classified: number;
  total: number;
  sensibles: number;
  distribution: Record<Classe, number>;
  /** Classe globale = max niveau atteint sur toutes les données. */
  projectClasse: Classe;
  /** Au moins une donnée sensible loi 05-20. */
  projectSensible: boolean;
}

/** Verdict cloud agrégé du projet (3 états explicites). */
export type ReportVerdictKind = "none" | "sensible" | "eligible";

function getLvl(cls: Classification, dim: "C" | "I" | "D"): number {
  return cls.cells.find((x) => x.dim === dim)?.level ?? 0;
}

/** Citations DGSSI uniques (par section) agrégées sur les 3 cellules. */
export function itemCitations(cls: Classification): string[] {
  const seen = new Set<string>();
  for (const cell of cls.cells) {
    for (const cit of cell.citations ?? []) {
      const s = (cit.section || "").trim();
      if (s) seen.add(s);
    }
  }
  return [...seen];
}

/** Agrégat de classification d'un projet (pur, déterministe). */
export function reportSummary(project: Project): ReportSummary {
  const all = Object.values(project.classifications) as Classification[];
  const distribution: Record<Classe, number> = {
    I: 0,
    II: 0,
    III: 0,
    IV: 0,
    V: 0,
  };
  for (const c of all) distribution[c.classe]++;
  const sensibles = all.filter((c) => c.sensible).length;
  const projectMaxLevel = all.reduce<number>(
    (acc, c) => Math.max(acc, getLvl(c, "C"), getLvl(c, "I"), getLvl(c, "D")),
    0
  );
  const projectClasse = (["V", "IV", "III", "II", "I"] as Classe[])[
    projectMaxLevel
  ];
  return {
    classified: all.length,
    total: project.items.length,
    sensibles,
    distribution,
    projectClasse,
    projectSensible: sensibles > 0,
  };
}

/** Verdict cloud à afficher dans le livrable. */
export function reportVerdictKind(s: ReportSummary): ReportVerdictKind {
  if (s.classified === 0) return "none";
  return s.projectSensible ? "sensible" : "eligible";
}

/** Le projet est-il signé (livrable opposable) ? */
export function isSignedDeliverable(project: Project): boolean {
  return project.status === "signed" && !!project.signature;
}
