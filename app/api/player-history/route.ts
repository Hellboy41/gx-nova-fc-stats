import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";

const CLUB_ID = "1663";

type PlayerPerformanceRow = {
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

type MatchRow = {
  id: number;
  ea_match_id: string;
  played_at: string | null;
  opponent_name: string;
  goals_for: number;
  goals_against: number;
  result: "V" | "N" | "D";
  season_id: number | null;
  competition_id: number | null;
};

type SeasonRow = {
  id: number;
  name: string;
};

type CompetitionRow = {
  id: number;
  name: string;
  short_name: string | null;
};

export async function GET(
  request: Request
) {
  const authorization =
    await requireActiveStaff();

  if (
    authorization.error
  ) {
    return authorization.error;
  }

  try {
    const url =
      new URL(
        request.url
      );

    const playerId =
      (
        url.searchParams.get(
          "playerId"
        ) ??
        ""
      ).trim();

    const playerName =
      (
        url.searchParams.get(
          "playerName"
        ) ??
        ""
      ).trim();

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

    if (
      !playerId &&
      !playerName
    ) {
      return NextResponse.json(
        {
          error:
            "Le joueur est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      createAdminClient();

    let matchQuery =
      admin
        .from(
          "matches"
        )
        .select(`
          id,
          ea_match_id,
          played_at,
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

    if (
      matchesError
    ) {
      throw matchesError;
    }

    const matches =
      (matchesData ??
        []) as MatchRow[];

    if (
      matches.length ===
      0
    ) {
      return NextResponse.json({
        playerId,
        playerName,
        performances: [],
      });
    }

    const matchIds =
      matches.map(
        (match) =>
          match.id
      );

    const selectFields = `
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
    `;

    let performances:
      PlayerPerformanceRow[] =
      [];

    if (playerId) {
      const {
        data,
        error,
      } =
        await admin
          .from(
            "match_players"
          )
          .select(
            selectFields
          )
          .in(
            "match_id",
            matchIds
          )
          .eq(
            "player_ea_id",
            playerId
          );

      if (
        error
      ) {
        throw error;
      }

      performances =
        (data ??
          []) as PlayerPerformanceRow[];
    }

    if (
      performances.length ===
        0 &&
      playerName
    ) {
      const {
        data,
        error,
      } =
        await admin
          .from(
            "match_players"
          )
          .select(
            selectFields
          )
          .in(
            "match_id",
            matchIds
          )
          .eq(
            "player_name",
            playerName
          );

      if (
        error
      ) {
        throw error;
      }

      performances =
        (data ??
          []) as PlayerPerformanceRow[];
    }

    const matchMap =
      new Map<
        number,
        MatchRow
      >();

    for (
      const match of
      matches
    ) {
      matchMap.set(
        match.id,
        match
      );
    }

    const seasonIds =
      Array.from(
        new Set(
          matches
            .map(
              (match) =>
                match.season_id
            )
            .filter(
              (
                value
              ): value is number =>
                typeof value ===
                "number"
            )
        )
      );

    const competitionIds =
      Array.from(
        new Set(
          matches
            .map(
              (match) =>
                match.competition_id
            )
            .filter(
              (
                value
              ): value is number =>
                typeof value ===
                "number"
            )
        )
      );

    const [
      seasonsResult,
      competitionsResult,
    ] =
      await Promise.all([
        seasonIds.length >
        0
          ? admin
              .from(
                "seasons"
              )
              .select(
                "id, name"
              )
              .in(
                "id",
                seasonIds
              )
          : Promise.resolve({
              data:
                [] as SeasonRow[],
              error: null,
            }),

        competitionIds.length >
        0
          ? admin
              .from(
                "competitions"
              )
              .select(
                "id, name, short_name"
              )
              .in(
                "id",
                competitionIds
              )
          : Promise.resolve({
              data:
                [] as CompetitionRow[],
              error: null,
            }),
      ]);

    if (
      seasonsResult.error
    ) {
      throw seasonsResult.error;
    }

    if (
      competitionsResult.error
    ) {
      throw competitionsResult.error;
    }

    const seasonMap =
      new Map<
        number,
        SeasonRow
      >(
        (
          seasonsResult.data ??
          []
        ).map(
          (season) => [
            season.id,
            season as SeasonRow,
          ]
        )
      );

    const competitionMap =
      new Map<
        number,
        CompetitionRow
      >(
        (
          competitionsResult.data ??
          []
        ).map(
          (competition) => [
            competition.id,
            competition as CompetitionRow,
          ]
        )
      );

    const formatted =
      performances
        .map(
          (
            performance
          ) => {
            const match =
              matchMap.get(
                performance.match_id
              );

            if (!match) {
              return null;
            }

            const passAttempts =
              numberValue(
                performance.pass_attempts
              );

            const passesMade =
              numberValue(
                performance.passes_made
              );

            const tackleAttempts =
              numberValue(
                performance.tackle_attempts
              );

            const tacklesMade =
              numberValue(
                performance.tackles_made
              );

            const season =
              match.season_id
                ? seasonMap.get(
                    match.season_id
                  ) ??
                  null
                : null;

            const competition =
              match.competition_id
                ? competitionMap.get(
                    match.competition_id
                  ) ??
                  null
                : null;

            return {
              matchId:
                match.id,

              eaMatchId:
                match.ea_match_id,

              playedAt:
                match.played_at,

              opponent:
                match.opponent_name,

              goalsFor:
                numberValue(
                  match.goals_for
                ),

              goalsAgainst:
                numberValue(
                  match.goals_against
                ),

              result:
                match.result,

              seasonId:
                match.season_id,

              seasonName:
                season?.name ??
                null,

              competitionId:
                match.competition_id,

              competitionName:
                competition?.name ??
                null,

              competitionShortName:
                competition?.short_name ??
                null,

              position:
                normalizeEaPosition(
                  performance.position
                ),

              rating:
                round(
                  numberValue(
                    performance.rating
                  ),
                  2
                ),

              goals:
                numberValue(
                  performance.goals
                ),

              assists:
                numberValue(
                  performance.assists
                ),

              shots:
                numberValue(
                  performance.shots
                ),

              passesMade,

              passAttempts,

              passSuccess:
                passAttempts >
                0
                  ? round(
                      (
                        passesMade /
                        passAttempts
                      ) *
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
                      (
                        tacklesMade /
                        tackleAttempts
                      ) *
                        100,
                      1
                    )
                  : 0,

              saves:
                numberValue(
                  performance.saves
                ),

              redCards:
                numberValue(
                  performance.red_cards
                ),
            };
          }
        )
        .filter(
          (
            value
          ): value is NonNullable<
            typeof value
          > =>
            value !==
            null
        )
        .sort(
          (a, b) =>
            new Date(
              b.playedAt ??
                0
            ).getTime() -
            new Date(
              a.playedAt ??
                0
            ).getTime()
        );

    return NextResponse.json({
      playerId,
      playerName:
        formatted.length >
        0
          ? performances[0]
              ?.player_name ??
            playerName
          : playerName,
      performances:
        formatted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Impossible de récupérer l'historique détaillé du joueur.",
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
    Number(
      value
    );

  return Number.isInteger(
    parsed
  ) &&
    parsed >
      0
    ? parsed
    : null;
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
      "goalkeeper" ||
    position ===
      "defender" ||
    position ===
      "midfielder" ||
    position ===
      "forward"
  ) {
    return position;
  }

  return position ||
    "unknown";
}

function numberValue(
  value: unknown
) {
  const parsed =
    Number(
      value
    );

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
    10 **
    decimals;

  return (
    Math.round(
      value *
        multiplier
    ) /
    multiplier
  );
}
