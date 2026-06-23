// =====================================================================
// NutriView — persistance localStorage v0.
// Pattern simplifié (NutriBudget-like) : un seul blob JSON, écriture
// debouncée, abonnement reactif. Aucune REST tant que la Phase 5 n'est
// pas branchée — un commentaire `// TODO Phase 5` marque l'extension.
// =====================================================================

import { STORE_KEY, type Project } from "./model";

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
}

const EMPTY_STATE: AppState = {
  projects: [],
  activeProjectId: null,
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function readLS(): AppState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return clone(EMPTY_STATE);
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed || !Array.isArray(parsed.projects)) return clone(EMPTY_STATE);
    return {
      projects: parsed.projects,
      activeProjectId: parsed.activeProjectId ?? null,
    };
  } catch {
    return clone(EMPTY_STATE);
  }
}

function writeLS(state: AppState) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode — silently skip
  }
}

type Listener = (state: AppState) => void;

class Store {
  private state: AppState = clone(EMPTY_STATE);
  private listeners = new Set<Listener>();
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private hydrated = false;

  load(): AppState {
    if (!this.hydrated) {
      this.state = readLS();
      this.hydrated = true;
    }
    return this.state;
  }

  save(next: AppState): void {
    this.state = next;
    this.hydrated = true;
    // Debounce — 200 ms — pour éviter de marteler localStorage quand
    // l'utilisateur fait glisser un slider.
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => writeLS(this.state), 200);
    this.notify();
  }

  /** Mise à jour immutable via callback. Pratique côté React. */
  update(mut: (prev: AppState) => AppState): void {
    this.save(mut(this.state));
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    for (const l of this.listeners) l(this.state);
  }
}

// Singleton — un seul store pour toute l'app.
export const store = new Store();

// TODO Phase 5 — backend REST + MySQL :
//   - GET /wp-json/dnai-nview/v1/collection/projects
//   - PUT /wp-json/dnai-nview/v1/collection/projects
//   - debounced sync miroir de NutriBudget useEngagementData.
