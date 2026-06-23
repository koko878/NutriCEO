// =====================================================================
// Badges — classe (I-V), sensible, statut projet.
// Palette : ambre profond pour I/II (registre administratif, pas alarmiste).
// Rouge réservé aux erreurs système. cf. shape/verdict-component.md.
// =====================================================================

import type { ReactNode } from "react";
import type { Classe, Project } from "../lib/model";

const CLASSE_STYLES: Record<Classe, { bg: string; ring: string; text: string }> = {
  // Classe I — très grave : ambre profond
  I: {
    bg: "bg-amber-vd-100",
    ring: "ring-amber-vd-300",
    text: "text-amber-vd-800",
  },
  // Classe II — grave : ambre moyen
  II: {
    bg: "bg-amber-vd-50",
    ring: "ring-amber-vd-200",
    text: "text-amber-vd-700",
  },
  // Classe III — modéré : zinc neutre chaud
  III: {
    bg: "bg-zinc-100",
    ring: "ring-zinc-300",
    text: "text-zinc-800",
  },
  // Classe IV — limité : vert OCP léger
  IV: {
    bg: "bg-ocp-50",
    ring: "ring-ocp-200",
    text: "text-ocp-800",
  },
  // Classe V — sans impact : zinc très clair
  V: {
    bg: "bg-zinc-50",
    ring: "ring-zinc-200",
    text: "text-zinc-500",
  },
};

const CLASSE_LABEL: Record<Classe, string> = {
  I: "Très grave",
  II: "Grave",
  III: "Modéré",
  IV: "Limité",
  V: "Sans impact",
};

export function ClasseBadge({
  classe,
  size = "md",
}: {
  classe: Classe;
  size?: "sm" | "md";
}) {
  const s = CLASSE_STYLES[classe];
  const sz =
    size === "sm"
      ? "px-1.5 py-0.5 text-[10.5px]"
      : "px-2.5 py-1 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold uppercase tracking-[0.04em] tabular-nums ring-1 ring-inset ${sz} ${s.bg} ${s.ring} ${s.text}`}
      aria-label={`Classe ${classe} — ${CLASSE_LABEL[classe]}`}
    >
      <span className="font-display text-[12px] font-bold tracking-normal normal-case">
        {classe}
      </span>
      <span className="opacity-60">·</span>
      <span className="font-medium normal-case tracking-normal">
        {CLASSE_LABEL[classe]}
      </span>
    </span>
  );
}

export function SensibleBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-amber-vd-50 font-medium text-amber-vd-800 ring-1 ring-inset ring-amber-vd-200 ${
        compact ? "px-1.5 py-0.5 text-[10.5px]" : "px-2 py-0.5 text-[11px]"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-vd-500" aria-hidden />
      Sensible
    </span>
  );
}

const STATUS: Record<Project["status"], { label: string; cls: string }> = {
  drafting: {
    label: "Brouillon",
    cls: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  },
  in_review: {
    label: "En revue",
    cls: "bg-ocp-50 text-ocp-800 ring-ocp-200",
  },
  signed: {
    label: "Signé",
    cls: "bg-ocp-100 text-ocp-900 ring-ocp-300",
  },
  rejected: {
    label: "Rejeté",
    cls: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

export function ProjectStatusBadge({ status }: { status: Project["status"] }) {
  const s = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.cls}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "signed"
            ? "bg-ocp-600"
            : status === "in_review"
            ? "bg-ocp-500"
            : status === "rejected"
            ? "bg-rose-500"
            : "bg-zinc-400"
        }`}
        aria-hidden
      />
      {s.label}
    </span>
  );
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-zinc-600 ring-1 ring-inset ring-zinc-200">
      {children}
    </span>
  );
}
