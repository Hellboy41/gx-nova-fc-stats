import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CRON_SCHEDULE = "30 2 * * *";
const HEALTHY_CRON_MAX_AGE_HOURS = 36;

type SyncRunRow = {
  id: number;
  trigger_type: "manual" | "cron";
  status: "running" | "success" | "error";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  matches_found: number | null;
  matches_accepted: number | null;
  matches_synchronized: number | null;
  player_performances_synchronized: number | null;
  short_matches_excluded: number | null;
  artificial_draws_corrected: number | null;
  programme_links_cleared: number | null;
  error_message: string | null;
};

export async function GET() {
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("ea_sync_runs")
    .select(
      "id, trigger_type, status, started_at, finished_at, duration_ms, matches_found, matches_accepted, matches_synchronized, player_performances_synchronized, short_matches_excluded, artificial_draws_corrected, programme_links_cleared, error_message"
    )
    .order("started_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json(
      {
        error:
          "Impossible de récupérer l'historique des synchronisations EA.",
        details: error.message,
      },
      { status: 500 }
    );
  }

  const runs = (data ?? []) as SyncRunRow[];
  const lastRun = runs[0] ?? null;
  const lastCronRun =
    runs.find((run) => run.trigger_type === "cron") ?? null;
  const lastSuccessfulCron =
    runs.find(
      (run) =>
        run.trigger_type === "cron" &&
        run.status === "success"
    ) ?? null;
  const lastManualRun =
    runs.find((run) => run.trigger_type === "manual") ?? null;

  const lastCronSuccessAgeHours = lastSuccessfulCron
    ? Math.max(
        0,
        (Date.now() -
          new Date(lastSuccessfulCron.started_at).getTime()) /
          3_600_000
      )
    : null;

  const cronHealthy =
    lastCronSuccessAgeHours !== null &&
    lastCronSuccessAgeHours <= HEALTHY_CRON_MAX_AGE_HOURS;

  return NextResponse.json({
    cronSchedule: CRON_SCHEDULE,
    cronHealthy,
    lastCronSuccessAgeHours,
    lastRun,
    lastCronRun,
    lastSuccessfulCron,
    lastManualRun,
    runs,
  });
}
