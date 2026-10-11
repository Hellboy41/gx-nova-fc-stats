import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeClubPlayerName } from "@/lib/players/status";

const CLUB_ID = "1663";
const PLATFORM = "common-gen5";
const PARIS_TIME_ZONE = "Europe/Paris";
const MAX_CLUBS_PER_SCAN = 80;
const MATCH_TYPES = [
  "friendlyMatch",
  "leagueMatch",
] as const;

type TrackingRow = {
  player_key: string;
  player_ea_id: string | null;
  player_name: string;
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

type RawPlayer = Record<string, unknown>;

type RawMatch = {
  matchId?: string | number;
  timestamp?: string | number;
  clubs?: Record<string, RawClub>;
  players?: Record<
    string,
    RawPlayer[] | Record<string, RawPlayer>
  >;
};

function staffOnly(
  authorization: Awaited<ReturnType<typeof requireActiveStaff>>
) {
  if (authorization.error) {
    return authorization.error;
  }

  if (
    authorization.profile?.role !== "admin" &&
    authorization.profile?.role !== "staff"
  ) {
    return NextResponse.json(
      {
        error:
          "Le scanner externe est réservé à l'administrateur et au staff.",
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
    staffOnly(authorization);

  if (accessError) {
    return accessError;
  }

  const admin =
    createAdminClient();

  const eveningDate =
    eveningDateKey(new Date());

  const {
    data: trackingData,
    error: trackingError,
  } =
    await admin
      .from("external_player_tracking")
      .select(
        "player_key, player_ea_id, player_name, watch_date, watch_permanent, is_enabled"
      )
      .eq("club_id", CLUB_ID)
      .eq("is_enabled", true);

  if (trackingError) {
    return NextResponse.json(
      {
        error:
          "Impossible de charger les joueurs surveillés.",
        details:
          trackingError.message,
      },
      { status: 500 }
    );
  }

  const watched =
    (
      (trackingData ?? []) as TrackingRow[]
    ).filter(
      (row) =>
        row.watch_permanent ||
        row.watch_date === eveningDate
    );

  if (watched.length === 0) {
    return NextResponse.json({
      success: true,
      eveningDate,
      watchedPlayers: 0,
      checkedClubs: 0,
      matchesScanned: 0,
      discoveredClubs: 0,
      failedRequests: 0,
      detectionsSaved: 0,
      message:
        "Aucun joueur n'est marqué à surveiller pour cette soirée.",
    });
  }

  await seedCatalogFromGxMatches(admin);

  const {
    data: catalogData,
    error: catalogError,
  } =
    await admin
      .from("ea_club_catalog")
      .select(
        "club_id, club_name, last_checked_at, last_seen_at"
      )
      .eq("platform", PLATFORM)
      .neq("club_id", CLUB_ID)
      .order("last_checked_at", {
        ascending: true,
        nullsFirst: true,
      })
      .order("last_seen_at", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(MAX_CLUBS_PER_SCAN);

  if (catalogError) {
    return NextResponse.json(
      {
        error:
          "Impossible de charger le catalogue de clubs EA.",
        details:
          catalogError.message,
      },
      { status: 500 }
    );
  }

  const scanStartedAt =
    new Date().toISOString();

  const scanIds =
    new Map<string, number>();

  for (const player of watched) {
    const {
      data: inserted,
      error: insertError,
    } =
      await admin
        .from("external_player_scans")
        .insert({
          club_id: CLUB_ID,
          scan_date: eveningDate,
          player_key:
            player.player_key,
          player_ea_id:
            player.player_ea_id,
          player_name:
            player.player_name,
          status: "running",
          started_at:
            scanStartedAt,
          triggered_by:
            authorization.profile
              ?.userId ??
            null,
        })
        .select("id")
        .single();

    if (!insertError && inserted?.id) {
      scanIds.set(
        player.player_key,
        Number(inserted.id)
      );
    }
  }

  let checkedClubs = 0;
  let matchesScanned = 0;
  let failedRequests = 0;
  let discoveredClubs = 0;
  let detectionsSaved = 0;

  const detectedByPlayer =
    new Map<string, number>();

  const knownCatalogIds =
    new Set(
      (catalogData ?? []).map(
        (row) =>
          String(row.club_id)
      )
    );

  const seenRelevantMatches =
    new Set<string>();

  for (const catalogRow of
    catalogData ?? []) {
    const externalClubId =
      String(
        catalogRow.club_id
      );

    let clubSucceeded = false;

    for (const matchType of MATCH_TYPES) {
      try {
        const matches =
          await fetchEaMatches(
            externalClubId,
            matchType
          );

        clubSucceeded = true;

        for (const match of matches) {
          const timestamp =
            numberValue(
              match.timestamp
            );

          const playedAt =
            timestamp > 0
              ? new Date(
                  timestamp * 1000
                ).toISOString()
              : null;

          discoverClubsFromMatch(
            match,
            externalClubId
          );

          for (const [
            discoveredId,
            club,
          ] of Object.entries(
            match.clubs ?? {}
          )) {
            if (
              !discoveredId ||
              discoveredId ===
                CLUB_ID
            ) {
              continue;
            }

            if (
              !knownCatalogIds.has(
                discoveredId
              )
            ) {
              knownCatalogIds.add(
                discoveredId
              );
              discoveredClubs++;
            }

            await admin
              .from(
                "ea_club_catalog"
              )
              .upsert(
                {
                  platform:
                    PLATFORM,
                  club_id:
                    discoveredId,
                  club_name:
                    club.details
                      ?.name?.trim() ||
                    null,
                  discovered_from_club_id:
                    externalClubId,
                  last_seen_at:
                    playedAt,
                  updated_at:
                    new Date()
                      .toISOString(),
                },
                {
                  onConflict:
                    "platform,club_id",
                }
              );
          }

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

          const matchKey =
            String(
              match.matchId ??
                `${externalClubId}:${timestamp}:${matchType}`
            );

          if (
            !seenRelevantMatches.has(
              matchKey
            )
          ) {
            seenRelevantMatches.add(
              matchKey
            );
            matchesScanned++;
          }

          for (const player of watched) {
            if (
              !playerAppearedAnywhere(
                match,
                player.player_ea_id,
                player.player_name
              )
            ) {
              continue;
            }

            const playerClubEntry =
              findPlayerClub(
                match,
                player.player_ea_id,
                player.player_name
              );

            if (
              !playerClubEntry ||
              playerClubEntry.clubId ===
                CLUB_ID
            ) {
              continue;
            }

            const ownClub =
              match.clubs?.[
                playerClubEntry.clubId
              ];

            const opponentEntry =
              Object.entries(
                match.clubs ?? {}
              ).find(
                ([clubId]) =>
                  clubId !==
                  playerClubEntry.clubId
              );

            const opponent =
              opponentEntry?.[1];

            const goalsFor =
              numberValue(
                ownClub?.goals
              );

            const goalsAgainst =
              ownClub
                ?.goalsAgainst !==
                undefined
                ? numberValue(
                    ownClub
                      .goalsAgainst
                  )
                : numberValue(
                    opponent?.goals
                  );

            const eaMatchId =
              String(
                match.matchId ??
                  ""
              );

            if (!eaMatchId) {
              continue;
            }

            const {
              error: saveError,
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
                      player.player_key,
                    player_ea_id:
                      player.player_ea_id,
                    player_name:
                      player.player_name,
                    external_club_id:
                      playerClubEntry.clubId,
                    external_club_name:
                      ownClub?.details
                        ?.name?.trim() ||
                      null,
                    ea_match_id:
                      eaMatchId,
                    match_type:
                      matchType,
                    played_at:
                      playedAt,
                    opponent_name:
                      opponent?.details
                        ?.name?.trim() ||
                      "Adversaire inconnu",
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
              detectionsSaved++;
              detectedByPlayer.set(
                player.player_key,
                (
                  detectedByPlayer.get(
                    player.player_key
                  ) ?? 0
                ) + 1
              );
            }
          }
        }
      } catch {
        failedRequests++;
      }
    }

    if (clubSucceeded) {
      checkedClubs++;
    }

    await admin
      .from("ea_club_catalog")
      .update({
        last_checked_at:
          new Date()
            .toISOString(),
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq("platform", PLATFORM)
      .eq(
        "club_id",
        externalClubId
      );
  }

  const completedAt =
    new Date().toISOString();

  for (const player of watched) {
    const detections =
      detectedByPlayer.get(
        player.player_key
      ) ?? 0;

    const status =
      detections > 0
        ? "detected"
        : failedRequests > 0
        ? "partial"
        : "not_detected";

    const scanId =
      scanIds.get(
        player.player_key
      );

    if (!scanId) {
      continue;
    }

    await admin
      .from(
        "external_player_scans"
      )
      .update({
        status,
        clubs_scanned:
          checkedClubs,
        matches_scanned:
          matchesScanned,
        discovered_clubs:
          discoveredClubs,
        failed_requests:
          failedRequests,
        detections,
        completed_at:
          completedAt,
      })
      .eq("id", scanId);
  }

  return NextResponse.json({
    success: true,
    eveningDate,
    watchedPlayers:
      watched.length,
    checkedClubs,
    matchesScanned,
    discoveredClubs,
    failedRequests,
    detectionsSaved,
    catalogLimit:
      MAX_CLUBS_PER_SCAN,
  });
}

async function seedCatalogFromGxMatches(
  admin: ReturnType<typeof createAdminClient>
) {
  const {
    data,
    error,
  } =
    await admin
      .from("matches")
      .select(
        "raw_data, played_at"
      )
      .eq("club_id", CLUB_ID)
      .order("played_at", {
        ascending: false,
      })
      .limit(500);

  if (error) {
    throw new Error(
      `Impossible d'initialiser le catalogue EA : ${error.message}`
    );
  }

  for (const row of data ?? []) {
    const raw =
      row.raw_data;

    if (
      !raw ||
      typeof raw !==
        "object" ||
      Array.isArray(raw)
    ) {
      continue;
    }

    const clubs =
      (raw as RawMatch)
        .clubs ??
      {};

    for (const [
      clubId,
      club,
    ] of Object.entries(
      clubs
    )) {
      if (
        !clubId ||
        clubId ===
          CLUB_ID
      ) {
        continue;
      }

      await admin
        .from(
          "ea_club_catalog"
        )
        .upsert(
          {
            platform:
              PLATFORM,
            club_id:
              clubId,
            club_name:
              club.details
                ?.name?.trim() ||
              null,
            discovered_from_club_id:
              CLUB_ID,
            last_seen_at:
              row.played_at,
            updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "platform,club_id",
          }
        );
    }
  }
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

function findPlayerClub(
  match: RawMatch,
  playerEaId:
    string | null,
  playerName: string
) {
  for (const [
    clubId,
    players,
  ] of Object.entries(
    match.players ?? {}
  )) {
    if (
      playerAppearedInPlayers(
        players,
        playerEaId,
        playerName
      )
    ) {
      return {
        clubId,
      };
    }
  }

  return null;
}

function playerAppearedAnywhere(
  match: RawMatch,
  playerEaId:
    string | null,
  playerName: string
) {
  return Boolean(
    findPlayerClub(
      match,
      playerEaId,
      playerName
    )
  );
}

function playerAppearedInPlayers(
  value:
    | RawPlayer[]
    | Record<
        string,
        RawPlayer
      >
    | undefined,
  playerEaId:
    string | null,
  playerName: string
) {
  const wantedName =
    normalizeClubPlayerName(
      playerName
    );

  for (const item of
    normalizePlayers(value)) {
    if (
      playerEaId &&
      (
        item.id ===
          playerEaId ||
        textValue(
          firstValue(
            item.player,
            [
              "blazeId",
              "playerId",
              "personaId",
              "id",
            ]
          )
        ) ===
          playerEaId
      )
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
    Array.isArray(value)
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

  return String(value);
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

function discoverClubsFromMatch(
  _match: RawMatch,
  _sourceClubId: string
) {
  // Le catalogue est enrichi directement dans la boucle principale.
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
    ).formatToParts(value);

  const get =
    (type: string) =>
      parts.find(
        (part) =>
          part.type === type
      )?.value ??
      "";

  const year =
    Number(get("year"));
  const month =
    Number(get("month"));
  const day =
    Number(get("day"));
  const hour =
    Number(get("hour"));

  if (
    !year ||
    !month ||
    !day
  ) {
    return "";
  }

  if (hour >= 10) {
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
    .slice(0, 10);
}
