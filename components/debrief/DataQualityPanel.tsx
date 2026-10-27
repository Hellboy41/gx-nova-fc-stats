"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { DebriefPerformancesResponse } from "@/lib/debrief-performances";

type Warning = {
  matchId: number;
  time: string;
  opponent: string;
  issues: string[];
};

export function DataQualityPanel({ data }: { data: DebriefPerformancesResponse }) {
  const warnings: Warning[] = [];
  let corrections = 0;

  for (const match of data.matches) {
    const issues: string[] = [];
    const playerGoals = match.players.reduce((sum, player) => sum + player.corrected.goals, 0);
    corrections += match.players.reduce((sum, player) => sum + Object.keys(player.overrides).length, 0);

    if (playerGoals !== match.goalsFor) {
      issues.push(
        `Buts attribués aux joueurs : ${playerGoals} / score équipe : ${match.goalsFor}`
      );
    }
    if (match.players.length < 10) {
      issues.push(`Seulement ${match.players.length} joueur(s) récupéré(s) par EA`);
    }
    if (match.players.some((player) =>
      player.corrected.passesMade > player.corrected.passAttempts ||
      player.corrected.tacklesMade > player.corrected.tackleAttempts
    )) {
      issues.push("Un ratio passes/tacles dépasse le nombre de tentatives");
    }
    if (issues.length) {
      warnings.push({ matchId: match.id, time: match.time, opponent: match.opponent, issues });
    }
  }

  if (!data.matches.length) return null;

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-[#091626] p-4 lg:p-5" aria-label="Contrôle qualité des statistiques EA">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {warnings.length ? (
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-300"/>
          ) : (
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-300"/>
          )}
          <div>
            <h2 className="font-black">Contrôle qualité EA</h2>
            <p className="mt-1 text-sm text-gray-400">
              {warnings.length
                ? `${warnings.length} match(s) à vérifier sur ${data.matches.length}`
                : `Aucune incohérence détectée sur ${data.matches.length} match(s)`}
              {" • "}{corrections} champ(s) corrigé(s) par le staff
            </p>
          </div>
        </div>
        {warnings.length > 0 && (
          <a href="#performances" className="rounded-lg border border-yellow-400/30 px-3 py-2 text-xs font-bold text-yellow-300 hover:bg-yellow-400/10">
            Vérifier les statistiques
          </a>
        )}
      </div>
      {warnings.length > 0 && (
        <details className="mt-4 border-t border-white/10 pt-3">
          <summary className="cursor-pointer text-sm font-bold text-amber-200">
            Voir les matchs et les écarts signalés
          </summary>
          <div className="mt-3 space-y-3">
            {warnings.map((warning) => (
              <div key={warning.matchId} className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3">
                <p className="text-sm font-bold">{warning.time} — GX NOVA vs {warning.opponent}</p>
                {warning.issues.map((issue) => <p key={issue} className="mt-1 text-xs text-gray-300">• {issue}</p>)}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-400">
            Un écart entre les buts d'équipe et les buts des joueurs n'est pas nécessairement une erreur :
            buts contre son camp, remplacements par l'IA et matchs interrompus peuvent l'expliquer.
            Vérifie le replay avant de corriger.
          </p>
        </details>
      )}
    </section>
  );
}
