import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { activeRosterById } from "@/lib/platform/rosters";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeTemplateSlots } from "@/lib/programme-templates";

export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "private, no-store" };
const LEGACY = "gx-nova-legacy";
const ROSTER_RE = /^roster-[a-f0-9]{32}$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;
const invalid = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status, headers: HEADERS });

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function authorize(rosterId: unknown, write: boolean) {
  if (typeof rosterId !== "string" || (rosterId !== LEGACY && !ROSTER_RE.test(rosterId)))
    return { error: invalid("Roster invalide."), profile: null };
  const auth = await requireActiveStaff({ rosterId, write });
  if (auth.error) return { error: auth.error, profile: null };
  if (rosterId !== LEGACY) {
    const roster = await activeRosterById(rosterId);
    if (!roster || roster.workspace_mode !== "monitoring")
      return { error: invalid("Roster inactif ou introuvable.", 404), profile: null };
  }
  return { error: null, profile: auth.profile };
}

function shape(row: { id: string; roster_id: string; name: string; slots: unknown; updated_at: string }) {
  return {
    id: row.id, rosterId: row.roster_id, name: row.name,
    slots: sanitizeTemplateSlots(row.slots, row.roster_id !== LEGACY) ?? [],
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  const rosterId = new URL(request.url).searchParams.get("rosterId");
  const auth = await authorize(rosterId, false);
  if (auth.error) return auth.error;
  const { data, error } = await createAdminClient().from("programme_evening_templates")
    .select("id,roster_id,name,slots,updated_at")
    .eq("roster_id", rosterId!).order("name").limit(30);
  if (error) return invalid("Impossible de charger les modèles de soirées.", 500);
  return NextResponse.json({ templates: (data ?? []).map(shape) }, { headers: HEADERS });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return invalid("Origine interdite.", 403);
  const body = await request.json().catch(() => null);
  const rosterId = body?.rosterId;
  const auth = await authorize(rosterId, true);
  if (auth.error) return auth.error;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const slots = sanitizeTemplateSlots(body?.slots, rosterId !== LEGACY);
  if (name.length < 2 || name.length > 80 || !slots)
    return invalid("Indique un nom (2 à 80 caractères) et de 1 à 42 créneaux valides, sans horaires en doublon.");
  const admin = createAdminClient();
  const { count, error: countError } = await admin.from("programme_evening_templates")
    .select("id", { count: "exact", head: true }).eq("roster_id", rosterId);
  if (countError) return invalid("Impossible de vérifier les modèles existants.", 500);
  if ((count ?? 0) >= 20) return invalid("20 modèles maximum par roster.", 409);
  const { data, error } = await admin.from("programme_evening_templates").insert({
    roster_id: rosterId, name, slots, created_by: auth.profile?.userId ?? null,
  }).select("id,roster_id,name,slots,updated_at").single();
  if (error) return invalid(error.code === "23505" ? "Un modèle porte déjà ce nom pour ce roster." : "Impossible d'enregistrer le modèle.", error.code === "23505" ? 409 : 500);
  return NextResponse.json({ template: shape(data) }, { status: 201, headers: HEADERS });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return invalid("Origine interdite.", 403);
  const body = await request.json().catch(() => null);
  const rosterId = body?.rosterId;
  const auth = await authorize(rosterId, true);
  if (auth.error) return auth.error;
  if (typeof body?.templateId !== "string" || !UUID_RE.test(body.templateId))
    return invalid("Modèle invalide.");
  const { data, error } = await createAdminClient().from("programme_evening_templates")
    .delete().eq("id", body.templateId).eq("roster_id", rosterId).select("id").maybeSingle();
  if (error) return invalid("Suppression impossible.", 500);
  if (!data) return invalid("Modèle introuvable.", 404);
  return NextResponse.json({ success: true }, { headers: HEADERS });
}
