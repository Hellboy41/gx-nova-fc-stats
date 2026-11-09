import { after, NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { activeRosterById } from "@/lib/platform/rosters";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshDiscordPublications } from "@/lib/discord/publish";
import { dateForTemplateWeekday, sanitizeTemplateSlots, validTemplateDate } from "@/lib/programme-templates";

export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "private, no-store" };
const ROSTER_RE = /^roster-[a-f0-9]{32}$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;
const invalid = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status, headers: HEADERS });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return invalid("Origine interdite.", 403);
  const body = await request.json().catch(() => null);
  const rosterId = body?.rosterId;
  if (typeof rosterId !== "string" || !ROSTER_RE.test(rosterId))
    return invalid("Cette action concerne les rosters autonomes uniquement.");
  const auth = await requireActiveStaff({ rosterId, write: true });
  if (auth.error) return auth.error;
  const roster = await activeRosterById(rosterId);
  if (!roster || roster.workspace_mode !== "monitoring")
    return invalid("Roster inactif ou introuvable.", 404);
  if (typeof body?.templateId !== "string" || !UUID_RE.test(body.templateId) ||
      !validTemplateDate(body?.startDate) || !Array.isArray(body?.opponents))
    return invalid("Modèle, période ou adversaires invalides.");

  const admin = createAdminClient();
  const { data: record, error: templateError } = await admin.from("programme_evening_templates")
    .select("slots").eq("id", body.templateId).eq("roster_id", rosterId).maybeSingle();
  if (templateError) return invalid("Impossible de lire ce modèle.", 500);
  if (!record) return invalid("Modèle introuvable pour ce roster.", 404);
  const slots = sanitizeTemplateSlots(record.slots, true);
  if (!slots || slots.length !== body.opponents.length) return invalid("Créneaux du modèle invalides.");

  const dates = slots.map(slot => dateForTemplateWeekday(body.startDate, slot.weekday));
  const first = [...dates].sort()[0];
  const last = [...dates].sort().at(-1)!;
  const now = Date.now();
  const min = new Date(now - 30 * 86400000).toISOString().slice(0, 10);
  const max = new Date(now + 366 * 86400000).toISOString().slice(0, 10);
  if (first < min || last > max) return invalid("Les dates doivent être comprises entre le mois dernier et l'an prochain.");

  const opponents = body.opponents.map((value: unknown) =>
    typeof value === "string" ? value.trim() : "");
  if (opponents.some((value: string) => value.length > 120))
    return invalid("Un nom d'adversaire dépasse 120 caractères.");

  const { data: existing, error: existingError } = await admin.from("atyom_roster_events")
    .select("event_date,event_time").eq("roster_id", rosterId).gte("event_date", first).lte("event_date", last);
  if (existingError) return invalid("Impossible de vérifier les rencontres de la semaine.", 500);
  const occupied = new Set((existing ?? []).map(row => row.event_date + ":" + String(row.event_time).slice(0, 5)));
  const pending = slots.flatMap((slot, index) => {
    const date = dates[index];
    const key = date + ":" + slot.time;
    if (occupied.has(key)) return [];
    return [{
      roster_id: rosterId, event_date: date, event_time: slot.time,
      competition: slot.competition,
      event_type: slot.type,
      opponent_name: opponents[index].length >= 2 ? opponents[index] : "À définir",
      created_by: auth.profile?.userId ?? null,
    }];
  });
  if (pending.length) {
    const { error } = await admin.from("atyom_roster_events").insert(pending);
    if (error) return invalid(error.code === "23505"
      ? "Un créneau vient d'être occupé. Actualise le programme et réessaie."
      : "Impossible d'ajouter les rencontres du modèle.", error.code === "23505" ? 409 : 500);
    after(() => refreshDiscordPublications(rosterId, [...new Set(pending.map(row => row.event_date))]));
  }
  return NextResponse.json({
    success: true, inserted: pending.length, skipped: slots.length - pending.length,
    missingOpponents: pending.filter(row => row.opponent_name === "À définir").length,
  }, { headers: HEADERS });
}
