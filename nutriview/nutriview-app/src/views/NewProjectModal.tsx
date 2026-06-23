// =====================================================================
// NewProjectModal — création de projet : titre, BU, owners, description.
// =====================================================================

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import type { Project } from "../lib/model";

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

const BUS = [
  "Digital Solutions",
  "Core IT",
  "Data & AI",
  "Africa",
  "Brazil",
  "North America",
  "HR",
  "Nutricrops — autre",
];

export function NewProjectModal({ open, onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [bu, setBu] = useState(BUS[2]);
  const [owner, setOwner] = useState("");
  const [dataOwner, setDataOwner] = useState("");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);

  function reset() {
    setTitle("");
    setBu(BUS[2]);
    setOwner("");
    setDataOwner("");
    setDescription("");
    setTouched(false);
  }

  function submit() {
    setTouched(true);
    if (!title.trim()) return;
    const project: Project = {
      id: uid(),
      title: title.trim(),
      bu,
      description: description.trim() || undefined,
      owner: owner.trim(),
      dataOwner: dataOwner.trim(),
      ingestion: {
        source: "text",
        extractedAt: new Date().toISOString(),
      },
      items: [],
      classifications: {},
      status: "drafting",
    };
    reset();
    onCreate(project);
  }

  const titleError = touched && !title.trim();

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
          <Button variant="primary" onClick={submit} disabled={!title.trim()}>
            Créer le projet
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field id="np-title" label="Titre du projet" required error={titleError ? "Renseignez un titre" : undefined}>
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
          <Field id="np-bu" label="Business unit">
            <select
              id="np-bu"
              value={bu}
              onChange={(e) => setBu(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-ocp-500 focus:outline-none"
            >
              {BUS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
          <Field id="np-owner" label="Chef de projet">
            <input
              id="np-owner"
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="ex. Hamza Kohen"
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-ocp-500 focus:outline-none"
            />
          </Field>
        </div>

        <Field
          id="np-data-owner"
          label="Propriétaire des données"
          hint="Chief Data Officer ou data domain owner — c'est lui qui validera et signera."
        >
          <input
            id="np-data-owner"
            type="text"
            value={dataOwner}
            onChange={(e) => setDataOwner(e.target.value)}
            placeholder="ex. CDO Nutricrops Africa"
            className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-ocp-500 focus:outline-none"
          />
        </Field>

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
