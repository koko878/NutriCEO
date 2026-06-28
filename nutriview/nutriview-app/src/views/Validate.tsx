// =====================================================================
// Validate — vue propriétaire pour un projet `in_review`.
// SPEC §5 (signature.contentHash) + Q5 (signature simple horodatée).
//
// Composition :
//   - Hero : titre, infos chef de projet + date d'envoi.
//   - Banner verdict global (Verdict density="synthese") — récap décision.
//   - Tableau divide-y : 1 ligne par donnée, classe + verdict, bouton "Valider ✓".
//   - Footer collant : barre de progression validation + CTA "Tout valider et signer".
//   - Quand tout validé : modale signature (preview hash, bouton "Signer").
//   - Quand signé : bandeau succès avec hash hex + horodatage.
// =====================================================================

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUUpLeft,
  Check,
  ShieldCheck,
  MapPinLine,
  PenNib,
  X,
  Warning,
  Tray,
  CircleNotch,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/Button";
import { PageHero } from "../components/Card";
import { ClasseBadge, ProjectStatusBadge } from "../components/Badge";
import { Verdict } from "../components/Verdict";
import type { Classe, Classification, Perimeter, Project } from "../lib/model";
import { graduatedMeasures } from "../lib/engine";
import {
  computePerimeterHash,
  computeProjectHash,
  formatHashShort,
} from "../lib/signature";
import { notifySigned } from "../lib/validation";
import {
  effectivePerimeters,
  perimeterItemsValidated,
  perimetersForUser,
} from "../lib/perimeters";
import { useGov } from "../lib/useGov";

interface Props {
  project: Project;
  currentUser: string;
  onChange: (p: Project) => void;
  onBackToInbox: () => void;
}

