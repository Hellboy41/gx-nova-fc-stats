"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, RotateCcw, Save, X } from "lucide-react";
import {
  type DebriefPerformanceRow, type DebriefPerformancesResponse,
  type PerformanceField, type PerformanceOverrides,
  PERFORMANCE_FIELDS, PERFORMANCE_LABELS,
  sumPlayerPerformances, withOverrides,
} from "@/lib/debrief-performances";

const FIELDS = PERFORMANCE_FIELDS;

export function PlayerStatsEditor({
  data, canEdit, onSaved,
}: {
  data: DebriefPerformancesResponse;
  canEdit: boolean;
  onSaved: (next: DebriefPerformancesResponse) => void;
}) {
  const [matchId, setMatchId] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setMatchId(null);
    setSelectedPlayer("");
    setDraft({});
    setError("");
    setNotice("");
  }, [data.date]);

  const selectedMatch = data.matches.find((match) => match.id === matchId) ?? data.matches[0];
  const selectedRow = selectedMatch?.players.find((player) => player.playerName === selectedPlayer) ?? null;
  const totals = useMemo(() => sumPlayerPerformances(data.matches), [data.matches]);
  const modified = data.matches.reduce((count, match) =>
    count + match.players.filter((row) => Object.keys(row.overrides).length > 0).length, 0);

  function choosePlayer(row: DebriefPerformanceRow) {
    setSelectedPlayer(row.playerName);
    setDraft(Object.fromEntries(FIELDS.map((field) => [field,
      row.overrides[field] === undefined ? "" : String(row.overrides[field]),
    ])));
    setError("");
    setNotice("");
  }

  async function saveCorrection(reset = false) {
    if (!canEdit || !selectedMatch || !selectedRow || saving) return;
    const overrides: PerformanceOverrides = {};
    if (!reset) {
      for (const field of FIELDS) {
        const value = draft[field]?.trim() ?? "";
        if (!value) continue; // Champ vide : valeur EA
        const parsed = Number(value);
        const valid = Number.isFinite(parsed) && parsed >= 0 &&
          (field === "rating"
            ? parsed <= 10 && Math.abs(Math.round(parsed * 100) - parsed * 100) < 0.000001
            : Number.isInteger(parsed) && parsed <= 10000);
        if (!valid) {
          setError(`La valeur de « ${PERFORMANCE_LABELS[field]} » est incorrecte.`);
          return;
        }
        // Une valeur identique à EA ne nécessite pas de correction.
        if (parsed !== selectedRow.original[field]) overrides[field] = parsed;
      }
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/debrief-studio/performances", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: data.date, matchId: selectedMatch.id,
          playerName: selectedRow.playerName, overrides,
        }),
      });
      const result = await response.json() as {
        success?: boolean; error?: string; details?: string;
        overrides?: PerformanceOverrides; updatedAt?: string | null;
      };
      if (!response.ok) throw new Error(result.details ? `${result.error} ${result.details}` : result.error ?? "Erreur de sauvegarde.");

      const effectiveOverrides = result.overrides ?? overrides;
      onSaved({
        ...data,
        matches: data.matches.map((match) => match.id !== selectedMatch.id ? match : {
          ...match, players: match.players.map((row) => row.playerName !== selectedRow.playerName ? row : {
            ...row,
            overrides: effectiveOverrides,
            corrected: withOverrides(row.original, effectiveOverrides),
            updatedAt: result.updatedAt ?? null,
          }),
        }),
      });
      setDraft(Object.fromEntries(FIELDS.map((field) => [
        field, effectiveOverrides[field] === undefined ? "" : String(effectiveOverrides[field]),
      ])));
      setNotice(reset ? "Valeurs EA restaurées pour ce joueur." : "Corrections enregistrées et intégrées au débrief.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="performances" className="mt-8 scroll-mt-4 rounded-3xl border border-yellow-400/20 bg-[#091626] p-5 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">GX NOVA • STATISTIQUES INDIVIDUELLES</p>
          <h2 className="mt-2 text-2xl font-black">Performances EA & corrections staff</h2>
          <p className="mt-2 max-w-4xl text-sm text-gray-400">
            Statistiques importées automatiquement par match. Les champs vides reprennent les données EA.
            Les corrections sont sauvegardées séparément et restent présentes après une synchronisation.
          </p>
        </div>
        <span className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300">
          {modified} joueur(s) corrigé(s)
        </span>
      </div>

      {!data.matches.length ? (
        <p className="mt-6 rounded-xl border border-white/10 p-5 text-sm text-gray-500">Aucun match EA disponible sur cette soirée.</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase text-gray-400">
                <tr><th className="p-3">Joueur</th><th className="p-3">Matchs</th><th className="p-3">Buts</th><th className="p-3">Passes D</th><th className="p-3">Tirs</th><th className="p-3">Passes</th><th className="p-3">Note moy.</th><th className="p-3">Statut</th></tr>
              </thead>
              <tbody>
                {totals.map((player) => (
                  <tr key={player.playerName} className="border-t border-white/[0.06] text-gray-200">
                    <td className="p-3 font-bold">{player.playerName}</td>
                    <td className="p-3">{player.matches}</td>
                    <td className="p-3 font-black text-yellow-300">{player.goals}</td>
                    <td className="p-3 font-black text-cyan-300">{player.assists}</td>
                    <td className="p-3">{player.shots}</td>
                    <td className="p-3">{player.passesMade}/{player.passAttempts}</td>
                    <td className="p-3">{player.ratingCount ? (player.ratingSum / player.ratingCount).toFixed(2) : "—"}</td>
                    <td className="p-3">{player.correctedFields ? <span className="text-yellow-300">Corrigé</span> : <span className="text-gray-500">EA</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.4fr)]">
            <div>
              <h3 className="mb-3 text-sm font-black text-white">Modifier un match</h3>
              <div className="mb-4 flex flex-wrap gap-2">
                {data.matches.map((match) => <button type="button" key={match.id} onClick={() => { setMatchId(match.id); setSelectedPlayer(""); setError(""); setNotice(""); }}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-bold ${selectedMatch?.id === match.id ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300" : "border-white/10 text-gray-400"}`}>
                  {match.time} • {match.opponent} • {match.goalsFor}-{match.goalsAgainst}
                </button>)}
              </div>
              <div className="max-h-[400px] overflow-y-auto rounded-xl border border-white/10">
                {selectedMatch?.players.length ? selectedMatch.players.map((row) => (
                  <button key={row.playerName} type="button" onClick={() => choosePlayer(row)}
                    className={`flex w-full items-center justify-between gap-3 border-b border-white/[0.06] p-3 text-left text-sm transition hover:bg-white/[0.05] ${selectedRow?.playerName === row.playerName ? "bg-cyan-400/[0.08] text-cyan-300" : "text-gray-300"}`}>
                    <span className="truncate font-bold">{row.playerName}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-gray-400">
                      {row.corrected.goals} B · {row.corrected.assists} PD
                      {Object.keys(row.overrides).length > 0 && <Pencil size={13} className="text-yellow-300"/>}
                    </span>
                  </button>
                )) : <p className="p-4 text-xs text-gray-500">Aucun joueur récupéré pour ce match.</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#030914] p-4">
              {!selectedRow ? (
                <div className="flex min-h-44 items-center justify-center text-center text-sm text-gray-500">
                  Sélectionne un joueur pour consulter ou corriger ses performances sur ce match.
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black">{selectedRow.playerName}</h3>
                      <p className="text-xs text-gray-500">{selectedMatch?.opponent} • {selectedRow.position || "Poste inconnu"}</p>
                    </div>
                    {Object.keys(selectedRow.overrides).length > 0 && <span className="rounded-lg bg-yellow-400/10 px-2 py-1 text-xs font-bold text-yellow-300">Correction staff enregistrée</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                    {FIELDS.map((field: PerformanceField) => (
                      <label key={field} className="block rounded-xl border border-white/10 p-3 text-[11px] text-gray-400">
                        <span className="block min-h-8 font-bold">{PERFORMANCE_LABELS[field]}</span>
                        <span className="my-1 block text-[10px]">EA : <strong className="text-gray-200">{selectedRow.original[field]}</strong></span>
                        <input type="number" inputMode="decimal" min={0} max={field === "rating" ? 10 : 10000} step={field === "rating" ? "0.01" : "1"}
                          disabled={!canEdit || saving} placeholder={String(selectedRow.original[field])}
                          value={draft[field] ?? ""}
                          onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-[#091626] px-2 py-2 text-sm font-black text-yellow-300 outline-none focus:border-yellow-400/40 disabled:opacity-50"
                        />
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-gray-500">Laisse un champ vide pour utiliser la valeur EA. Modifie uniquement ce qui manque ou est incorrect.</p>
                  {error && <p role="alert" className="mt-3 rounded-lg bg-red-400/10 p-3 text-xs text-red-200">{error}</p>}
                  {notice && <p role="status" className="mt-3 rounded-lg bg-cyan-400/10 p-3 text-xs text-cyan-200"><Check size={14} className="mr-1 inline"/>{notice}</p>}
                  {canEdit && <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => void saveCorrection()} disabled={saving}
                      className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black disabled:opacity-40"><Save size={15}/>{saving ? "Sauvegarde..." : "Enregistrer ces stats"}</button>
                    <button type="button" onClick={() => void saveCorrection(true)} disabled={saving || !Object.keys(selectedRow.overrides).length}
                      className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 disabled:opacity-40"><RotateCcw size={14}/> Restaurer EA</button>
                    <button type="button" onClick={() => { choosePlayer(selectedRow); }} disabled={saving}
                      className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs text-gray-500"><X size={14}/> Annuler la saisie</button>
                  </div>}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
