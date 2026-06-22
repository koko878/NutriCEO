import { useCallback, useEffect, useState } from "react";
import type { EngagementLine } from "./model";
import { LS_KEY, SEED } from "./model";

// ---------------------------------------------------------------------------
// Persistance NutriBudget — adaptateur REST (WordPress) / localStorage (standalone).
// Dans WordPress, le plugin injecte window.DNAI_NBUDGET = {restUrl, nonce, canEdit}.
//  → persistance PARTAGÉE multi-utilisateur via REST + MySQL (SANS SSO au PoV).
// Hors WordPress (fichier ouvert seul), fallback localStorage.
// localStorage reste utilisé comme cache offline / 1er paint dans les deux cas.
// ---------------------------------------------------------------------------

type WpCtx = { restUrl?: string; nonce?: string; canEdit?: boolean; user?: string };
declare global {
  interface Window {
    DNAI_NBUDGET?: WpCtx;
  }
}

function ctx(): WpCtx | null {
  return (typeof window !== "undefined" && window.DNAI_NBUDGET) || null;
}
function hasBackend(): boolean {
  const c = ctx();
  return !!(c && c.restUrl);
}

const SHARED = new URLSearchParams(location.search).get("view") === "shared";
export function isReadOnly(): boolean {
  const c = ctx();
  return SHARED || (c ? c.canEdit === false : false);
}

function loadLocal(): EngagementLine[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EngagementLine[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore corrupt cache */
  }
  return JSON.parse(JSON.stringify(SEED)) as EngagementLine[];
}

function cacheLocal(next: EngagementLine[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

async function loadRemote(): Promise<EngagementLine[]> {
  const c = ctx()!;
  const res = await fetch(`${c.restUrl}/collection/lines`, {
    headers: { "X-WP-Nonce": c.nonce ?? "" },
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`GET lines ${res.status}`);
  const body = (await res.json()) as { data: EngagementLine[] | null };
  const data = body?.data;
  if (Array.isArray(data) && data.length) return data;
  // Base serveur vide → on amorce avec le seed (push si éditeur).
  const seed = JSON.parse(JSON.stringify(SEED)) as EngagementLine[];
  if (c.canEdit) void saveRemote(seed).catch(() => {});
  return seed;
}

async function saveRemote(next: EngagementLine[]): Promise<void> {
  const c = ctx()!;
  const res = await fetch(`${c.restUrl}/collection/lines`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-WP-Nonce": c.nonce ?? "" },
    credentials: "same-origin",
    body: JSON.stringify({ data: next }),
  });
  if (!res.ok) throw new Error(`PUT lines ${res.status}`);
}

function debounce<F extends (...a: never[]) => void>(fn: F, ms = 700): F {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: never[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as F;
}

export type SyncState = "idle" | "saving" | "error";

export function useEngagementData() {
  const [data, setData] = useState<EngagementLine[] | null>(null);
  const [sync, setSync] = useState<SyncState>("idle");

  useEffect(() => {
    let alive = true;
    (async () => {
      // petit délai pour laisser respirer les skeletons
      await new Promise((r) => setTimeout(r, 320));
      if (!alive) return;
      if (hasBackend()) {
        try {
          const remote = await loadRemote();
          if (alive) {
            setData(remote);
            cacheLocal(remote);
            return;
          }
        } catch {
          /* réseau KO → cache local */
        }
      }
      if (alive) setData(loadLocal());
    })();
    return () => {
      alive = false;
    };
  }, []);

  // PUT debouncé (collection complète). Cache local immédiat dans persist().
  const pushRemote = useCallback(
    debounce((next: EngagementLine[]) => {
      if (!hasBackend() || isReadOnly()) return;
      setSync("saving");
      saveRemote(next)
        .then(() => setSync("idle"))
        .catch(() => setSync("error"));
    }),
    []
  );

  const persist = useCallback(
    (next: EngagementLine[]) => {
      if (isReadOnly()) return;
      cacheLocal(next);
      pushRemote(next);
    },
    [pushRemote]
  );

  const upsert = useCallback(
    (rec: EngagementLine) => {
      setData((prev) => {
        const base = prev ?? [];
        const i = base.findIndex((x) => x.id === rec.id);
        const next = i >= 0 ? base.map((x, j) => (j === i ? rec : x)) : [rec, ...base];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const remove = useCallback(
    (id: string) => {
      setData((prev) => {
        const next = (prev ?? []).filter((x) => x.id !== id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return { data, upsert, remove, sync };
}