export function Validate({
  project,
  currentUser,
  onChange,
  onBackToInbox,
}: Props) {
  const { can } = useGov();
  const [signOpen, setSignOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [previewHash, setPreviewHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const all = useMemo(
    () => Object.values(project.classifications) as Classification[],
    [project.classifications]
  );
  const sensibleCount = all.filter((c) => c.sensible).length;
  const projectSensible = sensibleCount > 0;
  const projectMaxLevel = all.reduce<number>((acc, c) => {
    const lc = c.cells.find((x) => x.dim === "C")?.level ?? 0;
    const li = c.cells.find((x) => x.dim === "I")?.level ?? 0;
    const ld = c.cells.find((x) => x.dim === "D")?.level ?? 0;
    return Math.max(acc, lc, li, ld);
  }, 0);
  const projectClasse: Classe = (["V", "IV", "III", "II", "I"] as Classe[])[
    projectMaxLevel
  ];
  const projectVerdict = projectSensible
    ? {
        eligible: false as const,
        reason:
          "données sensibles loi 05-20 — résidence MA obligatoire" as const,
      }
    : {
        eligible: true as const,
        conditions: graduatedMeasures(projectClasse),
      };

  const isSigned = project.status === "signed";
  const allPerimeters = useMemo(() => effectivePerimeters(project), [project]);

  // Périmètres dont l'utilisateur est propriétaire. Un admin (can manage) sans
  // périmètre propre peut agir sur tous les périmètres encore en attente.
  const myPerimeters = useMemo(() => {
    const mine = perimetersForUser(project, currentUser);
    if (mine.length > 0) return mine;
    return can("manage") ? allPerimeters : [];
  }, [project, currentUser, can, allPerimeters]);

  const myPending = myPerimeters.filter((p) => p.status !== "signed");
  // Données qui relèvent de mon périmètre encore à signer.
  const myScopeIds = useMemo(
    () => new Set(myPending.flatMap((p) => p.itemIds)),
    [myPending]
  );
  const myScopeItems = project.items.filter((it) => myScopeIds.has(it.id));
  // Map donnée → périmètre (pour afficher le propriétaire de chaque ligne).
  const itemPerimeter = useMemo(() => {
    const m = new Map<string, Perimeter>();
    for (const p of allPerimeters) for (const id of p.itemIds) m.set(id, p);
    return m;
  }, [allPerimeters]);
  const myValidatedN = myScopeItems.filter((it) => it.validation).length;
  const myTotalN = myScopeItems.length;
  const myItemsAllValidated =
    myPending.length > 0 && myPending.every((p) => perimeterItemsValidated(project, p));
  const canSign = myItemsAllValidated && project.status === "in_review";
  const iOwnNothing = myPerimeters.length === 0;
  const myPartDone = myPerimeters.length > 0 && myPending.length === 0;

  // Pré-calcul du hash de prévisualisation de MON périmètre (avant signature).
  useEffect(() => {
    let cancelled = false;
    const ids = [...myScopeIds];
    const p = ids.length
      ? computePerimeterHash(project, ids)
      : computeProjectHash(project);
    p.then((h) => {
      if (!cancelled) setPreviewHash(h);
    }).catch(() => {
      if (!cancelled) setPreviewHash(null);
    });
    return () => {
      cancelled = true;
    };
  }, [project, myScopeIds]);

  function toggleItemValidation(itemId: string) {
    if (isSigned || !myScopeIds.has(itemId)) return;
    const it = project.items.find((x) => x.id === itemId);
    if (!it) return;
    const next: Project = {
      ...project,
      items: project.items.map((x) =>
        x.id === itemId
          ? {
              ...x,
              validation: x.validation
                ? undefined
                : {
                    validatedAt: new Date().toISOString(),
                    validatedBy: currentUser || "anonyme",
                  },
            }
          : x
      ),
    };
    onChange(next);
  }

  function validateAll() {
    if (isSigned) return;
    const now = new Date().toISOString();
    const next: Project = {
      ...project,
      items: project.items.map((it) =>
        myScopeIds.has(it.id) && !it.validation
          ? {
              ...it,
              validation: {
                validatedAt: now,
                validatedBy: currentUser || "anonyme",
              },
            }
          : it
      ),
    };
    onChange(next);
  }

  async function signNow() {
    setSigning(true);
    setErrorMsg(null);
    try {
      const signedAt = new Date().toISOString();
      const signer = currentUser || "anonyme";
      // Signe chacun de MES périmètres en attente (hash de leur sous-ensemble).
      const signedKeys = new Set<string>();
      const nextPerimeters: Perimeter[] = await Promise.all(
        allPerimeters.map(async (p) => {
          const isMine = myPending.some(
            (mp) => mp.ownerLogin === p.ownerLogin && mp.ownerName === p.ownerName
          );
          if (!isMine || p.status === "signed") return p;
          const hash = await computePerimeterHash(project, p.itemIds);
          signedKeys.add(p.ownerLogin + "|" + p.ownerName);
          return {
            ...p,
            status: "signed" as const,
            signedAt,
            signedBy: signer,
            contentHash: hash,
          };
        })
      );

      // Données de mes périmètres → statut signed.
      const justSignedItemIds = new Set(
        nextPerimeters
          .filter((p) => signedKeys.has(p.ownerLogin + "|" + p.ownerName))
          .flatMap((p) => p.itemIds)
      );

      const everyoneSigned = nextPerimeters.every((p) => p.status === "signed");
      let next: Project = {
        ...project,
        perimeters: nextPerimeters,
        items: project.items.map((it) =>
          justSignedItemIds.has(it.id)
            ? { ...it, status: "signed" as const }
            : it
        ),
      };

      // Le projet n'est clos (signed) que quand TOUS les périmètres le sont.
      if (everyoneSigned) {
        const hash = await computeProjectHash(next);
        next = {
          ...next,
          status: "signed",
          signature: { signedBy: signer, signedAt, contentHash: hash },
        };
      }

      onChange(next);
      setSignOpen(false);
      if (everyoneSigned) void notifySigned(next); // best-effort, no-op standalone
    } catch (e) {
      setErrorMsg(
        e instanceof Error
          ? e.message
          : "Impossible de calculer la signature. Réessayez."
      );
    } finally {
      setSigning(false);
    }
  }

  const submittedAt = project.submission?.submittedAt
    ? new Date(project.submission.submittedAt).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div>
      <PageHero
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Tray size={13} weight="duotone" />
            Validation propriétaire ·{" "}
            {project.bu ?? "Nutricrops"}
          </span>
        }
        title={project.title || "(projet sans titre)"}
        lead={
          isSigned
            ? "Vous avez signé cette classification. Le hash SHA-256 atteste que la décision n'a pas été modifiée depuis."
            : `Le chef de projet ${project.owner || "—"} a finalisé la classification CID le ${submittedAt}. Validez ligne par ligne — vous pouvez encore renvoyer en brouillon si vous n'êtes pas d'accord — puis signez d'un trait.`
        }
        right={
          <div className="flex items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowUUpLeft size={14} weight="bold" />}
              onClick={onBackToInbox}
            >
              Retour à l'inbox
            </Button>
          </div>
        }
      />

      {/* Verdict projet — récap décision avant signature */}
      <section className="mb-8">
        <Verdict
          density="synthese"
          classe={projectClasse}
          sensible={projectSensible}
          verdictCloud={projectVerdict}
          sensibleCount={sensibleCount}
          totalCount={project.items.length}
          measures={
            projectVerdict.eligible
              ? projectVerdict.conditions
              : []
          }
        />
      </section>

      {/* Vue d'ensemble des périmètres (qui valide quoi) */}
      <PerimeterOverview
        perimeters={allPerimeters}
        currentUser={currentUser}
      />

      {/* Tableau données + checkbox validation (scopé à mon périmètre) */}
      <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white">
        <header className="border-b border-zinc-100 px-7 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11.5px] font-medium text-zinc-500">
                {iOwnNothing
                  ? "Validation ligne par ligne (lecture seule)"
                  : "Validation de mon périmètre, ligne par ligne"}
              </div>
              <h2 className="mt-0.5 font-display text-2xl font-semibold text-zinc-900">
                {iOwnNothing ? (
                  <>
                    {project.items.length} donnée
                    {project.items.length > 1 ? "s" : ""} au total
                  </>
                ) : (
                  <>
                    <span className="tabular-nums">{myTotalN}</span> donnée
                    {myTotalN > 1 ? "s" : ""} ·{" "}
                    <span className="tabular-nums text-ocp-700">
                      {myValidatedN}
                    </span>{" "}
                    validée{myValidatedN > 1 ? "s" : ""}
                  </>
                )}
              </h2>
            </div>
            {!isSigned && !iOwnNothing && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Check size={14} weight="bold" />}
                onClick={validateAll}
                disabled={myTotalN === 0 || myValidatedN === myTotalN}
              >
                Tout valider (mon périmètre)
              </Button>
            )}
          </div>
        </header>
        <ul className="divide-y divide-zinc-100">
          {project.items.map((it) => {
            const cls = project.classifications[it.id];
            const validated = Boolean(it.validation);
            const inScope = myScopeIds.has(it.id);
            const per = itemPerimeter.get(it.id);
            const outOfScope = !inScope && !isSigned;
            return (
              <li
                key={it.id}
                className={`flex flex-col gap-2.5 px-7 py-4 transition-colors sm:flex-row sm:items-start sm:justify-between sm:gap-6 ${
                  validated ? "bg-ocp-50/30" : "hover:bg-zinc-50/60"
                } ${outOfScope ? "opacity-70" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[17px] font-semibold leading-tight text-zinc-900">
                    {it.name || (
                      <span className="italic text-zinc-400">(sans nom)</span>
                    )}
                  </div>
                  {it.description && it.description !== it.name && (
                    <p className="mt-0.5 max-w-[65ch] text-[12.5px] text-zinc-500">
                      {it.description}
                    </p>
                  )}
                  {outOfScope && per && (
                    <p className="mt-1 text-[11.5px] text-zinc-500">
                      Périmètre de{" "}
                      <span className="font-medium text-zinc-700">
                        {per.ownerName}
                      </span>
                      {per.status === "signed" ? " · signé" : " · en attente"}
                    </p>
                  )}
                  {validated && it.validation && (
                    <p className="mt-1 text-[11.5px] text-ocp-700">
                      <Check size={11} weight="bold" className="-mt-0.5 mr-0.5 inline-block" />
                      Validée le{" "}
                      {new Date(it.validation.validatedAt).toLocaleString(
                        "fr-FR",
                        { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
                      )}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {cls ? (
                    <>
                      <DimChip label="C" value={cls.cells.find((c) => c.dim === "C")?.level ?? 0} />
                      <DimChip label="I" value={cls.cells.find((c) => c.dim === "I")?.level ?? 0} />
                      <DimChip label="D" value={cls.cells.find((c) => c.dim === "D")?.level ?? 0} />
                      <ClasseBadge classe={cls.classe} size="sm" />
                      {cls.sensible ? (
                        <MapPinLine
                          size={16}
                          weight="duotone"
                          className="text-amber-vd-700"
                          aria-label="Donnée sensible"
                        />
                      ) : (
                        <ShieldCheck
                          size={16}
                          weight="duotone"
                          className="text-ocp-600"
                          aria-label="Cloud éligible"
                        />
                      )}
                    </>
                  ) : (
                    <span className="text-[11.5px] italic text-zinc-400">
                      non classée
                    </span>
                  )}
                  {!isSigned && inScope && (
                    <button
                      type="button"
                      onClick={() => toggleItemValidation(it.id)}
                      aria-pressed={validated}
                      aria-label={
                        validated
                          ? `Annuler la validation de ${it.name}`
                          : `Valider ${it.name}`
                      }
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-95 ${
                        validated
                          ? "bg-ocp-700 text-white shadow-[0_4px_12px_-4px_rgba(20,59,24,0.45)]"
                          : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                      }`}
                    >
                      <Check size={16} weight="bold" />
                    </button>
                  )}
                  {!isSigned && !inScope && validated && (
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ocp-50 text-ocp-600"
                      aria-label="Validée par son propriétaire"
                    >
                      <Check size={16} weight="bold" />
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Signature : bandeau résultat / attente des autres / CTA / lecture seule */}
      {isSigned && project.signature ? (
        <SignedBanner project={project} />
      ) : myPartDone ? (
        <WaitingOthersBanner perimeters={allPerimeters} />
      ) : iOwnNothing ? (
        <ReadOnlyNotice />
      ) : (
        <SignActionBar
          canSign={canSign}
          validatedN={myValidatedN}
          totalN={myTotalN}
          previewHash={previewHash}
          onOpenSign={() => setSignOpen(true)}
        />
      )}

      <AnimatePresence>
        {signOpen && (
          <SignDialog
            user={currentUser}
            projectTitle={project.title || "(projet sans titre)"}
            previewHash={previewHash}
            sensible={projectSensible}
            classe={projectClasse}
            signing={signing}
            errorMsg={errorMsg}
            onClose={() => {
              if (!signing) setSignOpen(false);
            }}
            onConfirm={signNow}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------

function DimChip({ label, value }: { label: string; value: number }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums ${
        value >= 3
          ? "bg-amber-vd-50 text-amber-vd-800 ring-1 ring-inset ring-amber-vd-200"
          : "bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-200"
      }`}
    >
      <span className="font-display font-semibold">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function SignActionBar({
  canSign,
  validatedN,
  totalN,
  previewHash,
  onOpenSign,
}: {
  canSign: boolean;
  validatedN: number;
  totalN: number;
  previewHash: string | null;
  onOpenSign: () => void;
}) {
  const pct = totalN > 0 ? Math.round((validatedN / totalN) * 100) : 0;
  return (
    <section className="sticky bottom-4 z-10 rounded-3xl border border-zinc-200 bg-white/95 px-6 py-5 shadow-[0_30px_60px_-30px_rgba(20,59,24,0.25)] backdrop-blur-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-[12px] text-zinc-500">
            <span>
              Mon périmètre ·{" "}
              <span className="tabular-nums font-medium text-zinc-700">
                {validatedN}/{totalN}
              </span>{" "}
              validée(s)
            </span>
            <span className="tabular-nums font-medium text-zinc-700">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="h-full bg-ocp-600"
            />
          </div>
          {previewHash && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Empreinte qui sera signée ·{" "}
              <code className="rounded bg-zinc-50 px-1.5 py-0.5 font-mono text-[10.5px] text-zinc-700 ring-1 ring-zinc-200">
                {formatHashShort(previewHash)}
              </code>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            icon={<PenNib size={16} weight="duotone" />}
            onClick={onOpenSign}
            disabled={!canSign}
            title={
              canSign
                ? "Mon périmètre est validé — apposer ma signature"
                : `Validez les ${totalN - validatedN} donnée(s) restante(s) de mon périmètre avant de signer`
            }
          >
            Signer mon périmètre
          </Button>
        </div>
      </div>
    </section>
  );
}

// Vue d'ensemble des périmètres : qui valide quoi, et où ça en est.
function PerimeterOverview({
  perimeters,
  currentUser,
}: {
  perimeters: Perimeter[];
  currentUser: string;
}) {
  if (perimeters.length <= 1) return null; // mono-propriétaire : inutile
  const u = (currentUser || "").trim().toLowerCase();
  const signedN = perimeters.filter((p) => p.status === "signed").length;
  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white">
      <header className="flex items-center justify-between border-b border-zinc-100 px-7 py-4">
        <div>
          <div className="text-[11.5px] font-medium text-zinc-500">
            Validation multi-propriétaires
          </div>
          <h2 className="mt-0.5 font-display text-xl font-semibold text-zinc-900">
            {perimeters.length} périmètres ·{" "}
            <span className="tabular-nums text-ocp-700">{signedN}</span> signé
            {signedN > 1 ? "s" : ""}
          </h2>
        </div>
      </header>
      <ul className="divide-y divide-zinc-100">
        {perimeters.map((p, i) => {
          const mine =
            u &&
            (u === p.ownerLogin.trim().toLowerCase() ||
              u === p.ownerName.trim().toLowerCase());
          return (
            <li
              key={p.ownerLogin + i}
              className="flex items-center justify-between gap-4 px-7 py-3.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[14px] font-medium text-zinc-900">
                  {p.ownerName}
                  {mine && (
                    <span className="rounded bg-ocp-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ocp-700">
                      vous
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-zinc-500">
                  {p.domainNames.length
                    ? p.domainNames.join(" · ")
                    : "Données transverses"}{" "}
                  · <span className="tabular-nums">{p.itemIds.length}</span>{" "}
                  donnée{p.itemIds.length > 1 ? "s" : ""}
                </div>
              </div>
              {p.status === "signed" ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-ocp-50 px-2 py-1 text-[11px] font-medium text-ocp-800 ring-1 ring-inset ring-ocp-200">
                  <ShieldCheck size={12} weight="duotone" />
                  Signé
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-vd-50 px-2 py-1 text-[11px] font-medium text-amber-vd-800 ring-1 ring-inset ring-amber-vd-200">
                  <Tray size={12} weight="duotone" />
                  En attente
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Mon périmètre est signé, mais d'autres restent à valider.
function WaitingOthersBanner({ perimeters }: { perimeters: Perimeter[] }) {
  const remaining = perimeters.filter((p) => p.status !== "signed");
  return (
    <section className="rounded-3xl border border-ocp-200 bg-ocp-50/40 px-7 py-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ocp-100 text-ocp-700">
          <ShieldCheck size={22} weight="duotone" />
        </div>
        <div>
          <h3 className="font-display text-[22px] font-semibold leading-tight text-ocp-900">
            Votre périmètre est signé.
          </h3>
          <p className="mt-0.5 text-[13px] text-zinc-700">
            En attente de{" "}
            <span className="font-medium">
              {remaining.map((p) => p.ownerName).join(", ") || "—"}
            </span>
            . Le projet sera clos quand tous les périmètres auront été signés.
          </p>
        </div>
      </div>
    </section>
  );
}

// L'utilisateur n'est propriétaire d'aucun périmètre sur ce projet.
function ReadOnlyNotice() {
  return (
    <section className="rounded-3xl border border-dashed border-zinc-200 bg-white px-7 py-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
          <Tray size={22} weight="duotone" />
        </div>
        <div>
          <h3 className="font-display text-[20px] font-semibold leading-tight text-zinc-900">
            Lecture seule.
          </h3>
          <p className="mt-0.5 text-[13px] text-zinc-600">
            Vous n'êtes propriétaire d'aucun périmètre de ce projet. Seuls les
            data domain owners concernés valident et signent leurs données.
          </p>
        </div>
      </div>
    </section>
  );
}

function SignedBanner({ project }: { project: Project }) {
  if (!project.signature) return null;
  const at = new Date(project.signature.signedAt).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <section className="rounded-3xl border border-ocp-200 bg-ocp-50/40 px-7 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ocp-100 text-ocp-700">
            <ShieldCheck size={22} weight="duotone" />
          </div>
          <div>
            <h3 className="font-display text-[22px] font-semibold leading-tight text-ocp-900">
              Classification signée.
            </h3>
            <p className="mt-0.5 text-[13px] text-zinc-700">
              Par{" "}
              <span className="font-medium">
                {project.signature.signedBy}
              </span>{" "}
              · le {at}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
            Hash SHA-256 du contenu
          </span>
          <code className="mt-1 break-all rounded-lg bg-white px-3 py-1.5 font-mono text-[12px] text-zinc-800 ring-1 ring-zinc-200 md:text-right">
            {project.signature.contentHash}
          </code>
        </div>
      </div>
    </section>
  );
}

function SignDialog({
  user,
  projectTitle,
  previewHash,
  sensible,
  classe,
  signing,
  errorMsg,
  onClose,
  onConfirm,
}: {
  user: string;
  projectTitle: string;
  previewHash: string | null;
  sensible: boolean;
  classe: Classe;
  signing: boolean;
  errorMsg: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[3px]"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Apposer ma signature"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_40px_80px_-20px_rgba(20,59,24,0.35)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ocp-50 text-ocp-700">
              <PenNib size={20} weight="duotone" />
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
                Signature DGSSI
              </div>
              <h3 className="mt-0.5 font-display text-[22px] font-semibold text-zinc-900">
                Apposer ma signature
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={signing}
            aria-label="Fermer"
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 disabled:opacity-40"
          >
            <X weight="bold" size={18} />
          </button>
        </header>
        <div className="px-6 py-5 text-[13.5px] leading-relaxed text-zinc-700">
          <p>
            Vous êtes sur le point de signer <strong>votre périmètre</strong> de
            la classification DGSSI du projet <strong>{projectTitle}</strong>.
            Cette action :
          </p>
          <ul className="mt-3 space-y-2 text-[13px] text-zinc-600">
            <li className="flex items-start gap-2">
              <Check size={13} weight="bold" className="mt-1 text-ocp-600" />
              calcule un hash <code className="rounded bg-zinc-50 px-1 font-mono text-[11.5px]">SHA-256</code> des données de votre périmètre,
            </li>
            <li className="flex items-start gap-2">
              <Check size={13} weight="bold" className="mt-1 text-ocp-600" />
              horodate la signature à l'instant T,
            </li>
            <li className="flex items-start gap-2">
              <Check size={13} weight="bold" className="mt-1 text-ocp-600" />
              fige votre périmètre — le projet sera clos en statut <strong>Signé</strong> quand tous les périmètres auront été signés.
            </li>
          </ul>
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
            <div className="flex items-center justify-between gap-3 text-[11.5px] text-zinc-500">
              <span>Signataire</span>
              <span className="tabular-nums font-medium text-zinc-700">
                {user || "anonyme"}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-[11.5px] text-zinc-500">
              <span>Classe max projet</span>
              <ClasseBadge classe={classe} size="sm" />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-[11.5px] text-zinc-500">
              <span>Verdict cloud</span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium ring-1 ring-inset ${
                  sensible
                    ? "bg-amber-vd-50 text-amber-vd-800 ring-amber-vd-200"
                    : "bg-ocp-50 text-ocp-800 ring-ocp-200"
                }`}
              >
                {sensible ? (
                  <>
                    <MapPinLine size={11} weight="duotone" />
                    Résidence Maroc
                  </>
                ) : (
                  <>
                    <ShieldCheck size={11} weight="duotone" />
                    Cloud éligible
                  </>
                )}
              </span>
            </div>
            {previewHash && (
              <div className="mt-3 border-t border-zinc-200 pt-3">
                <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-zinc-500">
                  Empreinte qui sera signée
                </div>
                <code className="mt-1 block break-all font-mono text-[11.5px] text-zinc-800">
                  {previewHash}
                </code>
              </div>
            )}
          </div>
          {errorMsg && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-vd-50 p-3 text-[12.5px] text-amber-vd-900 ring-1 ring-amber-vd-200">
              <Warning size={14} weight="duotone" className="mt-0.5 text-amber-vd-700" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/70 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={signing}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={
              signing ? (
                <CircleNotch size={14} weight="bold" className="animate-spin" />
              ) : (
                <PenNib size={14} weight="duotone" />
              )
            }
            onClick={onConfirm}
            disabled={signing}
          >
            {signing ? "Signature en cours…" : "Apposer ma signature"}
          </Button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
