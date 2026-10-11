import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeClubPlayerName } from "@/lib/players/status";

const CLUB_ID = "1663";
const PLATFORM = "common-gen5";
const PARIS_TIME_ZONE = "Europe/Paris";
const MATCH_TYPES = [
  "friendlyMatch",
  "leagueMatch",
] as const;

type TrackingRow = {
  player_key: string;
  player_ea_id: string | null;
  player_name: string;
  external_club_id: string | null;
  external_club_name: string | null;
  watch_date: string | null;
  watch_permanent: boolean;
  is_enabled: boolean;
};

type RawClub = {
  goals?: string | number;
  goalsAgainst?: string | number;
  details?: {
    name?: string;
    clubId?: string | number;
  };
};

type RawPlayer =
  Record<string, unknown>;

type RawMatch = {
  matchId?: string | number;
  timestamp?: string | number;
  clubs?: Record<
    string,
    RawClub
  >;
  players?: Record<
    string,
    RawPlayer[] |
      Record<
        string,
        RawPlayer
      >
  >;
};

function staffOnly(
  authorization: Awaited<ReturnType<typeof requireActiveStaff>>
) {
  if (authorization.error) {
    return authorization.error;
  }

  if (
    authorization.profile?.role !==
      "admin" &&
    authorization.profile?.role !==
      "staff"
  ) {
    return NextResponse.json(
      {
        error:
          "Le suivi externe est réservé à l'administrateur et au staff.",
      },
      { status: 403 }
    );
  }

  return null;
}

