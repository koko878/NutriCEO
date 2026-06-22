import { memo } from "react";
import type { CostType, PayStatus } from "../lib/model";
import { PAY_LABELS } from "../lib/model";

// Status / cost-type pill — colour + label (colour never alone, WCAG AA).
const PAY_CLASS: Record<PayStatus, string> = {
  paid: "bg-ocp-50 text-ocp-700 ring-ocp-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  blocked: "bg-rose-50 text-rose-700 ring-rose-200",
  draft: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

export function PayPill({ status }: { status: PayStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${PAY_CLASS[status]}`}
    >
      {status === "blocked" && <BreathingDot />}
      {PAY_LABELS[status]}
    </span>
  );
}

export function CostPill({ type }: { type: CostType }) {
  const cls =
    type === "CAPEX"
      ? "bg-sky-50 text-sky-700 ring-sky-200"
      : "bg-amber-50 text-amber-800 ring-amber-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${cls}`}
    >
      {type}
    </span>
  );
}

// Perpetual "breathing" dot for blocked items — isolated, memoized.
export const BreathingDot = memo(function BreathingDot() {
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      <span className="nb-breathe absolute inline-flex h-full w-full rounded-full bg-rose-500" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-600" />
    </span>
  );
});

export function PageHeader({
  title,
  lead,
}: {
  title: string;
  lead: React.ReactNode;
}) {
  return (
    <div className="mb-8 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[28px]">
        {title}
      </h1>
      <p className="mt-2 leading-relaxed text-zinc-600">{lead}</p>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
      {children}
    </div>
  );
}
