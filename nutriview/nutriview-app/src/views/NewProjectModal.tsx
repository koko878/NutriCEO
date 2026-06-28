// =====================================================================
// NewProjectModal — création de projet branchée sur les référentiels
// gouvernance (Phase 6) : entité, BU (filtrée par entité), data domain.
// Choisir un data domain pré-remplit automatiquement le propriétaire des
// données (dataOwner) depuis l'owner du domaine — éditable ensuite.
// =====================================================================

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import type { Project, Region } from "../lib/model";
import { REGIONS } from "../lib/model";
import { useGov } from "../lib/useGov";
import {
  busOfEntity,
  domainById,
  ownerOfDomain,
} from "../lib/refs";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (project: Project) => void;
}

function uid() {
  return `prj_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function NewProjectModal({ open, onClose, onCreate }: Props) {
  const { state } = useGov();
  const refs = state.refs;

  const [title, setTitle] = useState("");
  const [entityId, setEntityId] = useState<string>("");
  const [buId, setBuId] = useState<string>("");
  const [region, setRegion] = useState<Region | "">("");
  const [dataDomainId, setDataDomainId] = useState<string>("");
  const [owner, setOwner] = useState("");
  const [dataOwner, setDataOwner] = useState("");
  const [dataOwnerTouched, setDataOwnerTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);

  // BU filtrées par l'entité choisie (ou toutes si aucune entité).
  const buOptions = useMemo(
    () => busOfEntity(refs, entityId || undefined),
    [refs, entityId]
  );

  // Owner proposé par le data domain choisi.
  const proposedOwner = useMemo(
    () => ownerOfDomain(refs, dataDomainId || undefined),
    [refs, dataDomainId]
  );

  // Chefs de projet suggérés = users avec rôle pm/admin.
  const pmLogins = useMemo(
    () =>
      state.roles
        .filter((a) => a.roles.includes("pm") || a.roles.includes("admin"))
        .map((a) => a.name || a.login),
    [state.roles]
  );

  function reset() {
    setTitle("");
    setEntityId("");
    setBuId("");
    setRegion("");
    setDataDomainId("");
    setOwner("");
    setDataOwner("");
    setDataOwnerTouched(false);
    setDescription("");
    setTouched(false);
  }

  function onPickDomain(id: string) {
    setDataDomainId(id);
    const dom = domainById(refs, id || undefined);
    // Aligne automatiquement la BU si le domaine en porte une.
    if (dom?.buId) setBuId(dom.buId);
    // Pré-remplit le propriétaire si l'utilisateur n'a pas saisi manuellement.
    const o = ownerOfDomain(refs, id || undefined);
    if (o && !dataOwnerTouched) setDataOwner(o.name || o.login);
  }

  function submit() {
    setTouched(true);
    if (!title.trim() || !region) return;
    const ent = refs.entities.find((e) => e.id === entityId);
    const bu = buOptions.find((b) => b.id === buId);
    const buLabel = bu?.name ?? (entityId ? "" : undefined);
    const project: Project = {
      id: uid(),
      title: title.trim(),
      bu: bu?.name || buLabel || undefined,
      region: region || undefined,
      entityId: entityId || undefined,
      buId: buId || undefined,
      dataDomainId: dataDomainId || undefined,
      description: description.trim() || undefined,
      owner: owner.trim(),
      dataOwner: dataOwner.trim(),
      ingestion: { source: "text", extractedAt: new Date().toISOString() },
      items: [],
      classifications: {},
      status: "drafting",
    };
    // ent n'est pas stocké en libellé séparé (entityId suffit), mais on
    // garde la résolution pour cohérence future.
    void ent;
    reset();
    onCreate(project);
  }

  const titleError = touched && !title.trim();
  const regionError = touched && !region;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Nouveau projet de classification"
      subtitle="Quelques métadonnées de contexte avant l'ingestion du brief."
      size="lg"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!title.trim() || !region}
          >
            Créer le projet
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field
          id="np-title"
          label="Titre du projet"
          required
          error={titleError ? "Renseignez un titre" : undefined}
        >
          <input
            id="np-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Plateforme RH Workday"
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none ${
              titleError
                ? "border-rose-300 focus:border-rose-500"
                : "border-zinc-200 focus:border-ocp-500"
            }`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="np-entity" label="Entité">
            <select
              id="np-entity"
              value={entityId}
              onChange={(e) => {
                setEntityId(e.target.value);
                setBuId(""); // reset BU quand on change d'entité
              }}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-ocp-500 focus:outline-none"
            >
              <option value="">— à préciser —</option>
              {refs.entities
                .filter((e) => e.active)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field id="np-bu" label="Business unit / function">
            <select
              id="np-bu"
              value={buId}
              onChange={(e) => setBuId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-ocp-500 focus:outline-none"
            >
              <option value="">— à préciser —</option>
              {buOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="np-region"
            label="Région"
            required
            error={regionError ? "Sélectionnez une région" : undefined}
          >
            <select
              id="np-region"
              value={region}
              onChange={(e) => setRegion(e.target.value as Region | "")}
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm focus:outline-none ${
                regionError
                  ? "border-rose-300 focus:border-rose-500"
                  : "border-zinc-200 focus:border-ocp-500"
              }`}
            >
              <option value="">— à préciser —</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="np-domain"
            label="Data domain"
            hint="Choisir un domaine pré-remplit son propriétaire (signataire)."
          >
            <select
              id="np-domain"
              value={dataDomainId}
              onChange={(e) => onPickDomain(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-ocp-500 focus:outline-none"
            >
              <option value="">— aucun / transverse —</option>
              {refs.dataDomains
                .filter((d) => d.active)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="np-owner" label="Chef de projet">
            <input
              id="np-owner"
              type="text"
              list="np-pm-list"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="ex. Hamza Kohen"
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-ocp-500 focus:outline-none"
            />
            <datalist id="np-pm-list">
              {pmLogins.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field
            id="np-data-owner"
            label="Propriétaire des données"
            hint={
              proposedOwner
                ? `Proposé depuis le domaine : ${proposedOwner.name || proposedOwner.login}`
                : "C'est lui qui validera et signera."
            }
          >
            <input
              id="np-data-owner"
              type="text"
              list="np-owner-list"
              value={dataOwner}
              onChange={(e) => {
                setDataOwner(e.target.value);
                setDataOwnerTouched(true);
              }}
              placeholder="ex. CDO Nutricrops"
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-ocp-500 focus:outline-none"
            />
            <datalist id="np-owner-list">
              {refs.dataDomainOwners
                .filter((o) => o.active)
                .map((o) => (
                  <option key={o.id} value={o.name || o.login} />
                ))}
            </datalist>
          </Field>
        </div>

        <Field id="np-desc" label="Description courte">
          <textarea
            id="np-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Finalité du projet, utilisateurs cibles, données manipulées…"
            rows={3}
            className="w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-ocp-500 focus:outline-none"
          />
        </Field>
      </div>
    </Modal>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[12.5px] font-medium text-zinc-700"
      >
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[12px] text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[12px] text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}
