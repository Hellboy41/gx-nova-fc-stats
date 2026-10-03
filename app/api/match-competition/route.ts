import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";

const CLUB_ID = "1663";

export async function GET() {
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("matches")
      .select(`
        id,
        ea_match_id,
        played_at,
        match_type,
        opponent_name,
        goals_for,
        goals_against,
        result,
        season_id,
        competition_id,
        seasons (id, name),
        competitions (id, name, short_name)
      `)
      .eq("club_id", CLUB_ID)
      .order("played_at", { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);
    return NextResponse.json(data ?? []);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Impossible de récupérer les matchs.",
        details: error instanceof Error ? error.message : "Erreur inconnue.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authorization = await requireActiveStaff({ write: true });
  if (authorization.error) return authorization.error;

  try {
    const body = await request.json();
    const matchId = Number(body.matchId);
    const seasonId = body.seasonId ? Number(body.seasonId) : null;
    const competitionId = body.competitionId ? Number(body.competitionId) : null;

    if (!Number.isInteger(matchId) || matchId <= 0) {
      return NextResponse.json({ error: "Identifiant du match invalide." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id")
      .eq("id", matchId)
      .eq("club_id", CLUB_ID)
      .maybeSingle();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match introuvable." }, { status: 404 });
    }

    if (seasonId) {
      const { data: season, error: seasonError } = await supabase
        .from("seasons")
        .select("id")
        .eq("id", seasonId)
        .eq("club_id", CLUB_ID)
        .maybeSingle();

      if (seasonError || !season) {
        return NextResponse.json({ error: "Saison invalide." }, { status: 400 });
      }
    }

    if (competitionId) {
      const { data: competition, error: competitionError } = await supabase
        .from("competitions")
        .select("id")
        .eq("id", competitionId)
        .eq("club_id", CLUB_ID)
        .maybeSingle();

      if (competitionError || !competition) {
        return NextResponse.json({ error: "Compétition invalide." }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("matches")
      .update({
        season_id: seasonId,
        competition_id: competitionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .eq("club_id", CLUB_ID)
      .select("id, season_id, competition_id")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, match: data });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Impossible d'affecter le match.",
        details: error instanceof Error ? error.message : "Erreur inconnue.",
      },
      { status: 500 }
    );
  }
}
