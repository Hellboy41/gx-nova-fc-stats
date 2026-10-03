import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CLUB_ID = "1663";
const PLATFORM = "common-gen5";
const MATCH_TYPE = "friendlyMatch";

type RawClub = {
  goals?: string | number;
  goalsAgainst?: string | number;

  details?: {
    name?: string;
    clubId?: number | string;
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

type PlayerRow = {
  match_id: number;

  player_ea_id: string | null;

  player_name: string;

  position: string | null;

  rating: number;

  goals: number;
  assists: number;

  shots: number;

  passes_made: number;
  pass_attempts: number;

  tackles_made: number;
  tackle_attempts: number;

  saves: number;

  red_cards: number;

  raw_data: RawPlayer;

  updated_at: string;
};

/* =========================================================
   POST
   Synchronisation EA -> Supabase

   IMPORTANT :
   On récupère UNIQUEMENT les friendlyMatch.
========================================================= */

export async function POST() {
  try {
    const supabase =
      createAdminClient();

    const warnings: string[] =
      [];

    /* =====================================================
       1. RÉCUPÉRATION DES FRIENDLY MATCHS
    ===================================================== */

    const url =
      `https://proclubs.ea.com/api/fc/clubs/matches` +
      `?platform=${PLATFORM}` +
      `&clubIds=${CLUB_ID}` +
      `&matchType=${MATCH_TYPE}` +
      `&maxResultCount=50`;

    const response =
      await fetch(url, {
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
      });

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "Impossible de récupérer les matchs EA.",

          details:
            `Erreur EA ${response.status}`,
        },
        {
          status: 502,
        }
      );
    }

    const data:
      RawMatch[] =
      await response.json();

    if (
      !Array.isArray(data)
    ) {
      return NextResponse.json(
        {
          error:
            "La réponse EA n'est pas au format attendu.",
        },
        {
          status: 502,
        }
      );
    }

    /* =====================================================
       2. SUPPRESSION DES MATCHS EN DOUBLE
    ===================================================== */

    const uniqueMatches =
      new Map<
        string,
        RawMatch
      >();

    for (
      const match
      of data
    ) {
      if (
        match.matchId ===
          undefined ||
        match.matchId ===
          null
      ) {
        continue;
      }

      const key =
        String(
          match.matchId
        );

      if (
        !uniqueMatches.has(
          key
        )
      ) {
        uniqueMatches.set(
          key,
          match
        );
      }
    }

    const matchesToSave =
      Array.from(
        uniqueMatches.values()
      );

    if (
      matchesToSave.length ===
      0
    ) {
      return NextResponse.json({
        success:
          true,

        clubId:
          CLUB_ID,

        platform:
          PLATFORM,

        matchType:
          MATCH_TYPE,

        matchesFound:
          0,

        matchesSynchronized:
          0,

        playerPerformancesSynchronized:
          0,

        ignoredInvalidPlayers:
          0,

        warnings,
      });
    }

    /* =====================================================
       3. PRÉPARATION DES MATCHS
    ===================================================== */

    const now =
      new Date().toISOString();

    const matchRows =
      matchesToSave.map(
        (match) => {
          const clubs =
            match.clubs ??
            {};

          const gxNova =
            clubs[
              CLUB_ID
            ];

          const opponentEntry =
            Object.entries(
              clubs
            ).find(
              ([clubId]) =>
                clubId !==
                CLUB_ID
            );

          const opponent =
            opponentEntry?.[
              1
            ];

          const goalsFor =
            numberValue(
              gxNova?.goals
            );

          const goalsAgainst =
            gxNova
              ?.goalsAgainst !==
            undefined
              ? numberValue(
                  gxNova
                    .goalsAgainst
                )
              : numberValue(
                  opponent
                    ?.goals
                );

          let result:
            | "V"
            | "N"
            | "D" = "N";

          if (
            goalsFor >
            goalsAgainst
          ) {
            result =
              "V";
          }

          if (
            goalsFor <
            goalsAgainst
          ) {
            result =
              "D";
          }

          const timestamp =
            numberValue(
              match.timestamp
            );

          return {
            platform:
              PLATFORM,

            ea_match_id:
              String(
                match.matchId
              ),

            club_id:
              CLUB_ID,

            played_at:
              timestamp > 0
                ? new Date(
                    timestamp *
                      1000
                  ).toISOString()
                : null,

            /*
             * Toujours friendlyMatch
             */
            match_type:
              MATCH_TYPE,

            opponent_name:
              opponent
                ?.details
                ?.name ??
              "Adversaire inconnu",

            goals_for:
              goalsFor,

            goals_against:
              goalsAgainst,

            result,

            raw_data:
              match,

            imported_at:
              now,

            updated_at:
              now,
          };
        }
      );

    /* =====================================================
       4. ENREGISTREMENT DES MATCHS
    ===================================================== */

    const {
      data:
        savedMatches,

      error:
        matchesError,
    } =
      await supabase
        .from(
          "matches"
        )
        .upsert(
          matchRows,
          {
            onConflict:
              "platform,ea_match_id",
          }
        )
        .select(
          "id, ea_match_id"
        );

    if (
      matchesError
    ) {
      console.error(
        "Erreur matchs :",
        matchesError
      );

      return NextResponse.json(
        {
          error:
            "Erreur lors de l'enregistrement des matchs.",

          details:
            matchesError.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =====================================================
       5. CORRESPONDANCE EA -> SUPABASE
    ===================================================== */

    const matchIdMap =
      new Map<
        string,
        number
      >();

    for (
      const savedMatch
      of savedMatches ??
      []
    ) {
      matchIdMap.set(
        String(
          savedMatch
            .ea_match_id
        ),

        Number(
          savedMatch.id
        )
      );
    }

    /* =====================================================
       6. PRÉPARATION DES JOUEURS
    ===================================================== */

    const playerRowsMap =
      new Map<
        string,
        PlayerRow
      >();

    let ignoredPlayers =
      0;

    for (
      const match
      of matchesToSave
    ) {
      const eaMatchId =
        String(
          match.matchId
        );

      const databaseMatchId =
        matchIdMap.get(
          eaMatchId
        );

      if (
        !databaseMatchId
      ) {
        continue;
      }

      const clubPlayers =
        match.players?.[
          CLUB_ID
        ];

      const normalizedPlayers =
        normalizePlayers(
          clubPlayers
        );

      for (
        const item
        of normalizedPlayers
      ) {
        const player =
          item.player;

        const playerName =
          textValue(
            firstValue(
              player,
              [
                "playername",
                "playerName",
                "name",
                "gamertag",
                "personaName",
              ]
            )
          ).trim();

        /* ===============================================
           IGNORER LES PSEUDOS EA INVALIDES
        =============================================== */

        if (
          !isValidPlayerName(
            playerName
          )
        ) {
          ignoredPlayers++;

          continue;
        }

        const playerEaId =
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
          item.id ||
          null;

        const position =
          textValue(
            firstValue(
              player,
              [
                "pos",
                "position",
                "vproPosition",
                "vproposition",
              ]
            )
          );

        const playerRow:
          PlayerRow = {
          match_id:
            databaseMatchId,

          player_ea_id:
            playerEaId,

          player_name:
            playerName,

          position:
            position ||
            null,

          rating:
            numberValue(
              firstValue(
                player,
                [
                  "rating",
                  "matchRating",
                ]
              )
            ),

          goals:
            numberValue(
              firstValue(
                player,
                [
                  "goals",
                ]
              )
            ),

          assists:
            numberValue(
              firstValue(
                player,
                [
                  "assists",
                ]
              )
            ),

          shots:
            numberValue(
              firstValue(
                player,
                [
                  "shots",
                ]
              )
            ),

          passes_made:
            numberValue(
              firstValue(
                player,
                [
                  "passesmade",
                  "passesMade",
                ]
              )
            ),

          pass_attempts:
            numberValue(
              firstValue(
                player,
                [
                  "passattempts",
                  "passAttempts",
                ]
              )
            ),

          tackles_made:
            numberValue(
              firstValue(
                player,
                [
                  "tacklesmade",
                  "tacklesMade",
                ]
              )
            ),

          tackle_attempts:
            numberValue(
              firstValue(
                player,
                [
                  "tackleattempts",
                  "tackleAttempts",
                ]
              )
            ),

          saves:
            numberValue(
              firstValue(
                player,
                [
                  "saves",
                ]
              )
            ),

          red_cards:
            numberValue(
              firstValue(
                player,
                [
                  "redcards",
                  "redCards",
                ]
              )
            ),

          raw_data:
            player,

          updated_at:
            now,
        };

        /*
         * Un seul pseudo
         * par match.
         */
        const uniqueKey =
          `${databaseMatchId}::${playerName}`;

        playerRowsMap.set(
          uniqueKey,
          playerRow
        );
      }
    }

    const playerRows =
      Array.from(
        playerRowsMap.values()
      );

    /* =====================================================
       7. ENREGISTREMENT DES JOUEURS
    ===================================================== */

    if (
      playerRows.length >
      0
    ) {
      const {
        error:
          playersError,
      } =
        await supabase
          .from(
            "match_players"
          )
          .upsert(
            playerRows,
            {
              onConflict:
                "match_id,player_name",
            }
          );

      if (
        playersError
      ) {
        console.error(
          "Erreur joueurs :",
          playersError
        );

        return NextResponse.json(
          {
            error:
              "Les matchs ont été enregistrés mais une erreur est survenue avec les joueurs.",

            details:
              playersError.message,

            matchesSynchronized:
              savedMatches
                ?.length ??
              0,

            playersPrepared:
              playerRows.length,

            ignoredPlayers,
          },
          {
            status:
              500,
          }
        );
      }
    }

    /* =====================================================
       8. SUCCÈS
    ===================================================== */

    return NextResponse.json({
      success:
        true,

      clubId:
        CLUB_ID,

      platform:
        PLATFORM,

      /*
       * Important :
       * cela permet de voir clairement
       * que seuls les amicaux sont récupérés.
       */
      matchType:
        MATCH_TYPE,

      matchesFound:
        matchesToSave.length,

      matchesSynchronized:
        savedMatches
          ?.length ??
        0,

      playerPerformancesSynchronized:
        playerRows.length,

      ignoredInvalidPlayers:
        ignoredPlayers,

      warnings,
    });
  } catch (error) {
    console.error(
      "Erreur sync-matches :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible de synchroniser les matchs.",

        details:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   JOUEUR VALIDE ?
========================================================= */

function isValidPlayerName(
  playerName: string
) {
  const invalidNames = [
    "",
    "-",
    "--",
    "---",
    "null",
    "undefined",
  ];

  return !invalidNames.includes(
    playerName.toLowerCase()
  );
}

/* =========================================================
   OUTILS
========================================================= */

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

function textValue(
  value: unknown
) {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return "";
  }

  return String(
    value
  );
}

function firstValue(
  player:
    RawPlayer,

  keys:
    string[]
) {
  for (
    const key
    of keys
  ) {
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
    ([
      id,
      player,
    ]) => ({
      id,
      player,
    })
  );
}