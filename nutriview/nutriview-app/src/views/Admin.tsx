// =====================================================================
// Admin — gouvernance NutriView (Phase 6).
// 5 onglets : Entités · Functions/BU · Data Domains · Data Domain Owners · Accès.
// Édition inline (champs toujours éditables, commit immédiat → govStore).
// Réservé aux porteurs de la capability `manage` (gating aussi côté App).
// =====================================================================

import { useState, type ReactNode } from "react";
import {
  Buildings,
  TreeStructure,
  Database,
  IdentificationBadge,
  Key,
  Plus,
  Trash,
  Warning,
  ShieldCheck,
  CloudCheck,
  HardDrives,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/Button";
import { PageHero } from "../components/Card";
import { useGov } from "../lib/useGov";
import { govStore, govBackendAvailable } from "../lib/govStore";
import {
  ownerById,
  refUid,
  type BusinessUnit,
  type DataDomain,
  type DataDomainOwner,
  type Entity,
  type Refs,
} from "../lib/refs";
import {
  ALL_ROLES,
  ROLE_HINTS,
  ROLE_LABELS,
  hasAnyAdmin,
  type Role,
  type RoleAssignment,
} from "../lib/access";

type TabKey =
  | "entities"
  | "bus"
  | "domains"
  | "owners"
  | "access";

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "entities", label: "Entités", icon: <Buildings size={15} weight="duotone" /> },
  { key: "bus", label: "Functions / BU", icon: <TreeStructure size={15} weight="duotone" /> },
  { key: "domains", label: "Data Domains", icon: <Database size={15} weight="duotone" /> },
  { key: "owners", label: "Data Domain Owners", icon: <IdentificationBadge size={15} weight="duotone" /> },
  { key: "access", label: "Accès", icon: <Key size={15} weight="duotone" /> },
];

