import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  children?: ReactNode;
}

const STYLES: Record<Variant, string> = {
  primary:
    "bg-ocp-600 text-white hover:bg-ocp-700 disabled:bg-ocp-300 disabled:cursor-not-allowed",
  secondary:
    "bg-white text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-zinc-700 hover:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed",
};

export function Button({
  variant = "primary",
  icon,
  children,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${STYLES[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
