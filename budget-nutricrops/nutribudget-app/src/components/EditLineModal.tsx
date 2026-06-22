import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Trash, FloppyDisk } from "@phosphor-icons/react";
import type { CostType, Currency, EngagementLine, PayStatus } from "../lib/model";
import { BUS, CATS, CURRENCIES, PAY_LABELS } from "../lib/model";
import { spring } from "../lib/motion";

function blank(): EngagementLine {
  return {
    id: "", bu: BUS[0], costType: "CAPEX", cat: CATS[0], project: "", vendor: "",
    sponsor: "", spoc: "", amount: 0, cur: "MAD", otp: "", po: "", pay: "draft",
    payNote: "", justif: "", progress: 0,
  };
}

interface Props {
  open: boolean;
  line: EngagementLine | null; // null = new
  onClose: () => void;
  onSave: (rec: EngagementLine) => void;
  onDelete: (id: string) => void;
}

const FOCUSABLE =
  'button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

export function EditLineModal({ open, line, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<EngagementLine>(blank);
  const [errors, setErrors] = useState<{ project?: string; progress?: string }>({});
  const boxRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const isEdit = Boolean(line?.id);

  useEffect(() => {
    if (open) {
      lastFocus.current = document.activeElement as HTMLElement;
      setForm(line ? { ...line } : blank());
      setErrors({});
      const t = setTimeout(() => firstFieldRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open, line]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !boxRef.current) return;
      const f = boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    onClose();
    lastFocus.current?.focus?.();
  }

  function set<K extends keyof EngagementLine>(k: K, v: EngagementLine[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    const errs: typeof errors = {};
    if (!form.project.trim()) errs.project = "Le projet est obligatoire.";
    if (form.progress < 0 || form.progress > 100)
      errs.progress = "L’avancement doit être entre 0 et 100.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const rec: EngagementLine = {
      ...form,
      id: form.id || "L-" + Date.now().toString(36),
      project: form.project.trim(),
      vendor: form.vendor.trim(),
      sponsor: form.sponsor.trim(),
      spoc: form.spoc.trim(),
      otp: form.otp.trim(),
      po: form.po.trim(),
      payNote: form.payNote.trim(),
      justif: form.justif.trim(),
      amount: Number(form.amount) || 0,
      progress: Math.max(0, Math.min(100, Math.round(Number(form.progress) || 0))),
    };
    onSave(rec);
    close();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="nb-no-print fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-zinc-950/50 px-4 py-8 sm:py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <motion.div
            ref={boxRef}
            role="dialog"
            aria-modal="true"
            aria-label={isEdit ? "Éditer la ligne d’engagement" : "Nouvelle ligne d’engagement"}
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={spring}
            className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-[0_30px_70px_-25px_rgba(20,59,24,0.35)]"
          >
            <div className="flex items-start gap-3 border-b border-zinc-100 px-6 py-4">
              <h2 className="flex-1 text-lg font-semibold tracking-tight text-zinc-900">
                {isEdit ? "Éditer la ligne" : "Nouvelle ligne d’engagement"}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer"
                className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 active:scale-95"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="max-h-[calc(100dvh-260px)] overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  full
                  label="Projet / volet *"
                  error={errors.project}
                >
                  <input
                    ref={firstFieldRef}
                    value={form.project}
                    onChange={(e) => set("project", e.target.value)}
                    placeholder="Ex. Salesforce — CRM"
                    aria-invalid={Boolean(errors.project)}
                    className={inputCls(Boolean(errors.project))}
                  />
                </Field>

                <Field label="Business Unit">
                  <select className={selCls} value={form.bu} onChange={(e) => set("bu", e.target.value)}>
                    {BUS.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Type">
                  <select
                    className={selCls}
                    value={form.costType}
                    onChange={(e) => set("costType", e.target.value as CostType)}
                  >
                    <option>CAPEX</option>
                    <option>OPEX</option>
                  </select>
                </Field>

                <Field label="Catégorie de coût" full>
                  <select className={selCls} value={form.cat} onChange={(e) => set("cat", e.target.value)}>
                    {CATS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>

                <Field label="Prestataire">
                  <input className={inputCls(false)} value={form.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="Ex. Teal" />
                </Field>
                <Field label="Montant">
                  <input
                    type="number"
                    inputMode="decimal"
                    className={`${inputCls(false)} font-mono`}
                    value={form.amount}
                    onChange={(e) => set("amount", Number(e.target.value))}
                  />
                </Field>

                <Field label="Devise">
                  <select className={selCls} value={form.cur} onChange={(e) => set("cur", e.target.value as Currency)}>
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Statut paiement">
                  <select className={selCls} value={form.pay} onChange={(e) => set("pay", e.target.value as PayStatus)}>
                    {(Object.keys(PAY_LABELS) as PayStatus[]).map((k) => (
                      <option key={k} value={k}>{PAY_LABELS[k]}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Sponsor">
                  <input className={inputCls(false)} value={form.sponsor} onChange={(e) => set("sponsor", e.target.value)} />
                </Field>
                <Field label="SPOC">
                  <input className={inputCls(false)} value={form.spoc} onChange={(e) => set("spoc", e.target.value)} />
                </Field>

                <Field label="OTP">
                  <input className={`${inputCls(false)} font-mono`} value={form.otp} onChange={(e) => set("otp", e.target.value)} />
                </Field>
                <Field label="PO / Bon de commande">
                  <input className={`${inputCls(false)} font-mono`} value={form.po} onChange={(e) => set("po", e.target.value)} />
                </Field>

                <Field label="Avancement %" error={errors.progress}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    aria-invalid={Boolean(errors.progress)}
                    className={`${inputCls(Boolean(errors.progress))} font-mono`}
                    value={form.progress}
                    onChange={(e) => set("progress", Number(e.target.value))}
                  />
                </Field>
                <Field label="Note de blocage / paiement">
                  <input className={inputCls(false)} value={form.payNote} onChange={(e) => set("payNote", e.target.value)} placeholder="Ex. Bloqué dans SAP" />
                </Field>

                <Field full label="Justification du besoin (défendable)">
                  <textarea
                    rows={3}
                    className={`${inputCls(false)} resize-y`}
                    value={form.justif}
                    onChange={(e) => set("justif", e.target.value)}
                    placeholder="Objectif opérationnel · livrable concret · impact business · alternative interne"
                  />
                </Field>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3.5">
              {isEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(form.id);
                    close();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 active:scale-[0.98]"
                >
                  <Trash size={16} /> Supprimer
                </button>
              )}
              <span className="flex-1" />
              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submit}
                className="inline-flex items-center gap-2 rounded-xl bg-ocp-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ocp-700 active:scale-[0.98]"
              >
                <FloppyDisk size={16} weight="fill" /> Enregistrer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const selCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-ocp-400";
function inputCls(err: boolean): string {
  return `w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 transition placeholder:text-zinc-400 focus:border-ocp-400 ${
    err ? "border-rose-300" : "border-zinc-200"
  }`;
}

function Field({
  label,
  children,
  full,
  error,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  error?: string;
}) {
  const id = "f-" + label.replace(/[^a-z]/gi, "").toLowerCase();
  return (
    <div className={`flex flex-col gap-2 ${full ? "sm:col-span-2" : ""}`}>
      <label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-[0.05em] text-zinc-500"
      >
        {label}
      </label>
      {/* clone-free: pass id via context of label htmlFor — wire by element id */}
      <div onFocusCapture={() => void 0}>
        {wireId(children, id)}
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

// Attach the generated id to the single control child so the label binds.
import { cloneElement, isValidElement } from "react";
function wireId(children: React.ReactNode, id: string): React.ReactNode {
  if (isValidElement(children)) {
    return cloneElement(children as React.ReactElement<{ id?: string }>, { id });
  }
  return children;
}
