"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp, LoaderCircle, Plus, Trash2 } from "lucide-react";
import {
  dateForTemplateWeekday, type EveningTemplate, type TemplateSlot,
} from "@/lib/programme-templates";

type Props = {
  rosterId: string;
  canEdit: boolean;
  startDate: string;
  sourceSlots: TemplateSlot[];
  competitionChoices?: Array<{ id: number; name: string }>;
  mode: "legacy" | "roster";
  onApplyLegacy?: (template: EveningTemplate, opponents: string[]) => { inserted: number; skipped: number };
  onRosterApplied?: () => Promise<void> | void;
};
const LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function EveningTemplates({ rosterId, canEdit, startDate, sourceSlots, competitionChoices = [], mode, onApplyLegacy, onRosterApplied }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<EveningTemplate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [newName, setNewName] = useState("");
  const [draftSlots, setDraftSlots] = useState<TemplateSlot[] | null>(null);
  const [targetDate, setTargetDate] = useState(startDate);
  const [opponents, setOpponents] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/programme/templates?rosterId=" + encodeURIComponent(rosterId), { cache: "no-store" });
      const data = await response.json() as { templates?: EveningTemplate[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Modèles indisponibles.");
      setTemplates(data.templates ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Modèles indisponibles.");
    } finally {
      setLoading(false);
    }
  }, [rosterId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setTargetDate(startDate);
  }, [startDate]);

  const selected = useMemo(() => templates.find(template => template.id === selectedId) ?? null, [selectedId, templates]);
  const effectiveDate = mode === "legacy" ? startDate : targetDate;
  const sortedSlots = useMemo(() => selected?.slots ?? [], [selected]);
  const slotsToSave = draftSlots ?? sourceSlots;
  const createDisabled = !canEdit || busy || slotsToSave.length === 0 || slotsToSave.length > 42 ||
    newName.trim().length < 2 || newName.trim().length > 80;

  async function createTemplate() {
    if (createDisabled) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/programme/templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterId, name: newName.trim(), slots: slotsToSave }),
      });
      const data = await response.json() as { template?: EveningTemplate; error?: string };
      if (!response.ok || !data.template) throw new Error(data.error ?? "Impossible de créer le modèle.");
      setTemplates(current => [...current, data.template!].sort((a, b) => a.name.localeCompare(b.name, "fr")));
      setSelectedId(data.template.id); setNewName(""); setDraftSlots(null);
      setOpponents({}); setNotice("Modèle enregistré. Tu peux désormais l'utiliser chaque semaine.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Création impossible.");
    } finally { setBusy(false); }
  }

  async function deleteTemplate() {
    if (!canEdit || !selected || busy || !window.confirm("Supprimer le modèle « " + selected.name + " » ? Les rencontres existantes seront conservées.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/programme/templates", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterId, templateId: selected.id }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Suppression impossible.");
      setTemplates(current => current.filter(template => template.id !== selected.id));
      setSelectedId(""); setOpponents({}); setNotice("Modèle supprimé. Les programmes existants sont intacts.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally { setBusy(false); }
  }

  async function applyTemplate() {
    if (!canEdit || !selected || busy || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(effectiveDate)) return;
    setBusy(true); setError(""); setNotice("");
    const names = sortedSlots.map((_, i) => (opponents[i] ?? "").trim());
    try {
      if (mode === "legacy") {
        if (!onApplyLegacy) throw new Error("Programme non disponible.");
        const result = onApplyLegacy(selected, names);
        setNotice(result.inserted + " rencontre(s) préparée(s), " + result.skipped +
          " horaire(s) déjà occupé(s). Complète les adversaires manquants puis clique sur Enregistrer.");
      } else {
        const response = await fetch("/api/programme/templates/apply", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rosterId, templateId: selected.id, startDate: targetDate, opponents: names }),
        });
        const data = await response.json() as { inserted?: number; skipped?: number; missingOpponents?: number; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Application du modèle impossible.");
        await onRosterApplied?.();
        setNotice((data.inserted ?? 0) + " rencontre(s) créée(s), " + (data.skipped ?? 0) +
          " créneau(x) déjà occupé(s)." + ((data.missingOpponents ?? 0) > 0 ? " Les adversaires « À définir » restent modifiables dans la liste." : ""));
      }
      setOpponents({});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Application impossible.");
    } finally { setBusy(false); }
  }

  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0A1625]">
    <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}
      className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-white/[0.04]">
      <span className="flex items-center gap-3">
        <CalendarClock size={21} className="text-[#FBD046]"/>
        <span>
          <strong className="block text-sm font-black text-white">Modèles de soirée</strong>
          <span className="block text-xs text-slate-400">Retrouve tes compétitions et horaires sans tout ressaisir.</span>
        </span>
      </span>
      {open ? <ChevronUp size={18} className="shrink-0 text-slate-300"/> : <ChevronDown size={18} className="shrink-0 text-slate-300"/>}
    </button>
    {open && <div className="space-y-4 border-t border-white/10 p-4">
      {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-200">{notice}</p>}
      {loading ? <p className="text-sm text-slate-400">Chargement des modèles…</p> : <>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-xs font-semibold text-slate-300">Choisir un modèle
            <select value={selectedId} onChange={event => { setSelectedId(event.target.value); setOpponents({}); setError(""); }}
              className="mt-1 block w-full rounded-xl border border-white/15 bg-[#06101B] px-3 py-2.5 text-sm text-white">
              <option value="">Sélectionner une soirée enregistrée…</option>
              {templates.map(template => <option key={template.id} value={template.id}>{template.name} · {template.slots.length} matchs</option>)}
            </select>
          </label>
          {selected && canEdit && <button type="button" disabled={busy} onClick={() => void deleteTemplate()}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-400/20 px-3 py-2.5 text-xs font-bold text-rose-200 disabled:opacity-50">
            <Trash2 size={14}/> Supprimer
          </button>}
        </div>
        {selected && <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-bold text-white">Préparer « {selected.name} »</p>
          {mode === "roster" && <label className="block text-xs font-semibold text-slate-300">Premier jour de la période (7 jours)
            <input type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/15 bg-[#06101B] p-2.5 text-sm text-white [color-scheme:dark]"/>
          </label>}
          <p className="text-xs text-slate-400">
            Créneaux de la période à partir du {effectiveDate}. Les adversaires sont facultatifs : tu pourras les compléter après.
          </p>
          {sortedSlots.map((slot, index) => <label key={index} className="grid gap-2 rounded-lg border border-white/10 p-3 sm:grid-cols-[1fr_1fr] sm:items-center">
            <span className="min-w-0 text-xs font-semibold text-slate-200">
              {LABELS[slot.weekday]} {dateForTemplateWeekday(effectiveDate, slot.weekday).split("-").reverse().join("/")} · {slot.time}
              <span className="mt-1 block truncate text-slate-400">{slot.competition}</span>
            </span>
            <input type="text" maxLength={120} value={opponents[index] ?? ""}
              onChange={event => setOpponents(current => ({ ...current, [index]: event.target.value }))}
              placeholder="Adversaire (à compléter)"
              disabled={!canEdit || busy}
              className="w-full rounded-lg border border-white/15 bg-[#06101B] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"/>
          </label>)}
          {canEdit && <button type="button" onClick={() => void applyTemplate()} disabled={busy || !effectiveDate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FBD046] px-4 py-3 text-sm font-black text-[#071321] disabled:opacity-50">
            {busy ? <LoaderCircle size={16} className="animate-spin"/> : <Plus size={16}/>}
            Utiliser ce modèle pour la période
          </button>}
          <p className="text-xs text-slate-400">Les rencontres déjà présentes sont conservées. Les scores et compositions ne sont jamais repris.</p>
        </div>}
        {canEdit && <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-bold text-white">Créer un modèle de soirée</p>
          <p className="mt-1 text-xs text-slate-400">
            {slotsToSave.length} créneau(x) prévu(s), sans adversaires, résultats ni compositions.
            {draftSlots === null ? " Les horaires de la période affichée sont proposés." : " Tu personnalises les créneaux du nouveau modèle."}
          </p>
          <div className="mt-3">
            <button type="button" onClick={() => setDraftSlots(current => current === null ? sourceSlots.map(slot => ({ ...slot })) : null)}
              className="text-xs font-bold text-[#FBD046] hover:underline">
              {draftSlots === null ? "Personnaliser ou créer les créneaux" : "Reprendre les matchs de la période"}
            </button>
            {draftSlots !== null && <div className="mt-3 space-y-2">
              {draftSlots.map((slot, index) => <div key={index} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[110px_100px_1fr_120px_auto]">
                <select aria-label={"Jour du créneau " + (index + 1)} value={slot.weekday}
                  onChange={event => setDraftSlots(current => current?.map((item, i) => i === index ? { ...item, weekday: Number(event.target.value) } : item) ?? [])}
                  className="min-w-0 rounded-lg border border-white/15 bg-[#06101B] px-2 py-2 text-xs text-white">
                  {LABELS.map((label, day) => <option key={day} value={day}>{label}</option>)}
                </select>
                <input type="time" aria-label={"Horaire du créneau " + (index + 1)} value={slot.time}
                  onChange={event => setDraftSlots(current => current?.map((item, i) => i === index ? { ...item, time: event.target.value } : item) ?? [])}
                  className="min-w-0 rounded-lg border border-white/15 bg-[#06101B] px-2 py-2 text-xs text-white [color-scheme:dark]"/>
                {mode === "legacy" && slot.type === "competition" ? <select
                  aria-label={"Compétition du créneau " + (index + 1)} value={slot.competitionId ?? ""}
                  onChange={event => {
                    const choice = competitionChoices.find(candidate => candidate.id === Number(event.target.value));
                    setDraftSlots(current => current?.map((item, i) => i === index ?
                      { ...item, competition: choice?.name ?? "", competitionId: choice?.id ?? null } : item) ?? []);
                  }}
                  className="min-w-0 rounded-lg border border-white/15 bg-[#06101B] px-2 py-2 text-xs text-white">
                  <option value="">Choisir une compétition</option>
                  {competitionChoices.map(choice => <option key={choice.id} value={choice.id}>{choice.name}</option>)}
                </select> : <input type="text" maxLength={90} aria-label={"Compétition du créneau " + (index + 1)}
                  value={slot.competition} placeholder="Compétition / événement"
                  onChange={event => setDraftSlots(current => current?.map((item, i) => i === index ? { ...item, competition: event.target.value, competitionId: null } : item) ?? [])}
                  className="min-w-0 rounded-lg border border-white/15 bg-[#06101B] px-3 py-2 text-xs text-white"/>}
                <select aria-label={"Type de rencontre " + (index + 1)} value={slot.type}
                  onChange={event => setDraftSlots(current => current?.map((item, i) => i === index ? { ...item, type: event.target.value as TemplateSlot["type"], competitionId: null } : item) ?? [])}
                  className="min-w-0 rounded-lg border border-white/15 bg-[#06101B] px-2 py-2 text-xs text-white">
                  <option value="competition">Compétition</option>
                  <option value="tournament">Tournoi</option>
                  {mode === "roster" && <option value="friendly">Amical</option>}
                </select>
                <button type="button" aria-label={"Retirer le créneau " + (index + 1)}
                  onClick={() => setDraftSlots(current => current?.filter((_, i) => i !== index) ?? [])}
                  className="rounded-lg border border-rose-400/20 p-2 text-rose-200"><Trash2 size={15}/></button>
              </div>)}
              <button type="button" disabled={draftSlots.length >= 42}
                onClick={() => setDraftSlots(current => [...(current ?? []), { weekday: 0, time: "21:20", competition: "", competitionId: null, type: "competition" }])}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
                <Plus size={14}/> Ajouter un créneau
              </button>
              <p className="text-xs text-slate-400">Jusqu'à 42 créneaux ; pas deux matchs au même horaire le même jour.</p>
            </div>}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input type="text" maxLength={80} value={newName} onChange={event => setNewName(event.target.value)}
              placeholder="Ex. Soirée championnat du lundi" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#06101B] px-3 py-2.5 text-sm text-white"/>
            <button type="button" disabled={createDisabled} onClick={() => void createTemplate()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">
              {busy ? <LoaderCircle size={14} className="animate-spin"/> : <Plus size={14}/>} Sauver le modèle
            </button>
          </div>
        </div>}
      </>}
    </div>}
  </section>;
}
