"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ClipboardList, Plus, Trash2, Wrench } from "lucide-react";
import type { TacticalObjective } from "@/lib/debrief-studio";

export const OBJECTIVE_LABELS: Record<TacticalObjective["status"], string> = {
  todo: "À travailler",
  working: "En cours",
  done: "Validé",
};
const OPTIONS: TacticalObjective["status"][] = ["todo", "working", "done"];

export function TacticalObjectives({ objectives, onChange, canEdit }: {
  objectives: TacticalObjective[];
  onChange: (next: TacticalObjective[]) => void;
  canEdit: boolean;
}) {
  const [draft, setDraft] = useState("");
  const canAdd = canEdit && objectives.length < 8;

  function add() {
    const title = draft.trim().slice(0, 180);
    if (!canAdd || !title) return;
    onChange([...objectives, { id: crypto.randomUUID(), title, status: "todo" }]);
    setDraft("");
  }

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-[#091626] p-5" aria-label="Objectifs tactiques du chapitre">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-black text-yellow-300"><ClipboardList size={18}/> Objectifs tactiques</h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">Transforme chaque observation en consigne à travailler. Le statut est conservé dans ce débrief et apparaît en présentation live et dans l'export Discord.</p>
        </div>
        <span className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-slate-400">{objectives.filter((x) => x.status === "done").length}/{objectives.length} validés</span>
      </div>
      {objectives.length ? <div className="space-y-2">
        {objectives.map((objective) =>
          <div key={objective.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#030914]/70 p-3">
            <span className={objective.status === "done" ? "text-emerald-300" : objective.status === "working" ? "text-cyan-300" : "text-slate-400"}>
              {objective.status === "done" ? <CheckCircle2 size={19}/> : objective.status === "working" ? <Wrench size={19}/> : <Circle size={19}/>}
            </span>
            <p className="min-w-0 flex-1 text-sm font-semibold text-slate-200">{objective.title}</p>
            <select value={objective.status} aria-label={"Statut de " + objective.title} disabled={!canEdit}
              onChange={(e) => onChange(objectives.map((x) => x.id === objective.id ? { ...x, status: e.target.value as TacticalObjective["status"] } : x))}
              className="rounded-lg border border-white/10 bg-[#0d2130] px-2 py-2 text-xs font-bold text-white disabled:opacity-60">
              {OPTIONS.map((value) => <option value={value} key={value}>{OBJECTIVE_LABELS[value]}</option>)}
            </select>
            {canEdit && <button type="button" aria-label={"Supprimer " + objective.title} title="Supprimer l'objectif"
              onClick={() => { if (window.confirm("Supprimer cet objectif ?")) onChange(objectives.filter((x) => x.id !== objective.id)); }}
              className="rounded-lg p-2 text-rose-300 hover:bg-rose-400/10"><Trash2 size={15}/></button>}
          </div>
        )}
      </div> : <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Aucun objectif pour ce chapitre. Ajoute une consigne concrète, par exemple : « Refermer l'axe au repli ».</p>}
      {canEdit && <div className="mt-4 flex flex-wrap gap-2">
        <input type="text" value={draft} disabled={!canAdd} onChange={(e) => setDraft(e.target.value)} maxLength={180}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          aria-label="Nouvel objectif tactique" placeholder="Nouvel objectif (8 maximum par chapitre)…"
          className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-[#030914] px-3 py-3 text-sm text-white outline-none focus:border-cyan-400/50 disabled:opacity-40"/>
        <button type="button" onClick={add} disabled={!canAdd || !draft.trim()}
          className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-xs font-black text-[#06111f] disabled:opacity-40"><Plus size={16}/> Ajouter</button>
      </div>}
    </section>
  );
}

export function TacticalObjectivesLive({ objectives }: { objectives: TacticalObjective[] }) {
  if (!objectives.length) return null;
  return (
    <div className="rounded-2xl border border-yellow-400/20 bg-[#0c1d2b] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-[0.13em] text-yellow-300">Objectifs et axes de progression</h3>
        <p className="text-xs font-bold text-slate-400">{objectives.filter((x) => x.status === "done").length}/{objectives.length} validés</p>
      </div>
      <div className="grid gap-2">
        {objectives.map((objective) => <div key={objective.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          {objective.status === "done" ? <CheckCircle2 className="shrink-0 text-emerald-300" size={19}/> : objective.status === "working" ? <Wrench className="shrink-0 text-cyan-300" size={19}/> : <Circle className="shrink-0 text-slate-400" size={19}/>}
          <span className="flex-1 text-sm font-bold text-slate-200">{objective.title}</span>
          <span className="shrink-0 text-xs font-semibold text-slate-400">{OBJECTIVE_LABELS[objective.status]}</span>
        </div>)}
      </div>
    </div>
  );
}
