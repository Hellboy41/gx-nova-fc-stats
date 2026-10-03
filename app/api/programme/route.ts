import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";

const CLUB_ID = "1663";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type LinkMethod = "auto" | "manual" | null;
type ProgrammeStatus = "upcoming" | "played";

type ProgrammeItem = {
  id: string;
  type: "competition" | "tournament";
  competitionId: number | null;
  title: string;
  time: string;
  opponentName: string;
  opponentLogoUrl: string;
  notes: string;
  status: ProgrammeStatus;
  linkedMatchId: number | null;
  linkedEaMatchId: string;
  linkedAt: string;
  linkConfidence: number | null;
  linkMethod: LinkMethod;
  eaOpponentName: string;
  eaPlayedAt: string;
  goalsFor: number | null;
  goalsAgainst: number | null;
  result: "V" | "N" | "D" | null;
};

type ProgrammeSchedule = Record<string, ProgrammeItem[]>;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeItem(value: unknown): ProgrammeItem | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const type =
    candidate.type === "competition" || candidate.type === "tournament"
      ? candidate.type
      : null;

  if (!type) return null;

  const competitionId =
    typeof candidate.competitionId === "number" &&
    Number.isInteger(candidate.competitionId) &&
    candidate.competitionId > 0
      ? candidate.competitionId
      : null;

  const timeRaw = cleanText(candidate.time, 5);
  const time = TIME_RE.test(timeRaw) ? timeRaw : "";
  const linkedMatchId = cleanNumber(candidate.linkedMatchId);
  const goalsFor = cleanNumber(candidate.goalsFor);
  const goalsAgainst = cleanNumber(candidate.goalsAgainst);
  const confidence = cleanNumber(candidate.linkConfidence);
  const result =
    candidate.result === "V" || candidate.result === "N" || candidate.result === "D"
      ? candidate.result
      : null;
  const linkMethod =
    candidate.linkMethod === "auto" || candidate.linkMethod === "manual"
      ? candidate.linkMethod
      : null;

  return {
    id: cleanText(candidate.id, 80) || crypto.randomUUID(),
    type,
    competitionId,
    title: cleanText(candidate.title, 120),
    time,
    opponentName: cleanText(candidate.opponentName, 120),
    opponentLogoUrl: cleanText(candidate.opponentLogoUrl, 700),
    notes: cleanText(candidate.notes, 300),
    status: candidate.status === "played" && linkedMatchId ? "played" : "upcoming",
    linkedMatchId: linkedMatchId && linkedMatchId > 0 ? Math.trunc(linkedMatchId) : null,
    linkedEaMatchId: cleanText(candidate.linkedEaMatchId, 80),
    linkedAt: cleanText(candidate.linkedAt, 40),
    linkConfidence:
      confidence !== null ? Math.max(0, Math.min(100, Math.round(confidence))) : null,
    linkMethod,
    eaOpponentName: cleanText(candidate.eaOpponentName, 120),
    eaPlayedAt: cleanText(candidate.eaPlayedAt, 50),
    goalsFor,
    goalsAgainst,
    result,
  };
}

function sanitizeSchedule(value: unknown): ProgrammeSchedule {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const source = value as Record<string, unknown>;
  const result: ProgrammeSchedule = {};

  for (const [date, items] of Object.entries(source)) {
    if (!DATE_RE.test(date) || !Array.isArray(items)) continue;
    result[date] = items
      .slice(0, 12)
      .map(sanitizeItem)
      .filter((item): item is ProgrammeItem => Boolean(item));
  }

  return result;
}

export async function GET(request: Request) {
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart") ?? "";

  if (!DATE_RE.test(weekStart)) {
    return NextResponse.json(
      { error: "La date de début de semaine est invalide." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const [programmeResult, competitionsResult, aliasesResult] = await Promise.all([
    admin
      .from("weekly_programs")
      .select("schedule, updated_at")
      .eq("club_id", CLUB_ID)
      .eq("week_start", weekStart)
      .maybeSingle(),
    admin
      .from("competitions")
      .select("id, name, short_name, competition_type")
      .eq("club_id", CLUB_ID)
      .order("id", { ascending: true }),
    admin
      .from("opponent_aliases")
      .select("id, programme_name, ea_name, ea_club_id, updated_at")
      .eq("club_id", CLUB_ID)
      .order("programme_name", { ascending: true }),
  ]);

  if (programmeResult.error) {
    return NextResponse.json(
      {
        error: "Impossible de récupérer le programme de la semaine.",
        details: programmeResult.error.message,
      },
      { status: 500 }
    );
  }

  if (competitionsResult.error) {
    return NextResponse.json(
      {
        error: "Impossible de récupérer les compétitions.",
        details: competitionsResult.error.message,
      },
      { status: 500 }
    );
  }

  if (aliasesResult.error) {
    return NextResponse.json(
      {
        error: "Impossible de récupérer les correspondances adversaires.",
        details: aliasesResult.error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    weekStart,
    schedule: sanitizeSchedule(programmeResult.data?.schedule ?? {}),
    updatedAt: programmeResult.data?.updated_at ?? null,
    competitions: competitionsResult.data ?? [],
    aliases: aliasesResult.data ?? [],
    currentUser: authorization.profile,
  });
}

export async function PUT(request: Request) {
  const authorization = await requireActiveStaff({ write: true });
  if (authorization.error) return authorization.error;

  const body = await request.json().catch(() => ({}));
  const weekStart = cleanText(body.weekStart, 10);

  if (!DATE_RE.test(weekStart)) {
    return NextResponse.json(
      { error: "La date de début de semaine est invalide." },
      { status: 400 }
    );
  }

  const schedule = sanitizeSchedule(body.schedule);
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("weekly_programs")
    .upsert(
      {
        club_id: CLUB_ID,
        week_start: weekStart,
        schedule,
        updated_by: authorization.profile?.userId ?? null,
        updated_at: now,
      },
      { onConflict: "club_id,week_start" }
    )
    .select("week_start, schedule, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: "Impossible d'enregistrer le programme de la semaine.",
        details: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    weekStart: data.week_start,
    schedule: sanitizeSchedule(data.schedule),
    updatedAt: data.updated_at,
  });
}
