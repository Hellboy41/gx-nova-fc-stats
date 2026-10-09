import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import {
  EaSyncError,
  syncEaMatches,
} from "@/lib/ea/sync-matches";
import {
  finishEaSyncRunError,
  finishEaSyncRunSuccess,
  startEaSyncRun,
} from "@/lib/ea/sync-history";

export const dynamic = "force-dynamic";

export async function POST() {
  const authorization = await requireActiveStaff({ write: true });
  if (authorization.error) return authorization.error;

  const run = await startEaSyncRun(
    "manual",
    authorization.profile?.userId ?? null
  );

  try {
    const result = await syncEaMatches();

    await finishEaSyncRunSuccess(run, result);

    return NextResponse.json({
      ...result,
      syncRunId: run?.id ?? null,
      trigger: "manual",
    });
  } catch (error) {
    await finishEaSyncRunError(run, error);

    console.error("Erreur sync-matches :", error);

    return NextResponse.json(
      {
        error: "Impossible de synchroniser les matchs.",
        details:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
        syncRunId: run?.id ?? null,
        trigger: "manual",
      },
      {
        status:
          error instanceof EaSyncError
            ? error.status
            : 500,
      }
    );
  }
}
