"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Goal, ShieldCheck, Trophy, Users } from "lucide-react";
import {
  type DebriefPerformancesResponse,
  sumPlayerPerformances,
} from "@/lib/debrief-performances";

export type LiveReportMatch = {
  id: number;
  time: string;
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  result?: "V" | "N" | "D" | null;
  competitionName: string | null;
  competitionShortName: string | null;
};

export type LiveEveningReport = {
  matches: LiveReportMatch[];
  totals: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
};

type Props = {
  report: LiveEveningReport | null;
  performances: DebriefPerformancesResponse | null;
  performanceError?: string;
};

function nightMatches({ report, performances }: Props): LiveReportMatch[] {
  if (report) return report.matches;
  return (performances?.matches ?? []).map((match) => ({
    ...match,
    competitionName: null,
    competitionShortName: null,
    result: match.goalsFor > match.goalsAgainst ? "V" : match.goalsFor < match.goalsAgainst ? "D" : "N",
  }));
}

function matchResult(match: LiveReportMatch): "V" | "N" | "D" {
  return match.result ?? (match.goalsFor > match.goalsAgainst ? "V" : match.goalsFor < match.goalsAgainst ? "D" : "N");
}

function resultClass(result: "V" | "N" | "D") {
  return result === "V"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
    : result === "N"
      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
      : "border-rose-400/30 bg-rose-400/10 text-rose-300";
}

function Missing({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#091626] p-8 text-center text-gray-400">
      {label}
    </div>
  );
}

