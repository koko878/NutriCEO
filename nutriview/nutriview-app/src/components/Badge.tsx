import type { ReactNode } from "react";
import type { Classe } from "../lib/model";

const CLASSE_BG: Record<Classe, string> = {
  I: "bg-red-700 text-white",
  II: "bg-orange-600 text-white",
  III: "bg-amber-500 text-zinc-900",
  IV: "bg-lime-600 text-white",
  V: "bg-zinc-400 text-white",
};

export function ClasseBadge({ classe }: { classe: Classe }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${CLASSE_BG[classe]}`}
      aria-label={`Classe ${classe}`}
    >
      Classe {classe}
    </span>
  );
}

export function SensibleBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
      Donnée sensible
    </span>
  );
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-600 ring-1 ring-inset ring-zinc-200">
      {children}
    </span>
  );
}
