import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { getArchivedPlayerKeys, getPlayerKey } from "@/lib/players/status";

const CLUB_ID = "1663";
const PARIS_TIME_ZONE = "Europe/Paris";

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

type PlayerRow = {
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

type CompetitionRow = {
  id: number;
  name: string;
  short_name: string | null;
};

type PlayerBucket = {
  id: string;
  name: string;
  positions: Set<string>;
  games: number;
  ratingTotal: number;
  ratingCount: number;
  goals: number;
  assists: number;
  shots: number;
  passesMade: number;
  passAttempts: number;
  tacklesMade: number;
  tackleAttempts: number;
  saves: number;
  redCards: number;
  ratings: Array<{
    matchId: number;
    rating: number;
    position: string;
    playedAt: string | null;
  }>;
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

    const date =
      (
        url.searchParams.get(
          "date"
        ) ??
        ""
      ).trim();

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        date
      )
    ) {
      return NextResponse.json(
        {
          error:
            "La date de soirée est invalide.",
        },
        {
          status: 400,
        }
      );
    }

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

    const admin =
      createAdminClient();

    const windowStart =
      addUtcDays(
        date,
        -1
      );

    const windowEnd =
      addUtcDays(
        date,
        2
      );

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
        )
        .gte(
          "played_at",
          `${windowStart}T00:00:00.000Z`
        )
        .lt(
          "played_at",
          `${windowEnd}T00:00:00.000Z`
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
      data: matchData,
      error: matchError,
    } =
      await matchQuery.order(
        "played_at",
        {
          ascending: true,
          nullsFirst: false,
        }
      );

    if (
      matchError
    ) {
      throw matchError;
    }

    const matches =
      (
        (matchData ??
          []) as MatchRow[]
      ).filter(
        (match) =>
          match.played_at &&
          parisDateKey(
            match.played_at
          ) ===
            date
      );

    if (
      matches.length ===
      0
    ) {
      return NextResponse.json({
        date,
        matches: [],
        players: [],
        mvp: null,
        mvpMinimumGames: 1,
        totals: {
          matches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          cleanSheets: 0,
        },
      });
    }

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

    const competitionsResult =
      competitionIds.length >
      0
        ? await admin
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
        : {
            data:
              [] as CompetitionRow[],
            error: null,
          };

    if (
      competitionsResult.error
    ) {
      throw competitionsResult.error;
    }

    const competitionMap =
      new Map<
        number,
        CompetitionRow
      >(
        (
          competitionsResult.data ??
          []
        ).map(
          (
            competition
          ) => [
            competition.id,
            competition as CompetitionRow,
          ]
        )
      );

    const matchIds =
      matches.map(
        (match) =>
          match.id
      );

    const {
      data: playerData,
      error: playerError,
    } =
      await admin
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

    if (
      playerError
    ) {
      throw playerError;
    }

    const archivedPlayerKeys =
      await getArchivedPlayerKeys(
        CLUB_ID
      );

    const matchMap =
      new Map<
        number,
        MatchRow
      >(
        matches.map(
          (match) => [
            match.id,
            match,
          ]
        )
      );

    const buckets =
      new Map<
        string,
        PlayerBucket
      >();

    for (
      const performance
      of (
        playerData ??
        []
      ) as PlayerRow[]
    ) {
      const playerKey =
        getPlayerKey(
          performance.player_ea_id,
          performance.player_name
        );

      if (
        archivedPlayerKeys.has(
          playerKey
        )
      ) {
        continue;
      }

      const identity =
        performance.player_ea_id?.trim() ||
        normalizeName(
          performance.player_name
        );

      if (
        !identity
      ) {
        continue;
      }

      let bucket =
        buckets.get(
          identity
        );

      if (
        !bucket
      ) {
        bucket = {
          id:
            performance.player_ea_id?.trim() ||
            identity,
          name:
            performance.player_name,
          positions:
            new Set<string>(),
          games: 0,
          ratingTotal: 0,
          ratingCount: 0,
          goals: 0,
          assists: 0,
          shots: 0,
          passesMade: 0,
          passAttempts: 0,
          tacklesMade: 0,
          tackleAttempts: 0,
          saves: 0,
          redCards: 0,
          ratings: [],
        };

        buckets.set(
          identity,
          bucket
        );
      }

      const position =
        normalizeEaPosition(
          performance.position
        );

      bucket.positions.add(
        position
      );

      bucket.games +=
        1;

      const rating =
        numberValue(
          performance.rating
        );

      if (
        rating >
        0
      ) {
        bucket.ratingTotal +=
          rating;
        bucket.ratingCount +=
          1;

        bucket.ratings.push({
          matchId:
            performance.match_id,
          rating,
          position,
          playedAt:
            matchMap.get(
              performance.match_id
            )?.played_at ??
            null,
        });
      }

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
    }

    const players =
      Array.from(
        buckets.values()
      )
        .map(
          (bucket) => {
            const orderedRatings =
              [
                ...bucket.ratings,
              ].sort(
                (a, b) =>
                  timestampValue(
                    a.playedAt
                  ) -
                  timestampValue(
                    b.playedAt
                  )
              );

            const firstRating =
              orderedRatings[0]
                ?.rating ??
              null;

            const lastRating =
              orderedRatings[
                orderedRatings.length -
                  1
              ]?.rating ??
              null;

            const trendDelta =
              orderedRatings.length >=
                2 &&
              firstRating !==
                null &&
              lastRating !==
                null
                ? round(
                    lastRating -
                      firstRating,
                    2
                  )
                : null;

            return {
              id:
                bucket.id,
              name:
                bucket.name,
              games:
                bucket.games,
              positions:
                Array.from(
                  bucket.positions
                ),
              averageRating:
                bucket.ratingCount >
                0
                  ? round(
                      bucket.ratingTotal /
                        bucket.ratingCount,
                      2
                    )
                  : 0,
              goals:
                bucket.goals,
              assists:
                bucket.assists,
              shots:
                bucket.shots,
              passesMade:
                bucket.passesMade,
              passAttempts:
                bucket.passAttempts,
              passSuccess:
                bucket.passAttempts >
                0
                  ? round(
                      (
                        bucket.passesMade /
                        bucket.passAttempts
                      ) *
                        100,
                      1
                    )
                  : 0,
              tacklesMade:
                bucket.tacklesMade,
              tackleAttempts:
                bucket.tackleAttempts,
              tackleSuccess:
                bucket.tackleAttempts >
                0
                  ? round(
                      (
                        bucket.tacklesMade /
                        bucket.tackleAttempts
                      ) *
                        100,
                      1
                    )
                  : 0,
              saves:
                bucket.saves,
              redCards:
                bucket.redCards,
              firstRating,
              lastRating,
              trendDelta,
              ratings:
                orderedRatings.map(
                  (item) => ({
                    matchId:
                      item.matchId,
                    rating:
                      round(
                        item.rating,
                        2
                      ),
                    position:
                      item.position,
                  })
                ),
            };
          }
        )
        .sort(
          (a, b) =>
            b.averageRating -
              a.averageRating ||
            b.games -
              a.games ||
            (
              b.goals +
              b.assists
            ) -
              (
                a.goals +
                a.assists
              )
        );

    const mvpMinimumGames =
      matches.length >=
      2
        ? Math.min(
            2,
            matches.length
          )
        : 1;

    const mvp =
      players.find(
        (player) =>
          player.games >=
            mvpMinimumGames &&
          player.averageRating >
            0
      ) ??
      players.find(
        (player) =>
          player.averageRating >
          0
      ) ??
      null;

    const formattedMatches =
      matches.map(
        (match) => {
          const competition =
            match.competition_id
              ? competitionMap.get(
                  match.competition_id
                ) ??
                null
              : null;

          return {
            id:
              match.id,
            eaMatchId:
              match.ea_match_id,
            playedAt:
              match.played_at,
            time:
              match.played_at
                ? parisTime(
                    match.played_at
                  )
                : "--:--",
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
            competitionId:
              match.competition_id,
            competitionName:
              competition?.name ??
              null,
            competitionShortName:
              competition?.short_name ??
              null,
          };
        }
      );

    const totals = {
      matches:
        matches.length,
      wins:
        matches.filter(
          (match) =>
            match.result ===
            "V"
        ).length,
      draws:
        matches.filter(
          (match) =>
            match.result ===
            "N"
        ).length,
      losses:
        matches.filter(
          (match) =>
            match.result ===
            "D"
        ).length,
      goalsFor:
        matches.reduce(
          (
            total,
            match
          ) =>
            total +
            numberValue(
              match.goals_for
            ),
          0
        ),
      goalsAgainst:
        matches.reduce(
          (
            total,
            match
          ) =>
            total +
            numberValue(
              match.goals_against
            ),
          0
        ),
      cleanSheets:
        matches.filter(
          (match) =>
            numberValue(
              match.goals_against
            ) ===
            0
        ).length,
    };

    return NextResponse.json({
      date,
      matches:
        formattedMatches,
      players,
      mvp,
      mvpMinimumGames,
      totals,
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          "Impossible de construire le rapport de soirée.",
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

function addUtcDays(
  value: string,
  offset: number
) {
  const [
    year,
    month,
    day,
  ] =
    value.split(
      "-"
    ).map(
      Number
    );

  const date =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day +
          offset
      )
    );

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}

