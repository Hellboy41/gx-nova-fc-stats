import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";

const CLUB_ID = "1663";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FORMATIONS = new Set(["3-1-4-2", "3-5-2", "4-3-3", "4-2-2-2", "4-3-1-2"]);
const STATUSES = new Set(["available", "maybe", "absent", "unknown"]);

type AvailabilityStatus = "available" | "maybe" | "absent" | "unknown";

type AvailabilityEntry = {
  playerId: string;
  name: string;
  status: AvailabilityStatus;
};

type LineupEntry = {
  slot: string;
  playerId: string;
  name: string;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sanitizeAvailability(value: unknown): Record<string, AvailabilityEntry> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const result: Record<string, AvailabilityEntry> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const candidate = raw as Record<string, unknown>;
    const playerId = cleanText(candidate.playerId ?? key, 120);
    const name = cleanText(candidate.name, 120);
    const statusRaw = cleanText(candidate.status, 20);
    const status = STATUSES.has(statusRaw) ? (statusRaw as AvailabilityStatus) : "unknown";
    if (!playerId || !name) continue;
    result[playerId] = { playerId, name, status };
  }
  return result;
}

function sanitizeLineup(value: unknown): LineupEntry[] {
  if (!Array.isArray(value)) return [];
  const seenSlots = new Set<string>();
  const seenPlayers = new Set<string>();
  const result: LineupEntry[] = [];

  for (const raw of value.slice(0, 20)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const candidate = raw as Record<string, unknown>;
    const slot = cleanText(candidate.slot, 30);
    const playerId = cleanText(candidate.playerId, 120);
    const name = cleanText(candidate.name, 120);
    if (!slot || !playerId || !name || seenSlots.has(slot) || seenPlayers.has(playerId)) continue;
    seenSlots.add(slot);
    seenPlayers.add(playerId);
    result.push({ slot, playerId, name });
  }
  return result;
}

function sanitizeBench(value: unknown): LineupEntry[] {
  if (!Array.isArray(value)) return [];
  const seenPlayers = new Set<string>();
  const result: LineupEntry[] = [];
  for (const raw of value.slice(0, 30)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const candidate = raw as Record<string, unknown>;
    const playerId = cleanText(candidate.playerId, 120);
    const name = cleanText(candidate.name, 120);
    if (!playerId || !name || seenPlayers.has(playerId)) continue;
    seenPlayers.add(playerId);
    result.push({ slot: "BENCH", playerId, name });
  }
  return result;
}

