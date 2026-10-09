import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import {
  getPlayerKey,
  normalizeClubPlayerName,
} from "@/lib/players/status";

const CLUB_ID = "1663";
const PARIS_TIME_ZONE = "Europe/Paris";

type PlayerPerformanceRow = {
  player_ea_id: string | null;
  player_name: string;
  position: string | null;
  updated_at: string | null;
};

type StatusRow = {
  player_key: string;
  player_ea_id: string | null;
  player_name: string;
  is_active: boolean;
  archived_at: string | null;
};

type ManagedPlayer = {
  playerKey: string;
  playerEaId: string | null;
  name: string;
  position: string;
  games: number;
  isActive: boolean;
  archivedAt: string | null;
};

function adminOnly(
  authorization: Awaited<ReturnType<typeof requireActiveStaff>>
) {
  if (authorization.error) {
    return authorization.error;
  }

  if (authorization.profile?.role !== "admin") {
    return NextResponse.json(
      {
        error:
          "Cette action est réservée à l'administrateur.",
      },
      { status: 403 }
    );
  }

  return null;
}

export async function GET() {
  const authorization = await requireActiveStaff();
  const accessError = adminOnly(authorization);
  if (accessError) return accessError;

  const admin = createAdminClient();

  const [playersResult, statusResult] =
    await Promise.all([
      admin
        .from("match_players")
        .select(
          "player_ea_id, player_name, position, updated_at"
        )
        .order("updated_at", {
          ascending: false,
        })
        .limit(5000),
      admin
        .from("club_player_status")
        .select(
          "player_key, player_ea_id, player_name, is_active, archived_at"
        )
        .eq("club_id", CLUB_ID),
    ]);

  if (playersResult.error) {
    return NextResponse.json(
      {
        error:
          "Impossible de récupérer l'effectif.",
        details: playersResult.error.message,
      },
      { status: 500 }
    );
  }

  if (statusResult.error) {
    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les statuts joueurs.",
        details: statusResult.error.message,
      },
      { status: 500 }
    );
  }

  const statusMap = new Map(
    ((statusResult.data ?? []) as StatusRow[]).map(
      (row) => [row.player_key, row]
    )
  );

  const playerMap = new Map<
    string,
    ManagedPlayer
  >();

  for (const row of
    (playersResult.data ?? []) as PlayerPerformanceRow[]) {
    const name = String(
      row.player_name ?? ""
    ).trim();

    if (!name) continue;

    const playerEaId =
      row.player_ea_id?.trim() || null;

    const playerKey =
      getPlayerKey(playerEaId, name);

    const status =
      statusMap.get(playerKey);

    const existing =
      playerMap.get(playerKey);

    if (!existing) {
      playerMap.set(playerKey, {
        playerKey,
        playerEaId,
        name,
        position:
          String(row.position ?? "").trim() ||
          "unknown",
        games: 1,
        isActive:
          status?.is_active !== false,
        archivedAt:
          status?.archived_at ?? null,
      });

      continue;
    }

    existing.games += 1;
  }

  for (const status of statusMap.values()) {
    if (
      playerMap.has(status.player_key)
    ) {
      continue;
    }

    playerMap.set(status.player_key, {
      playerKey: status.player_key,
      playerEaId:
        status.player_ea_id,
      name: status.player_name,
      position: "unknown",
      games: 0,
      isActive:
        status.is_active !== false,
      archivedAt:
        status.archived_at,
    });
  }

  const allPlayers =
    [...playerMap.values()].sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "fr"
        )
    );

  return NextResponse.json({
    currentUser:
      authorization.profile,
    activePlayers:
      allPlayers.filter(
        (player) =>
          player.isActive
      ),
    archivedPlayers:
      allPlayers.filter(
        (player) =>
          !player.isActive
      ),
  });
}