function parisDateKey(
  value: string
) {
  const date =
    new Date(
      value
    );

  const parts =
    new Intl.DateTimeFormat(
      "fr-FR",
      {
        timeZone:
          PARIS_TIME_ZONE,
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
      }
    ).formatToParts(
      date
    );

  const get =
    (
      type: string
    ) =>
      parts.find(
        (part) =>
          part.type ===
          type
      )?.value ??
      "";

  return `${get(
    "year"
  )}-${get(
    "month"
  )}-${get(
    "day"
  )}`;
}

function parisTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      timeZone:
        PARIS_TIME_ZONE,
      hour:
        "2-digit",
      minute:
        "2-digit",
      hour12:
        false,
    }
  ).format(
    new Date(
      value
    )
  );
}

function normalizeEaPosition(
  value: string | null
) {
  const normalized =
    (
      value ??
      ""
    )
      .trim()
      .toLowerCase();

  if (
    normalized ===
      "goalkeeper" ||
    normalized ===
      "defender" ||
    normalized ===
      "midfielder" ||
    normalized ===
      "forward"
  ) {
    return normalized;
  }

  return normalized ||
    "unknown";
}

function normalizeName(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    );
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

function timestampValue(
  value: string | null
) {
  if (
    !value
  ) {
    return 0;
  }

  const parsed =
    new Date(
      value
    ).getTime();

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
  const factor =
    10 **
    decimals;

  return (
    Math.round(
      value *
        factor
    ) /
    factor
  );
}
