// =====================================================================
// Modal — focus-trap, role=dialog, aria-modal, ESC, restore focus.
// Backdrop : flou justifié léger (zinc-900/40 + backdrop-blur-sm).
// Motion : opacity .15s + transform .25s, dégrade en crossfade sous
// prefers-reduced-motion (cf. SPEC §10 + shape brief Verdict).
// =====================================================================

import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@phosphor-icons/react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
}

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
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
      'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
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
    // Bloque le scroll de fond.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-8 backdrop-blur-[2px]"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nv-modal-title"
            className={`w-full ${SIZE[size]} max-h-[calc(100dvh-4rem)] flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_40px_80px_-20px_rgba(20,59,24,0.25)] ring-1 ring-zinc-200`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 28,
            }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-zinc-100 px-7 py-5">
              <div>
                <h2
                  id="nv-modal-title"
                  className="font-display text-[26px] font-semibold leading-tight text-zinc-900"
                >
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-1 text-[13px] text-zinc-500">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:scale-95"
              >
                <X weight="bold" size={18} />
              </button>
            </header>
            <div className="overflow-y-auto px-7 py-6">{children}</div>
            {footer && (
              <footer className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/70 px-7 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
