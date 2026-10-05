import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  EaSyncError,
  syncEaMatches,
} from "@/lib/ea/sync-matches";

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

  try {
    const result =
      await syncEaMatches();

    return NextResponse.json({
      ...result,
      trigger: "vercel-cron",
    });
  } catch (error) {
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
