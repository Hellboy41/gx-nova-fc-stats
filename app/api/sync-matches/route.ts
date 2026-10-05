import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import {
  EaSyncError,
  syncEaMatches,
} from "@/lib/ea/sync-matches";

export const dynamic = "force-dynamic";

export async function POST() {
  const authorization = await requireActiveStaff({ write: true });
  if (authorization.error) return authorization.error;

  try {
    const result = await syncEaMatches();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur sync-matches :", error);

    return NextResponse.json(
      {
        error: "Impossible de synchroniser les matchs.",
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
