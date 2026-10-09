import {
  NextRequest,
  NextResponse,
} from "next/server";
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

export async function GET(
  request: NextRequest
) {
  const cronSecret =
    process.env.CRON_SECRET;

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !cronSecret ||
    authorization !==
      `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      {
        error:
          "Cron non autorisé.",
      },
      {
        status: 401,
      }
    );
  }

  const run = await startEaSyncRun("cron");

  try {
    const result =
      await syncEaMatches();

    await finishEaSyncRunSuccess(run, result);

    return NextResponse.json({
      ...result,
      trigger: "vercel-cron",
      syncRunId: run?.id ?? null,
      cronSchedule:
        request.headers.get(
          "x-vercel-cron-schedule"
        ) ?? null,
    });
  } catch (error) {
    await finishEaSyncRunError(run, error);

    console.error(
      "Erreur cron sync-matches :",
      error
    );

    return NextResponse.json(
      {
        error:
          "La synchronisation EA automatique a échoué.",
        details:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
        trigger: "vercel-cron",
        syncRunId: run?.id ?? null,
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
