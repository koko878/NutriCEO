import { useState } from "react";
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

  function reset() {
    setTitle("");
    setBu(BUS[2]);
    setOwner("");
    setDataOwner("");
    setDescription("");
  }

  function submit() {
    if (!title.trim()) return;
    const project: Project = {
      id: uid(),
      title: title.trim(),
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
    // On encapsule la description dans la première ingestion brute pour
    // ne pas perdre l'info utilisateur (la BU sera ré-affichée en synthèse).
    if (description.trim() || bu) {
      // On stocke informellement dans le titre du projet (BU séparée).
      project.title = `${project.title}${bu ? ` — ${bu}` : ""}`;
    }
    reset();
    onCreate(project);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Nouveau projet"
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
      <div className="space-y-4">
        <Field id="np-title" label="Titre du projet" required>
          <input
            id="np-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Plateforme RH Workday"
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-ocp-500 focus:outline-none"
          />
        </Field>

        <Field id="np-bu" label="Business unit">
          <select
            id="np-bu"
            value={bu}
            onChange={(e) => setBu(e.target.value)}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-ocp-500 focus:outline-none"
          >
            {BUS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="np-owner" label="Chef de projet">
            <input
              id="np-owner"
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="ex. Hamza Kohen"
              className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-ocp-500 focus:outline-none"
            />
          </Field>
          <Field id="np-data-owner" label="Propriétaire des données">
            <input
              id="np-data-owner"
              type="text"
              value={dataOwner}
              onChange={(e) => setDataOwner(e.target.value)}
              placeholder="ex. CDO / data domain owner"
              className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-ocp-500 focus:outline-none"
            />
          </Field>
        </div>

        <Field id="np-desc" label="Description courte">
          <textarea
            id="np-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Quelle est la finalité du projet, qui sont les utilisateurs cibles, quelles données il manipule…"
            rows={3}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-ocp-500 focus:outline-none"
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
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
      >
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </label>
      {children}
    </div>
  );
}
