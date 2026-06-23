// =====================================================================
// Projects — liste des classifications DGSSI.
// Hero asymétrique : titre Cormorant gauche · CTA compact droite.
// Liste : pas de 3-col uniforme — divide-y + grille 2fr 1fr 1fr 1fr.
// =====================================================================

import { useMemo, useState } from "react";
import {
  Plus,
  Files,
  MagnifyingGlass,
  CaretRight,
  User,
  ShieldCheck,
  MapPinLine,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { Button } from "../components/Button";
import { PageHero } from "../components/Card";
import { ProjectStatusBadge } from "../components/Badge";
import type { Level, Project } from "../lib/model";
import { isSensible } from "../lib/engine";
import { NewProjectModal } from "./NewProjectModal";

interface Props {
  projects: Project[];
  onCreate: (p: Project) => void;
  onOpen: (p: Project) => void;
  /** Capability create_project — masque les CTA de création si false. */
  canCreate?: boolean;
}

type StatusFilter = "all" | Project["status"];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "drafting", label: "Brouillon" },
  { value: "in_review", label: "En revue" },
  { value: "signed", label: "Signés" },
  { value: "rejected", label: "Rejetés" },
];

function projectHasSensible(p: Project): boolean {
  for (const cls of Object.values(p.classifications)) {
    const c = (cls.cells.find((x) => x.dim === "C")?.level ?? 0) as Level;
    const i = (cls.cells.find((x) => x.dim === "I")?.level ?? 0) as Level;
    const d = (cls.cells.find((x) => x.dim === "D")?.level ?? 0) as Level;
    if (isSensible({ C: c, I: i, D: d })) return true;
  }
  return false;
}

export function Projects({ projects, onCreate, onOpen, canCreate = true }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.dataOwner.toLowerCase().includes(q)
      );
    });
  }, [projects, query, filter]);

  return (
    <div>
      <PageHero
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ocp-600" aria-hidden />
            Référentiel DGSSI · loi 05-20
          </span>
        }
        title={
          <>
            Classifications DGSSI
            <span className="block text-zinc-400">en cours et signées.</span>
          </>
        }
        lead="Chaque projet digital ou data Nutricrops démarre par un exercice de classification. NutriView vous accompagne de l'ingestion du brief jusqu'à la décision d'éligibilité cloud, citation Annexe II à l'appui."
        right={
          canCreate ? (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} weight="bold" />}
              onClick={() => setOpen(true)}
            >
              Nouveau projet
            </Button>
          ) : undefined
        }
      />

      {/* Search + filter — sticky top bar discrète */}
      {projects.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <label htmlFor="nv-projects-search" className="sr-only">
              Rechercher un projet
            </label>
            <input
              id="nv-projects-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par titre, chef de projet, propriétaire…"
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:border-ocp-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-all active:scale-[0.97] ${
                  filter === f.value
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState onCreate={canCreate ? () => setOpen(true) : undefined} />
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <p className="text-[14px] text-zinc-500">
            Aucun projet ne correspond à la recherche.
          </p>
        </div>
      ) : (
        <motion.ul
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
          className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_20px_40px_-22px_rgba(20,59,24,0.10)]"
        >
          {/* Header table */}
          <li
            aria-hidden
            className="grid grid-cols-[2fr_1fr_1fr_140px_50px] gap-4 border-b border-zinc-100 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400"
          >
            <span>Projet</span>
            <span>Chef de projet</span>
            <span>Propriétaire</span>
            <span>Statut</span>
            <span className="sr-only">Ouvrir</span>
          </li>
          {filtered.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              onOpen={() => onOpen(p)}
            />
          ))}
        </motion.ul>
      )}

      <NewProjectModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={(p) => {
          setOpen(false);
          onCreate(p);
        }}
      />
    </div>
  );
}

function ProjectRow({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: () => void;
}) {
  const sensible = projectHasSensible(project);
  const n = project.items.length;
  const classifiedN = Object.keys(project.classifications).length;

  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 6 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ type: "spring", stiffness: 110, damping: 20 }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="group grid w-full grid-cols-[2fr_1fr_1fr_140px_50px] items-center gap-4 border-b border-zinc-50 px-6 py-5 text-left transition-colors duration-150 last:border-0 hover:bg-ocp-50/40 active:bg-ocp-50/70"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-[19px] font-semibold leading-tight text-zinc-900 group-hover:text-ocp-900">
              {project.title || "(projet sans titre)"}
            </span>
            {sensible && (
              <MapPinLine
                size={14}
                weight="duotone"
                className="text-amber-vd-700"
                aria-label="Contient des données sensibles"
              />
            )}
            {!sensible && classifiedN > 0 && (
              <ShieldCheck
                size={14}
                weight="duotone"
                className="text-ocp-700"
                aria-label="Cloud éligible"
              />
            )}
          </div>
          <div className="mt-1 text-[12px] text-zinc-500">
            <span className="tabular-nums">{n}</span> donnée{n > 1 ? "s" : ""} ·{" "}
            <span className="tabular-nums">{classifiedN}</span> classée
            {classifiedN > 1 ? "s" : ""} · maj{" "}
            {new Date(project.ingestion.extractedAt).toLocaleDateString(
              "fr-FR",
              { day: "2-digit", month: "short" }
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-zinc-700">
          <User size={13} className="text-zinc-400" />
          {project.owner || <span className="text-zinc-400">—</span>}
        </div>
        <div className="text-[13px] text-zinc-700">
          {project.dataOwner || <span className="text-zinc-400">—</span>}
        </div>
        <div>
          <ProjectStatusBadge status={project.status} />
        </div>
        <div className="flex justify-end text-zinc-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-ocp-700">
          <CaretRight size={16} />
        </div>
      </button>
    </motion.li>
  );
}

function EmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 110, damping: 20 }}
      className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white px-8 py-16 text-center"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ocp-50 text-ocp-700">
        <Files size={32} weight="duotone" />
      </div>
      <h2 className="mt-5 font-display text-[28px] font-semibold text-zinc-900">
        Aucune classification en cours.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] text-zinc-500">
        {onCreate
          ? "Démarrez en cataloguant un projet digital. NutriView vous propose une classification draft en moins de cinq minutes, justifiée par citations au guide DGSSI."
          : "Aucun projet ne vous est encore accessible. Contactez un chef de projet ou un administrateur."}
      </p>
      {onCreate && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="primary"
            icon={<Plus size={16} weight="bold" />}
            onClick={onCreate}
          >
            Démarrer un projet
          </Button>
        </div>
      )}
    </motion.div>
  );
}
