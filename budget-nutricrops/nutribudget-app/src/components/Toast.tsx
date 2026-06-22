import { AnimatePresence, motion } from "framer-motion";
import { spring } from "../lib/motion";

export function Toast({ message }: { message: string | null }) {
  return (
    <div
      className="nb-no-print pointer-events-none fixed inset-x-0 bottom-7 z-[9000] flex justify-center"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={spring}
            className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-50 shadow-[0_20px_40px_-15px_rgba(20,59,24,0.45)] ring-1 ring-ocp-500/40"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
