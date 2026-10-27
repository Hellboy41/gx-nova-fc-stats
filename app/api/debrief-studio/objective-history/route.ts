import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEveningDate, sanitizeDebriefChapters } from "@/lib/debrief-studio";

const CLUB_ID = "1663";
const HISTORY_LIMIT = 80;

export type HistoricalObjective = {
  date: string;
  chapterTitle: string;
  id: string;
  trackingId: string;
  title: string;
  status: "todo" | "working" | "done";
};

export async function GET(request: Request) {
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!isEveningDate(date)) {
    return NextResponse.json({ error: "Date de soirée invalide." }, { status: 400 });
  }

  try {
    const { data, error } = await createAdminClient().from("evening_debriefs")
      .select("evening_date, chapters")
      .eq("club_id", CLUB_ID)
      .lt("evening_date", date)
      .order("evening_date", { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) throw error;

    const history: HistoricalObjective[] = [];
    for (const evening of data ?? []) {
      const chapterList = sanitizeDebriefChapters(evening.chapters);
      for (const chapter of chapterList) {
        for (const objective of chapter.objectives ?? []) {
          history.push({
            date: String(evening.evening_date),
            chapterTitle: chapter.title,
            id: objective.id,
            trackingId: objective.trackingId ?? objective.id,
            title: objective.title,
            status: objective.status,
          });
        }
      }
    }

    return NextResponse.json({
      history,
      examinedEvenings: (data ?? []).length,
      limit: HISTORY_LIMIT,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({
      error: "Historique tactique indisponible.",
      details: error instanceof Error ? error.message : "Erreur de lecture.",
    }, { status: 500 });
  }
}
