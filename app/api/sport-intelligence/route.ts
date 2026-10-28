import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { applyStaffPerformanceCorrections } from "@/lib/stats/apply-staff-corrections";
import { getArchivedPlayerKeys, getPlayerKey } from "@/lib/players/status";
import {
  buildSportIntelligence,
  type IntelligenceMatch,
  type IntelligencePerformance,
} from "@/lib/sport-intelligence";

const CLUB_ID = "1663";
const MAX_MATCHES = 250;
const PAGE_SIZE = 1000;

export async function GET(request: Request) {
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;

  const requestedSeason = new URL(request.url).searchParams.get("seasonId") ?? "all";
  if (requestedSeason !== "all" && !/^[1-9]\d*$/.test(requestedSeason)) {
    return NextResponse.json({ error: "Saison invalide." }, { status: 400 });
  }
  const selectedSeason = requestedSeason === "all" ? null : Number(requestedSeason);
  if (selectedSeason !== null && !Number.isSafeInteger(selectedSeason)) {
    return NextResponse.json({ error: "Identifiant de saison invalide." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const seasonsPromise = admin.from("seasons")
      .select("id,name,is_active").eq("club_id", CLUB_ID).order("id", { ascending: false });
    let matchesQuery = admin.from("matches")
      .select("id,played_at,result,goals_for,goals_against")
      .eq("club_id", CLUB_ID)
      .order("played_at", { ascending: false, nullsFirst: false })
      .limit(MAX_MATCHES + 1);
    if (selectedSeason !== null) matchesQuery = matchesQuery.eq("season_id", selectedSeason);
    const [matchesResult, seasonsResult, archivedKeys] = await Promise.all([
      matchesQuery, seasonsPromise, getArchivedPlayerKeys(CLUB_ID),
    ]);

    if (matchesResult.error) throw matchesResult.error;
    if (seasonsResult.error) throw seasonsResult.error;
    const selected = (matchesResult.data ?? []) as IntelligenceMatch[];
    const truncated = selected.length > MAX_MATCHES;
    const matches = selected.slice(0, MAX_MATCHES);
    const ids = matches.map((match) => match.id);

    const rawPlayers: IntelligencePerformance[] = [];
    if (ids.length) {
      // Supabase REST renvoie par défaut 1000 lignes maximum. Paginer évite
      // de sous-compter discrètement les joueurs lorsque l'historique grandit.
      for (let start = 0; ; start += PAGE_SIZE) {
        const { data, error } = await admin.from("match_players")
          .select("id,match_id,player_ea_id,player_name,position,rating,goals,assists,shots,passes_made,pass_attempts,tackles_made,tackle_attempts,saves,red_cards,raw_data")
          .in("match_id", ids)
          .order("id", { ascending: true })
          .range(start, start + PAGE_SIZE - 1);
        if (error) throw error;
        const page = (data ?? []) as IntelligencePerformance[];
        rawPlayers.push(...page);
        if (page.length < PAGE_SIZE) break;
      }
    }
    const corrected = await applyStaffPerformanceCorrections(CLUB_ID, rawPlayers);
    const result = buildSportIntelligence(matches, corrected, archivedKeys, getPlayerKey, truncated);

    return NextResponse.json({
      ...result,
      seasonId: requestedSeason,
      seasons: (seasonsResult.data ?? []).map((row) => ({
        id: Number(row.id), name: String(row.name), isActive: Boolean(row.is_active),
      })),
      rules: {
        formRecent: 5,
        formPrevious: 5,
        formMinimum: 3,
        formChangeThreshold: 0.35,
        roleMinimum: 3,
        pairMinimum: 8,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({
      error: "Impossible de calculer l'intelligence sportive.",
      details: error instanceof Error ? error.message : "Erreur serveur.",
    }, { status: 500 });
  }
}
