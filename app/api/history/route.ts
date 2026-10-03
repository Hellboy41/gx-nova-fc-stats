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

type StatBucket = {
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

type AggregatedPlayer = StatBucket & {
  id: string;
  name: string;
  latestPosition: string;
  positions: Map<string, StatBucket>;
};

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

    const seasonId =
      parseFilterId(
        url.searchParams.get(
          "seasonId"
        )
      );

    const competitionId =
      parseFilterId(
        url.searchParams.get(
          "competitionId"
        )
      );

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

    performances.sort(
      (a, b) =>
        (matchDateMap.get(
          b.match_id
        ) ?? 0) -
        (matchDateMap.get(
          a.match_id
        ) ?? 0)
    );

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

      const position =
        normalizeEaPosition(
          performance.position
        );

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

          latestPosition:
            position,

          ...createStatBucket(),

          positions:
            new Map<
              string,
              StatBucket
            >(),
        };

        playerMap.set(
          playerId,
          player
        );
      }

      if (
        player.games ===
        0
      ) {
        player.name =
          performance.player_name;

        player.latestPosition =
          position;
      }

      addPerformanceToBucket(
        player,
        performance
      );

      let positionBucket =
        player.positions.get(
          position
        );

      if (
        !positionBucket
      ) {
        positionBucket =
          createStatBucket();

        player.positions.set(
          position,
          positionBucket
        );
      }

      addPerformanceToBucket(
        positionBucket,
        performance
      );
    }

    const players =
      Array.from(
        playerMap.values()
      )
        .map(
          (player) => {
            const positionStats =
              Array.from(
                player.positions.entries()
              )
                .map(
                  ([
                    position,
                    stats,
                  ]) => ({
                    position,
                    ...formatBucket(
                      stats
                    ),
                  })
                )
                .sort(
                  (a, b) =>
                    b.games -
                    a.games
                );

            const primaryPosition =
              positionStats[0]
                ?.position ??
              player.latestPosition ??
              "";

            return {
              id:
                player.id,

              name:
                player.name,

              position:
                primaryPosition,

              ...formatBucket(
                player
              ),

              positionStats,
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

function createStatBucket(): StatBucket {
  return {
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
}

function addPerformanceToBucket(
  bucket: StatBucket,
  performance: DatabasePlayer
) {
  bucket.games++;

  bucket.goals +=
    numberValue(
      performance.goals
    );

  bucket.assists +=
    numberValue(
      performance.assists
    );

  bucket.shots +=
    numberValue(
      performance.shots
    );

  bucket.passesMade +=
    numberValue(
      performance.passes_made
    );

  bucket.passAttempts +=
    numberValue(
      performance.pass_attempts
    );

  bucket.tacklesMade +=
    numberValue(
      performance.tackles_made
    );

  bucket.tackleAttempts +=
    numberValue(
      performance.tackle_attempts
    );

  bucket.saves +=
    numberValue(
      performance.saves
    );

  bucket.redCards +=
    numberValue(
      performance.red_cards
    );

  const rating =
    numberValue(
      performance.rating
    );

  if (
    rating > 0
  ) {
    bucket.ratingTotal +=
      rating;

    bucket.ratingCount++;

    if (
      bucket.recentRatings
        .length < 5
    ) {
      bucket.recentRatings.push(
        rating
      );
    }
  }
}

function formatBucket(
  bucket: StatBucket
) {
  const averageRating =
    bucket.ratingCount > 0
      ? bucket.ratingTotal /
        bucket.ratingCount
      : 0;

  const passSuccess =
    bucket.passAttempts > 0
      ? (
          bucket.passesMade /
          bucket.passAttempts
        ) * 100
      : 0;

  const tackleSuccess =
    bucket.tackleAttempts > 0
      ? (
          bucket.tacklesMade /
          bucket.tackleAttempts
        ) * 100
      : 0;

  return {
    games:
      bucket.games,

    goals:
      bucket.goals,

    assists:
      bucket.assists,

    averageRating:
      round(
        averageRating,
        2
      ),

    shots:
      bucket.shots,

    passesMade:
      bucket.passesMade,

    passAttempts:
      bucket.passAttempts,

    passSuccess:
      round(
        passSuccess,
        1
      ),

    tacklesMade:
      bucket.tacklesMade,

    tackleAttempts:
      bucket.tackleAttempts,

    tackleSuccess:
      round(
        tackleSuccess,
        1
      ),

    saves:
      bucket.saves,

    redCards:
      bucket.redCards,

    recentRatings:
      bucket.recentRatings,
  };
}

function normalizeEaPosition(
  value: string | null
) {
  const position =
    (
      value ??
      ""
    )
      .trim()
      .toLowerCase();

  if (
    position ===
    "goalkeeper"
  ) {
    return "goalkeeper";
  }

  if (
    position ===
    "defender"
  ) {
    return "defender";
  }

  if (
    position ===
    "midfielder"
  ) {
    return "midfielder";
  }

  if (
    position ===
    "forward"
  ) {
    return "forward";
  }

  return position ||
    "unknown";
}

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
