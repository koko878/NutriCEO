import { useState } from "react";
import { Plus, FolderOpen } from "@phosphor-icons/react";
import { Button } from "../components/Button";
import { Card, PageHeader, SectionLabel } from "../components/Card";
import { StatusBadge } from "../components/Badge";
import type { Project } from "../lib/model";
import { NewProjectModal } from "./NewProjectModal";

const STATUS_LABEL: Record<Project["status"], string> = {
  drafting: "Brouillon",
  in_review: "En revue",
  signed: "Signé",
  rejected: "Rejeté",
};

interface Props {
  projects: Project[];
  onCreate: (p: Project) => void;
  onOpen: (p: Project) => void;
}

export function Projects({ projects, onCreate, onOpen }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <PageHeader
          title="Mes projets de classification"
          lead="Chaque projet digital ou data Nutricrops démarre par une classification DGSSI. NutriView vous accompagne de l'ingestion du brief jusqu'à la décision d'éligibilité cloud."
        />
        <Button
          variant="primary"
          icon={<Plus size={16} weight="bold" />}
          onClick={() => setOpen(true)}
        >
          Nouveau projet
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <FolderOpen
              size={36}
              weight="duotone"
              className="mx-auto text-ocp-700"
            />
            <p className="mt-3 text-lg text-zinc-900">
              Aucun projet pour l'instant.
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Démarrez votre premier exercice de classification — vous
              pourrez ensuite ingérer un brief ou saisir vos données
              manuellement.
            </p>
            <div className="mt-5 flex justify-center">
              <Button
                variant="primary"
                icon={<Plus size={16} weight="bold" />}
                onClick={() => setOpen(true)}
              >
                Créer mon premier projet
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Projet</th>
                <th className="px-5 py-3">Chef de projet</th>
                <th className="px-5 py-3">Propriétaire des données</th>
                <th className="px-5 py-3">Données</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Mis à jour</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-ocp-50/40"
                  onClick={() => onOpen(p)}
                >
                  <td className="px-5 py-3 font-medium text-zinc-900">
                    {p.title}
                  </td>
                  <td className="px-5 py-3 text-zinc-700">{p.owner || "—"}</td>
                  <td className="px-5 py-3 text-zinc-700">
                    {p.dataOwner || "—"}
                  </td>
                  <td className="px-5 py-3 text-zinc-700">{p.items.length}</td>
                  <td className="px-5 py-3">
                    <StatusBadge>{STATUS_LABEL[p.status]}</StatusBadge>
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-500">
                    {new Date(p.ingestion.extractedAt).toLocaleDateString(
                      "fr-FR"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="mt-6">
        <SectionLabel>Note de version</SectionLabel>
        <p className="max-w-2xl text-sm text-zinc-500">
          NutriView v0.1 — moteur déterministe + UI catalogue + ingestion
          multi-format. L'IA et la signature horodatée arrivent dans les
          phases 4 et 5.
        </p>
      </div>

      <NewProjectModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={(p) => {
          setOpen(false);
          onCreate(p);
        }}
      />
    </div>
  );
}