export async function GET(request: Request) {
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;

  const { searchParams } = new URL(request.url);
  const weekStart = cleanText(searchParams.get("weekStart"), 10);
  if (!DATE_RE.test(weekStart)) {
    return NextResponse.json({ error: "La date de début de semaine est invalide." }, { status: 400 });
  }

  const admin = createAdminClient();
  const [plansResult, playersResult, currentLineupResult] = await Promise.all([
    admin
      .from("programme_event_plans")
      .select("id, week_start, event_date, event_id, formation, availability, lineup, bench, notes, updated_at")
      .eq("club_id", CLUB_ID)
      .eq("week_start", weekStart)
      .order("event_date", { ascending: true }),
    admin
      .from("match_players")
      .select("player_ea_id, player_name, position, updated_at")
      .order("updated_at", { ascending: false })
      .limit(800),
    admin
      .from("lineups")
      .select("formation, lineup, bench, updated_at")
      .eq("club_id", CLUB_ID)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (plansResult.error) {
    return NextResponse.json({ error: "Impossible de récupérer les plans d'équipe.", details: plansResult.error.message }, { status: 500 });
  }
  if (playersResult.error) {
    return NextResponse.json({ error: "Impossible de récupérer l'effectif EA.", details: playersResult.error.message }, { status: 500 });
  }
  if (currentLineupResult.error) {
    return NextResponse.json({ error: "Impossible de récupérer la composition actuelle.", details: currentLineupResult.error.message }, { status: 500 });
  }

  const rosterMap = new Map<string, { id: string; name: string; position: string; lastSeen: string }>();
  for (const row of playersResult.data ?? []) {
    const id = cleanText(row.player_ea_id, 120) || `name:${cleanText(row.player_name, 120).toLowerCase()}`;
    const name = cleanText(row.player_name, 120);
    if (!id || !name || rosterMap.has(id)) continue;
    rosterMap.set(id, {
      id,
      name,
      position: cleanText(row.position, 40) || "unknown",
      lastSeen: cleanText(row.updated_at, 80),
    });
  }

  const positionOrder: Record<string, number> = {
    goalkeeper: 0,
    defender: 1,
    midfielder: 2,
    forward: 3,
    unknown: 4,
  };
  const roster = [...rosterMap.values()].sort((a, b) => {
    const pos = (positionOrder[a.position] ?? 9) - (positionOrder[b.position] ?? 9);
    return pos !== 0 ? pos : a.name.localeCompare(b.name, "fr");
  });

  const currentLineup = currentLineupResult.data
    ? {
        formation: cleanText(currentLineupResult.data.formation, 30) || "3-1-4-2",
        lineup: Array.isArray(currentLineupResult.data.lineup) ? currentLineupResult.data.lineup : [],
        bench: Array.isArray(currentLineupResult.data.bench) ? currentLineupResult.data.bench : [],
      }
    : { formation: "3-1-4-2", lineup: [], bench: [] };

  const plans = (plansResult.data ?? []).map((plan) => ({
    id: plan.id,
    weekStart: plan.week_start,
    eventDate: plan.event_date,
    eventId: plan.event_id,
    formation: FORMATIONS.has(plan.formation) ? plan.formation : "3-1-4-2",
    availability: sanitizeAvailability(plan.availability),
    lineup: sanitizeLineup(plan.lineup),
    bench: sanitizeBench(plan.bench),
    notes: cleanText(plan.notes, 500),
    updatedAt: plan.updated_at,
  }));

  return NextResponse.json({
    weekStart,
    plans,
    roster,
    currentLineup,
    currentUser: authorization.profile,
  });
}

export async function PUT(request: Request) {
  const authorization = await requireActiveStaff({ write: true });
  if (authorization.error) return authorization.error;

  const body = await request.json().catch(() => ({}));
  const weekStart = cleanText(body.weekStart, 10);
  const eventDate = cleanText(body.eventDate, 10);
  const eventId = cleanText(body.eventId, 120);
  const formationRaw = cleanText(body.formation, 30);
  const formation = FORMATIONS.has(formationRaw) ? formationRaw : "3-1-4-2";

  if (!DATE_RE.test(weekStart) || !DATE_RE.test(eventDate) || !eventId) {
    return NextResponse.json({ error: "Les informations de l'événement sont invalides." }, { status: 400 });
  }

  const availability = sanitizeAvailability(body.availability);
  const lineup = sanitizeLineup(body.lineup);
  const lineupPlayerIds = new Set(lineup.map((entry) => entry.playerId));
  const bench = sanitizeBench(body.bench).filter((entry) => !lineupPlayerIds.has(entry.playerId));
  const notes = cleanText(body.notes, 500);
  const now = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("programme_event_plans")
    .upsert(
      {
        club_id: CLUB_ID,
        week_start: weekStart,
        event_date: eventDate,
        event_id: eventId,
        formation,
        availability,
        lineup,
        bench,
        notes,
        updated_by: authorization.profile?.userId ?? null,
        updated_at: now,
      },
      { onConflict: "club_id,event_id" }
    )
    .select("id, week_start, event_date, event_id, formation, availability, lineup, bench, notes, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Impossible d'enregistrer les disponibilités et la composition.", details: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    plan: {
      id: data.id,
      weekStart: data.week_start,
      eventDate: data.event_date,
      eventId: data.event_id,
      formation: data.formation,
      availability: sanitizeAvailability(data.availability),
      lineup: sanitizeLineup(data.lineup),
      bench: sanitizeBench(data.bench),
      notes: cleanText(data.notes, 500),
      updatedAt: data.updated_at,
    },
  });
}
