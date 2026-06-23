// =====================================================================
// Button — variants primary / secondary / ghost / danger / link.
// Tactile : active:scale-[0.98], spring-ish via CSS transitions.
// Disabled : opacité réduite + cursor-not-allowed + tooltip optionnel.
// =====================================================================

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-ocp-700 text-white hover:bg-ocp-800 active:bg-ocp-900 shadow-[0_4px_12px_-4px_rgba(20,59,24,0.35)] hover:shadow-[0_6px_18px_-4px_rgba(20,59,24,0.45)] disabled:bg-ocp-300 disabled:shadow-none",
  secondary:
    "bg-white text-zinc-900 ring-1 ring-zinc-200 hover:ring-zinc-300 hover:bg-zinc-50 active:bg-zinc-100 disabled:bg-zinc-50 disabled:text-zinc-400",
  ghost:
    "bg-transparent text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200 disabled:text-zinc-400",
  danger:
    "bg-rose-700 text-white hover:bg-rose-800 active:bg-rose-900 disabled:bg-rose-300",
  link: "bg-transparent text-ocp-700 hover:text-ocp-900 underline-offset-4 hover:underline px-0 py-0 shadow-none",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[13px] gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-sm gap-2 rounded-xl",
  lg: "px-5 py-3 text-base gap-2 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  children,
  className = "",
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 ease-out
        active:scale-[0.98] active:translate-y-[1px]
        disabled:cursor-not-allowed disabled:active:scale-100 disabled:active:translate-y-0
        ${SIZE[size]} ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}
