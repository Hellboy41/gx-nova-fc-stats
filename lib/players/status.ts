import { createAdminClient } from "@/lib/supabase/admin";

export function normalizeClubPlayerName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/^gx[_\-\s]?/i, "")
    .replace(/[^a-z0-9]/g, "");
}

export function getPlayerKey(
  playerEaId: string | null | undefined,
  playerName: string
) {
  const eaId = (playerEaId ?? "").trim();

  if (eaId) {
    return `ea:${eaId}`;
  }

  return `name:${normalizeClubPlayerName(playerName)}`;
}

export async function getArchivedPlayerKeys(
  clubId: string
) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("club_player_status")
    .select("player_key")
    .eq("club_id", clubId)
    .eq("is_active", false);

  if (error) {
    throw new Error(
      `Impossible de récupérer les joueurs archivés : ${error.message}`
    );
  }

  return new Set(
    (data ?? []).map((row) =>
      String(row.player_key)
    )
  );
}
