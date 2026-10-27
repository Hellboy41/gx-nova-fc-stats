import { createAdminClient } from "@/lib/supabase/admin";
import {
  type PerformanceField,
  sanitizePerformanceOverrides,
} from "@/lib/debrief-performances";

// Source unique pour appliquer les corrections du staff aux écrans de lecture.
// La table match_players (source EA) ne reçoit aucune écriture.
const columns: Record<PerformanceField, string> = {
  goals: "goals",
  assists: "assists",
  shots: "shots",
  passesMade: "passes_made",
  passAttempts: "pass_attempts",
  tacklesMade: "tackles_made",
  tackleAttempts: "tackle_attempts",
  saves: "saves",
  redCards: "red_cards",
  rating: "rating",
};

type MatchPlayerRow = {
  match_id: number;
  player_name: string;
};

function key(matchId: number, name: string): string {
  return JSON.stringify([matchId, name]);
}

export async function applyStaffPerformanceCorrections<T extends MatchPlayerRow>(
  clubId: string,
  rows: readonly T[]
): Promise<T[]> {
  if (!rows.length) return [];

  const matchIds = [...new Set(rows.map((row) => row.match_id))];
  const { data, error } = await createAdminClient()
    .from("debrief_player_overrides")
    .select("match_id, player_name, overrides")
    .eq("club_id", clubId)
    .in("match_id", matchIds);

  if (error) throw new Error(`Corrections staff indisponibles : ${error.message}`);

  const edits = new Map(
    (data ?? []).map((entry) => [
      key(Number(entry.match_id), String(entry.player_name)),
      sanitizePerformanceOverrides(entry.overrides) ?? {},
    ])
  );

  return rows.map((row) => {
    const overrides = edits.get(key(row.match_id, row.player_name));
    if (!overrides || Object.keys(overrides).length === 0) return row;

    const corrected: Record<string, unknown> = { ...row };
    for (const [field, value] of Object.entries(overrides) as Array<
      [PerformanceField, number]
    >) {
      const column = columns[field];
      if (column && Object.prototype.hasOwnProperty.call(row, column)) {
        corrected[column] = value;
      }
    }
    return corrected as T;
  });
}
