// =====================================================================
// Inbox — file de validation propriétaire (Phase 5).
// Liste les projets `in_review` dont je suis dataOwner, triés du plus
// récent au plus ancien (submission.submittedAt desc).
// Densité divide-y, jamais une card par projet.
// =====================================================================

import { useMemo } from "react";
import {
  Tray,
  CaretRight,
  User,
  Database,
  Sparkle,
  MapPinLine,
  ShieldCheck,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { PageHero } from "../components/Card";
import { ClasseBadge } from "../components/Badge";
import type { Classe, Classification, Project } from "../lib/model";
import { isSensible } from "../lib/engine";
import { pendingForOwner } from "../lib/inbox";

interface Props {
  projects: Project[];
  currentUser: string;
  onOpen: (projectId: string) => void;
}

function highestClasse(p: Project): Classe | null {
  const all = Object.values(p.classifications) as Classification[];
  if (all.length === 0) return null;
  const maxLevel = all.reduce((acc, cls) => {
    const c = cls.cells.find((x) => x.dim === "C")?.level ?? 0;
    const i = cls.cells.find((x) => x.dim === "I")?.level ?? 0;
    const d = cls.cells.find((x) => x.dim === "D")?.level ?? 0;
    return Math.max(acc, c, i, d);
  }, 0);
  return (["V", "IV", "III", "II", "I"] as Classe[])[maxLevel];
}

function projectIsSensible(p: Project): boolean {
  for (const cls of Object.values(p.classifications)) {
    const c = (cls.cells.find((x) => x.dim === "C")?.level ?? 0) as 0 | 1 | 2 | 3 | 4;
    const i = (cls.cells.find((x) => x.dim === "I")?.level ?? 0) as 0 | 1 | 2 | 3 | 4;
    const d = (cls.cells.find((x) => x.dim === "D")?.level ?? 0) as 0 | 1 | 2 | 3 | 4;
    if (isSensible({ C: c, I: i, D: d })) return true;
  }
  return false;
}

export function Inbox({ projects, currentUser, onOpen }: Props) {
  const list = useMemo(
    () => pendingForOwner(projects, currentUser),
    [projects, currentUser]
  );

  const totalLabel = list.length > 0
    ? `${list.length} projet${list.length > 1 ? "s" : ""} en attente de votre signature`
    : "Aucune validation en attente.";

  return (
    <div>
      <PageHero
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Tray size={13} weight="duotone" />
            Propriétaire des données · validation
          </span>
        }
        title={
          <>
            Vos projets à valider
            <span className="block text-zinc-400">avant signature.</span>
          </>
        }
        lead="Le chef de projet a finalisé la classification CID. Vous validez ligne par ligne — vous gardez la décision finale sur chaque donnée — puis vous signez d'un trait : un hash SHA-256 du contenu classifié est apposé, horodaté."
      />

      <div className="mb-4 flex items-center gap-2 text-[12.5px] text-zinc-500">
        <Tray size={14} weight="duotone" className="text-ocp-700" />
        <span className="tabular-nums font-medium text-zinc-700">
          {totalLabel}
        </span>
      </div>

      {list.length === 0 ? (
        <EmptyInbox />
      ) : (
        <motion.ul
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_20px_40px_-22px_rgba(20,59,24,0.10)]"
        >
          <li
            aria-hidden
            className="grid grid-cols-[2fr_1fr_1fr_120px_50px] gap-4 border-b border-zinc-100 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400"
          >
            <span>Projet</span>
            <span>Chef de projet</span>
            <span>Envoyé</span>
            <span>Classe max</span>
            <span className="sr-only">Ouvrir</span>
          </li>
          {list.map((p) => {
            const sensible = projectIsSensible(p);
            const klass = highestClasse(p);
            const submittedAt = p.submission?.submittedAt
              ? new Date(p.submission.submittedAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—";
            const n = p.items.length;
            return (
              <motion.li
                key={p.id}
                variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                transition={{ type: "spring", stiffness: 110, damping: 20 }}
              >
                <button
                  type="button"
                  onClick={() => onOpen(p.id)}
                  className="group grid w-full grid-cols-[2fr_1fr_1fr_120px_50px] items-center gap-4 border-b border-zinc-50 px-6 py-5 text-left transition-colors duration-150 last:border-0 hover:bg-ocp-50/40 active:bg-ocp-50/70"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[19px] font-semibold leading-tight text-zinc-900 group-hover:text-ocp-900">
                        {p.title || "(projet sans titre)"}
                      </span>
                      {sensible ? (
                        <span
                          title="Données sensibles — résidence MA"
                          className="inline-flex items-center gap-1 rounded-md bg-amber-vd-50 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-vd-800 ring-1 ring-inset ring-amber-vd-200"
                        >
                          <MapPinLine size={11} weight="duotone" />
                          Sensible
                        </span>
                      ) : klass ? (
                        <span
                          title="Cloud éligible"
                          className="inline-flex items-center gap-1 rounded-md bg-ocp-50 px-1.5 py-0.5 text-[10.5px] font-medium text-ocp-800 ring-1 ring-inset ring-ocp-200"
                        >
                          <ShieldCheck size={11} weight="duotone" />
                          Cloud éligible
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-vd-50 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-vd-800 ring-1 ring-inset ring-amber-vd-200">
                        <Sparkle size={10} weight="duotone" />
                        À signer
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[12px] text-zinc-500">
                      <Database size={12} weight="duotone" />
                      <span className="tabular-nums">{n}</span> donnée
                      {n > 1 ? "s" : ""} ·{" "}
                      <span className="tabular-nums">
                        {Object.keys(p.classifications).length}
                      </span>{" "}
                      classée{Object.keys(p.classifications).length > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[13px] text-zinc-700">
                    <User size={13} className="text-zinc-400" />
                    {p.owner || <span className="text-zinc-400">—</span>}
                  </div>
                  <div className="text-[12.5px] text-zinc-600 tabular-nums">
                    {submittedAt}
                  </div>
                  <div>{klass ? <ClasseBadge classe={klass} size="sm" /> : <span className="text-[11.5px] italic text-zinc-400">—</span>}</div>
                  <div className="flex justify-end text-zinc-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-ocp-700">
                    <CaretRight size={16} />
                  </div>
                </button>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}

function EmptyInbox() {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-200 bg-white px-8 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ocp-50 text-ocp-700">
        <Tray size={28} weight="duotone" />
      </div>
      <h2 className="mt-4 font-display text-[24px] font-semibold text-zinc-900">
        Inbox vide.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] text-zinc-500">
        Vous serez notifié(e) ici dès qu'un chef de projet vous enverra une
        classification à signer. C'est vous qui validez chaque donnée — l'IA
        propose, vous décidez.
      </p>
    </div>
  );
}
