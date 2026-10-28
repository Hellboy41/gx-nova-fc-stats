"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, LockKeyhole, RefreshCw, Save, Shield } from "lucide-react";

type Scope = "structure" | "rosters";
type Roster = { id: string; name: string; gameEdition: string };
type Member = { userId: string; name: string; role: "admin" | "staff" | "viewer"; isActive: boolean; accessScope: Scope; allowedRosterIds: string[] };
type Draft = { accessScope: Scope; allowedRosterIds: string[] };

export function StaffAccessPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/staff/access", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Accès indisponibles.");
      const items: Member[] = data.staff ?? [];
      setMembers(items);
      setRosters(data.rosters ?? []);
      setDrafts(Object.fromEntries(items.map(m => [m.userId, {
        accessScope: m.accessScope, allowedRosterIds: m.allowedRosterIds ?? [],
      }])));
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  function update(id: string, patch: Partial<Draft>) {
    setDrafts(old => ({ ...old, [id]: { ...old[id], ...patch } }));
    setMessage("");
  }
  async function save(id: string) {
    const draft = drafts[id];
    if (!draft || (draft.accessScope === "rosters" && draft.allowedRosterIds.length === 0)) {
      setError("Sélectionne au moins un roster."); return;
    }
    setSaving(id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/staff/access", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, accessScope: draft.accessScope,
          allowedRosterIds: draft.accessScope === "structure" ? [] : draft.allowedRosterIds }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "Enregistrement impossible.");
      setMessage("Périmètre d'accès enregistré.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setSaving(null); }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#FBD046]/25 bg-[#101010] 2xl:col-span-12">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div><h3 className="flex items-center gap-2 font-black text-[#FBD046]"><Shield size={18}/> PÉRIMÈTRES D’ACCÈS</h3>
          <p className="mt-1 text-xs text-slate-400">Structure ATYOM entière ou rosters sélectionnés. Le rôle Admin / Staff / Viewer reste indépendant.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"><RefreshCw size={14}/> Actualiser</button>
      </div>
      {error && <p role="alert" className="m-4 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
      {message && <p role="status" className="m-4 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={16}/>{message}</p>}
      {loading ? <p className="p-5 text-sm text-slate-500">Chargement des accès…</p> :
      <div className="divide-y divide-white/10">
        {members.map(member => {
          const draft = drafts[member.userId] ?? { accessScope: member.accessScope, allowedRosterIds: member.allowedRosterIds };
          const isAdmin = member.role === "admin";
          return <div key={member.userId} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(160px,1fr)_minmax(230px,1.4fr)_auto] lg:items-center">
            <div className="min-w-0"><p className="truncate text-sm font-bold text-white">{member.name}</p>
              <p className="text-xs text-slate-400">{member.role.toUpperCase()} · {member.isActive ? "Actif" : "Bloqué"}</p></div>
            <div className="space-y-2">
              <select aria-label={`Périmètre de ${member.name}`} value={draft.accessScope} disabled={isAdmin || !member.isActive}
                onChange={e => update(member.userId, { accessScope: e.target.value as Scope,
                  allowedRosterIds: e.target.value === "structure" ? [] : draft.allowedRosterIds })}
                className="w-full rounded-lg border border-white/15 bg-[#080808] p-2 text-xs text-white disabled:opacity-50">
                <option value="structure">Toute la structure ATYOM</option>
                <option value="rosters">Rosters sélectionnés</option>
              </select>
              {draft.accessScope === "rosters" && <div className="flex flex-wrap gap-3">
                {rosters.map(roster => <label key={roster.id} className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" disabled={isAdmin || !member.isActive} checked={draft.allowedRosterIds.includes(roster.id)}
                    onChange={e => update(member.userId, { allowedRosterIds: e.target.checked
                      ? [...draft.allowedRosterIds, roster.id] : draft.allowedRosterIds.filter(id => id !== roster.id) })}
                    className="accent-[#FBD046]"/>
                  {roster.name} · {roster.gameEdition}
                </label>)}
              </div>}
              {isAdmin && <p className="flex items-center gap-1 text-[11px] text-[#FBD046]"><LockKeyhole size={12}/> Accès global obligatoire pour les administrateurs</p>}
            </div>
            <button type="button" onClick={() => void save(member.userId)}
              disabled={isAdmin || !member.isActive || saving !== null ||
                (draft.accessScope === "rosters" && draft.allowedRosterIds.length === 0)}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#FBD046]/35 bg-[#FBD046]/10 px-4 py-2 text-xs font-black text-[#FBD046] disabled:opacity-40">
              {saving === member.userId ? <RefreshCw size={15} className="animate-spin"/> : <Save size={15}/>} Enregistrer
            </button>
          </div>;
        })}
      </div>}
      <p className="border-t border-white/10 px-5 py-3 text-xs text-slate-500">
        Phase pilote : GX NØVA est le seul roster connecté. Les nouveaux rosters n’apparaîtront ici qu’une fois leur isolation activée.
      </p>
    </section>
  );
}