function Metric({ label, value, accent = "text-white" }: {
  label: string; value: string | number; accent?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-[#0a182a] px-5 py-4">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-black lg:text-4xl ${accent}`}>{value}</p>
    </div>
  );
}

export function LiveEveningSummary(props: Props) {
  const matches = nightMatches(props);
  if (!props.report && !props.performances) return <Missing label="Bilan indisponible : aucune donnée EA chargée pour cette soirée." />;
  if (!matches.length) return <Missing label="Aucun match trouvé pour la soirée sélectionnée." />;

  const wins = matches.filter((match) => matchResult(match) === "V").length;
  const draws = matches.filter((match) => matchResult(match) === "N").length;
  const losses = matches.filter((match) => matchResult(match) === "D").length;
  const scored = matches.reduce((total, match) => total + match.goalsFor, 0);
  const conceded = matches.reduce((total, match) => total + match.goalsAgainst, 0);
  const players = sumPlayerPerformances(props.performances?.matches ?? []);
  const corrections = players.reduce((total, player) => total + player.correctedFields, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <Metric label="Matchs" value={matches.length}/>
        <Metric label="Victoires" value={wins} accent="text-emerald-300"/>
        <Metric label="Nuls" value={draws} accent="text-yellow-300"/>
        <Metric label="Défaites" value={losses} accent="text-rose-300"/>
        <Metric label="Buts marqués" value={scored} accent="text-cyan-300"/>
        <Metric label="Buts encaissés" value={conceded} accent="text-rose-300"/>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-cyan-400/20 bg-[#091626] p-5">
          <h3 className="flex items-center gap-2 text-lg font-black text-cyan-300"><Trophy size={19}/> Bilan collectif</h3>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-400">Taux de victoires</p><p className="mt-1 text-3xl font-black">{Math.round(100 * wins / matches.length)}%</p></div>
            <div><p className="text-xs text-gray-400">Différence de buts</p><p className="mt-1 text-3xl font-black">{scored - conceded > 0 ? "+" : ""}{scored - conceded}</p></div>
            <div><p className="text-xs text-gray-400">Clean sheets</p><p className="mt-1 text-2xl font-black">{matches.filter((match) => match.goalsAgainst === 0).length}</p></div>
            <div><p className="text-xs text-gray-400">Buts / match</p><p className="mt-1 text-2xl font-black">{(scored / matches.length).toFixed(2)}</p></div>
          </div>
        </section>

        <section className="rounded-2xl border border-yellow-400/20 bg-[#091626] p-5">
          <h3 className="flex items-center gap-2 text-lg font-black text-yellow-300"><Users size={19}/> Performances individuelles</h3>
          {players.length ? (
            <div className="mt-5 space-y-3">
              {players.slice(0, 3).map((player, index) => (
                <div key={player.playerName} className="flex items-center justify-between gap-4 border-b border-white/[0.07] pb-2">
                  <div className="min-w-0"><span className="mr-3 text-yellow-300">{String(index + 1).padStart(2, "0")}</span><strong className="text-sm">{player.playerName}</strong></div>
                  <span className="shrink-0 text-sm font-bold text-cyan-300">{player.goals} B · {player.assists} PD</span>
                </div>
              ))}
              <p className="text-xs text-gray-400">{players.length} joueur(s) • {corrections} correction(s) staff prise(s) en compte</p>
            </div>
          ) : <p className="mt-5 text-sm text-gray-400">{props.performanceError ?? "Pas de statistiques individuelles disponibles."}</p>}
        </section>
      </div>
      <p className="text-xs text-gray-500">Scores et bilan collectif : données EA. Statistiques des joueurs : valeurs EA avec corrections staff enregistrées.</p>
    </div>
  );
}

export function LiveMatchResults(props: Props) {
  const matches = useMemo(() => nightMatches(props), [props.report, props.performances]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  useEffect(() => {
    if (!matches.length) return;
    if (!matches.some((match) => match.id === selectedId)) setSelectedId(matches[0].id);
  }, [matches, selectedId]);
  if (!props.report && !props.performances) return <Missing label="Résultats indisponibles : aucune donnée EA chargée." />;
  if (!matches.length) return <Missing label="Aucun résultat pour cette soirée." />;

  const selected = matches.find((match) => match.id === selectedId) ?? matches[0];
  const players = props.performances?.matches.find((match) => match.id === selected.id)?.players ?? [];
  const sorted = [...players].sort((a, b) => b.corrected.goals - a.corrected.goals ||
    b.corrected.assists - a.corrected.assists || b.corrected.rating - a.corrected.rating);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {matches.map((match, i) => {
          const result = matchResult(match);
          return (
            <button key={match.id} type="button" onClick={() => setSelectedId(match.id)}
              className={`rounded-2xl border p-4 text-left transition ${selected.id === match.id ? "border-yellow-400/60 bg-yellow-400/[0.08]" : "border-white/10 bg-[#091626] hover:border-cyan-400/40"}`}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold uppercase text-gray-400">Match {i + 1} • {match.time}</span>
                <span className={`rounded-md border px-2 py-1 text-xs font-black ${resultClass(result)}`}>{result}</span>
              </div>
              <p className="mt-3 truncate text-base font-black" title={match.opponent}>{match.opponent}</p>
              <p className="mt-2 text-xs font-semibold text-gray-500">{match.competitionShortName ?? match.competitionName ?? "Match EA"}</p>
              <div className="mt-3 flex items-end justify-between gap-2"><span className="text-2xl font-black">GX <span className="text-yellow-300">{match.goalsFor} – {match.goalsAgainst}</span></span><span className="text-[11px] text-gray-400">Adverse</span></div>
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#091626]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-300">Détail du match sélectionné</p>
            <h3 className="mt-1 text-2xl font-black">GX NOVA {selected.goalsFor} – {selected.goalsAgainst} {selected.opponent}</h3>
          </div>
          <span className={`rounded-lg border px-3 py-2 text-sm font-black ${resultClass(matchResult(selected))}`}>{matchResult(selected) === "V" ? "Victoire" : matchResult(selected) === "N" ? "Match nul" : "Défaite"}</span>
        </div>
        {!props.performances ? (
          <p className="p-5 text-sm text-gray-400">{props.performanceError ?? "Statistiques des joueurs indisponibles."}</p>
        ) : sorted.length ? (
          <div className="max-h-[440px] overflow-y-auto">
            <table className="w-full min-w-[670px] text-left text-sm">
              <thead className="sticky top-0 bg-[#0b1a2d] text-xs uppercase text-gray-400">
                <tr><th className="p-3">Joueur</th><th className="p-3">Buts</th><th className="p-3">Passes D</th><th className="p-3">Tirs</th><th className="p-3">Passes</th><th className="p-3">Note</th><th className="p-3">Source</th></tr>
              </thead>
              <tbody>{sorted.map((player) => (
                <tr key={player.playerName} className="border-t border-white/[0.06]">
                  <td className="p-3 font-bold">{player.playerName}<span className="ml-2 text-[10px] text-gray-500">{player.position ?? ""}</span></td>
                  <td className="p-3 text-lg font-black text-yellow-300">{player.corrected.goals}</td>
                  <td className="p-3 text-lg font-black text-cyan-300">{player.corrected.assists}</td>
                  <td className="p-3">{player.corrected.shots}</td>
                  <td className="p-3">{player.corrected.passesMade}/{player.corrected.passAttempts}</td>
                  <td className="p-3">{player.corrected.rating > 0 ? player.corrected.rating.toFixed(2) : "—"}</td>
                  <td className="p-3 text-xs">{Object.keys(player.overrides).length ? <span className="text-yellow-300">Corrigé staff</span> : <span className="text-gray-400">EA</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="p-5 text-sm text-gray-400">EA n'a pas fourni de performances individuelles pour ce match.</p>}
      </section>
      <p className="text-xs text-gray-500">Scores des matchs issus d'EA ; buts, passes décisives et autres statistiques individuelles tiennent compte des corrections du staff.</p>
    </div>
  );
}

export function LivePlayerStats(props: Props) {
  const players = sumPlayerPerformances(props.performances?.matches ?? []);
  if (!props.performances) return <Missing label={props.performanceError ?? "Statistiques individuelles indisponibles pour cette soirée."}/>;
  if (!players.length) return <Missing label="Aucune performance individuelle pour cette soirée." />;

  return (
    <section className="overflow-hidden rounded-2xl border border-yellow-400/20 bg-[#091626]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5">
        <h3 className="flex items-center gap-2 text-lg font-black text-yellow-300"><ClipboardList size={20}/> Performances corrigées</h3>
        <span className="text-xs font-semibold text-gray-400">{players.length} joueur(s) • {props.performances.matches.length} match(s)</span>
      </div>
      <div className="max-h-[68vh] overflow-auto">
        <table className="w-full min-w-[930px] text-left text-base">
          <thead className="sticky top-0 bg-[#0b1a2d] text-xs uppercase tracking-wide text-gray-400">
            <tr><th className="p-4">Joueur</th><th className="p-4">Matchs</th><th className="p-4">Buts</th><th className="p-4">Passes D</th><th className="p-4">Tirs</th><th className="p-4">Passes</th><th className="p-4">Tacles</th><th className="p-4">Arrêts</th><th className="p-4">Note moy.</th><th className="p-4">Source</th></tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.playerName} className="border-t border-white/[0.06]">
                <td className="p-4 font-black">{player.playerName}</td>
                <td className="p-4">{player.matches}</td>
                <td className="p-4 text-xl font-black text-yellow-300">{player.goals}</td>
                <td className="p-4 text-xl font-black text-cyan-300">{player.assists}</td>
                <td className="p-4">{player.shots}</td>
                <td className="p-4">{player.passesMade}/{player.passAttempts}</td>
                <td className="p-4">{player.tacklesMade}/{player.tackleAttempts}</td>
                <td className="p-4">{player.saves}</td>
                <td className="p-4 font-bold">{player.ratingCount ? (player.ratingSum / player.ratingCount).toFixed(2) : "—"}</td>
                <td className="p-4 text-xs">{player.correctedFields > 0 ? <span className="text-yellow-300">Corrigé staff</span> : <span className="text-gray-400">EA</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 text-xs text-gray-500">Les valeurs modifiées dans « Corriger les stats EA » sont automatiquement répercutées ici.</p>
    </section>
  );
}
