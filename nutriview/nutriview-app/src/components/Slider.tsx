import type { Dim, Level } from "../lib/model";
import { DIM_LABELS, LEVEL_LABELS } from "../lib/model";

interface Props {
  dim: Dim;
  value: Level;
  onChange: (v: Level) => void;
  onShowExamples?: () => void;
}

export function Slider({ dim, value, onChange, onShowExamples }: Props) {
  const id = `slider-${dim}`;
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="font-medium text-zinc-900">
          {dim} — {DIM_LABELS[dim]}
        </label>
        {onShowExamples && (
          <button
            type="button"
            onClick={onShowExamples}
            className="text-xs font-medium text-ocp-700 underline-offset-2 hover:underline"
          >
            Voir exemples Annexe II
          </button>
        )}
      </div>
      <input
        id={id}
        type="range"
        className="nv-slider"
        min={0}
        max={4}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as Level)}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={value}
        aria-valuetext={`${value} — ${LEVEL_LABELS[value]}`}
      />
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-zinc-400">
        {([0, 1, 2, 3, 4] as Level[]).map((lvl) => (
          <span
            key={lvl}
            className={
              lvl === value ? "font-semibold text-ocp-700" : undefined
            }
          >
            {lvl}
          </span>
        ))}
      </div>
      <p className="mt-2 text-sm text-zinc-700">
        Niveau <span className="font-semibold">{value}</span> —{" "}
        {LEVEL_LABELS[value]}
      </p>
    </div>
  );
}
