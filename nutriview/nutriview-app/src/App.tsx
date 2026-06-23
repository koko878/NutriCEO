// =====================================================================
// App — shell NutriView : header + navigation par étape, routing local.
// =====================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  House,
  ListChecks,
  UploadSimple,
  Sparkle,
  ChartBar,
  CaretRight,
} from "@phosphor-icons/react";
import { store, type AppState } from "./lib/store";
import type { Project } from "./lib/model";
import { Projects } from "./views/Projects";
import { Ingest } from "./views/Ingest";
import { Catalog } from "./views/Catalog";
import { Classify } from "./views/Classify";
import { Synthesis } from "./views/Synthesis";

// Type unifié déclaré dans src/lib/ai.ts (source de vérité — inclut aiStatus, restNs, nonce).
// Pas de re-déclaration ici pour éviter le conflit TS2717.

type View =
  | { kind: "projects" }
  | { kind: "ingest"; projectId: string }
  | { kind: "catalog"; projectId: string }
  | { kind: "classify"; projectId: string; itemId?: string }
  | { kind: "synthesis"; projectId: string };

export default function App() {
  const [state, setState] = useState<AppState>(() => store.load());
  const [view, setView] = useState<View>({ kind: "projects" });

  useEffect(() => {
    const unsub = store.subscribe(setState);
    return () => {
      unsub();
    };
  }, []);

  const activeProject = useMemo<Project | null>(() => {
    if (view.kind === "projects") return null;
    return state.projects.find((p) => p.id === view.projectId) ?? null;
  }, [view, state.projects]);

  const updateProject = useCallback((next: Project) => {
    store.update((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === next.id ? next : p)),
    }));
  }, []);

  const addProject = useCallback((p: Project) => {
    store.update((prev) => ({
      ...prev,
      projects: [p, ...prev.projects],
      activeProjectId: p.id,
    }));
  }, []);

  const ctxUser = window.DNAI_NVIEW?.user ?? "anonyme";
  const ver = window.DNAI_NVIEW?.ver ?? "0.2";

  return (
    <div className="min-h-[100dvh] bg-zinc-50 text-zinc-900">
      {/* Header global — wordmark gauche, user contexte droite */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-zinc-50/85 backdrop-blur-md nv-no-print">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 sm:px-10">
          <button
            type="button"
            onClick={() => setView({ kind: "projects" })}
            className="group flex items-baseline gap-3 transition-transform duration-150 active:scale-[0.98]"
          >
            <span className="font-display text-[26px] font-semibold tracking-[-0.02em] text-ocp-800">
              NutriView
            </span>
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-400 sm:inline">
              D²nAI · OCP Nutricrops
            </span>
          </button>
          <div className="flex items-center gap-4 text-[12px] text-zinc-500">
            {ctxUser !== "anonyme" && (
              <span>
                Connecté ·{" "}
                <span className="font-medium text-zinc-700">{ctxUser}</span>
              </span>
            )}
            <span className="hidden font-mono text-[10.5px] tabular-nums text-zinc-400 sm:inline">
              v{ver}
            </span>
          </div>
        </div>
      </header>

      {/* Breadcrumb / nav projet — visible quand un projet est ouvert */}
      {activeProject && (
        <nav className="border-b border-zinc-200/70 bg-white nv-no-print">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-1 px-6 sm:px-10">
            <NavTab
              active={false}
              icon={<House size={14} weight="duotone" />}
              onClick={() => setView({ kind: "projects" })}
              label="Projets"
            />
            <CaretRight size={11} className="text-zinc-300" />
            <span className="truncate px-3 py-3 text-[13px] font-medium text-zinc-900">
              {activeProject.title}
            </span>
            <div className="ml-auto flex items-center">
              <NavTab
                active={view.kind === "ingest"}
                icon={<UploadSimple size={14} weight="duotone" />}
                onClick={() =>
                  setView({ kind: "ingest", projectId: activeProject.id })
                }
                label="Ingestion"
              />
              <NavTab
                active={view.kind === "catalog"}
                icon={<ListChecks size={14} weight="duotone" />}
                onClick={() =>
                  setView({ kind: "catalog", projectId: activeProject.id })
                }
                label="Catalogue"
              />
              <NavTab
                active={view.kind === "classify"}
                icon={<Sparkle size={14} weight="duotone" />}
                onClick={() =>
                  setView({ kind: "classify", projectId: activeProject.id })
                }
                label="Classification"
              />
              <NavTab
                active={view.kind === "synthesis"}
                icon={<ChartBar size={14} weight="duotone" />}
                onClick={() =>
                  setView({ kind: "synthesis", projectId: activeProject.id })
                }
                label="Synthèse"
              />
            </div>
          </div>
        </nav>
      )}

      <main className="mx-auto max-w-[1400px] px-6 py-10 sm:px-10 sm:py-14">
        {view.kind === "projects" && (
          <Projects
            projects={state.projects}
            onCreate={(p) => {
              addProject(p);
              setView({ kind: "ingest", projectId: p.id });
            }}
            onOpen={(p) => setView({ kind: "catalog", projectId: p.id })}
          />
        )}
        {view.kind === "ingest" && activeProject && (
          <Ingest
            project={activeProject}
            onChange={updateProject}
            onDone={() =>
              setView({ kind: "catalog", projectId: activeProject.id })
            }
          />
        )}
        {view.kind === "catalog" && activeProject && (
          <Catalog
            project={activeProject}
            onChange={updateProject}
            onClassify={() =>
              setView({ kind: "classify", projectId: activeProject.id })
            }
          />
        )}
        {view.kind === "classify" && activeProject && (
          <Classify
            project={activeProject}
            initialItemId={view.itemId}
            onChange={updateProject}
            onDone={() =>
              setView({ kind: "synthesis", projectId: activeProject.id })
            }
          />
        )}
        {view.kind === "synthesis" && activeProject && (
          <Synthesis project={activeProject} />
        )}
      </main>

      <footer className="mx-auto max-w-[1400px] px-6 py-10 text-[11.5px] leading-relaxed text-zinc-400 sm:px-10 nv-no-print">
        <div className="border-t border-zinc-200/70 pt-6">
          <p>
            NutriView v{ver} · phases 0-3 (moteur déterministe · UI catalogue ·
            ingestion multi-format). IA Databricks souverain en phase 4,
            workflow signature en phase 5.
          </p>
          <p className="mt-1 text-zinc-400">
            loi 05-20 sur la cybersécurité · décret 2-21-406 · Guide
            DGSSI v1.0 (juillet 2025) — OCP Nutricrops · équipe D²nAI.
          </p>
        </div>
      </footer>
    </div>
  );
}

function NavTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium transition-colors duration-150 ${
        active
          ? "text-ocp-800"
          : "text-zinc-500 hover:text-zinc-900"
      }`}
    >
      {icon}
      {label}
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-ocp-700"
        />
      )}
    </button>
  );
}
