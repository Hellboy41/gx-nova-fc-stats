"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Users } from "lucide-react";
import { auditReadiness, type ReadinessMatch } from "@/lib/programme-readiness";

type Props = {
  matches: ReadinessMatch[];
  canEdit: boolean;
  pendingChanges?: boolean;
  onSelect: (match: ReadinessMatch, action: "edit" | "coach") => void;
};

export function ProgrammeReadiness({ matches, canEdit, pendingChanges = false, onSelect }: Props) {
  const audit = useMemo(() => auditReadiness(matches), [matches]);
  const [open, setOpen] = useState(false);
  const pendingCount = audit.coaching.length;
  const blockedCount = audit.blocking.length;
  const needsAttention = pendingChanges || blockedCount > 0;

  return <section className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1625]">
    <button type="button" onClick={() => setOpen(current => !current)} aria-expanded={open}
      className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition hover:bg-white/[0.03]">
      <span className="flex min-w-0 items-center gap-3">
        {needsAttention ? <AlertTriangle className="shrink-0 text-amber-300" size={21}/> :
          <ClipboardCheck className="shrink-0 text-emerald-300" size={21}/>}
        <span className="min-w-0">
          <strong className="block text-sm font-black text-white">Contrôle avant partage</strong>
          <span className="block text-xs text-slate-400">
            {audit.total === 0 ? "Aucun match à contrôler sur cette période." :
              blockedCount > 0 ? blockedCount + " match(s) à compléter sur " + audit.total :
              pendingChanges ? "Modifications à enregistrer avant le partage." :
              "Les " + audit.total + " rencontre(s) ont les informations essentielles."}
          </span>
        </span>
      </span>
      <span className="flex items-center gap-2">
        {audit.total > 0 && <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold text-slate-200">
          {audit.ready}/{audit.total} prêts
        </span>}
        {pendingCount > 0 && <span className="hidden rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-xs font-bold text-cyan-200 sm:inline-flex">
          {pendingCount} prépa. à suivre
        </span>}
        {open ? <ChevronUp className="text-slate-300" size={17}/> : <ChevronDown className="text-slate-300" size={17}/>}
      </span>
    </button>

    {open && <div className="space-y-4 border-t border-white/10 p-4">
      {pendingChanges && <p role="status" className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs font-semibold text-amber-200">
        <AlertTriangle size={15}/> Enregistre les modifications du programme avant de publier sur Discord.
      </p>}
      {audit.total > 0 && blockedCount === 0 && <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
        <CheckCircle2 size={17}/> Aucun adversaire, horaire ou compétition essentiel ne manque.
      </p>}
      {blockedCount > 0 && <div>
        <h3 className="mb-2 text-sm font-black text-white">À corriger avant le partage ({blockedCount})</h3>
        <div className="space-y-2">
          {audit.blocking.slice(0, 10).map(({ match, problems }) => <div key={match.id + match.date}
            className="flex flex-col gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-100">{match.date.split("-").reverse().join("/")} · {match.time || "--:--"} · {match.opponent || "Adversaire inconnu"}</p>
              <p className="mt-1 text-xs text-amber-200">{problems.join(" · ")}</p>
            </div>
            <button type="button" onClick={() => onSelect(match, "edit")}
              className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-xs font-black text-white hover:bg-white/10">
              {canEdit ? "Corriger" : "Consulter"}
            </button>
          </div>)}
          {blockedCount > 10 && <p className="text-xs text-slate-400">Et {blockedCount - 10} autre(s) rencontre(s) à vérifier dans le calendrier.</p>}
        </div>
      </div>}
      {pendingCount > 0 && <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-white">
          <Users size={16} className="text-cyan-300"/> Préparation des joueurs (facultative pour partager)
        </h3>
        <div className="space-y-2">
          {audit.coaching.slice(0, 6).map(({ match, coaching }) => <div key={match.id + match.date}
            className="flex flex-col gap-2 rounded-xl border border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-100">{match.date.split("-").reverse().join("/")} · {match.time || "--:--"} · {match.opponent || "Adversaire à définir"}</p>
              <p className="mt-1 text-xs text-slate-400">{coaching.join(" · ")}</p>
            </div>
            <button type="button" onClick={() => onSelect(match, "coach")}
              className="shrink-0 rounded-lg border border-cyan-400/20 px-3 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-400/10">
              {canEdit ? "Préparer" : "Voir"}
            </button>
          </div>)}
          {pendingCount > 6 && <p className="text-xs text-slate-400">Et {pendingCount - 6} autre(s) préparation(s) dans le programme.</p>}
        </div>
      </div>}
      {!blockedCount && !pendingCount && !pendingChanges && <p className="text-xs text-slate-400">
        Le programme ne présente pas d'élément manquant détecté. Tu peux ouvrir « Partager sur Discord ».
      </p>}
      {audit.total === 0 && <p className="text-xs text-slate-400">
        Ajoute des rencontres ou applique un modèle de soirée pour préparer ton calendrier.
      </p>}
    </div>}
  </section>;
}