export function Admin() {
  const { state, can } = useGov();
  const [tab, setTab] = useState<TabKey>("entities");

  if (!can("manage")) {
    return (
      <div>
        <PageHero
          eyebrow="Administration"
          title="Accès restreint"
          lead="Cet écran est réservé aux administrateurs NutriView. Demandez à un administrateur de vous attribuer le rôle adéquat."
        />
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-white px-8 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
            <Key size={26} weight="duotone" />
          </div>
          <p className="mx-auto mt-4 max-w-md text-[13.5px] text-zinc-500">
            Vous n'avez pas la capability <code className="rounded bg-zinc-100 px-1 font-mono text-[12px]">manage</code>.
          </p>
        </div>
      </div>
    );
  }

  const refs = state.refs;

  return (
    <div>
      <PageHero
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={13} weight="duotone" />
            Gouvernance · référentiels & accès
          </span>
        }
        title={
          <>
            Administration
            <span className="block text-zinc-400">de NutriView.</span>
          </>
        }
        lead="Gérez les référentiels qui alimentent les projets (entités, business units, data domains et leurs propriétaires) et les droits d'accès des utilisateurs. Les data domain owners seront synchronisés avec Azure AD au branchement du SSO."
        right={
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium ring-1 ring-inset ${
              govBackendAvailable()
                ? "bg-ocp-50 text-ocp-800 ring-ocp-200"
                : "bg-zinc-50 text-zinc-600 ring-zinc-200"
            }`}
            title={
              govBackendAvailable()
                ? "Les modifications sont enregistrées côté serveur WordPress."
                : "Mode démo : modifications stockées localement (navigateur)."
            }
          >
            {govBackendAvailable() ? (
              <CloudCheck size={14} weight="duotone" />
            ) : (
              <HardDrives size={14} weight="duotone" />
            )}
            {govBackendAvailable() ? "Synchronisé serveur" : "Local (démo)"}
          </span>
        }
      />

      {/* Onglets */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-zinc-200">
        {TABS.map((t) => {
          const active = tab === t.key;
          const count =
            t.key === "entities"
              ? refs.entities.length
              : t.key === "bus"
              ? refs.businessUnits.length
              : t.key === "domains"
              ? refs.dataDomains.length
              : t.key === "owners"
              ? refs.dataDomainOwners.length
              : state.roles.length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                active ? "text-ocp-800" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {t.icon}
              {t.label}
              <span
                className={`ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] tabular-nums ${
                  active ? "bg-ocp-100 text-ocp-800" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {count}
              </span>
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-ocp-700" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
        >
          {tab === "entities" && <EntitiesTab refs={refs} />}
          {tab === "bus" && <BusTab refs={refs} />}
          {tab === "domains" && <DomainsTab refs={refs} />}
          {tab === "owners" && <OwnersTab refs={refs} />}
          {tab === "access" && (
            <AccessTab roles={state.roles} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// =====================================================================
// Shell de table générique
// =====================================================================

function TableShell({
  columns,
  children,
  onAdd,
  addLabel,
  empty,
  isEmpty,
}: {
  columns: { label: string; className?: string }[];
  children: ReactNode;
  onAdd: () => void;
  addLabel: string;
  empty: ReactNode;
  isEmpty: boolean;
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div
          className="grid items-center gap-3 border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400"
          style={{ gridTemplateColumns: columns.map((c) => c.className || "1fr").join(" ") }}
        >
          {columns.map((c, i) => (
            <span key={i}>{c.label}</span>
          ))}
        </div>
        {isEmpty ? (
          <div className="px-6 py-10 text-center text-[13px] text-zinc-500">
            {empty}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">{children}</ul>
        )}
      </div>
      <div className="mt-3">
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={14} weight="bold" />}
          onClick={onAdd}
        >
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] focus:border-ocp-500 focus:outline-none";
const selectCls = inputCls + " bg-white";

function Row({
  cols,
  children,
  onDelete,
  deleteLabel,
}: {
  cols: string;
  children: ReactNode;
  onDelete: () => void;
  deleteLabel: string;
}) {
  return (
    <li
      className="grid items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50/50"
      style={{ gridTemplateColumns: cols }}
    >
      {children}
      <button
        type="button"
        onClick={onDelete}
        aria-label={deleteLabel}
        className="flex h-8 w-8 items-center justify-center justify-self-end rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 active:scale-95"
      >
        <Trash size={15} weight="duotone" />
      </button>
    </li>
  );
}

function ActiveToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-zinc-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-ocp-600"
        aria-label={label}
      />
      {checked ? "Actif" : "Inactif"}
    </label>
  );
}

// =====================================================================
// Onglet Entités
// =====================================================================

function EntitiesTab({ refs }: { refs: Refs }) {
  const cols = "1.6fr 0.7fr 0.6fr 40px";
  // Les mutateurs lisent l'état FRAIS (govStore.get) plutôt que le prop capturé
  // au render : deux events dans le même tick composent sans s'écraser.
  function update(id: string, patch: Partial<Entity>) {
    const r = govStore.get().refs;
    govStore.setRefs({
      ...r,
      entities: r.entities.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  }
  function add() {
    const r = govStore.get().refs;
    govStore.setRefs({
      ...r,
      entities: [
        ...r.entities,
        { id: refUid("ent"), name: "", code: "", active: true },
      ],
    });
  }
  function remove(id: string) {
    const r = govStore.get().refs;
    govStore.setRefs({ ...r, entities: r.entities.filter((e) => e.id !== id) });
  }
  return (
    <TableShell
      columns={[{ label: "Nom", className: "1.6fr" }, { label: "Code", className: "0.7fr" }, { label: "Statut", className: "0.6fr" }, { label: "", className: "40px" }]}
      onAdd={add}
      addLabel="Ajouter une entité"
      isEmpty={refs.entities.length === 0}
      empty="Aucune entité. Ajoutez votre première entité juridique / organisationnelle."
    >
      {refs.entities.map((e) => (
        <Row key={e.id} cols={cols} onDelete={() => remove(e.id)} deleteLabel={`Supprimer ${e.name || "l'entité"}`}>
          <input
            className={inputCls}
            value={e.name}
            placeholder="ex. OCP Nutricrops"
            onChange={(ev) => update(e.id, { name: ev.target.value })}
            aria-label="Nom de l'entité"
          />
          <input
            className={inputCls}
            value={e.code ?? ""}
            placeholder="NCR"
            onChange={(ev) => update(e.id, { code: ev.target.value })}
            aria-label="Code de l'entité"
          />
          <ActiveToggle checked={e.active} onChange={(v) => update(e.id, { active: v })} label="Entité active" />
        </Row>
      ))}
    </TableShell>
  );
}

// =====================================================================
// Onglet Functions / Business Units
// =====================================================================

function BusTab({ refs }: { refs: Refs }) {
  const cols = "1.4fr 1fr 0.6fr 40px";
  function update(id: string, patch: Partial<BusinessUnit>) {
    const r = govStore.get().refs;
    govStore.setRefs({
      ...r,
      businessUnits: r.businessUnits.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  }
  function add() {
    const r = govStore.get().refs;
    govStore.setRefs({
      ...r,
      businessUnits: [
        ...r.businessUnits,
        { id: refUid("bu"), name: "", entityId: r.entities[0]?.id, active: true },
      ],
    });
  }
  function remove(id: string) {
    const r = govStore.get().refs;
    govStore.setRefs({ ...r, businessUnits: r.businessUnits.filter((b) => b.id !== id) });
  }
  return (
    <TableShell
      columns={[{ label: "Nom", className: "1.4fr" }, { label: "Entité", className: "1fr" }, { label: "Statut", className: "0.6fr" }, { label: "", className: "40px" }]}
      onAdd={add}
      addLabel="Ajouter une BU / function"
      isEmpty={refs.businessUnits.length === 0}
      empty="Aucune business unit. Rattachez vos BU à une entité."
    >
      {refs.businessUnits.map((b) => (
        <Row key={b.id} cols={cols} onDelete={() => remove(b.id)} deleteLabel={`Supprimer ${b.name || "la BU"}`}>
          <input
            className={inputCls}
            value={b.name}
            placeholder="ex. Data & AI (D²nAI)"
            onChange={(ev) => update(b.id, { name: ev.target.value })}
            aria-label="Nom de la BU"
          />
          <select
            className={selectCls}
            value={b.entityId ?? ""}
            onChange={(ev) => update(b.id, { entityId: ev.target.value || undefined })}
            aria-label="Entité de rattachement"
          >
            <option value="">— sans entité —</option>
            {refs.entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name || "(sans nom)"}
              </option>
            ))}
          </select>
          <ActiveToggle checked={b.active} onChange={(v) => update(b.id, { active: v })} label="BU active" />
        </Row>
      ))}
    </TableShell>
  );
}

// =====================================================================
// Onglet Data Domains
// =====================================================================

function DomainsTab({ refs }: { refs: Refs }) {
  const cols = "1.2fr 1fr 1fr 0.6fr 40px";
  function update(id: string, patch: Partial<DataDomain>) {
    const r = govStore.get().refs;
    govStore.setRefs({
      ...r,
      dataDomains: r.dataDomains.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });
  }
  function add() {
    const r = govStore.get().refs;
    govStore.setRefs({
      ...r,
      dataDomains: [
        ...r.dataDomains,
        { id: refUid("dom"), name: "", ownerId: r.dataDomainOwners[0]?.id, active: true },
      ],
    });
  }
  function remove(id: string) {
    const r = govStore.get().refs;
    govStore.setRefs({ ...r, dataDomains: r.dataDomains.filter((d) => d.id !== id) });
  }
  return (
    <TableShell
      columns={[
        { label: "Domaine", className: "1.2fr" },
        { label: "Owner", className: "1fr" },
        { label: "BU pilote", className: "1fr" },
        { label: "Statut", className: "0.6fr" },
        { label: "", className: "40px" },
      ]}
      onAdd={add}
      addLabel="Ajouter un data domain"
      isEmpty={refs.dataDomains.length === 0}
      empty="Aucun data domain. Chaque domaine porte un propriétaire (signataire)."
    >
      {refs.dataDomains.map((d) => {
        const owner = ownerById(refs, d.ownerId);
        const orphan = d.ownerId && !owner;
        return (
          <Row key={d.id} cols={cols} onDelete={() => remove(d.id)} deleteLabel={`Supprimer ${d.name || "le domaine"}`}>
            <input
              className={inputCls}
              value={d.name}
              placeholder="ex. RH & Paie"
              onChange={(ev) => update(d.id, { name: ev.target.value })}
              aria-label="Nom du data domain"
            />
            <select
              className={`${selectCls} ${orphan ? "border-amber-vd-300 text-amber-vd-800" : ""}`}
              value={d.ownerId ?? ""}
              onChange={(ev) => update(d.id, { ownerId: ev.target.value || undefined })}
              aria-label="Propriétaire du domaine"
            >
              <option value="">— sans owner —</option>
              {refs.dataDomainOwners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name || o.login}
                </option>
              ))}
            </select>
            <select
              className={selectCls}
              value={d.buId ?? ""}
              onChange={(ev) => update(d.id, { buId: ev.target.value || undefined })}
              aria-label="BU pilote du domaine"
            >
              <option value="">— aucune —</option>
              {refs.businessUnits.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || "(sans nom)"}
                </option>
              ))}
            </select>
            <ActiveToggle checked={d.active} onChange={(v) => update(d.id, { active: v })} label="Domaine actif" />
          </Row>
        );
      })}
    </TableShell>
  );
}

