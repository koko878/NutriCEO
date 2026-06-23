// =====================================================================
// govStore — persistance des référentiels + assignations de rôles (Phase 6).
//
// Source de vérité au boot :
//   1. window.DNAI_NVIEW.refs / .roles injectés par WP (si présents) ;
//   2. sinon localStorage `nutriview_gov_v0` ;
//   3. sinon seed par défaut.
//
// Écriture : optimiste en localStorage immédiat + PUT best-effort vers le
// proxy WP (`/admin/refs`, `/admin/roles`). En standalone, seul le LS est
// utilisé — la démo reste pleinement fonctionnelle.
// =====================================================================

import {
  normalizeRefs,
  seedRefs,
  type Refs,
} from "./refs";
import { normalizeAssignments, type RoleAssignment } from "./access";

const GOV_KEY = "nutriview_gov_v0";

export interface GovState {
  refs: Refs;
  roles: RoleAssignment[];
}

type WpBoot = {
  home?: string;
  user?: string;
  ver?: string;
  restNs?: string;
  nonce?: string;
  refs?: unknown;
  roles?: unknown;
  govReady?: boolean;
};

function wpBoot(): WpBoot {
  return (
    (typeof window !== "undefined" &&
      (window as { DNAI_NVIEW?: WpBoot }).DNAI_NVIEW) ||
    {}
  );
}

/** True si on peut écrire les référentiels/rôles dans WP. */
export function govBackendAvailable(): boolean {
  const b = wpBoot();
  return Boolean(b.restNs && b.nonce && b.govReady);
}

function readLS(): GovState | null {
  try {
    const raw = localStorage.getItem(GOV_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GovState>;
    return {
      refs: normalizeRefs(parsed.refs),
      roles: normalizeAssignments(parsed.roles),
    };
  } catch {
    return null;
  }
}

function writeLS(state: GovState) {
  try {
    localStorage.setItem(GOV_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — ignore */
  }
}

function initialState(): GovState {
  const b = wpBoot();
  // 1. Boot WP a la priorité (référentiels gérés côté serveur).
  if (b.refs !== undefined || b.roles !== undefined) {
    return {
      refs: normalizeRefs(b.refs),
      roles: normalizeAssignments(b.roles),
    };
  }
  // 2. localStorage.
  const ls = readLS();
  if (ls) return ls;
  // 3. Seed par défaut (premier run).
  return { refs: seedRefs(), roles: [] };
}

type Listener = (state: GovState) => void;

async function putJson(path: string, body: unknown): Promise<void> {
  const b = wpBoot();
  if (!govBackendAvailable()) return;
  const url = `${b.home ?? "/"}wp-json/${b.restNs}/${path}`;
  try {
    await fetch(url, {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": b.nonce ?? "",
      },
      body: JSON.stringify(body),
    });
  } catch {
    /* best-effort : la mutation locale a déjà eu lieu */
  }
}

class GovStore {
  private state: GovState = initialState();
  private listeners = new Set<Listener>();

  get(): GovState {
    return this.state;
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private commit(next: GovState, syncPath?: "refs" | "roles") {
    this.state = next;
    writeLS(next);
    for (const l of this.listeners) l(next);
    if (syncPath === "refs") void putJson("admin/refs", { refs: next.refs });
    if (syncPath === "roles") void putJson("admin/roles", { roles: next.roles });
  }

  setRefs(refs: Refs) {
    this.commit({ ...this.state, refs }, "refs");
  }

  setRoles(roles: RoleAssignment[]) {
    this.commit({ ...this.state, roles }, "roles");
  }
}

export const govStore = new GovStore();
