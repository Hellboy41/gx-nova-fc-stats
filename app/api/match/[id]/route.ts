import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CLUB_ID = "1663";

type MatchRow = {
  id: number;
  ea_match_id: string;
  played_at: string | null;
  match_type: string | null;
  opponent_name: string;
  goals_for: number;
  goals_against: number;
  result: "V" | "N" | "D";
  season_id: number | null;
  competition_id: number | null;
};

type PlayerRow = {
  id: number;
  player_ea_id: string | null;
  player_name: string;
  position: string | null;
  rating: number | string;
  goals: number;
  assists: number;
  shots: number;
  passes_made: number;
  pass_attempts: number;
  tackles_made: number;
  tackle_attempts: number;
  saves: number;
  red_cards: number;
  raw_data: Record<string, unknown> | null;
};

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    const matchId =
      Number(id);

    if (
      !Number.isInteger(
        matchId
      ) ||
      matchId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Identifiant de match invalide.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      createAdminClient();

    /* =====================================================
       MATCH
    ===================================================== */

    const {
      data: matchData,
      error: matchError,
    } =
      await supabase
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
          competition_id
        `)
        .eq(
          "id",
          matchId
        )
        .eq(
          "club_id",
          CLUB_ID
        )
        .maybeSingle();

    if (matchError) {
      throw new Error(
        matchError.message
      );
    }

    if (!matchData) {
      return NextResponse.json(
        {
          error:
            "Match introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    const match =
      matchData as MatchRow;

    /* =====================================================
       JOUEURS
    ===================================================== */

    const {
      data: playersData,
      error: playersError,
    } =
      await supabase
        .from(
          "match_players"
        )
        .select(`
          id,
          player_ea_id,
          player_name,
          position,
          rating,
          goals,
          assists,
          shots,
          passes_made,
          pass_attempts,
          tackles_made,
          tackle_attempts,
          saves,
          red_cards,
          raw_data
        `)
        .eq(
          "match_id",
          matchId
        );

    if (playersError) {
      throw new Error(
        playersError.message
      );
    }

    const rawPlayers =
      (playersData ??
        []) as PlayerRow[];

    /* =====================================================
       SAISON / COMPÉTITION
    ===================================================== */

    let seasonName:
      | string
      | null = null;

    let competitionName:
      | string
      | null = null;

    let competitionShortName:
      | string
      | null = null;

    if (
      match.season_id
    ) {
      const {
        data: season,
      } =
        await supabase
          .from("seasons")
          .select("name")
          .eq(
            "id",
            match.season_id
          )
          .maybeSingle();

      seasonName =
        season?.name ??
        null;
    }

    if (
      match.competition_id
    ) {
      const {
        data: competition,
      } =
        await supabase
          .from(
            "competitions"
          )
          .select(
            "name, short_name"
          )
          .eq(
            "id",
            match.competition_id
          )
          .maybeSingle();

      competitionName =
        competition?.name ??
        null;

      competitionShortName =
        competition?.short_name ??
        null;
    }

    /* =====================================================
       FORMAT JOUEURS
    ===================================================== */

    const players =
      rawPlayers
        .map(
          (player) => {
            const passesMade =
              numberValue(
                player.passes_made
              );

            const passAttempts =
              numberValue(
                player.pass_attempts
              );

            const tacklesMade =
              numberValue(
                player.tackles_made
              );

            const tackleAttempts =
              numberValue(
                player.tackle_attempts
              );

            const raw =
              player.raw_data ??
              {};

            return {
              id:
                player.id,

              playerEaId:
                player.player_ea_id,

              name:
                player.player_name,

              position:
                player.position ??
                "",

              rating:
                numberValue(
                  player.rating
                ),

              goals:
                numberValue(
                  player.goals
                ),

              assists:
                numberValue(
                  player.assists
                ),

              shots:
                numberValue(
                  player.shots
                ),

              passesMade,

              passAttempts,

              passSuccess:
                passAttempts > 0
                  ? round(
                      (passesMade /
                        passAttempts) *
                        100,
                      1
                    )
                  : 0,

              tacklesMade,

              tackleAttempts,

              tackleSuccess:
                tackleAttempts >
                0
                  ? round(
                      (tacklesMade /
                        tackleAttempts) *
                        100,
                      1
                    )
                  : 0,

              saves:
                numberValue(
                  player.saves
                ),

              redCards:
                numberValue(
                  player.red_cards
                ),

              manOfTheMatch:
                numberValue(
                  raw.mom
                ) === 1,

              goalsConceded:
                numberValue(
                  raw.goalsconceded
                ),

              secondsPlayed:
                numberValue(
                  raw.secondsPlayed ??
                    raw.gameTime
                ),
            };
          }
        )
        .sort(
          (a, b) =>
            positionOrder(
              a.position
            ) -
              positionOrder(
                b.position
              ) ||
            b.rating -
              a.rating
        );

    /* =====================================================
       TOTAL ÉQUIPE
    ===================================================== */

    const totalShots =
      players.reduce(
        (total, player) =>
          total +
          player.shots,
        0
      );

    const totalPassesMade =
      players.reduce(
        (total, player) =>
          total +
          player.passesMade,
        0
      );

    const totalPassAttempts =
      players.reduce(
        (total, player) =>
          total +
          player.passAttempts,
        0
      );

    const totalTacklesMade =
      players.reduce(
        (total, player) =>
          total +
          player.tacklesMade,
        0
      );

    const totalTackleAttempts =
      players.reduce(
        (total, player) =>
          total +
          player.tackleAttempts,
        0
      );

    const totalSaves =
      players.reduce(
        (total, player) =>
          total +
          player.saves,
        0
      );

    const totalRedCards =
      players.reduce(
        (total, player) =>
          total +
          player.redCards,
        0
      );

    const ratedPlayers =
      players.filter(
        (player) =>
          player.rating > 0
      );

    const averageRating =
      ratedPlayers.length >
      0
        ? ratedPlayers.reduce(
            (
              total,
              player
            ) =>
              total +
              player.rating,
            0
          ) /
          ratedPlayers.length
        : 0;

    const detectedStructure =
      detectStructure(
        players
      );

    return NextResponse.json({
      match: {
        id:
          match.id,

        eaMatchId:
          match.ea_match_id,

        playedAt:
          match.played_at,

        matchType:
          match.match_type,

        opponent:
          match.opponent_name,

        goalsFor:
          Number(
            match.goals_for
          ),

        goalsAgainst:
          Number(
            match.goals_against
          ),

        result:
          match.result,

        seasonId:
          match.season_id,

        seasonName,

        competitionId:
          match.competition_id,

        competitionName,

        competitionShortName,
      },

      detectedStructure,

      players,

      teamTotals: {
        players:
          players.length,

        averageRating:
          round(
            averageRating,
            2
          ),

        shots:
          totalShots,

        passesMade:
          totalPassesMade,

        passAttempts:
          totalPassAttempts,

        passSuccess:
          totalPassAttempts >
          0
            ? round(
                (totalPassesMade /
                  totalPassAttempts) *
                  100,
                1
              )
            : 0,

        tacklesMade:
          totalTacklesMade,

        tackleAttempts:
          totalTackleAttempts,

        tackleSuccess:
          totalTackleAttempts >
          0
            ? round(
                (totalTacklesMade /
                  totalTackleAttempts) *
                  100,
                1
              )
            : 0,

        saves:
          totalSaves,

        redCards:
          totalRedCards,
      },
    });
  } catch (error) {
    console.error(
      "Erreur GET /api/match/[id] :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer la fiche du match.",

        details:
          error instanceof Error
            ? error.message
            : "Erreur inconnue.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   STRUCTURE DÉTECTÉE
========================================================= */

function detectStructure(
  players: {
    position: string;
  }[]
) {
  const defenders =
    players.filter(
      (player) =>
        player.position
          .toLowerCase() ===
        "defender"
    ).length;

  const midfielders =
    players.filter(
      (player) =>
        player.position
          .toLowerCase() ===
        "midfielder"
    ).length;

  const forwards =
    players.filter(
      (player) =>
        player.position
          .toLowerCase() ===
        "forward"
    ).length;

  if (
    defenders === 0 &&
    midfielders === 0 &&
    forwards === 0
  ) {
    return null;
  }

  return `${defenders}-${midfielders}-${forwards}`;
}

function positionOrder(
  position: string
) {
  switch (
    position.toLowerCase()
  ) {
    case "goalkeeper":
      return 1;

    case "defender":
      return 2;

    case "midfielder":
      return 3;

    case "forward":
      return 4;

    default:
      return 5;
  }
}

function numberValue(
  value: unknown
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function round(
  value: number,
  decimals: number
) {
  const multiplier =
    10 ** decimals;

  return (
    Math.round(
      value *
        multiplier
    ) /
    multiplier
  );
}