export async function POST() {
  const authorization =
    await requireActiveStaff();
  const accessError =
    staffOnly(
      authorization
    );
  if (accessError) {
    return accessError;
  }

  const admin =
    createAdminClient();

  const eveningDate =
    eveningDateKey(
      new Date()
    );

  const {
    data,
    error,
  } =
    await admin
      .from(
        "external_player_tracking"
      )
      .select(
        "player_key, player_ea_id, player_name, external_club_id, external_club_name, watch_date, watch_permanent, is_enabled"
      )
      .eq(
        "club_id",
        CLUB_ID
      )
      .eq(
        "is_enabled",
        true
      );

  if (error) {
    return NextResponse.json(
      {
        error:
          "Impossible de charger les joueurs surveillés.",
        details:
          error.message,
      },
      { status: 500 }
    );
  }

  const watched =
    (
      (data ?? []) as TrackingRow[]
    ).filter(
      (row) =>
        row.watch_permanent ||
        row.watch_date ===
          eveningDate
    );

  const clubIds =
    Array.from(
      new Set(
        watched
          .map(
            (row) =>
              row.external_club_id
                ?.trim() ??
              ""
          )
          .filter(Boolean)
      )
    );

  const matchesByClub =
    new Map<
      string,
      Array<{
        match: RawMatch;
        matchType:
          typeof MATCH_TYPES[number];
      }>
    >();

  const clubErrors =
    new Map<
      string,
      string
    >();

  await Promise.all(
    clubIds.map(
      async (
        externalClubId
      ) => {
        const matches:
          Array<{
            match: RawMatch;
            matchType:
              typeof MATCH_TYPES[number];
          }> = [];

        for (const matchType of
          MATCH_TYPES) {
          try {
            const fetched =
              await fetchEaMatches(
                externalClubId,
                matchType
              );

            for (const match of
              fetched) {
              matches.push({
                match,
                matchType,
              });
            }
          } catch (error) {
            clubErrors.set(
              externalClubId,
              error instanceof
                Error
                ? error.message
                : "Erreur EA inconnue."
            );
          }
        }

        const unique =
          new Map<
            string,
            {
              match: RawMatch;
              matchType:
                typeof MATCH_TYPES[number];
            }
          >();

        for (const item of
          matches) {
          const key =
            String(
              item.match.matchId ??
                ""
            );

          if (
            key &&
            !unique.has(
              key
            )
          ) {
            unique.set(
              key,
              item
            );
          }
        }

        matchesByClub.set(
          externalClubId,
          [...unique.values()]
        );
      }
    )
  );

  let detectionsSaved =
    0;

  const statuses:
    Array<{
      playerKey: string;
      playerName: string;
      externalClubId:
        string | null;
      externalClubName:
        string | null;
      checked: boolean;
      error: string | null;
      detections:
        Array<{
          eaMatchId: string;
          playedAt:
            string | null;
          matchType: string;
          opponentName:
            string;
          goalsFor:
            number;
          goalsAgainst:
            number;
        }>;
    }> = [];

  for (const row of
    watched) {
    const externalClubId =
      row.external_club_id
        ?.trim() ??
      "";

    if (!externalClubId) {
      statuses.push({
        playerKey:
          row.player_key,
        playerName:
          row.player_name,
        externalClubId:
          null,
        externalClubName:
          row.external_club_name,
        checked: false,
        error:
          "Club ID EA non renseigné.",
        detections: [],
      });

      continue;
    }

    const errorMessage =
      clubErrors.get(
        externalClubId
      ) ??
      null;

    const detections:
      Array<{
        eaMatchId: string;
        playedAt:
          string | null;
        matchType: string;
        opponentName:
          string;
        goalsFor:
          number;
        goalsAgainst:
          number;
      }> = [];

    for (const item of
      matchesByClub.get(
        externalClubId
      ) ?? []) {
      const timestamp =
        numberValue(
          item.match.timestamp
        );

      const playedAt =
        timestamp > 0
          ? new Date(
              timestamp *
                1000
            ).toISOString()
          : null;

      if (
        !playedAt ||
        eveningDateKey(
          new Date(
            playedAt
          )
        ) !== eveningDate
      ) {
        continue;
      }

      if (
        !playerAppeared(
          item.match,
          externalClubId,
          row.player_ea_id,
          row.player_name
        )
      ) {
        continue;
      }

      const clubs =
        item.match.clubs ??
        {};

      const ownClub =
        clubs[
          externalClubId
        ];

      const opponentEntry =
        Object.entries(
          clubs
        ).find(
          ([id]) =>
            id !==
            externalClubId
        );

      const opponent =
        opponentEntry?.[1];

      const ownClubName =
        ownClub?.details
          ?.name?.trim() ||
        row.external_club_name ||
        null;

      const goalsFor =
        numberValue(
          ownClub?.goals
        );

      const goalsAgainst =
        ownClub?.goalsAgainst !==
          undefined
          ? numberValue(
              ownClub
                .goalsAgainst
            )
          : numberValue(
              opponent?.goals
            );

      const opponentName =
        opponent?.details
          ?.name?.trim() ||
        "Adversaire inconnu";

      const eaMatchId =
        String(
          item.match.matchId ??
            ""
        );

      if (!eaMatchId) {
        continue;
      }

      detections.push({
        eaMatchId,
        playedAt,
        matchType:
          item.matchType,
        opponentName,
        goalsFor,
        goalsAgainst,
      });

      const {
        error:
          saveError,
      } =
        await admin
          .from(
            "external_player_detections"
          )
          .upsert(
            {
              club_id:
                CLUB_ID,
              player_key:
                row.player_key,
              player_ea_id:
                row.player_ea_id,
              player_name:
                row.player_name,
              external_club_id:
                externalClubId,
              external_club_name:
                ownClubName,
              ea_match_id:
                eaMatchId,
              match_type:
                item.matchType,
              played_at:
                playedAt,
              opponent_name:
                opponentName,
              goals_for:
                goalsFor,
              goals_against:
                goalsAgainst,
              detected_at:
                new Date()
                  .toISOString(),
            },
            {
              onConflict:
                "club_id,player_key,ea_match_id",
            }
          );

      if (!saveError) {
        detectionsSaved +=
          1;
      }

      if (
        ownClubName &&
        ownClubName !==
          row.external_club_name
      ) {
        await admin
          .from(
            "external_player_tracking"
          )
          .update({
            external_club_name:
              ownClubName,
            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "club_id",
            CLUB_ID
          )
          .eq(
            "player_key",
            row.player_key
          );
      }
    }

    detections.sort(
      (a, b) =>
        String(
          b.playedAt ??
            ""
        ).localeCompare(
          String(
            a.playedAt ??
              ""
          )
        )
    );

    statuses.push({
      playerKey:
        row.player_key,
      playerName:
        row.player_name,
      externalClubId,
      externalClubName:
        row.external_club_name,
      checked:
        errorMessage ===
        null,
      error:
        errorMessage,
      detections,
    });
  }

  return NextResponse.json({
    success: true,
    eveningDate,
    watchedPlayers:
      watched.length,
    checkedClubs:
      clubIds.length,
    detectionsSaved,
    statuses,
  });
}

async function fetchEaMatches(
  clubId: string,
  matchType:
    typeof MATCH_TYPES[number]
) {
  const url =
    `https://proclubs.ea.com/api/fc/clubs/matches?platform=${PLATFORM}&clubIds=${encodeURIComponent(
      clubId
    )}&matchType=${matchType}&maxResultCount=10`;

  const response =
    await fetch(
      url,
      {
        headers: {
          Accept:
            "application/json, text/plain, */*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
          Referer:
            "https://www.ea.com/",
          Origin:
            "https://www.ea.com",
        },
        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `EA ${response.status} pour le club ${clubId} (${matchType}).`
    );
  }

  const data =
    (await response.json()) as unknown;

  if (!Array.isArray(data)) {
    throw new Error(
      `Réponse EA invalide pour le club ${clubId}.`
    );
  }

  return data.filter(
    (
      value
    ): value is RawMatch =>
      Boolean(
        value &&
        typeof value ===
          "object" &&
        !Array.isArray(
          value
        )
      )
  );
}

function playerAppeared(
  match: RawMatch,
  externalClubId: string,
  playerEaId:
    string | null,
  playerName: string
) {
  const clubPlayers =
    match.players?.[
      externalClubId
    ];

  const wantedName =
    normalizeClubPlayerName(
      playerName
    );

  for (const item of
    normalizePlayers(
      clubPlayers
    )) {
    if (
      playerEaId &&
      item.id ===
        playerEaId
    ) {
      return true;
    }

    const rawName =
      textValue(
        firstValue(
          item.player,
          [
            "playername",
            "playerName",
            "name",
            "gamertag",
            "personaName",
          ]
        )
      );

    if (
      wantedName &&
      normalizeClubPlayerName(
        rawName
      ) === wantedName
    ) {
      return true;
    }
  }

  return false;
}

function normalizePlayers(
  value:
    | RawPlayer[]
    | Record<
        string,
        RawPlayer
      >
    | undefined
) {
  if (!value) {
    return [];
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value.map(
      (
        player,
        index
      ) => ({
        id:
          textValue(
            firstValue(
              player,
              [
                "blazeId",
                "playerId",
                "personaId",
                "id",
              ]
            )
          ) ||
          `player-${index}`,
        player,
      })
    );
  }

  return Object.entries(
    value
  ).map(
    ([id, player]) => ({
      id,
      player,
    })
  );
}

function firstValue(
  player: RawPlayer,
  keys: string[]
) {
  for (const key of
    keys) {
    if (
      player[key] !==
        undefined &&
      player[key] !==
        null
    ) {
      return player[
        key
      ];
    }
  }

  return undefined;
}

function textValue(
  value: unknown
) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(
    value
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

function eveningDateKey(
  value: Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          PARIS_TIME_ZONE,
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
        hour:
          "2-digit",
        hour12:
          false,
      }
    ).formatToParts(
      value
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

  const year =
    Number(
      get(
        "year"
      )
    );
  const month =
    Number(
      get(
        "month"
      )
    );
  const day =
    Number(
      get(
        "day"
      )
    );
  const hour =
    Number(
      get(
        "hour"
      )
    );

  if (
    !year ||
    !month ||
    !day
  ) {
    return "";
  }

  if (
    hour >= 10
  ) {
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const previous =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day - 1,
        12
      )
    );

  return previous
    .toISOString()
    .slice(
      0,
      10
    );
}
