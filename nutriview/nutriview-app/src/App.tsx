import { useCallback, useEffect, useMemo, useState } from "react";
import { House, ListChecks, UploadSimple, Sparkle, ChartBar } from "@phosphor-icons/react";
import { store, type AppState } from "./lib/store";
import type { Project } from "./lib/model";
import { Projects } from "./views/Projects";
import { Ingest } from "./views/Ingest";
import { Catalog } from "./views/Catalog";
import { Classify } from "./views/Classify";
import { Synthesis } from "./views/Synthesis";

declare global {
  interface Window {
    DNAI_NVIEW?: {
      home?: string;
      user?: string;
      ver?: string;
    };
  }
}

type View =
  | { kind: "projects" }
  | { kind: "ingest"; projectId: string }
  | { kind: "catalog"; projectId: string }
  | { kind: "classify"; projectId: string; itemId?: string }
  | { kind: "synthesis"; projectId: string };

export default function App() {
  const [state, setState] = useState<AppState>(() => store.load());
  const [view, setView] = useState<View>({ kind: "projects" });

  // Subscribe au store global.
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

  const updateProject = useCallback(
    (next: Project) => {
      store.update((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => (p.id === next.id ? next : p)),
      }));
    },
    []
  );

  const addProject = useCallback((p: Project) => {
    store.update((prev) => ({
      ...prev,
      projects: [p, ...prev.projects],
      activeProjectId: p.id,
    }));
  }, []);

  const ctxUser = window.DNAI_NVIEW?.user ?? "anonyme";

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => setView({ kind: "projects" })}
            className="flex items-baseline gap-3"
          >
            <span className="font-display text-2xl font-semibold tracking-tight text-ocp-700">
              NutriView
            </span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
              Classification DGSSI · D²nAI
            </span>
          </button>
          <div className="text-xs text-zinc-500">
            {ctxUser !== "anonyme" && (
              <>
                Connecté : <span className="font-medium">{ctxUser}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {activeProject && (
        <nav className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-1 px-6">
            <NavTab
              active={view.kind === "projects"}
              icon={<House size={14} />}
              onClick={() => setView({ kind: "projects" })}
              label="Projets"
            />
            <span className="text-zinc-300">/</span>
            <span className="px-3 py-3 text-sm font-medium text-zinc-700">
              {activeProject.title}
            </span>
            <NavTab
              active={view.kind === "ingest"}
              icon={<UploadSimple size={14} />}
              onClick={() =>
                setView({ kind: "ingest", projectId: activeProject.id })
              }
              label="Ingestion"
            />
            <NavTab
              active={view.kind === "catalog"}
              icon={<ListChecks size={14} />}
              onClick={() =>
                setView({ kind: "catalog", projectId: activeProject.id })
              }
              label="Catalogue"
            />
            <NavTab
              active={view.kind === "classify"}
              icon={<Sparkle size={14} />}
              onClick={() =>
                setView({ kind: "classify", projectId: activeProject.id })
              }
              label="Classification"
            />
            <NavTab
              active={view.kind === "synthesis"}
              icon={<ChartBar size={14} />}
              onClick={() =>
                setView({ kind: "synthesis", projectId: activeProject.id })
              }
              label="Synthèse"
            />
          </div>
        </nav>
      )}

      <main className="mx-auto max-w-6xl px-6 py-8">
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

      <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-zinc-400">
        NutriView v0.1 · phases 0-3 (moteur déterministe + UI catalog +
        ingestion multi-format) · OCP Nutricrops · D²nAI · sans IA, sans
        backend dans cette version.
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
      className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors ${
        active
          ? "border-b-2 border-ocp-600 text-ocp-700"
          : "text-zinc-500 hover:text-zinc-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
