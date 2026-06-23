// =====================================================================
// NutriView — <Verdict> · le moment hero du produit.
// 4 combinaisons : density (inline | synthese) × outcome (eligible | sensible).
// Source d'autorité absolue : nutriview/shape/verdict-component.md
// Palette : vert OCP positif · ambre profond (--color-amber-vd-*) sensible.
// PAS rouge alarmiste — registre administratif facilitateur.
// =====================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  MapPinLine,
  Info,
  CaretRight,
  Buildings,
  Printer,
  PaperPlaneTilt,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import type { Classe } from "../lib/model";

// ---------------------------------------------------------------------------
// Type unique pour le verdict cloud — miroir du retour engine.verdictCloud().
// ---------------------------------------------------------------------------
export type VerdictCloudT =
  | {
      eligible: false;
      reason: "données sensibles loi 05-20 — résidence MA obligatoire";
    }
  | { eligible: true; conditions: string[] };

// ---------------------------------------------------------------------------
// 4 hébergeurs MA hardcodés v1 (cf. shape brief §7 — à valider RSSI,
// vrai catalogue admin en phase 2).
// ---------------------------------------------------------------------------
export const HEBERGEURS_MA = [
  {
    name: "Datacenter Nutricrops Khouribga",
    note: "Infrastructure on-prem groupe",
  },
  {
    name: "Datacenter OCP Casablanca",
    note: "Infrastructure on-prem groupe",
  },
  { name: "OVHcloud Maroc", note: "Région Casablanca · cloud public souverain" },
  { name: "Inwi Cloud", note: "Datacenter Tier III+, certifié résident MA" },
] as const;

const CITATION =
  "loi 05-20 sur la cybersécurité · décret 2-21-406 · Guide DGSSI v1.0 (juillet 2025)";

// =========================================================================
// Props
// =========================================================================

type CommonProps = {
  classe: Classe;
  sensible: boolean;
  verdictCloud: VerdictCloudT;
};

type InlineProps = CommonProps & {
  density: "inline";
};

type SyntheseProps = CommonProps & {
  density: "synthese";
  /** nombre de données sensibles dans le projet (utilisé par le sous-titre) */
  sensibleCount?: number;
  /** nombre total de données du projet */
  totalCount?: number;
  /** mesures Annexe I à afficher dans la variante eligible */
  measures?: string[];
};

type Props = InlineProps | SyntheseProps;

// =========================================================================
// Composant principal — dispatch par densité.
// =========================================================================

export function Verdict(props: Props) {
  if (props.density === "inline") return <VerdictInline {...props} />;
  return <VerdictSynthese {...props} />;
}

// =========================================================================
// INLINE
// =========================================================================

function VerdictInline(props: InlineProps) {
  const { sensible } = props;

  if (sensible) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-amber-vd-300 bg-amber-vd-50 p-4"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-xl bg-amber-vd-100 text-amber-vd-800"
          >
            <MapPinLine size={20} weight="duotone" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg leading-tight text-amber-vd-900">
              Donnée sensible — résidence Maroc
            </div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-amber-vd-800/80">
              loi 05-20 · classe {props.classe} ou supérieure · cloud étranger
              non éligible.
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // eligible inline
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 22 }}
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-2xl border border-ocp-200 bg-ocp-50/70 px-4 py-3"
    >
      <span
        aria-hidden="true"
        className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-white text-ocp-700 ring-1 ring-ocp-200"
      >
        <ShieldCheck size={18} weight="duotone" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium leading-tight text-ocp-900">
          Cloud éligible
        </div>
        {props.verdictCloud.eligible && props.verdictCloud.conditions.length > 0 && (
          <div className="mt-0.5 text-[12px] leading-snug text-ocp-800/85">
            {props.verdictCloud.conditions.length} mesure
            {props.verdictCloud.conditions.length > 1 ? "s" : ""} Annexe I à
            respecter
          </div>
        )}
      </div>
    </motion.div>
  );
}

// =========================================================================
// SYNTHESE
// =========================================================================

