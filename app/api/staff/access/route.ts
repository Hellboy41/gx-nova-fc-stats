import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEGACY_WORKSPACE } from "@/lib/platform/workspace";

export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "private, no-store" };

async function requireStructureAdmin() {
  const authorization = await requireActiveStaff({ requireStructure: true });
  if (authorization.error) return { error: authorization.error };
  if (authorization.profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Administration ATYOM uniquement." }, { status: 403, headers: HEADERS }) };
  }
  return { error: null };
}

export async function GET() {
  const auth = await requireStructureAdmin();
  if (auth.error) return auth.error;
  const admin = createAdminClient();
  const { data, error } = await admin.from("staff_profiles")
    .select("user_id, display_name, role, is_active, access_scope, allowed_roster_ids")
    .order("display_name");
  if (error) return NextResponse.json({ error: "Impossible de charger les périmètres d'accès." }, { status: 500, headers: HEADERS });
  return NextResponse.json({
    rosters: LEGACY_WORKSPACE.rosters.filter(r => r.status === "active").map(r => ({ id: r.id, name: r.name, gameEdition: r.gameEdition })),
    staff: (data ?? []).map(p => ({
      userId: p.user_id, name: p.display_name, role: p.role, isActive: p.is_active,
      accessScope: p.access_scope, allowedRosterIds: p.allowed_roster_ids,
    })),
  }, { headers: HEADERS });
}

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origine interdite." }, { status: 403, headers: HEADERS });
  }
  const auth = await requireStructureAdmin();
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.userId) ||
      (body.accessScope !== "structure" && body.accessScope !== "rosters") ||
      !Array.isArray(body.allowedRosterIds)) {
    return NextResponse.json({ error: "Données de droits invalides." }, { status: 400, headers: HEADERS });
  }
  const available = new Set(LEGACY_WORKSPACE.rosters.filter(r => r.status === "active").map(r => r.id));
  const ids: unknown[] = body.allowedRosterIds;
  if (ids.some(id => typeof id !== "string" || !available.has(id)) || new Set(ids).size !== ids.length ||
      (body.accessScope === "rosters" && ids.length === 0) ||
      (body.accessScope === "structure" && ids.length !== 0)) {
    return NextResponse.json({ error: "Sélectionne au moins un roster autorisé ou toute la structure." }, { status: 400, headers: HEADERS });
  }
  const admin = createAdminClient();
  const { data: member, error: readError } = await admin.from("staff_profiles")
    .select("user_id, role").eq("user_id", body.userId).maybeSingle();
  if (readError || !member) return NextResponse.json({ error: "Membre introuvable." }, { status: 404, headers: HEADERS });
  if (member.role === "admin" && body.accessScope !== "structure") {
    return NextResponse.json({ error: "Les administrateurs conservent l'accès à toute la structure." }, { status: 400, headers: HEADERS });
  }
  const { data, error } = await admin.from("staff_profiles").update({
    access_scope: body.accessScope, allowed_roster_ids: body.accessScope === "structure" ? [] : ids,
    updated_at: new Date().toISOString(),
  }).eq("user_id", body.userId).select("user_id, access_scope, allowed_roster_ids").single();
  if (error) return NextResponse.json({ error: "Impossible d'enregistrer les droits." }, { status: 500, headers: HEADERS });
  return NextResponse.json({ success: true, access: data }, { headers: HEADERS });
}
