"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, History, Plus, RotateCcw } from "lucide-react";
import type { TacticalObjective } from "@/lib/debrief-studio";
import { OBJECTIVE_LABELS } from "@/components/debrief/TacticalObjectives";

export type HistoricalObjective = {
  date: string;
  chapterTitle: string;
  id: string;
  trackingId: string;
  title: string;
  status: TacticalObjective["status"];
};

const LABEL_CLASS: Record<TacticalObjective["status"], string> = {
  todo: "border-slate-500/25 bg-slate-500/10 text-slate-300",
  working: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  done: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
};

function dateShort(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}

export function ObjectiveContinuity({
  history, objectives, allCurrentTrackingIds, canEdit, onResume, loading, error,
}: {
  history: HistoricalObjective[];
  objectives: TacticalObjective[];
  allCurrentTrackingIds: Set<string>;
  canEdit: boolean;
  onResume: (objective: HistoricalObjective) => void;
  loading: boolean;
  error: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const latest = useMemo(() => {
    const seen = new Set<string>();
    return history.filter((entry) => {
      if (seen.has(entry.trackingId)) return false;
      seen.add(entry.trackingId);
      return true;
    });
  }, [history]);
  const displayed = showAll ? latest : latest.slice(0, 8);

  return (
    <section className="rounded-2xl border border-yellow-400/20 bg-[#091626] p-5" aria-label="Suivi des objectifs entre les soirées">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-black text-yellow-300"><History size={18}/> Suivi d&apos;une soirée à l&apos;autre</h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Reprends les objectifs déjà abordés, puis mets à jour leur statut aujourd&apos;hui.
            Chaque soirée conserve son historique.
          </p>
        </div>
        <span className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-400">{latest.length} axe(s) déjà suivis</span>
      </div>
      {loading && <p className="text-xs text-slate-400">Lecture des débriefs précédents…</p>}
      {error && <p role="alert" className="mb-3 text-xs text-amber-300">{error}</p>}

      {objectives.map((current) => {
        const trackingId = current.trackingId ?? current.id;
        const entries = history.filter((entry) => entry.trackingId === trackingId).slice(0, 5).reverse();
        if (!entries.length) return null;
        return <div key={current.id} className="mb-3 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.035] p-3">
          <p className="mb-2 text-xs font-bold text-white">{current.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            {entries.map((entry) => <span key={entry.date + entry.id}
              title={entry.chapterTitle}
              className={`rounded-lg border px-2 py-1 text-[10px] font-black ${LABEL_CLASS[entry.status]}`}>
              {dateShort(entry.date)} · {OBJECTIVE_LABELS[entry.status]}
            </span>)}
            <ArrowRight size={15} className="text-yellow-300"/>
            <span className={`rounded-lg border px-2 py-1 text-[10px] font-black ${LABEL_CLASS[current.status]}`}>
              Aujourd&apos;hui · {OBJECTIVE_LABELS[current.status]}
            </span>
          </div>
        </div>;
      })}

      {!loading && !latest.length && !error && <p className="text-xs text-slate-500">Aucun objectif antérieur pour le moment. Tes prochaines soirées pourront reprendre ceux d&apos;aujourd&apos;hui.</p>}
      {!!latest.length && (
        <div className="space-y-2">
          <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Reprendre un objectif précédent</h4>
          {displayed.map((entry) => {
            const alreadyPresent = allCurrentTrackingIds.has(entry.trackingId);
            const disabled = !canEdit || alreadyPresent || objectives.length >= 8;
            return <div key={entry.trackingId} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              {entry.status === "done" ? <CheckCircle2 size={16} className="shrink-0 text-emerald-300"/> : <Clock3 size={16} className="shrink-0 text-cyan-300"/>}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-100">{entry.title}</p>
                <p className="mt-1 text-[11px] text-slate-500">Dernier suivi : {dateShort(entry.date)} · {OBJECTIVE_LABELS[entry.status]}</p>
              </div>
              {canEdit && <button type="button" disabled={disabled} onClick={() => onResume(entry)}
                className="flex items-center gap-1.5 rounded-lg border border-yellow-400/25 bg-yellow-400/[0.06] px-3 py-2 text-[11px] font-black text-yellow-200 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-yellow-400/15">
                {alreadyPresent ? <RotateCcw size={13}/> : <Plus size={13}/>}
                {alreadyPresent ? "Déjà repris" : "Reprendre"}
              </button>}
            </div>;
          })}
          {latest.length > 8 && <button type="button" onClick={() => setShowAll((v) => !v)}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-cyan-300">
            {showAll ? "Afficher moins" : `Afficher les ${latest.length} objectifs`}
          </button>}
          <p className="text-[11px] leading-5 text-slate-500">
            Le lien de suivi est explicite : seuls les objectifs repris avec ce bouton partagent un historique.
            Un libellé identique créé manuellement n&apos;est pas automatiquement assimilé au même objectif.
          </p>
        </div>
      )}
    </section>
  );
}