// =====================================================================
// Onglet Data Domain Owners
// =====================================================================

function OwnersTab({ refs }: { refs: Refs }) {
  const cols = "1fr 1fr 1.1fr 0.5fr 40px";
  function update(id: string, patch: Partial<DataDomainOwner>) {
    const r = govStore.get().refs;
    govStore.setRefs({
      ...r,
      dataDomainOwners: r.dataDomainOwners.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });
  }
  function add() {
    const r = govStore.get().refs;
    govStore.setRefs({
      ...r,
      dataDomainOwners: [
        ...r.dataDomainOwners,
        { id: refUid("own"), name: "", login: "", active: true },
      ],
    });
  }
  function remove(id: string) {
    // Détache les domaines pointant sur cet owner.
    const r = govStore.get().refs;
    govStore.setRefs({
      ...r,
      dataDomainOwners: r.dataDomainOwners.filter((o) => o.id !== id),
      dataDomains: r.dataDomains.map((d) =>
        d.ownerId === id ? { ...d, ownerId: undefined } : d
      ),
    });
  }
  return (
    <TableShell
      columns={[
        { label: "Nom", className: "1fr" },
        { label: "Login / UPN", className: "1fr" },
        { label: "Email", className: "1.1fr" },
        { label: "Statut", className: "0.5fr" },
        { label: "", className: "40px" },
      ]}
      onAdd={add}
      addLabel="Ajouter un owner"
      isEmpty={refs.dataDomainOwners.length === 0}
      empty="Aucun data domain owner. Le login servira de clé d'identité (futur UPN Azure AD)."
    >
      {refs.dataDomainOwners.map((o) => (
        <Row key={o.id} cols={cols} onDelete={() => remove(o.id)} deleteLabel={`Supprimer ${o.name || "l'owner"}`}>
          <input
            className={inputCls}
            value={o.name}
            placeholder="ex. Hamza Kohen"
            onChange={(ev) => update(o.id, { name: ev.target.value })}
            aria-label="Nom de l'owner"
          />
          <input
            className={inputCls}
            value={o.login}
            placeholder="hamza.kohen"
            onChange={(ev) => update(o.id, { login: ev.target.value })}
            aria-label="Login / UPN"
          />
          <input
            className={inputCls}
            value={o.email ?? ""}
            placeholder="h.kohen@ocpgroup.ma"
            onChange={(ev) => update(o.id, { email: ev.target.value })}
            aria-label="Email"
          />
          <ActiveToggle checked={o.active} onChange={(v) => update(o.id, { active: v })} label="Owner actif" />
        </Row>
      ))}
    </TableShell>
  );
}

