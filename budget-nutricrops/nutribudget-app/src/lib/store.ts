import { useCallback, useEffect, useState } from "react";
import type { EngagementLine } from "./model";
import { LS_KEY, SEED } from "./model";

const READONLY = new URLSearchParams(location.search).get("view") === "shared";
export function isReadOnly(): boolean {
  return READONLY;
}

function load(): EngagementLine[] {
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

export function useEngagementData() {
  const [data, setData] = useState<EngagementLine[] | null>(null);

  // Simulate an initial async load so skeletons get a beat to show.
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      if (alive) setData(load());
    }, 520);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  const persist = useCallback((next: EngagementLine[]) => {
    if (READONLY) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode — keep in-memory */
    }
  }, []);

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

  return { data, upsert, remove };
}
