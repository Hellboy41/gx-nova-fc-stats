import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";

const CLUB_ID = "1663";
const PARIS_TIMEZONE = "Europe/Paris";

type JsonRecord = Record<string, unknown>;

type ProgrammePlanRow = {
  event_id: string;
  formation: string | null;
  availability: unknown;
  lineup: unknown;
  bench: unknown;
};

function parisDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const map = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`,
  };
}

function addDaysIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function sundayOfWeek(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  const day = date.getUTCDay();

  return addDaysIso(isoDate, -day);
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function cleanNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function countAvailability(value: unknown) {
  const counts = {
    available: 0,
    maybe: 0,
    absent: 0,
  };

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return counts;
  }

  for (const rawEntry of Object.values(value as Record<string, unknown>)) {
    if (
      !rawEntry ||
      typeof rawEntry !== "object" ||
      Array.isArray(rawEntry)
    ) {
      continue;
    }

    const status = cleanString((rawEntry as JsonRecord).status);

    if (
      status === "available" ||
      status === "maybe" ||
      status === "absent"
    ) {
      counts[status] += 1;
    }
  }

  return counts;
}

export async function GET() {
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;

  try {
    const admin = createAdminClient();
    const now = parisDateParts();
    const currentWeekStart = sundayOfWeek(now.date);
    const rangeStart = addDaysIso(currentWeekStart, -7);
    const rangeEnd = addDaysIso(currentWeekStart, 28);

    const [programmeResult, competitionsResult, plansResult] =
      await Promise.all([
        admin
          .from("weekly_programs")
          .select("week_start, schedule")
          .eq("club_id", CLUB_ID)
          .gte("week_start", rangeStart)
          .lte("week_start", rangeEnd)
          .order("week_start", { ascending: true }),

        admin
          .from("competitions")
          .select("id, name, short_name")
          .eq("club_id", CLUB_ID),

        admin
          .from("programme_event_plans")
          .select("event_id, formation, availability, lineup, bench")
          .eq("club_id", CLUB_ID)
          .gte("week_start", rangeStart)
          .lte("week_start", rangeEnd),
      ]);

    if (programmeResult.error) throw programmeResult.error;
    if (competitionsResult.error) throw competitionsResult.error;
    if (plansResult.error) throw plansResult.error;

    const competitionMap = new Map<number, string>();

    for (const competition of competitionsResult.data ?? []) {
      competitionMap.set(
        competition.id,
        competition.short_name ?? competition.name
      );
    }

    const planMap = new Map<string, ProgrammePlanRow>();

    for (const plan of (plansResult.data ?? []) as ProgrammePlanRow[]) {
      planMap.set(plan.event_id, plan);
    }

    const events: Array<{
      weekStart: string;
      eventDate: string;
      eventId: string;
      time: string;
      type: "competition" | "tournament";
      competitionId: number | null;
      competitionName: string;
      title: string;
      opponentName: string;
      opponentLogoUrl: string;
      notes: string;
      status: "upcoming" | "played";
      linkedMatchId: number | null;
      goalsFor: number | null;
      goalsAgainst: number | null;
      result: "V" | "N" | "D" | null;
      plan: null | {
        formation: string;
        lineupCount: number;
        benchCount: number;
        available: number;
        maybe: number;
        absent: number;
      };
    }> = [];

    for (const programmeRow of programmeResult.data ?? []) {
      const schedule = programmeRow.schedule;

      if (
        !schedule ||
        typeof schedule !== "object" ||
        Array.isArray(schedule)
      ) {
        continue;
      }

      for (const [eventDate, rawItems] of Object.entries(
        schedule as Record<string, unknown>
      )) {
        if (!Array.isArray(rawItems)) continue;

        for (const rawItem of rawItems) {
          if (
            !rawItem ||
            typeof rawItem !== "object" ||
            Array.isArray(rawItem)
          ) {
            continue;
          }

          const item = rawItem as JsonRecord;
          const eventId = cleanString(item.id);
          if (!eventId) continue;

          const type =
            item.type === "tournament"
              ? "tournament"
              : "competition";

          const competitionId = cleanNumber(item.competitionId);
          const plan = planMap.get(eventId);
          const availability = countAvailability(plan?.availability);
          const lineup = Array.isArray(plan?.lineup) ? plan?.lineup : [];
          const bench = Array.isArray(plan?.bench) ? plan?.bench : [];
          const linkedMatchId = cleanNumber(item.linkedMatchId);
          const rawResult = cleanString(item.result);

          events.push({
            weekStart: cleanString(programmeRow.week_start),
            eventDate,
            eventId,
            time: cleanString(item.time),
            type,
            competitionId,
            competitionName:
              competitionId
                ? competitionMap.get(competitionId) ?? ""
                : type === "tournament"
                ? cleanString(item.title)
                : "",
            title: cleanString(item.title),
            opponentName: cleanString(item.opponentName),
            opponentLogoUrl: cleanString(item.opponentLogoUrl),
            notes: cleanString(item.notes),
            status:
              item.status === "played" || linkedMatchId
                ? "played"
                : "upcoming",
            linkedMatchId,
            goalsFor: cleanNumber(item.goalsFor),
            goalsAgainst: cleanNumber(item.goalsAgainst),
            result:
              rawResult === "V" ||
              rawResult === "N" ||
              rawResult === "D"
                ? rawResult
                : null,
            plan: plan
              ? {
                  formation: plan.formation ?? "3-5-2",
                  lineupCount: lineup.length,
                  benchCount: bench.length,
                  available: availability.available,
                  maybe: availability.maybe,
                  absent: availability.absent,
                }
              : null,
          });
        }
      }
    }

    events.sort((a, b) => {
      const aKey = `${a.eventDate} ${a.time || "99:99"}`;
      const bKey = `${b.eventDate} ${b.time || "99:99"}`;
      return aKey.localeCompare(bKey);
    });

    const currentWeekEnd = addDaysIso(currentWeekStart, 6);
    const nowKey = `${now.date} ${now.time}`;

    const weekEvents = events.filter(
      (event) =>
        event.eventDate >= currentWeekStart &&
        event.eventDate <= currentWeekEnd
    );

    const upcomingEvents = events.filter((event) => {
      if (event.status === "played") return false;

      const eventKey = `${event.eventDate} ${event.time || "99:99"}`;
      return eventKey >= nowKey;
    });

    return NextResponse.json({
      currentWeekStart,
      nextEvent: upcomingEvents[0] ?? null,
      weekEvents,
      upcomingEvents: upcomingEvents.slice(0, 12),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Impossible de charger le cockpit GX NOVA.",
        details:
          error instanceof Error
            ? error.message
            : "Erreur inconnue.",
      },
      { status: 500 }
    );
  }
}
