import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlayerKey } from "@/lib/players/status";

const CLUB_ID = "1663";
const PARIS_TIME_ZONE = "Europe/Paris";

type TrackingRow = {
  id: number;
  player_key: string;
  player_ea_id: string | null;
  player_name: string;
  watch_date: string | null;
  watch_permanent: boolean;
  is_enabled: boolean;
  notes: string | null;
  updated_at: string | null;
};

type DetectionRow = {
  player_key: string;
  external_club_id: string;
  external_club_name: string | null;
  ea_match_id: string;
  match_type: string | null;
  played_at: string | null;
  opponent_name: string | null;
  goals_for: number | null;
  goals_against: number | null;
  detected_at: string;
};

type ScanRow = {
  id: number;
  player_key: string;
  status: string;
  clubs_scanned: number;
  matches_scanned: number;
  discovered_clubs: number;
  failed_requests: number;
  detections: number;
  started_at: string;
  completed_at: string | null;
  error: string | null;
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
          "Le suivi externe est réservé à l'administrateur et au staff.",
      },
      { status: 403 }
    );
  }

  return null;
}

export async function GET() {
  const authorization = await requireActiveStaff();
  const accessError = staffOnly(authorization);
  if (accessError) return accessError;

  const admin = createAdminClient();
  const eveningDate = eveningDateKey(new Date());

  const [
    trackingResult,
    detectionResult,
    scansResult,
  ] = await Promise.all([
    admin
      .from("external_player_tracking")
      .select(
        "id, player_key, player_ea_id, player_name, watch_date, watch_permanent, is_enabled, notes, updated_at"
      )
      .eq("club_id", CLUB_ID)
      .order("player_name", {
        ascending: true,
      }),
    admin
      .from("external_player_detections")
      .select(
        "player_key, external_club_id, external_club_name, ea_match_id, match_type, played_at, opponent_name, goals_for, goals_against, detected_at"
      )
      .eq("club_id", CLUB_ID)
      .order("played_at", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(1000),
    admin
      .from("external_player_scans")
      .select(
        "id, player_key, status, clubs_scanned, matches_scanned, discovered_clubs, failed_requests, detections, started_at, completed_at, error"
      )
      .eq("club_id", CLUB_ID)
      .eq("scan_date", eveningDate)
      .order("started_at", {
        ascending: false,
      })
      .limit(1000),
  ]);

  if (trackingResult.error) {
    return NextResponse.json(
      {
        error:
          "Impossible de charger le suivi externe.",
        details: trackingResult.error.message,
      },
      { status: 500 }
    );
  }

  if (detectionResult.error) {
    return NextResponse.json(
      {
        error:
          "Impossible de charger les détections externes.",
        details: detectionResult.error.message,
      },
      { status: 500 }
    );
  }

  if (scansResult.error) {
    return NextResponse.json(
      {
        error:
          "Impossible de charger l'historique des scans.",
        details: scansResult.error.message,
      },
      { status: 500 }
    );
  }

  const detectionsByPlayer =
    new Map<string, DetectionRow[]>();

  for (const row of
    (detectionResult.data ?? []) as DetectionRow[]) {
    if (
      !row.played_at ||
      eveningDateKey(new Date(row.played_at)) !==
        eveningDate
    ) {
      continue;
    }

    const current =
      detectionsByPlayer.get(row.player_key) ?? [];

    current.push(row);

    detectionsByPlayer.set(
      row.player_key,
      current
    );
  }

  const latestScanByPlayer =
    new Map<string, ScanRow>();

  for (const row of
    (scansResult.data ?? []) as ScanRow[]) {
    if (!latestScanByPlayer.has(row.player_key)) {
      latestScanByPlayer.set(
        row.player_key,
        row
      );
    }
  }

  const items =
    ((trackingResult.data ?? []) as TrackingRow[]).map(
      (row) => {
        const latestScan =
          latestScanByPlayer.get(row.player_key) ?? null;

        return {
          id: row.id,
          playerKey: row.player_key,
          playerEaId: row.player_ea_id,
          playerName: row.player_name,
          watchDate: row.watch_date,
          watchPermanent: row.watch_permanent,
          isEnabled: row.is_enabled,
          notes: row.notes,
          updatedAt: row.updated_at,
          isWatchingTonight:
            row.is_enabled &&
            (
              row.watch_permanent ||
              row.watch_date === eveningDate
            ),
          detectionsTonight:
            (
              detectionsByPlayer.get(row.player_key) ?? []
            ).map(
              (detection) => ({
                eaMatchId: detection.ea_match_id,
                externalClubId:
                  detection.external_club_id,
                externalClubName:
                  detection.external_club_name,
                matchType: detection.match_type,
                playedAt: detection.played_at,
                opponentName:
                  detection.opponent_name,
                goalsFor: detection.goals_for,
                goalsAgainst:
                  detection.goals_against,
                detectedAt: detection.detected_at,
              })
            ),
          latestScan: latestScan
            ? {
                id: latestScan.id,
                status: latestScan.status,
                clubsScanned:
                  latestScan.clubs_scanned,
                matchesScanned:
                  latestScan.matches_scanned,
                discoveredClubs:
                  latestScan.discovered_clubs,
                failedRequests:
                  latestScan.failed_requests,
                detections:
                  latestScan.detections,
                startedAt:
                  latestScan.started_at,
                completedAt:
                  latestScan.completed_at,
                error: latestScan.error,
              }
            : null,
        };
      }
    );

  return NextResponse.json({
    eveningDate,
    items,
  });
}

export async function PATCH(
  request: Request
) {
  const authorization =
    await requireActiveStaff();
  const accessError =
    staffOnly(authorization);
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
      ? body.playerName.trim().slice(0, 120)
      : "";

  const notes =
    typeof body.notes === "string"
      ? body.notes.trim().slice(0, 500)
      : "";

  const watchMode =
    body.watchMode === "permanent"
      ? "permanent"
      : body.watchMode === "off"
      ? "off"
      : "tonight";

  if (!playerName) {
    return NextResponse.json(
      {
        error:
          "Le joueur est obligatoire.",
      },
      { status: 400 }
    );
  }

  const playerKey =
    getPlayerKey(
      playerEaId,
      playerName
    );

  const eveningDate =
    eveningDateKey(
      new Date()
    );

  const now =
    new Date().toISOString();

  const admin =
    createAdminClient();

  const { error } =
    await admin
      .from(
        "external_player_tracking"
      )
      .upsert(
        {
          club_id: CLUB_ID,
          player_key: playerKey,
          player_ea_id:
            playerEaId,
          player_name:
            playerName,
          external_club_id:
            null,
          external_club_name:
            null,
          watch_date:
            watchMode ===
              "tonight"
              ? eveningDate
              : null,
          watch_permanent:
            watchMode ===
            "permanent",
          is_enabled:
            watchMode !==
            "off",
          notes:
            notes ||
            null,
          created_by:
            authorization.profile
              ?.userId ??
            null,
          updated_by:
            authorization.profile
              ?.userId ??
            null,
          updated_at:
            now,
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
          "Impossible d'enregistrer le suivi externe.",
        details:
          error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    playerKey,
    watchMode,
    eveningDate,
  });
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

  if (!year || !month || !day) {
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
