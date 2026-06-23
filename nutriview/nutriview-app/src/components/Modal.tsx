import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const focusables = root?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // restore focus to the trigger that opened the modal
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  const widthCls = size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-4 py-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nv-modal-title"
        className={`w-full ${widthCls} rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200`}
      >
        <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 id="nv-modal-title" className="text-xl text-zinc-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X weight="bold" size={18} />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
