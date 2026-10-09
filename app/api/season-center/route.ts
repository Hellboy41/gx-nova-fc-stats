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

type PositionBucket = {
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
};

type PlayerBucket = PositionBucket & {
  id: string;
  name: string;
  positions: Map<string, PositionBucket>;
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

    const seasonId =
      parsePositiveInt(
        url.searchParams.get(
          "seasonId"
        )
      );

    if (
      seasonId === null
    ) {
      return NextResponse.json(
        {
          error:
            "La saison est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      createAdminClient();

    const [
      seasonResult,
      matchesResult,
      competitionsResult,
    ] =
      await Promise.all([
        admin
          .from(
            "seasons"
          )
          .select(
            "id, name, starts_on, ends_on, is_active"
          )
          .eq(
            "id",
            seasonId
          )
          .maybeSingle(),

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
          .eq(
            "season_id",
            seasonId
          )
          .order(
            "played_at",
            {
              ascending: true,
              nullsFirst: false,
            }
          ),

        admin
          .from(
            "competitions"
          )
          .select(
            "id, name, short_name"
          ),
      ]);

    if (
      seasonResult.error
    ) {
      throw seasonResult.error;
    }

    if (
      matchesResult.error
    ) {
      throw matchesResult.error;
    }

    if (
      competitionsResult.error
    ) {
      throw competitionsResult.error;
    }

    if (
      !seasonResult.data
    ) {
      return NextResponse.json(
        {
          error:
            "Saison introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    const matches =
      (
        matchesResult.data ??
        []
      ) as MatchRow[];

    const competitionMap =
      new Map<
        number,
        {
          id: number;
          name: string;
          short_name: string | null;
        }
      >(
        (
          competitionsResult.data ??
          []
        ).map(
          (
            competition
          ) => [
            competition.id,
            competition,
          ]
        )
      );

    if (
      matches.length ===
      0
    ) {
      return NextResponse.json({
        season: {
          id:
            seasonResult.data.id,
          name:
            seasonResult.data.name,
          startsOn:
            seasonResult.data.starts_on,
          endsOn:
            seasonResult.data.ends_on,
          isActive:
            Boolean(
              seasonResult.data.is_active
            ),
        },
        totals:
          emptyTotals(),
        months: [],
        competitions: [],
        players: [],
        mvp: null,
        mvpMinimumGames: 1,
        topByPosition: {
          goalkeeper: [],
          defender: [],
          midfielder: [],
          forward: [],
        },
        bestXi: [],
        bestXiMinimumGames: 1,
        records: {
          biggestWin: null,
          biggestLoss: null,
          highestScoring: null,
          longestUnbeaten: 0,
          longestWinStreak: 0,
          topScorer: null,
          topAssister: null,
          topSaves: null,
        },
      });
    }

    const matchIds =
      matches.map(
        (
          match
        ) =>
          match.id
      );

    const matchTimestamp =
      new Map<
        number,
        number
      >(
        matches.map(
          (
            match
          ) => [
            match.id,
            match.played_at
              ? new Date(
                  match.played_at
                ).getTime()
              : 0,
          ]
        )
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

    const performances =
      (
        playerData ??
        []
      ) as PlayerRow[];

    performances.sort(
      (
        a,
        b
      ) =>
        (
          matchTimestamp.get(
            b.match_id
          ) ??
          0
        ) -
        (
          matchTimestamp.get(
            a.match_id
          ) ??
          0
        )
    );

    const playerBuckets =
      new Map<
        string,
        PlayerBucket
      >();

    for (
      const performance
      of performances
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

      const id =
        performance.player_ea_id?.trim() ||
        `name:${normalizeName(
          performance.player_name
        )}`;

      let player =
        playerBuckets.get(
          id
        );

      if (
        !player
      ) {
        player = {
          id,
          name:
            performance.player_name,
          ...newBucket(),
          positions:
            new Map<
              string,
              PositionBucket
            >(),
        };

        playerBuckets.set(
          id,
          player
        );
      }

      addPerformance(
        player,
        performance
      );

      const position =
        normalizePosition(
          performance.position
        );

      let positionBucket =
        player.positions.get(
          position
        );

      if (
        !positionBucket
      ) {
        positionBucket =
          newBucket();

        player.positions.set(
          position,
          positionBucket
        );
      }

      addPerformance(
        positionBucket,
        performance
      );
    }

    const players =
      Array.from(
        playerBuckets.values()
      )
        .map(
          (
            player
          ) => {
            const positionStats =
              Array.from(
                player.positions.entries()
              )
                .map(
                  ([
                    position,
                    bucket,
                  ]) =>
                    formatBucket(
                      bucket,
                      position
                    )
                )
                .sort(
                  (
                    a,
                    b
                  ) =>
                    b.games -
                      a.games ||
                    b.averageRating -
                      a.averageRating
                );

            const primaryPosition =
              positionStats[0]
                ?.position ??
              "unknown";

            return {
              id:
                player.id,
              name:
                player.name,
              primaryPosition,
              games:
                player.games,
              goals:
                player.goals,
              assists:
                player.assists,
              averageRating:
                averageRating(
                  player
                ),
              saves:
                player.saves,
              positionStats,
            };
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            b.games -
              a.games ||
            b.averageRating -
              a.averageRating
        );

    const totals =
      buildTotals(
        matches
      );

    const months =
      buildMonths(
        matches
      );

    const competitions =
      buildCompetitionBreakdown(
        matches,
        competitionMap
      );

    const mvpMinimumGames =
      Math.max(
        3,
        Math.ceil(
          matches.length *
            0.25
        )
      );

    const mvpCandidates =
      players
        .map(
          (
            player
          ) => {
            const primary =
              player.positionStats.find(
                (
                  stats
                ) =>
                  stats.position ===
                  player.primaryPosition
              );

            if (
              !primary ||
              primary.games <
                mvpMinimumGames
            ) {
              return null;
            }

            return {
              player,
              stats:
                primary,
            };
          }
        )
        .filter(
          (
            item
          ): item is NonNullable<
            typeof item
          > =>
            Boolean(
              item
            )
        )
        .sort(
          (
            a,
            b
          ) =>
            b.stats.averageRating -
              a.stats.averageRating ||
            b.stats.games -
              a.stats.games ||
            (
              b.stats.goals +
              b.stats.assists
            ) -
              (
                a.stats.goals +
                a.stats.assists
              )
        );

    const mvpCandidate =
      mvpCandidates[0] ??
      null;

    const mvp =
      mvpCandidate
        ? {
            playerId:
              mvpCandidate.player.id,
            playerName:
              mvpCandidate.player.name,
            position:
              mvpCandidate.stats.position,
            games:
              mvpCandidate.stats.games,
            averageRating:
              mvpCandidate.stats.averageRating,
            goals:
              mvpCandidate.stats.goals,
            assists:
              mvpCandidate.stats.assists,
            saves:
              mvpCandidate.stats.saves,
          }
        : null;

    const topByPosition =
      Object.fromEntries(
        [
          "goalkeeper",
          "defender",
          "midfielder",
          "forward",
        ].map(
          (
            position
          ) => [
            position,
            players
              .map(
                (
                  player
                ) => {
                  const stats =
                    player.positionStats.find(
                      (
                        item
                      ) =>
                        item.position ===
                        position
                    );

                  return stats
                    ? {
                        playerId:
                          player.id,
                        playerName:
                          player.name,
                        ...stats,
                      }
                    : null;
                }
              )
              .filter(
                (
                  item
                ): item is NonNullable<
                  typeof item
                > =>
                  Boolean(
                    item
                  )
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  b.averageRating -
                    a.averageRating ||
                  b.games -
                    a.games
              )
              .slice(
                0,
                5
              ),
          ]
        )
      );

    const bestXiMinimumGames =
      Math.max(
        2,
        Math.ceil(
          matches.length *
            0.2
        )
      );

    const bestXi =
      buildBestXi(
        players,
        bestXiMinimumGames
      );

    const sortedChronological =
      [
        ...matches,
      ].sort(
        (
          a,
          b
        ) =>
          timestamp(
            a.played_at
          ) -
          timestamp(
            b.played_at
          )
      );

    const records = {
      biggestWin:
        matchRecord(
          [...matches]
            .filter(
              (
                match
              ) =>
                match.result ===
                "V"
            )
            .sort(
              (
                a,
                b
              ) =>
                margin(
                  b
                ) -
                margin(
                  a
                )
            )[0] ??
            null
        ),

      biggestLoss:
        matchRecord(
          [...matches]
            .filter(
              (
                match
              ) =>
                match.result ===
                "D"
            )
            .sort(
              (
                a,
                b
              ) =>
                margin(
                  a
                ) -
                margin(
                  b
                )
            )[0] ??
            null
        ),

      highestScoring:
        matchRecord(
          [...matches]
            .sort(
              (
                a,
                b
              ) =>
                totalGoals(
                  b
                ) -
                totalGoals(
                  a
                )
            )[0] ??
            null
        ),

      longestUnbeaten:
        longestStreak(
          sortedChronological,
          (
            match
          ) =>
            match.result !==
            "D"
        ),

      longestWinStreak:
        longestStreak(
          sortedChronological,
          (
            match
          ) =>
            match.result ===
            "V"
        ),

      topScorer:
        [...players].sort(
          (
            a,
            b
          ) =>
            b.goals -
              a.goals ||
            b.assists -
              a.assists
        )[0] ??
        null,

      topAssister:
        [...players].sort(
          (
            a,
            b
          ) =>
            b.assists -
              a.assists ||
            b.goals -
              a.goals
        )[0] ??
        null,

      topSaves:
        [...players]
          .filter(
            (
              player
            ) =>
              player.saves >
              0
          )
          .sort(
            (
              a,
              b
            ) =>
              b.saves -
                a.saves
          )[0] ??
        null,
    };

    return NextResponse.json({
      season: {
        id:
          seasonResult.data.id,
        name:
          seasonResult.data.name,
        startsOn:
          seasonResult.data.starts_on,
        endsOn:
          seasonResult.data.ends_on,
        isActive:
          Boolean(
            seasonResult.data.is_active
          ),
      },
      totals,
      months,
      competitions,
      players,
      mvp,
      mvpMinimumGames,
      topByPosition,
      bestXi,
      bestXiMinimumGames,
      records,
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          "Impossible de construire le Centre Saison.",
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

function newBucket(): PositionBucket {
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
  };
}

function addPerformance(
  bucket: PositionBucket,
  performance: PlayerRow
) {
  bucket.games +=
    1;
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
    rating >
    0
  ) {
    bucket.ratingTotal +=
      rating;
    bucket.ratingCount +=
      1;
  }
}

function formatBucket(
  bucket: PositionBucket,
  position: string
) {
  return {
    position,
    games:
      bucket.games,
    goals:
      bucket.goals,
    assists:
      bucket.assists,
    averageRating:
      averageRating(
        bucket
      ),
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
  };
}

function averageRating(
  bucket: PositionBucket
) {
  return bucket.ratingCount >
    0
    ? round(
        bucket.ratingTotal /
          bucket.ratingCount,
        2
      )
    : 0;
}

function buildTotals(
  matches: MatchRow[]
) {
  const played =
    matches.length;

  const wins =
    matches.filter(
      (
        match
      ) =>
        match.result ===
        "V"
    ).length;

  const draws =
    matches.filter(
      (
        match
      ) =>
        match.result ===
        "N"
    ).length;

  const losses =
    matches.filter(
      (
        match
      ) =>
        match.result ===
        "D"
    ).length;

  const goalsFor =
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
    );

  const goalsAgainst =
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
    );

  const cleanSheets =
    matches.filter(
      (
        match
      ) =>
        numberValue(
          match.goals_against
        ) ===
        0
    ).length;

  return {
    matches:
      played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference:
      goalsFor -
      goalsAgainst,
    winRate:
      played >
      0
        ? round(
            (
              wins /
              played
            ) *
              100,
            1
          )
        : 0,
    cleanSheets,
    cleanSheetRate:
      played >
      0
        ? round(
            (
              cleanSheets /
              played
            ) *
              100,
            1
          )
        : 0,
    goalsForPerMatch:
      played >
      0
        ? round(
            goalsFor /
              played,
            2
          )
        : 0,
    goalsAgainstPerMatch:
      played >
      0
        ? round(
            goalsAgainst /
              played,
            2
          )
        : 0,
  };
}

function emptyTotals() {
  return {
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    winRate: 0,
    cleanSheets: 0,
    cleanSheetRate: 0,
    goalsForPerMatch: 0,
    goalsAgainstPerMatch: 0,
  };
}

function buildMonths(
  matches: MatchRow[]
) {
  const groups =
    new Map<
      string,
      MatchRow[]
    >();

  for (
    const match
    of matches
  ) {
    if (
      !match.played_at
    ) {
      continue;
    }

    const key =
      parisMonthKey(
        match.played_at
      );

    if (
      !groups.has(
        key
      )
    ) {
      groups.set(
        key,
        []
      );
    }

    groups.get(
      key
    )?.push(
      match
    );
  }

  return Array.from(
    groups.entries()
  )
    .sort(
      (
        [a],
        [b]
      ) =>
        a.localeCompare(
          b
        )
    )
    .map(
      ([
        key,
        monthMatches,
      ]) => {
        const totals =
          buildTotals(
            monthMatches
          );

        return {
          key,
          label:
            monthLabel(
              key
            ),
          matches:
            totals.matches,
          wins:
            totals.wins,
          draws:
            totals.draws,
          losses:
            totals.losses,
          goalsFor:
            totals.goalsFor,
          goalsAgainst:
            totals.goalsAgainst,
          goalDifference:
            totals.goalDifference,
          winRate:
            totals.winRate,
          goalsForPerMatch:
            totals.goalsForPerMatch,
          goalsAgainstPerMatch:
            totals.goalsAgainstPerMatch,
        };
      }
    );
}

function buildCompetitionBreakdown(
  matches: MatchRow[],
  competitionMap: Map<
    number,
    {
      id: number;
      name: string;
      short_name: string | null;
    }
  >
) {
  const groups =
    new Map<
      string,
      {
        id:
          number | null;
        name:
          string;
        shortName:
          string;
        matches:
          MatchRow[];
      }
    >();

  for (
    const match
    of matches
  ) {
    const key =
      match.competition_id
        ? String(
            match.competition_id
          )
        : "unassigned";

    const competition =
      match.competition_id
        ? competitionMap.get(
            match.competition_id
          ) ??
          null
        : null;

    if (
      !groups.has(
        key
      )
    ) {
      groups.set(
        key,
        {
          id:
            match.competition_id ??
            null,
          name:
            competition?.name ??
            "Non attribué",
          shortName:
            competition?.short_name ??
            competition?.name ??
            "Non attribué",
          matches: [],
        }
      );
    }

    groups.get(
      key
    )?.matches.push(
      match
    );
  }

  return Array.from(
    groups.values()
  )
    .map(
      (
        group
      ) => {
        const totals =
          buildTotals(
            group.matches
          );

        return {
          id:
            group.id,
          name:
            group.name,
          shortName:
            group.shortName,
          matches:
            totals.matches,
          wins:
            totals.wins,
          draws:
            totals.draws,
          losses:
            totals.losses,
          goalsFor:
            totals.goalsFor,
          goalsAgainst:
            totals.goalsAgainst,
          goalDifference:
            totals.goalDifference,
          winRate:
            totals.winRate,
        };
      }
    )
    .sort(
      (
        a,
        b
      ) =>
        b.matches -
          a.matches ||
        b.winRate -
          a.winRate
    );
}

function buildBestXi(
  players: Array<{
    id: string;
    name: string;
    positionStats: Array<{
      position: string;
      games: number;
      averageRating: number;
    }>;
  }>,
  minimumGames: number
) {
  const formation = [
    {
      role:
        "goalkeeper",
      slots: [
        "GK",
      ],
    },
    {
      role:
        "defender",
      slots: [
        "DCG",
        "DC",
        "DCD",
      ],
    },
    {
      role:
        "midfielder",
      slots: [
        "MG",
        "MCG",
        "MC",
        "MCD",
        "MD",
      ],
    },
    {
      role:
        "forward",
      slots: [
        "ATG",
        "ATD",
      ],
    },
  ];

  const used =
    new Set<
      string
    >();

  const result:
    Array<{
      slot: string;
      role: string;
      playerId: string;
      playerName: string;
      games: number;
      averageRating: number;
      qualified: boolean;
    }> = [];

  for (
    const group
    of formation
  ) {
    const candidates =
      players
        .map(
          (
            player
          ) => {
            const stats =
              player.positionStats.find(
                (
                  item
                ) =>
                  item.position ===
                  group.role
              );

            return stats
              ? {
                  player,
                  stats,
                }
              : null;
          }
        )
        .filter(
          (
            item
          ): item is NonNullable<
            typeof item
          > =>
            Boolean(
              item
            )
        )
        .sort(
          (
            a,
            b
          ) => {
            const aq =
              a.stats.games >=
              minimumGames
                ? 1
                : 0;
            const bq =
              b.stats.games >=
              minimumGames
                ? 1
                : 0;

            if (
              aq !==
              bq
            ) {
              return (
                bq -
                aq
              );
            }

            return (
              b.stats.averageRating -
                a.stats.averageRating ||
              b.stats.games -
                a.stats.games
            );
          }
        );

    for (
      const slot
      of group.slots
    ) {
      const candidate =
        candidates.find(
          (
            item
          ) =>
            !used.has(
              item.player.id
            )
        );

      if (
        !candidate
      ) {
        continue;
      }

      used.add(
        candidate.player.id
      );

      result.push({
        slot,
        role:
          group.role,
        playerId:
          candidate.player.id,
        playerName:
          candidate.player.name,
        games:
          candidate.stats.games,
        averageRating:
          candidate.stats.averageRating,
        qualified:
          candidate.stats.games >=
          minimumGames,
      });
    }
  }

  return result;
}

function matchRecord(
  match: MatchRow | null
) {
  if (
    !match
  ) {
    return null;
  }

  return {
    id:
      match.id,
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
  };
}

function longestStreak(
  matches: MatchRow[],
  predicate: (
    match: MatchRow
  ) => boolean
) {
  let best =
    0;
  let current =
    0;

  for (
    const match
    of matches
  ) {
    if (
      predicate(
        match
      )
    ) {
      current +=
        1;
      best =
        Math.max(
          best,
          current
        );
    } else {
      current =
        0;
    }
  }

  return best;
}

function margin(
  match: MatchRow
) {
  return (
    numberValue(
      match.goals_for
    ) -
    numberValue(
      match.goals_against
    )
  );
}

function totalGoals(
  match: MatchRow
) {
  return (
    numberValue(
      match.goals_for
    ) +
    numberValue(
      match.goals_against
    )
  );
}

function normalizePosition(
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

function parisMonthKey(
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
      }
    ).formatToParts(
      date
    );

  const get =
    (
      type: string
    ) =>
      parts.find(
        (
          part
        ) =>
          part.type ===
          type
      )?.value ??
      "";

  return `${get(
    "year"
  )}-${get(
    "month"
  )}`;
}

function monthLabel(
  key: string
) {
  const [
    year,
    month,
  ] =
    key.split(
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
        1,
        12
      )
    );

  const label =
    new Intl.DateTimeFormat(
      "fr-FR",
      {
        month:
          "short",
        year:
          "2-digit",
        timeZone:
          PARIS_TIME_ZONE,
      }
    ).format(
      date
    );

  return label.replace(
    ".",
    ""
  );
}

function parsePositiveInt(
  value: string | null
) {
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

function timestamp(
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
