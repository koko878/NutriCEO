import { useState } from "react";
import { ArrowRight, NotePencil, Warning } from "@phosphor-icons/react";
import { Button } from "../components/Button";
import { Card, PageHeader, SectionLabel } from "../components/Card";
import { DropZone } from "../components/DropZone";
import type { DataItem, Project } from "../lib/model";
import {
  extractFromDocx,
  extractFromEml,
  extractFromExcel,
  extractFromPdf,
  extractFromText,
} from "../lib/ingest";

interface Props {
  project: Project;
  onChange: (p: Project) => void;
  onDone: () => void;
}

type Ingestion = Project["ingestion"];

export function Ingest({ project, onChange, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<DataItem[] | null>(null);
  const [pastedText, setPastedText] = useState("");

  function commit(items: DataItem[], ingestion: Ingestion) {
    setPreview(items);
    onChange({
      ...project,
      items,
      ingestion,
    });
  }

  async function onFile(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const name = file.name.toLowerCase();
      const extractedAt = new Date().toISOString();
      let result;
      let source: Ingestion["source"] = "text";
      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        source = "excel";
        result = await extractFromExcel(file);
      } else if (name.endsWith(".pdf")) {
        source = "pdf";
        result = await extractFromPdf(file);
      } else if (name.endsWith(".docx")) {
        source = "word";
        result = await extractFromDocx(file);
      } else if (name.endsWith(".eml")) {
        source = "email";
        const text = await file.text();
        result = extractFromEml(text);
      } else {
        source = "text";
        const text = await file.text();
        result = extractFromText(text);
      }
      commit(result.candidates, {
        source,
        fileName: file.name,
        extractedAt,
      });
    } catch (e) {
      setErr(
        `Extraction impossible : ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    } finally {
      setBusy(false);
    }
  }

  function onPasteCommit() {
    if (!pastedText.trim()) return;
    const result = extractFromText(pastedText);
    commit(result.candidates, {
      source: "text",
      fileName: undefined,
      extractedAt: new Date().toISOString(),
    });
  }

  function onManual() {
    commit([], {
      source: "text",
      extractedAt: new Date().toISOString(),
    });
  }

  return (
    <div>
      <PageHeader
        title="Ingestion du projet"
        lead="Déposez le brief, un fichier de spec ou un mail. NutriView extrait le texte côté navigateur — aucune donnée ne sort. Phase 3 = découpage heuristique simple ; l'extraction IA arrive en phase 4."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionLabel>Fichier</SectionLabel>
          <DropZone onFile={onFile} hint="Excel · PDF · Word · .eml · texte (≤ 10 Mo recommandé)" />
          {busy && (
            <p className="mt-3 text-sm text-zinc-500">
              Extraction en cours…
            </p>
          )}
        </Card>

        <Card>
          <SectionLabel>Collage de texte</SectionLabel>
          <label htmlFor="nv-paste" className="sr-only">
            Collez votre texte
          </label>
          <textarea
            id="nv-paste"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Collez ici le contenu d'un brief, d'un mail, d'un extrait de note…"
            rows={8}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-ocp-500 focus:outline-none"
          />
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={onManual}
              className="inline-flex items-center gap-1 text-xs font-medium text-ocp-700 hover:underline"
            >
              <NotePencil size={14} weight="bold" />
              Je préfère saisir manuellement
            </button>
            <Button
              variant="secondary"
              onClick={onPasteCommit}
              disabled={!pastedText.trim()}
            >
              Extraire ce texte
            </Button>
          </div>
        </Card>
      </div>

      {err && (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
          <Warning size={16} weight="fill" /> {err}
        </div>
      )}

      {preview !== null && (
        <Card className="mt-6">
          <SectionLabel>
            Aperçu — {preview.length} donnée(s) candidate(s) (découpage
            heuristique)
          </SectionLabel>
          {preview.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune ligne « catalogue » détectée automatiquement. Vous
              pouvez démarrer le catalogue manuellement à l'écran suivant.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {preview.slice(0, 8).map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-zinc-100 px-3 py-2"
                >
                  <div className="font-medium text-zinc-900">{c.name}</div>
                  {c.description !== c.name && (
                    <div className="mt-0.5 text-zinc-600">{c.description}</div>
                  )}
                </li>
              ))}
              {preview.length > 8 && (
                <li className="text-xs text-zinc-400">
                  +{preview.length - 8} autres lignes à éditer dans
                  l'écran Catalogue
                </li>
              )}
            </ul>
          )}
          <div className="mt-5 flex justify-end">
            <Button
              variant="primary"
              icon={<ArrowRight size={16} weight="bold" />}
              onClick={onDone}
            >
              Continuer vers le catalogue
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
