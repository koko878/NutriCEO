import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white p-5 ring-1 ring-zinc-200 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  lead,
}: {
  title: string;
  lead?: ReactNode;
}) {
  return (
    <div className="mb-6 max-w-3xl">
      <h1 className="text-3xl text-zinc-900 sm:text-[34px]">{title}</h1>
      {lead && <p className="mt-2 leading-relaxed text-zinc-600">{lead}</p>}
    </div>
  );
}