function VerdictSynthese(props: SyntheseProps) {
  if (props.sensible) return <VerdictSyntheseSensible {...props} />;
  return <VerdictSyntheseEligible {...props} />;
}

// ---------- synthese · sensible ----------
function VerdictSyntheseSensible(props: SyntheseProps) {
  const [showHebergeurs, setShowHebergeurs] = useState(false);
  const n = props.sensibleCount ?? 1;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 110, damping: 22, mass: 0.6 }}
      role="region"
      aria-label="Verdict cloud du projet — résidence Maroc obligatoire"
      className="relative overflow-hidden rounded-3xl border border-amber-vd-200 bg-amber-vd-50 px-8 py-9 shadow-[0_30px_60px_-40px_rgba(101,74,24,0.45)] md:px-12 md:py-12"
    >
      <div className="mb-7 flex items-start gap-4">
        <span
          aria-hidden="true"
          className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-amber-vd-100 text-amber-vd-800"
        >
          <MapPinLine size={26} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[34px] leading-none text-amber-vd-900 md:text-[38px]">
            Résidence Maroc obligatoire
          </h2>
          <p className="mt-2 max-w-[58ch] text-[15px] leading-relaxed text-amber-vd-900/85">
            Ce projet contient <span className="font-medium">{n} donnée
            {n > 1 ? "s" : ""} sensible{n > 1 ? "s" : ""}</span> au sens de la
            loi 05-20. Aucun hébergement hors du territoire national n'est
            éligible.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
        {/* Pourquoi */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-vd-700">
            Pourquoi
          </div>
          <blockquote className="mt-3 border-l-0 border-y border-amber-vd-200/70 py-3 font-display text-[18px] leading-snug text-amber-vd-900">
            « Les données dont la divulgation, l'altération ou l'indisponibilité
            mettrait en péril le maintien des capacités de sécurité et de
            défense de l'État doivent demeurer sur le territoire national. »
          </blockquote>
          <ul className="mt-4 space-y-1.5 text-[13.5px] text-amber-vd-900/85">
            <li>· Au moins une donnée a un impact confidentialité ≥ grave (C ≥ 3).</li>
            <li>· La classe globale atteint au moins II (grave).</li>
            <li>· La règle de résidence prime sur toute autre mesure de protection.</li>
          </ul>
        </div>

        {/* Que faire */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-vd-700">
            Que faire maintenant
          </div>
          <ul className="mt-3 space-y-3">
            <li>
              <button
                type="button"
                onClick={() => setShowHebergeurs((s) => !s)}
                className="group flex w-full items-center justify-between rounded-xl border border-amber-vd-200 bg-white px-4 py-3 text-left transition active:scale-[0.99]"
              >
                <span className="flex items-center gap-3">
                  <Buildings size={20} weight="duotone" className="text-amber-vd-700" />
                  <span className="text-[14px] font-medium text-amber-vd-900">
                    Voir les hébergeurs MA conformes
                  </span>
                </span>
                <motion.span
                  animate={{ rotate: showHebergeurs ? 90 : 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 22 }}
                  className="text-amber-vd-700"
                >
                  <CaretRight size={16} weight="bold" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {showHebergeurs && (
                  <motion.ul
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 26 }}
                    className="mt-2 divide-y divide-amber-vd-100 overflow-hidden rounded-xl border border-amber-vd-100 bg-white/70"
                  >
                    {HEBERGEURS_MA.map((h) => (
                      <li key={h.name} className="px-4 py-3">
                        <div className="text-[13.5px] font-medium text-amber-vd-900">
                          {h.name}
                        </div>
                        <div className="text-[12px] text-amber-vd-800/70">
                          {h.note}
                        </div>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
            <li>
              <button
                type="button"
                disabled
                title="Phase 5 — workflow dérogation"
                className="flex w-full items-center gap-3 rounded-xl border border-amber-vd-200/70 bg-white/60 px-4 py-3 text-left text-amber-vd-900/60"
              >
                <Info size={18} weight="duotone" className="text-amber-vd-700/70" />
                <span className="text-[14px]">Demander une dérogation RSSI</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                disabled
                title="Phase 5 — workflow ajustement"
                className="flex w-full items-center gap-3 rounded-xl border border-amber-vd-200/70 bg-white/60 px-4 py-3 text-left text-amber-vd-900/60"
              >
                <Info size={18} weight="duotone" className="text-amber-vd-700/70" />
                <span className="text-[14px]">Ajuster le périmètre data</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <VerdictFooter sensible />
    </motion.section>
  );
}

// ---------- synthese · eligible ----------
function VerdictSyntheseEligible(props: SyntheseProps) {
  const measures = props.measures ?? [];
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 110, damping: 22, mass: 0.6 }}
      role="region"
      aria-label="Verdict cloud du projet — éligible"
      className="rounded-3xl border border-ocp-200 bg-white px-8 py-9 shadow-[0_25px_50px_-35px_rgba(20,59,24,0.3)] md:px-12 md:py-12"
    >
      <div className="mb-7 flex items-start gap-4">
        <span
          aria-hidden="true"
          className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-ocp-50 text-ocp-700 ring-1 ring-ocp-200"
        >
          <ShieldCheck size={26} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[32px] leading-none text-zinc-900 md:text-[36px]">
            Projet éligible au cloud
          </h2>
          <p className="mt-2 max-w-[58ch] text-[15px] leading-relaxed text-zinc-700">
            Aucune donnée sensible identifiée sur le périmètre classé.
            L'hébergement hors territoire national est autorisé sous réserve
            des mesures listées ci-dessous.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Mesures Annexe I — graduées
          </div>
          {measures.length === 0 ? (
            <p className="mt-3 text-[13.5px] text-zinc-500">
              Aucune mesure additionnelle requise.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {measures.map((m) => (
                <li
                  key={m}
                  className="flex items-start gap-3 py-2.5 text-[13.5px] text-zinc-800"
                >
                  <span className="mt-2 inline-block h-1.5 w-1.5 flex-none rounded-full bg-ocp-500" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Récapitulatif
          </div>
          <dl className="mt-3 space-y-3 text-[13.5px] text-zinc-700">
            <div className="flex items-baseline justify-between gap-4">
              <dt>Données classées</dt>
              <dd className="font-medium tabular-nums text-zinc-900">
                {props.totalCount ?? "—"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt>Données sensibles</dt>
              <dd className="font-medium tabular-nums text-zinc-900">0</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt>Classe maximale atteinte</dt>
              <dd className="font-medium tabular-nums text-zinc-900">
                {props.classe}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <VerdictFooter />
    </motion.section>
  );
}

// ---------- footer commun ----------
function VerdictFooter({ sensible = false }: { sensible?: boolean }) {
  return (
    <footer
      className={`mt-9 flex flex-col gap-4 border-t pt-5 md:flex-row md:items-center md:justify-between ${
        sensible
          ? "border-amber-vd-200/70"
          : "border-zinc-100"
      } nv-no-print:print:hidden`}
    >
      <p className={`text-[11.5px] leading-snug ${sensible ? "text-amber-vd-800/70" : "text-zinc-500"}`}>
        {CITATION}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-medium transition active:scale-[0.98] ${
            sensible
              ? "border-amber-vd-300 bg-white text-amber-vd-900 hover:bg-amber-vd-50"
              : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
          }`}
        >
          <Printer size={16} weight="duotone" />
          Exporter le dossier PDF
        </button>
        <button
          type="button"
          disabled
          title="Phase 5 — workflow signature"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-100/60 px-3.5 py-2 text-[13px] font-medium text-zinc-400"
        >
          <PaperPlaneTilt size={16} weight="duotone" />
          Inviter le propriétaire à signer
        </button>
        <a
          href="https://www.dgssi.gov.ma"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[12.5px] font-medium ${
            sensible ? "text-amber-vd-800 hover:text-amber-vd-900" : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Comprendre le référentiel DGSSI
          <ArrowSquareOut size={13} weight="bold" />
        </a>
      </div>
    </footer>
  );
}
