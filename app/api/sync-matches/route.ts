import { after, NextResponse } from "next/server";
import { refreshDiscordPublications } from "@/lib/discord/publish";
import { parisDay } from "@/lib/discord/week";
import { addProgrammeDays } from "@/lib/programme-period";
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
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;

  const run = await startEaSyncRun(
    "manual",
    authorization.profile?.userId ?? null
  );

  try {
    const result = await syncEaMatches();

    await finishEaSyncRunSuccess(run, result);
    const today=parisDay(new Date());
    after(() => refreshDiscordPublications("gx-nova-legacy",
      [today,addProgrammeDays(today,-7),addProgrammeDays(today,-14),addProgrammeDays(today,-21)],["results"]));


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
