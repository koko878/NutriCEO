// =====================================================================
// Card — usage parcimonieux (taste-skill v1 : pas par défaut).
// Préférer divide-y / border-t / espacement quand l'élévation n'apporte
// pas d'info. Ici on garde une variante pour les moments "moment" et un
// SectionLabel discret (Inter, casse normale).
// =====================================================================

import type { ReactNode } from "react";

type Tone = "neutral" | "amber" | "ocp";

export function Card({
  children,
  className = "",
  tone = "neutral",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
  as?: "div" | "section" | "article";
}) {
  const TONE: Record<Tone, string> = {
    neutral:
      "bg-white ring-1 ring-zinc-200 shadow-[0_20px_40px_-22px_rgba(20,59,24,0.10)]",
    amber:
      "bg-amber-vd-50/70 ring-1 ring-amber-vd-200 shadow-[0_24px_48px_-24px_rgba(101,74,24,0.18)]",
    ocp: "bg-ocp-50/60 ring-1 ring-ocp-200 shadow-[0_20px_40px_-22px_rgba(20,59,24,0.18)]",
  };
  return (
    <Tag
      className={`rounded-3xl p-8 ${TONE[tone]} ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Étiquette de section discrète — Inter, casse normale. Pas d'uppercase
 * tracked. À utiliser parcimonieusement. */
export function SectionLabel({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
      {icon}
      <span>{children}</span>
    </div>
  );
}

/** Hero asymétrique pour les têtes de vue — titre Cormorant gauche,
 * actions droite (responsive : empilement < 768px).
 *
 * Deux densités :
 *  - `page`    : surface d'accueil (liste Projets). Titre large, respire.
 *  - `section` : écrans en-tâche (catalogue, classification, validation…).
 *                Titre compact, l'outil disparaît dans la tâche (registre
 *                produit) — pas de hero marketing pleine hauteur.
 *
 * On n'utilise JAMAIS de 2ᵉ ligne grise (text-zinc-400) : contraste WCAG
 * insuffisant ET tell visuel répété. Le message secondaire passe par `lead`. */
export function PageHero({
  eyebrow,
  title,
  lead,
  right,
  variant = "section",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  right?: ReactNode;
  variant?: "page" | "section";
}) {
  const isPage = variant === "page";
  return (
    <header
      className={`flex flex-col gap-5 md:flex-row md:items-end md:justify-between ${
        isPage ? "mb-9" : "mb-7"
      }`}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="mb-2.5 text-xs font-medium text-zinc-500">
            {eyebrow}
          </div>
        )}
        <h1
          className={`text-balance leading-[1.05] text-zinc-900 ${
            isPage
              ? "text-[38px] md:text-[46px]"
              : "text-[26px] md:text-[30px]"
          }`}
        >
          {title}
        </h1>
        {lead && (
          <p
            className={`max-w-[68ch] leading-relaxed text-zinc-600 ${
              isPage ? "mt-4 text-[15px]" : "mt-2.5 text-[13.5px]"
            }`}
          >
            {lead}
          </p>
        )}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}

// Alias historique — plusieurs vues importent `PageHeader`.
export const PageHeader = PageHero;
