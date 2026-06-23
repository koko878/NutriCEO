// =====================================================================
// useGov — hook React d'accès à la gouvernance (refs + rôles) + droits
// de l'utilisateur courant. S'abonne à govStore via useSyncExternalStore.
// =====================================================================

import { useSyncExternalStore, useMemo } from "react";
import { govStore, type GovState } from "./govStore";
import {
  capsForRoles,
  rolesForUser,
  type Cap,
  type Role,
} from "./access";

function currentLogin(): string {
  return (
    (typeof window !== "undefined" &&
      (window as { DNAI_NVIEW?: { user?: string } }).DNAI_NVIEW?.user) ||
    "anonyme"
  );
}

export interface GovApi {
  state: GovState;
  login: string;
  roles: Role[];
  can: (cap: Cap) => boolean;
}

export function useGov(): GovApi {
  const state = useSyncExternalStore(
    (cb) => govStore.subscribe(cb),
    () => govStore.get(),
    () => govStore.get()
  );
  const login = currentLogin();
  const roles = useMemo(
    () => rolesForUser(state.roles, login),
    [state.roles, login]
  );
  const caps = useMemo(() => capsForRoles(roles), [roles]);
  const can = useMemo(() => (cap: Cap) => caps.has(cap), [caps]);
  return { state, login, roles, can };
}
