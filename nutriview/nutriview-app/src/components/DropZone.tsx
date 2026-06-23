import { useRef, useState, type DragEvent } from "react";
import { UploadSimple } from "@phosphor-icons/react";

interface Props {
  accept?: string;
  onFile: (file: File) => void;
  hint?: string;
}

export function DropZone({
  accept = ".xlsx,.xls,.pdf,.docx,.eml,.txt",
  onFile,
  hint,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setHover(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  return (
    <label
      htmlFor="nv-dropzone-input"
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        hover
          ? "border-ocp-500 bg-ocp-50"
          : "border-zinc-300 bg-white hover:border-ocp-300 hover:bg-ocp-50/40"
      }`}
    >
      <UploadSimple size={28} className="text-ocp-700" weight="duotone" />
      <div>
        <div className="font-medium text-zinc-900">
          Déposez un fichier ou cliquez pour parcourir
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          {hint ?? "Excel · PDF · Word · .eml · texte"}
        </div>
      </div>
      <input
        ref={inputRef}
        id="nv-dropzone-input"
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </label>
  );
}
