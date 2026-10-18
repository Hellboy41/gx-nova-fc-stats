import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { isEveningDate } from "@/lib/debrief-studio";
import {
  type PerformanceOverrides, type PerformanceValues,
  sanitizePerformanceOverrides, withOverrides,
} from "@/lib/debrief-performances";

const CLUB_ID = "1663";

type MatchRow = {
  id: number;
  played_at: string | null;
  opponent_name: string;
  goals_for: number;
  goals_against: number;
};

type PlayerRow = {
  match_id: number;
  player_ea_id: string | null;
  player_name: string;
  position: string | null;
  goals: number;
  assists: number;
  shots: number;
  passes_made: number;
  pass_attempts: number;
  tackles_made: number;
  tackle_attempts: number;
  saves: number;
  red_cards: number;
  rating: number | string;
};

type OverrideRow = {
  match_id: number;
  player_name: string;
  overrides: PerformanceOverrides;
  updated_at: string;
};

function eveningDateKey(value: string): string {
  const stamp = new Date(value);
  if (!Number.isFinite(stamp.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(stamp);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  if (Number(get("hour")) >= 10) return date;
  const previous = new Date(`${date}T12:00:00.000Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
}

async function getNightMatches(date: string): Promise<MatchRow[]> {
  const start = new Date(`${date}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - 1);
  const end = new Date(`${date}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 2);

  const { data, error } = await createAdminClient()
    .from("matches")
    .select("id,played_at,opponent_name,goals_for,goals_against")
    .eq("club_id", CLUB_ID)
    .gte("played_at", start.toISOString())
    .lt("played_at", end.toISOString())
    .order("played_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as MatchRow[]).filter((match) =>
    match.played_at && eveningDateKey(match.played_at) === date
  );
}

function baseValues(player: PlayerRow): PerformanceValues {
  return {
    goals: Number(player.goals) || 0,
    assists: Number(player.assists) || 0,
    shots: Number(player.shots) || 0,
    passesMade: Number(player.passes_made) || 0,
    passAttempts: Number(player.pass_attempts) || 0,
    tacklesMade: Number(player.tackles_made) || 0,
    tackleAttempts: Number(player.tackle_attempts) || 0,
    saves: Number(player.saves) || 0,
    redCards: Number(player.red_cards) || 0,
    rating: Number(player.rating) || 0,
  };
}

export async function GET(request: Request) {
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!isEveningDate(date)) {
    return NextResponse.json({ error: "Date de soirée invalide." }, { status: 400 });
  }

  try {
    const matches = await getNightMatches(date);
    if (!matches.length) return NextResponse.json({ date, matches: [] });
    const ids = matches.map((match) => match.id);
    const admin = createAdminClient();
    const [playersResponse, overridesResponse] = await Promise.all([
      admin.from("match_players")
        .select("match_id,player_ea_id,player_name,position,goals,assists,shots,passes_made,pass_attempts,tackles_made,tackle_attempts,saves,red_cards,rating")
        .in("match_id", ids)
        .order("player_name"),
      admin.from("debrief_player_overrides")
        .select("match_id,player_name,overrides,updated_at")
        .eq("club_id", CLUB_ID)
        .in("match_id", ids),
    ]);

    if (playersResponse.error) throw playersResponse.error;
    if (overridesResponse.error) throw overridesResponse.error;

    const corrections = new Map(
      ((overridesResponse.data ?? []) as OverrideRow[])
        .map((row) => [`${row.match_id}::${row.player_name}`, row])
    );
    const byMatch = new Map<number, Array<{
      matchId: number;
      playerName: string;
      playerEaId: string | null;
      position: string | null;
      original: PerformanceValues;
      overrides: PerformanceOverrides;
      corrected: PerformanceValues;
      updatedAt: string | null;
    }>>();
    for (const player of (playersResponse.data ?? []) as PlayerRow[]) {
      const original = baseValues(player);
      const stored = corrections.get(`${player.match_id}::${player.player_name}`);
      const overrides = sanitizePerformanceOverrides(stored?.overrides ?? {}) ?? {};
      const rows = byMatch.get(player.match_id) ?? [];
      rows.push({
        matchId: player.match_id,
        playerName: player.player_name,
        playerEaId: player.player_ea_id,
        position: player.position,
        original,
        overrides,
        corrected: withOverrides(original, overrides),
        updatedAt: stored?.updated_at ?? null,
      });
      byMatch.set(player.match_id, rows);
    }

    return NextResponse.json({
      date,
      matches: matches.map((match) => ({
        id: match.id,
        opponent: match.opponent_name,
        time: match.played_at
          ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(new Date(match.played_at))
          : "--:--",
        goalsFor: match.goals_for,
        goalsAgainst: match.goals_against,
        players: byMatch.get(match.id) ?? [],
      })),
    });
  } catch (error) {
    return NextResponse.json({
      error: "Impossible de charger les performances individuelles.",
      details: error instanceof Error ? error.message : "Erreur inconnue.",
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireActiveStaff({ write: true });
  if (authorization.error) return authorization.error;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Données de correction invalides." }, { status: 400 });
  }
  const { date, matchId, playerName, overrides } = body as Record<string, unknown>;
  const cleaned = sanitizePerformanceOverrides(overrides);
  if (typeof date !== "string" || !isEveningDate(date) ||
      typeof matchId !== "number" || !Number.isSafeInteger(matchId) || matchId <= 0 ||
      typeof playerName !== "string" || playerName.length > 200 || !playerName.trim() || cleaned === null) {
    return NextResponse.json({ error: "Date, match, joueur ou statistiques incorrects." }, { status: 400 });
  }

  try {
    // Contrôle anti-IDOR : le match doit appartenir à GX NOVA et à la soirée choisie.
    const matches = await getNightMatches(date);
    if (!matches.some((match) => match.id === matchId)) {
      return NextResponse.json({ error: "Ce match n'appartient pas à la soirée sélectionnée." }, { status: 404 });
    }
    const admin = createAdminClient();
    const { data: player, error: playerError } = await admin
      .from("match_players")
      .select("id")
      .eq("match_id", matchId)
      .eq("player_name", playerName)
      .maybeSingle();
    if (playerError) throw playerError;
    if (!player) return NextResponse.json({ error: "Joueur introuvable pour ce match." }, { status: 404 });

    if (!Object.keys(cleaned).length) {
      const { error } = await admin.from("debrief_player_overrides")
        .delete()
        .eq("club_id", CLUB_ID)
        .eq("match_id", matchId)
        .eq("player_name", playerName);
      if (error) throw error;
      return NextResponse.json({ success: true, overrides: {}, updatedAt: null });
    }

    const { data, error } = await admin.from("debrief_player_overrides").upsert({
      club_id: CLUB_ID,
      match_id: matchId,
      player_name: playerName,
      overrides: cleaned,
      updated_at: new Date().toISOString(),
      updated_by: authorization.profile?.userId ?? null,
    }, { onConflict: "club_id,match_id,player_name" }).select("updated_at").single();
    if (error) throw error;
    return NextResponse.json({ success: true, overrides: cleaned, updatedAt: data.updated_at });
  } catch (error) {
    return NextResponse.json({
      error: "Impossible de sauvegarder les corrections.",
      details: error instanceof Error ? error.message : "Erreur inconnue.",
    }, { status: 500 });
  }
}
