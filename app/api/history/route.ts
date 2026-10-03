import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CLUB_ID = "1663";

type DatabaseMatch = {
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

type DatabasePlayer = {
  match_id: number;
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
};

type AggregatedPlayer = {
  id: string;
  name: string;
  position: string;

  games: number;

  goals: number;
  assists: number;

  ratingTotal: number;
  ratingCount: number;

  shots: number;

  passesMade: number;
  passAttempts: number;

  tacklesMade: number;
  tackleAttempts: number;

  saves: number;
  redCards: number;

  recentRatings: number[];
};

/* =========================================================
   GET
========================================================= */

export async function GET(
  request: Request
) {
  try {
    const supabase =
      createAdminClient();

    const url =
      new URL(
        request.url
      );

    const seasonParam =
      url.searchParams.get(
        "seasonId"
      );

    const competitionParam =
      url.searchParams.get(
        "competitionId"
      );

    const seasonId =
      parseFilterId(
        seasonParam
      );

    const competitionId =
      parseFilterId(
        competitionParam
      );

    /* =====================================================
       MATCHS
    ===================================================== */

    let matchQuery =
      supabase
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
          "club_id",
          CLUB_ID
        );

    if (
      seasonId !== null
    ) {
      matchQuery =
        matchQuery.eq(
          "season_id",
          seasonId
        );
    }

    if (
      competitionId !== null
    ) {
      matchQuery =
        matchQuery.eq(
          "competition_id",
          competitionId
        );
    }

    const {
      data: matchesData,
      error: matchesError,
    } =
      await matchQuery.order(
        "played_at",
        {
          ascending: false,
          nullsFirst: false,
        }
      );

    if (matchesError) {
      throw new Error(
        matchesError.message
      );
    }

    const databaseMatches =
      (matchesData ??
        []) as DatabaseMatch[];

    const matches =
      databaseMatches.map(
        (match) => ({
          id:
            match.id,

          matchId:
            match.ea_match_id,

          timestamp:
            match.played_at
              ? Math.floor(
                  new Date(
                    match.played_at
                  ).getTime() /
                    1000
                )
              : 0,

          date:
            match.played_at ??
            "",

          club:
            "GX NOVA",

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

          score:
            `${match.goals_for} - ${match.goals_against}`,

          result:
            match.result,

          matchType:
            match.match_type,

          seasonId:
            match.season_id,

          competitionId:
            match.competition_id,
        })
      );

    /* =====================================================
       AUCUN MATCH
    ===================================================== */

    if (
      databaseMatches.length ===
      0
    ) {
      return NextResponse.json({
        source:
          "supabase",

        filters: {
          seasonId,
          competitionId,
        },

        matches: [],
        players: [],

        totals: {
          matches: 0,

          playerPerformances:
            0,

          players: 0,
        },
      });
    }

    /* =====================================================
       IDS DES MATCHS
    ===================================================== */

    const matchIds =
      databaseMatches.map(
        (match) =>
          match.id
      );

    const matchDateMap =
      new Map<
        number,
        number
      >();

    for (
      const match
      of databaseMatches
    ) {
      matchDateMap.set(
        match.id,

        match.played_at
          ? new Date(
              match.played_at
            ).getTime()
          : 0
      );
    }

    /* =====================================================
       PERFORMANCES JOUEURS
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
          match_id,
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
          red_cards
        `)
        .in(
          "match_id",
          matchIds
        );

    if (playersError) {
      throw new Error(
        playersError.message
      );
    }

    const performances =
      (
        playersData ??
        []
      ) as DatabasePlayer[];

    /*
     * Du match le plus récent
     * au plus ancien.
     */

    performances.sort(
      (a, b) =>
        (matchDateMap.get(
          b.match_id
        ) ?? 0) -
        (matchDateMap.get(
          a.match_id
        ) ?? 0)
    );

    /* =====================================================
       AGRÉGATION PAR JOUEUR
    ===================================================== */

    const playerMap =
      new Map<
        string,
        AggregatedPlayer
      >();

    for (
      const performance
      of performances
    ) {
      const playerId =
        performance.player_ea_id
          ? `ea:${performance.player_ea_id}`
          : `name:${normalizePlayerName(
              performance.player_name
            )}`;

      let player =
        playerMap.get(
          playerId
        );

      if (!player) {
        player = {
          id:
            performance.player_ea_id ??
            normalizePlayerName(
              performance.player_name
            ),

          name:
            performance.player_name,

          position:
            performance.position ??
            "",

          games: 0,

          goals: 0,
          assists: 0,

          ratingTotal: 0,
          ratingCount: 0,

          shots: 0,

          passesMade: 0,
          passAttempts: 0,

          tacklesMade: 0,
          tackleAttempts: 0,

          saves: 0,
          redCards: 0,

          recentRatings: [],
        };

        playerMap.set(
          playerId,
          player
        );
      }

      if (
        player.games === 0
      ) {
        player.name =
          performance.player_name;

        player.position =
          performance.position ??
          player.position;
      }

      player.games++;

      player.goals +=
        numberValue(
          performance.goals
        );

      player.assists +=
        numberValue(
          performance.assists
        );

      player.shots +=
        numberValue(
          performance.shots
        );

      player.passesMade +=
        numberValue(
          performance.passes_made
        );

      player.passAttempts +=
        numberValue(
          performance.pass_attempts
        );

      player.tacklesMade +=
        numberValue(
          performance.tackles_made
        );

      player.tackleAttempts +=
        numberValue(
          performance.tackle_attempts
        );

      player.saves +=
        numberValue(
          performance.saves
        );

      player.redCards +=
        numberValue(
          performance.red_cards
        );

      const rating =
        numberValue(
          performance.rating
        );

      if (rating > 0) {
        player.ratingTotal +=
          rating;

        player.ratingCount++;

        if (
          player.recentRatings
            .length < 5
        ) {
          player.recentRatings.push(
            rating
          );
        }
      }
    }

    /* =====================================================
       FORMAT FINAL JOUEURS
    ===================================================== */

    const players =
      Array.from(
        playerMap.values()
      )
        .map(
          (player) => {
            const averageRating =
              player.ratingCount >
              0
                ? player.ratingTotal /
                  player.ratingCount
                : 0;

            const passSuccess =
              player.passAttempts >
              0
                ? (player.passesMade /
                    player.passAttempts) *
                  100
                : 0;

            const tackleSuccess =
              player.tackleAttempts >
              0
                ? (player.tacklesMade /
                    player.tackleAttempts) *
                  100
                : 0;

            return {
              id:
                player.id,

              name:
                player.name,

              position:
                player.position,

              games:
                player.games,

              goals:
                player.goals,

              assists:
                player.assists,

              averageRating:
                round(
                  averageRating,
                  2
                ),

              shots:
                player.shots,

              passesMade:
                player.passesMade,

              passAttempts:
                player.passAttempts,

              passSuccess:
                round(
                  passSuccess,
                  1
                ),

              tacklesMade:
                player.tacklesMade,

              tackleAttempts:
                player.tackleAttempts,

              tackleSuccess:
                round(
                  tackleSuccess,
                  1
                ),

              saves:
                player.saves,

              redCards:
                player.redCards,

              recentRatings:
                player.recentRatings,
            };
          }
        )
        .sort(
          (a, b) =>
            b.averageRating -
            a.averageRating
        );

    return NextResponse.json({
      source:
        "supabase",

      generatedAt:
        new Date().toISOString(),

      filters: {
        seasonId,
        competitionId,
      },

      matches,

      players,

      totals: {
        matches:
          matches.length,

        playerPerformances:
          performances.length,

        players:
          players.length,
      },
    });
  } catch (error) {
    console.error(
      "Erreur /api/history :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de récupérer l'historique Supabase.",

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
   OUTILS
========================================================= */

function parseFilterId(
  value: string | null
) {
  if (
    !value ||
    value === "all"
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
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

function normalizePlayerName(
  name: string
) {
  return name
    .toLowerCase()
    .replace(
      /^gx[_\-\s]?/i,
      ""
    )
    .replace(
      /[^a-z0-9]/g,
      ""
    );
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