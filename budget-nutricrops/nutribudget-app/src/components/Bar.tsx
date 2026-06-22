import { motion } from "framer-motion";

interface BarProps {
  label: React.ReactNode;
  pct: number;
  value: React.ReactNode;
  fill?: string; // tailwind bg class
  onClick?: () => void;
  ariaLabel?: string;
  shimmer?: boolean;
}

// A single horizontal bar row. As a <button> when drill-down is enabled.
export function Bar({ label, pct, value, fill = "bg-ocp-500", onClick, ariaLabel, shimmer }: BarProps) {
  const track = (
    <div className="relative h-5 overflow-hidden rounded-full bg-zinc-100">
      <motion.div
        className={`relative h-full rounded-full ${fill} ${shimmer ? "nb-shimmer" : ""}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(pct, 1.5)}%` }}
        transition={{ type: "spring", stiffness: 90, damping: 22 }}
      />
    </div>
  );

  const inner = (
    <>
      <span className="min-w-0 truncate text-sm font-medium text-zinc-700">{label}</span>
      {track}
      <span className="whitespace-nowrap text-right font-mono text-sm text-zinc-900">{value}</span>
    </>
  );

  const grid = "grid grid-cols-[minmax(110px,150px)_1fr_minmax(86px,auto)] items-center gap-3 py-1";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`${grid} group w-full rounded-lg text-left transition active:scale-[0.99]`}
      >
        <span className="min-w-0 truncate text-sm font-medium text-zinc-700 group-hover:text-ocp-700">
          {label}
        </span>
        {track}
        <span className="whitespace-nowrap text-right font-mono text-sm text-zinc-900">{value}</span>
      </button>
    );
  }
  return <div className={grid}>{inner}</div>;
}
