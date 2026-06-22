import { Link as LinkIcon, DownloadSimple, Printer, Copy } from "@phosphor-icons/react";
import type { Currency, EngagementLine, Rates } from "../lib/model";
import { pctComplete, pctJustif } from "../lib/aggregate";
import { exportCSV, exportTaskForce } from "../lib/export";
import { PageHeader, SectionLabel } from "../components/ui";
import { Bar } from "../components/Bar";

interface Props {
  data: EngagementLine[];
  rates: Rates;
  cur: Currency;
  onToast: (m: string) => void;
}

export function Share({ data, rates, onToast }: Props) {
  const url = location.origin + location.pathname + "?view=shared";
  const complete = pctComplete(data);
  const justif = pctJustif(data);

  function copy() {
    navigator.clipboard?.writeText(url).then(
      () => onToast("Lien copié"),
      () => onToast("Copie impossible")
    );
  }

  return (
    <div>
      <PageHeader
        title="Partage & export"
        lead="Diffuse une vue lecture seule, ou exporte vers Excel / les templates Task Force."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_40px_-30px_rgba(20,59,24,0.22)]">
          <div className="mb-3 flex items-center gap-2">
            <LinkIcon size={18} weight="duotone" className="text-ocp-600" />
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Lien lecture seule</h2>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-zinc-500">
            Génère un lien en lecture seule (pas d’édition possible). Idéal pour partager aux comités /
            Task Forces sans risque de modification.
          </p>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <input
              readOnly
              aria-label="Lien de partage en lecture seule"
              value={url}
              className="w-full bg-transparent font-mono text-xs text-zinc-600 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-xl bg-ocp-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ocp-700 active:scale-[0.98]"
          >
            <Copy size={16} /> Copier le lien
          </button>
          <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-3 text-xs leading-relaxed text-zinc-500">
            MVP local : le lien ouvre la même donnée (cache local du poste). Cible : lien serveur partagé
            (REST + MySQL, pattern NutriPlan) derrière SSO Entra ID.
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_40px_-30px_rgba(20,59,24,0.22)]">
          <div className="mb-3 flex items-center gap-2">
            <DownloadSimple size={18} weight="duotone" className="text-ocp-600" />
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Exports</h2>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-zinc-500">
            Une saisie → N formats. Fini la resaisie sous deadline d’une heure.
          </p>
          <div className="flex flex-col gap-2">
            <ExportBtn label="Export Excel / CSV (toutes lignes)" onClick={() => onToast("Export " + exportCSV(data, rates))} />
            <ExportBtn label="Template Task Force CAPEX" onClick={() => onToast("Export " + exportTaskForce("CAPEX", data, rates))} />
            <ExportBtn label="Template Task Force OPEX" onClick={() => onToast("Export " + exportTaskForce("OPEX", data, rates))} />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.99]"
            >
              <Printer size={16} /> Imprimer / PDF (vue courante)
            </button>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_40px_-30px_rgba(20,59,24,0.22)]">
        <SectionLabel>État de la donnée</SectionLabel>
        <div className="flex flex-col gap-2">
          <Bar label="Lignes complètes (OTP + PO)" pct={complete} value={`${complete}%`} shimmer={complete < 100} />
          <Bar label="Avec justification" pct={justif} value={`${justif}%`} shimmer={justif < 100} />
        </div>
        <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-3 text-xs leading-relaxed text-zinc-500">
          Avant d’envoyer à une Task Force : viser 100% sur ces deux barres. Une ligne sans justification ou
          sans OTP est éjectée de la commission (cf. relances « impact d’arrêt non renseigné »).
        </p>
      </section>
    </div>
  );
}

function ExportBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.99]"
    >
      <DownloadSimple size={16} className="text-zinc-400" /> {label}
    </button>
  );
}
