import { createAdminClient } from "@/lib/supabase/admin";
import type { EaSyncResult } from "@/lib/ea/sync-matches";

export type EaSyncTrigger = "manual" | "cron";

type SyncRun = {
  id: number;
  started_at: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 2000)
    : "Erreur inconnue";
}

export async function startEaSyncRun(
  triggerType: EaSyncTrigger,
  requestedBy: string | null = null
): Promise<SyncRun | null> {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("ea_sync_runs")
      .insert({
        trigger_type: triggerType,
        status: "running",
        requested_by: requestedBy,
      })
      .select("id, started_at")
      .single();

    if (error) {
      console.error("Impossible de créer l'historique de synchro EA :", error);
      return null;
    }

    return {
      id: Number(data.id),
      started_at: String(data.started_at),
    };
  } catch (error) {
    console.error("Impossible de créer l'historique de synchro EA :", error);
    return null;
  }
}

export async function finishEaSyncRunSuccess(
  run: SyncRun | null,
  result: EaSyncResult
) {
  if (!run) return;

  try {
    const admin = createAdminClient();
    const finishedAt = new Date();
    const startedAt = new Date(run.started_at);
    const durationMs = Math.max(
      0,
      finishedAt.getTime() - startedAt.getTime()
    );

    const { error } = await admin
      .from("ea_sync_runs")
      .update({
        status: "success",
        finished_at: finishedAt.toISOString(),
        duration_ms: durationMs,
        matches_found: result.matchesFound,
        matches_accepted: result.matchesAccepted,
        matches_synchronized: result.matchesSynchronized,
        player_performances_synchronized:
          result.playerPerformancesSynchronized,
        short_matches_excluded: result.shortMatchesExcluded,
        artificial_draws_corrected: result.artificialDrawsCorrected,
        programme_links_cleared: result.programmeLinksCleared,
        error_message: null,
        result,
      })
      .eq("id", run.id);

    if (error) {
      console.error("Impossible de terminer l'historique de synchro EA :", error);
    }
  } catch (error) {
    console.error("Impossible de terminer l'historique de synchro EA :", error);
  }
}

export async function finishEaSyncRunError(
  run: SyncRun | null,
  errorValue: unknown
) {
  if (!run) return;

  try {
    const admin = createAdminClient();
    const finishedAt = new Date();
    const startedAt = new Date(run.started_at);
    const durationMs = Math.max(
      0,
      finishedAt.getTime() - startedAt.getTime()
    );

    const { error } = await admin
      .from("ea_sync_runs")
      .update({
        status: "error",
        finished_at: finishedAt.toISOString(),
        duration_ms: durationMs,
        error_message: errorMessage(errorValue),
      })
      .eq("id", run.id);

    if (error) {
      console.error("Impossible d'enregistrer l'échec de synchro EA :", error);
    }
  } catch (error) {
    console.error("Impossible d'enregistrer l'échec de synchro EA :", error);
  }
}
