// =====================================================================
// Slider C/I/D — input range natif sous le capot, accessible clavier + SR.
// Tick visible 0-1-2-3-4, tick actif vert OCP, libellé textuel toujours
// doublé (« niveau 3 — Grave ») par accessibilité (cf. PRODUCT §54).
// =====================================================================

import { Info } from "@phosphor-icons/react";
import type { Dim, Level } from "../lib/model";
import { DIM_LABELS, LEVEL_LABELS } from "../lib/model";

interface Props {
  dim: Dim;
  value: Level;
  onChange: (v: Level) => void;
  onShowExamples?: () => void;
}

const LEVELS: Level[] = [0, 1, 2, 3, 4];

const DIM_TEXT: Record<Dim, string> = {
  C: "Risque si la donnée fuite.",
  I: "Risque si la donnée est altérée.",
  D: "Risque si la donnée est indisponible.",
};

export function Slider({ dim, value, onChange, onShowExamples }: Props) {
  const id = `slider-${dim}`;
  // Position en % de la valeur sur le segment (0 → 0%, 4 → 100%)
  const pctVal = (value / 4) * 100;

  return (
    <div className="flex flex-col gap-4 p-1">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold text-zinc-900">
              {dim}
            </span>
            <span className="text-sm font-medium text-zinc-700">
              {DIM_LABELS[dim]}
            </span>
          </label>
          {onShowExamples && (
            <button
              type="button"
              onClick={onShowExamples}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-ocp-700 transition-colors hover:text-ocp-900"
            >
              <Info size={14} weight="duotone" />
              Exemples Annexe&nbsp;II
            </button>
          )}
        </div>
        <p className="mt-1 text-[12.5px] text-zinc-500">{DIM_TEXT[dim]}</p>
      </div>

      <div className="relative pt-2">
        {/* Track + remplissage vert OCP jusqu'à la valeur */}
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-ocp-600 transition-[width] duration-200 ease-out"
            style={{ width: `${pctVal}%` }}
          />
        </div>
        <input
          id={id}
          type="range"
          className="nv-slider relative z-10"
          min={0}
          max={4}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) as Level)}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={value}
          aria-valuetext={`Niveau ${value} sur 4 — ${LEVEL_LABELS[value]}`}
        />

        {/* Ticks 0-4 sous le track */}
        <div className="mt-3 flex justify-between text-[10.5px] tabular-nums">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => onChange(lvl)}
              className={`flex h-6 w-6 items-center justify-center rounded-full font-semibold transition-all duration-150 ${
                lvl === value
                  ? "bg-ocp-700 text-white shadow-[0_2px_8px_-2px_rgba(20,59,24,0.5)] scale-110"
                  : lvl < value
                  ? "text-ocp-700 hover:bg-ocp-50"
                  : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              }`}
              aria-label={`Niveau ${lvl} — ${LEVEL_LABELS[lvl]}`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline gap-2 border-t border-zinc-100 pt-3">
        <span className="text-[11px] uppercase tracking-[0.06em] text-zinc-500">
          Niveau retenu
        </span>
        <span className="font-display text-xl font-semibold text-zinc-900 tabular-nums">
          {value}
        </span>
        <span className="text-sm text-zinc-600">— {LEVEL_LABELS[value]}</span>
      </div>
    </div>
  );
}