export async function PATCH(
  request: Request
) {
  const authorization =
    await requireActiveStaff();
  const accessError =
    adminOnly(authorization);
  if (accessError) return accessError;

  const body =
    await request
      .json()
      .catch(() => ({}));

  const playerEaId =
    typeof body.playerEaId === "string" &&
    body.playerEaId.trim()
      ? body.playerEaId.trim()
      : null;

  const playerName =
    typeof body.playerName === "string"
      ? body.playerName.trim().slice(
          0,
          120
        )
      : "";

  const requestedKey =
    typeof body.playerKey === "string"
      ? body.playerKey.trim()
      : "";

  const isActive =
    body.isActive === true;

  if (!playerName) {
    return NextResponse.json(
      {
        error:
          "Le nom du joueur est obligatoire.",
      },
      { status: 400 }
    );
  }

  const playerKey =
    getPlayerKey(
      playerEaId,
      playerName
    );

  if (
    requestedKey &&
    requestedKey !== playerKey
  ) {
    return NextResponse.json(
      {
        error:
          "L'identité du joueur est invalide.",
      },
      { status: 400 }
    );
  }

  const admin =
    createAdminClient();
  const now =
    new Date().toISOString();

  const { error } = await admin
    .from("club_player_status")
    .upsert(
      {
        club_id: CLUB_ID,
        player_key: playerKey,
        player_ea_id:
          playerEaId,
        player_name:
          playerName,
        is_active:
          isActive,
        archived_at:
          isActive
            ? null
            : now,
        archived_by:
          isActive
            ? null
            : authorization.profile
                ?.userId ?? null,
        updated_at: now,
      },
      {
        onConflict:
          "club_id,player_key",
      }
    );

  if (error) {
    return NextResponse.json(
      {
        error:
          "Impossible de modifier le statut du joueur.",
        details: error.message,
      },
      { status: 500 }
    );
  }

  if (!isActive) {
    const cleanup =
      await cleanupArchivedPlayer({
        playerEaId,
        playerName,
        now,
      });

    if (!cleanup.success) {
      return NextResponse.json(
        {
          error:
            "Le joueur a été archivé, mais le nettoyage des compositions a échoué.",
          details:
            cleanup.error,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    playerKey,
    isActive,
  });
}

async function cleanupArchivedPlayer({
  playerEaId,
  playerName,
  now,
}: {
  playerEaId: string | null;
  playerName: string;
  now: string;
}) {
  try {
    const admin =
      createAdminClient();

    const currentLineupResult =
      await admin
        .from("lineups")
        .select(
          "id, lineup, bench"
        )
        .eq(
          "club_id",
          CLUB_ID
        )
        .limit(1)
        .maybeSingle();

    if (
      currentLineupResult.error
    ) {
      throw currentLineupResult.error;
    }

    if (
      currentLineupResult.data
    ) {
      const lineup =
        Array.isArray(
          currentLineupResult.data
            .lineup
        )
          ? currentLineupResult.data.lineup.map(
              (raw) => {
                if (
                  !raw ||
                  typeof raw !==
                    "object" ||
                  Array.isArray(raw)
                ) {
                  return raw;
                }

                const spot =
                  raw as Record<
                    string,
                    unknown
                  >;

                const name =
                  typeof spot.name ===
                  "string"
                    ? spot.name
                    : "";

                return samePlayer(
                  null,
                  name,
                  playerEaId,
                  playerName
                )
                  ? {
                      ...spot,
                      name: "",
                    }
                  : raw;
              }
            )
          : [];

      const bench =
        Array.isArray(
          currentLineupResult.data
            .bench
        )
          ? currentLineupResult.data.bench.filter(
              (raw) =>
                typeof raw !==
                  "string" ||
                !samePlayer(
                  null,
                  raw,
                  playerEaId,
                  playerName
                )
            )
          : [];

      const { error: lineupError } =
        await admin
          .from("lineups")
          .update({
            lineup,
            bench,
            updated_at: now,
          })
          .eq(
            "id",
            currentLineupResult.data.id
          );

      if (lineupError) {
        throw lineupError;
      }
    }

    const today =
      parisDateKey(
        new Date()
      );

    const plansResult =
      await admin
        .from(
          "programme_event_plans"
        )
        .select(
          "id, availability, lineup, bench"
        )
        .eq(
          "club_id",
          CLUB_ID
        )
        .gte(
          "event_date",
          today
        );

    if (
      plansResult.error
    ) {
      throw plansResult.error;
    }

    for (const plan of
      plansResult.data ?? []) {
      const availability =
        cleanAvailability(
          plan.availability,
          playerEaId,
          playerName
        );

      const lineup =
        cleanLineupEntries(
          plan.lineup,
          playerEaId,
          playerName
        );

      const bench =
        cleanLineupEntries(
          plan.bench,
          playerEaId,
          playerName
        );

      const { error: planError } =
        await admin
          .from(
            "programme_event_plans"
          )
          .update({
            availability,
            lineup,
            bench,
            updated_at: now,
          })
          .eq(
            "id",
            plan.id
          );

      if (planError) {
        throw planError;
      }
    }

    return {
      success: true as const,
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Erreur inconnue.",
    };
  }
}

function cleanAvailability(
  value: unknown,
  playerEaId: string | null,
  playerName: string
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(
      value as Record<
        string,
        unknown
      >
    ).filter(
      ([key, raw]) => {
        if (
          !raw ||
          typeof raw !== "object" ||
          Array.isArray(raw)
        ) {
          return true;
        }

        const item =
          raw as Record<
            string,
            unknown
          >;

        const candidateId =
          typeof item.playerId ===
          "string"
            ? item.playerId
            : key;

        const candidateName =
          typeof item.name ===
          "string"
            ? item.name
            : "";

        return !samePlayer(
          candidateId,
          candidateName,
          playerEaId,
          playerName
        );
      }
    )
  );
}

function cleanLineupEntries(
  value: unknown,
  playerEaId: string | null,
  playerName: string
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (raw) => {
      if (
        !raw ||
        typeof raw !== "object" ||
        Array.isArray(raw)
      ) {
        return true;
      }

      const item =
        raw as Record<
          string,
          unknown
        >;

      return !samePlayer(
        typeof item.playerId ===
          "string"
          ? item.playerId
          : null,
        typeof item.name ===
          "string"
          ? item.name
          : "",
        playerEaId,
        playerName
      );
    }
  );
}

function samePlayer(
  candidateId: string | null,
  candidateName: string,
  playerEaId: string | null,
  playerName: string
) {
  if (
    playerEaId &&
    candidateId &&
    (
      candidateId ===
        playerEaId ||
      candidateId ===
        `ea:${playerEaId}`
    )
  ) {
    return true;
  }

  const candidateNormalized =
    normalizeClubPlayerName(
      candidateName ||
        candidateId?.replace(
          /^name:/,
          ""
        ) ||
        ""
    );

  return (
    candidateNormalized !== "" &&
    candidateNormalized ===
      normalizeClubPlayerName(
        playerName
      )
  );
}

function parisDateKey(
  date: Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          PARIS_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const values =
    Object.fromEntries(
      parts.map((part) => [
        part.type,
        part.value,
      ])
    );

  return `${values.year}-${values.month}-${values.day}`;
}
