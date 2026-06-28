// =====================================================================
// Ingest — 2/3 dropzone gauche, 1/3 panneau pédagogique droite.
// Quatre entrées : Fichier (drop) / Coller texte / Saisie manuelle.
// =====================================================================

import { useState } from "react";
import {
  ArrowRight,
  NotePencil,
  FileXls,
  FilePdf,
  FileDoc,
  FilePpt,
  TextAlignLeft,
  Sparkle,
  ShieldCheck,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/Button";
import { PageHero } from "../components/Card";
import { DropZone, type DropZoneState } from "../components/DropZone";
import type { DataItem, Project } from "../lib/model";
import {
  extractFromDocx,
  extractFromEml,
  extractFromExcel,
  extractFromPdf,
  extractFromPptx,
  extractFromText,
} from "../lib/ingest";
import { useGov } from "../lib/useGov";
import { suggestDomainId } from "../lib/refs";
import { isValidHttpUrl, scanUrl } from "../lib/scan";

interface Props {
  project: Project;
  onChange: (p: Project) => void;
  onDone: () => void;
}

type Ingestion = Project["ingestion"];
type Mode = "file" | "paste" | "url";

export function Ingest({ project, onChange, onDone }: Props) {
  const { state: gov } = useGov();
  const [mode, setMode] = useState<Mode>("file");
  const [dz, setDz] = useState<DropZoneState>({ kind: "idle" });
  const [preview, setPreview] = useState<DataItem[] | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [pasteErr, setPasteErr] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlErr, setUrlErr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Auto-mapping data domain : pour chaque donnée extraite, on devine son
  // data domain (et donc son owner, résolu via ownerOfDomain) à partir des
  // référentiels. L'utilisateur peut corriger au Catalogue. Si le projet
  // porte déjà un data domain global, il sert de défaut.
  function assignDomains(items: DataItem[]): DataItem[] {
    return items.map((it) => {
      if (it.dataDomainId) return it;
      const guess =
        suggestDomainId(gov.refs, `${it.name} ${it.description}`) ||
        project.dataDomainId;
      return guess ? { ...it, dataDomainId: guess } : it;
    });
  }

  function commit(rawItems: DataItem[], ingestion: Ingestion) {
    const items = assignDomains(rawItems);
    setPreview(items);
    onChange({
      ...project,
      items,
      ingestion,
    });
  }

  async function onFile(file: File) {
    setDz({ kind: "extracting", fileName: file.name });
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
      } else if (name.endsWith(".pptx")) {
        source = "ppt";
        result = await extractFromPptx(file);
      } else if (/\.(png|jpe?g|webp|gif|bmp|tiff?)$/.test(name)) {
        // OCR / vision : nécessite le backend IA souverain (Databricks
        // multimodal). On ne falsifie pas une extraction côté navigateur.
        throw new Error(
          "Image reçue. L'extraction par vision IA souveraine sera branchée avec le modèle multimodal Databricks. En attendant, collez le texte du document ou importez un Excel / PDF / Word / PPT."
        );
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
      setDz({
        kind: "done",
        fileName: file.name,
        count: result.candidates.length,
      });
    } catch (e) {
      setDz({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  function onPasteCommit() {
    if (!pastedText.trim()) {
      setPasteErr("Collez au moins quelques lignes de texte.");
      return;
    }
    setPasteErr(null);
    const result = extractFromText(pastedText);
    commit(result.candidates, {
      source: "text",
      fileName: undefined,
      extractedAt: new Date().toISOString(),
    });
  }

  async function onScanUrl() {
    const url = urlInput.trim();
    if (!isValidHttpUrl(url)) {
      setUrlErr("Entrez une URL valide (http:// ou https://).");
      return;
    }
    setUrlErr(null);
    setScanning(true);
    try {
      const res = await scanUrl(url);
      if (!res.ok) {
        setUrlErr(res.message);
        return;
      }
      const result = extractFromText(res.text);
      commit(result.candidates, {
        source: "url",
        sourceUrl: res.fetchedFrom,
        extractedAt: new Date().toISOString(),
      });
    } finally {
      setScanning(false);
    }
  }

  function onManual() {
    commit([], {
      source: "text",
      extractedAt: new Date().toISOString(),
    });
    onDone();
  }

  return (
    <div>
      <PageHero
        eyebrow={`${project.title}${project.bu ? " · " + project.bu : ""}`}
        title="Importez le brief"
        lead="Fichier, texte collé ou scan d'URL : NutriView extrait les objets-donnée et les rattache à leur data domain. Le texte des fichiers est lu côté navigateur, aucune donnée ne quitte votre poste."
      />

      {/* Split layout : 2/3 input · 1/3 pédagogie */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <section>
          {/* Toggle entre fichier et collage — pas 4 tabs identiques */}
          <div className="mb-4 inline-flex rounded-full bg-zinc-100 p-1 text-[13px] font-medium">
            <ModeTab
              active={mode === "file"}
              onClick={() => setMode("file")}
              label="Déposer un fichier"
            />
            <ModeTab
              active={mode === "paste"}
              onClick={() => setMode("paste")}
              label="Coller du texte"
            />
            <ModeTab
              active={mode === "url"}
              onClick={() => setMode("url")}
              label="Scanner une URL"
            />
          </div>

          <AnimatePresence mode="wait">
            {mode === "url" ? (
              <motion.div
                key="url"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <label htmlFor="nv-url" className="sr-only">
                  URL de l'application à scanner
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="nv-url"
                    type="url"
                    inputMode="url"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (urlErr) setUrlErr(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !scanning) onScanUrl();
                    }}
                    placeholder="https://app.nutricrops.com/dashboard"
                    className={`w-full rounded-2xl border bg-white px-5 py-3.5 text-[14px] focus:outline-none ${
                      urlErr
                        ? "border-rose-300 focus:border-rose-500"
                        : "border-zinc-200 focus:border-ocp-500"
                    }`}
                  />
                  <Button
                    variant="primary"
                    size="md"
                    onClick={onScanUrl}
                    disabled={scanning || !urlInput.trim()}
                    className="shrink-0"
                  >
                    {scanning ? "Scan en cours…" : "Scanner"}
                  </Button>
                </div>
                {urlErr && (
                  <p className="mt-2 text-[12.5px] text-rose-700">{urlErr}</p>
                )}
                <p className="mt-3 flex items-start gap-2 rounded-2xl bg-zinc-50 px-4 py-3 text-[12.5px] text-zinc-600">
                  <ShieldCheck
                    size={16}
                    weight="duotone"
                    className="mt-0.5 shrink-0 text-ocp-700"
                  />
                  <span>
                    Le scan passe par le proxy souverain NutriView (côté serveur
                    Nutricrops) : il récupère le texte visible de la page et en
                    extrait les objets-donnée. Aucune navigation depuis votre
                    poste.
                  </span>
                </p>
              </motion.div>
            ) : mode === "file" ? (
              <motion.div
                key="file"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <DropZone
                  onFile={onFile}
                  state={dz}
                  hint="Excel · PDF · Word · PPT · .eml · texte (≤ 10 Mo)"
                />
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-zinc-500">
                  <FormatChip icon={<FileXls size={14} weight="duotone" />} label="Excel" />
                  <FormatChip icon={<FilePdf size={14} weight="duotone" />} label="PDF" />
                  <FormatChip icon={<FileDoc size={14} weight="duotone" />} label="Word" />
                  <FormatChip icon={<FilePpt size={14} weight="duotone" />} label="PowerPoint" />
                  <FormatChip icon={<TextAlignLeft size={14} weight="duotone" />} label="Texte / .eml" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="paste"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <label htmlFor="nv-paste" className="sr-only">
                  Collez votre texte
                </label>
                <textarea
                  id="nv-paste"
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value);
                    if (pasteErr) setPasteErr(null);
                  }}
                  placeholder="Collez ici le contenu d'un brief, d'un mail, d'un extrait de note… NutriView fera un premier découpage heuristique."
                  rows={12}
                  className={`w-full resize-y rounded-3xl border bg-white px-5 py-4 text-[14px] leading-relaxed focus:outline-none ${
                    pasteErr
                      ? "border-rose-300 focus:border-rose-500"
                      : "border-zinc-200 focus:border-ocp-500"
                  }`}
                />
                {pasteErr && (
                  <p className="mt-2 text-[12.5px] text-rose-700">
                    {pasteErr}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onManual}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ocp-700 transition-colors hover:text-ocp-900"
                  >
                    <NotePencil size={14} weight="duotone" />
                    Je préfère saisir manuellement
                  </button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={onPasteCommit}
                    disabled={!pastedText.trim()}
                  >
                    Extraire ce texte
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Aperçu post-extraction */}
          <AnimatePresence>
            {preview !== null && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 110, damping: 22 }}
                className="mt-6 rounded-3xl border border-zinc-200 bg-white p-7"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-zinc-900">
                      Aperçu de l'extraction
                    </h3>
                    <p className="mt-1 text-[12.5px] text-zinc-500">
                      <span className="tabular-nums">{preview.length}</span> donnée(s)
                      candidate(s) — vous pourrez éditer la liste à l'étape suivante.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    iconRight={<ArrowRight size={16} weight="bold" />}
                    onClick={onDone}
                  >
                    Continuer vers le catalogue
                  </Button>
                </div>
                {preview.length === 0 ? (
                  <p className="rounded-2xl bg-zinc-50 px-4 py-6 text-center text-[13px] text-zinc-500">
                    Aucune ligne « catalogue » détectée automatiquement. Vous
                    pourrez démarrer manuellement depuis l'étape suivante.
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {preview.slice(0, 8).map((c) => (
                      <li key={c.id} className="py-3">
                        <div className="text-[14px] font-medium text-zinc-900">
                          {c.name}
                        </div>
                        {c.description !== c.name && (
                          <div className="mt-0.5 max-w-[65ch] text-[12.5px] text-zinc-500">
                            {c.description}
                          </div>
                        )}
                      </li>
                    ))}
                    {preview.length > 8 && (
                      <li className="pt-3 text-[12px] text-zinc-400">
                        +{preview.length - 8} autres lignes dans l'écran Catalogue
                      </li>
                    )}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Panneau pédagogique 1/3 droite */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-[0_20px_40px_-22px_rgba(20,59,24,0.10)]">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-ocp-700">
              <Sparkle size={14} weight="duotone" />
              Comment NutriView extrait vos données
            </div>
            <ol className="space-y-4 text-[13.5px] text-zinc-700">
              <Step n={1} title="Lecture côté navigateur">
                Le fichier est lu en mémoire avec <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11.5px] tabular-nums">pdfjs</code>, <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11.5px] tabular-nums">mammoth</code> ou <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11.5px] tabular-nums">xlsx</code>.
              </Step>
              <Step n={2} title="Découpage heuristique">
                NutriView repère les marqueurs <em>« Données… »</em>, <em>« Fichier de… »</em>, <em>« Base de… »</em> et propose une première liste.
              </Step>
              <Step n={3} title="Catalogue éditable">
                Vous validez, complétez, supprimez ligne par ligne avant de passer à la classification.
              </Step>
            </ol>
            <div className="mt-5 flex items-start gap-2 rounded-2xl bg-ocp-50 px-4 py-3 text-[12.5px] text-ocp-900">
              <ShieldCheck size={16} weight="duotone" className="mt-0.5 shrink-0 text-ocp-700" />
              <span>
                Aucune donnée du brief ne quitte votre navigateur dans cette version. L'IA arrive en phase 4, sur tenant Databricks souverain.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 transition-all duration-150 active:scale-[0.97] ${
        active
          ? "bg-white text-zinc-900 shadow-[0_2px_6px_-2px_rgba(20,59,24,0.20)]"
          : "text-zinc-600 hover:text-zinc-900"
      }`}
    >
      {label}
    </button>
  );
}

function FormatChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-zinc-200">
      <span className="text-ocp-700">{icon}</span>
      {label}
    </span>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ocp-100 font-display text-[13px] font-semibold text-ocp-800 tabular-nums"
        aria-hidden
      >
        {n}
      </span>
      <div>
        <div className="font-medium text-zinc-900">{title}</div>
        <div className="mt-0.5 text-[13px] leading-relaxed text-zinc-600">
          {children}
        </div>
      </div>
    </li>
  );
}