// =====================================================================
// Onglet Accès
// =====================================================================

function AccessTab({ roles }: { roles: RoleAssignment[] }) {
  const noAdmin = !hasAnyAdmin(roles);

  function update(idx: number, patch: Partial<RoleAssignment>) {
    const cur = govStore.get().roles;
    govStore.setRoles(cur.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }
  function toggleRole(idx: number, role: Role) {
    const cur = govStore.get().roles;
    const a = cur[idx];
    if (!a) return;
    const has = a.roles.includes(role);
    govStore.setRoles(
      cur.map((x, i) =>
        i === idx
          ? {
              ...x,
              roles: has ? x.roles.filter((r) => r !== role) : [...x.roles, role],
            }
          : x
      )
    );
  }
  function add() {
    const cur = govStore.get().roles;
    // Défaut : AUCUN rôle. Évite que l'admin courant ne se verrouille en
    // tapant son propre login (une assignation "reader" implicite le ferait
    // basculer hors amorçage). Tant que roles=[], l'amorçage reste actif.
    govStore.setRoles([...cur, { login: "", name: "", roles: [] }]);
  }
  function remove(idx: number) {
    const cur = govStore.get().roles;
    govStore.setRoles(cur.filter((_, i) => i !== idx));
  }

  return (
    <div>
      {noAdmin && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-vd-200 bg-amber-vd-50/60 px-4 py-3 text-[13px] text-amber-vd-900">
          <Warning size={16} weight="duotone" className="mt-0.5 shrink-0 text-amber-vd-700" />
          <div>
            <strong>Aucun administrateur défini.</strong> Tant que personne n'a le
            rôle « Administrateur », <em>tout utilisateur connecté</em> dispose de
            l'accès complet (mode amorçage). Assignez au moins un administrateur
            pour activer le contrôle d'accès.
          </div>
        </div>
      )}

      {/* Légende des rôles */}
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ALL_ROLES.map((r) => (
          <div key={r} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            <div className="text-[12.5px] font-semibold text-zinc-800">{ROLE_LABELS[r]}</div>
            <div className="mt-0.5 text-[11.5px] leading-snug text-zinc-500">{ROLE_HINTS[r]}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div
          className="grid items-center gap-3 border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400"
          style={{ gridTemplateColumns: "1fr 1fr 2.2fr 40px" }}
        >
          <span>Login / UPN</span>
          <span>Nom</span>
          <span>Rôles</span>
          <span />
        </div>
        {roles.length === 0 ? (
          <div className="px-6 py-10 text-center text-[13px] text-zinc-500">
            Aucun utilisateur assigné. En l'absence d'assignation, l'amorçage
            accorde un accès complet — ajoutez vos administrateurs.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {roles.map((a, idx) => (
              <li
                key={idx}
                className="grid items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50/50"
                style={{ gridTemplateColumns: "1fr 1fr 2.2fr 40px" }}
              >
                <input
                  className={inputCls}
                  value={a.login}
                  placeholder="hamza.kohen"
                  onChange={(e) => update(idx, { login: e.target.value })}
                  aria-label="Login utilisateur"
                />
                <input
                  className={inputCls}
                  value={a.name ?? ""}
                  placeholder="Hamza Kohen"
                  onChange={(e) => update(idx, { name: e.target.value })}
                  aria-label="Nom utilisateur"
                />
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ROLES.map((r) => {
                    const on = a.roles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRole(idx, r)}
                        aria-pressed={on}
                        className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-all active:scale-95 ${
                          on
                            ? r === "admin"
                              ? "bg-ocp-700 text-white"
                              : "bg-ocp-100 text-ocp-800 ring-1 ring-inset ring-ocp-200"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                        }`}
                      >
                        {ROLE_LABELS[r]}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  aria-label={`Retirer ${a.login || "l'utilisateur"}`}
                  className="flex h-8 w-8 items-center justify-center justify-self-end rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                >
                  <Trash size={15} weight="duotone" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-3">
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={14} weight="bold" />}
          onClick={add}
        >
          Ajouter un utilisateur
        </Button>
      </div>
    </div>
  );
}
