// =====================================================================
// DropZone — états : idle / hover / dragging / extracting / done / error.
// Drop area généreuse, bordure pointillée zinc, vert OCP au hover,
// shimmer pendant extraction.
// =====================================================================

import { useRef, useState, type DragEvent } from "react";
import {
  UploadSimple,
  FileText,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";

export type DropZoneState =
  | { kind: "idle" }
  | { kind: "extracting"; fileName: string }
  | { kind: "done"; fileName: string; count: number }
  | { kind: "error"; message: string };

interface Props {
  accept?: string;
  onFile: (file: File) => void;
  state?: DropZoneState;
  hint?: string;
}

export function DropZone({
  accept = ".xlsx,.xls,.pdf,.docx,.eml,.txt",
  onFile,
  state = { kind: "idle" },
  hint,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  const busy = state.kind === "extracting";

  return (
    <label
      htmlFor="nv-dropzone-input"
      onDragOver={(e) => {
        if (busy) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={busy ? undefined : handleDrop}
      className={`group relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed px-8 py-12 text-center transition-colors duration-200
        ${
          dragging
            ? "border-ocp-500 bg-ocp-50/80"
            : state.kind === "error"
            ? "border-rose-300 bg-rose-50/40"
            : state.kind === "done"
            ? "border-ocp-300 bg-ocp-50/40"
            : "border-zinc-300 bg-white hover:border-ocp-400 hover:bg-ocp-50/30"
        } ${busy ? "cursor-progress" : ""}`}
    >
      {state.kind === "idle" && (
        <>
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-ocp-50 text-ocp-700 transition-transform duration-200 ${
              dragging ? "scale-110" : "group-hover:scale-105"
            }`}
          >
            <UploadSimple size={28} weight="duotone" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold text-zinc-900">
              Déposez un fichier
            </div>
            <div className="mt-1 text-[13px] text-zinc-500">
              ou{" "}
              <span className="font-medium text-ocp-700 underline-offset-4 group-hover:underline">
                parcourez vos documents
              </span>
            </div>
            <div className="mt-3 text-[11.5px] text-zinc-400">
              {hint ?? "Excel · PDF · Word · .eml · texte — ≤ 10 Mo"}
            </div>
          </div>
        </>
      )}

      {state.kind === "extracting" && (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
            <FileText size={28} weight="duotone" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold text-zinc-900">
              Extraction en cours…
            </div>
            <div className="mt-1 text-[13px] text-zinc-500">
              {state.fileName}
            </div>
            <div className="mx-auto mt-4 h-1 w-48 overflow-hidden rounded-full bg-zinc-200">
              <div className="nv-shimmer h-full w-full" />
            </div>
          </div>
        </>
      )}

      {state.kind === "done" && (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ocp-100 text-ocp-800">
            <CheckCircle size={28} weight="duotone" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold text-zinc-900">
              Fichier extrait
            </div>
            <div className="mt-1 text-[13px] text-zinc-500">
              {state.fileName} ·{" "}
              <span className="tabular-nums">{state.count}</span> ligne(s)
              candidate(s)
            </div>
            <div className="mt-3 text-[12px] text-ocp-700">
              Cliquer pour remplacer le fichier
            </div>
          </div>
        </>
      )}

      {state.kind === "error" && (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <WarningCircle size={28} weight="duotone" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold text-rose-800">
              Extraction impossible
            </div>
            <div className="mt-1 max-w-md text-[13px] text-rose-700">
              {state.message}
            </div>
            <div className="mt-3 text-[12px] text-zinc-500">
              Cliquer pour réessayer
            </div>
          </div>
        </>
      )}

      <input
        ref={inputRef}
        id="nv-dropzone-input"
        type="file"
        accept={accept}
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </label>
  );
}
