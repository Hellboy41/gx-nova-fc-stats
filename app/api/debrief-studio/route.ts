import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { isEveningDate, sanitizeDebriefChapters } from "@/lib/debrief-studio";

const CLUB_ID = "1663";

export async function GET(request: Request) {
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!isEveningDate(date)) {
    return NextResponse.json({ error: "Date de soirée invalide." }, { status: 400 });
  }
  try {
    const { data, error } = await createAdminClient()
      .from("evening_debriefs")
      .select("chapters, updated_at")
      .eq("club_id", CLUB_ID)
      .eq("evening_date", date)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      date,
      chapters: sanitizeDebriefChapters(data?.chapters ?? []),
      updatedAt: data?.updated_at ?? null,
      currentUser: authorization.profile,
    });
  } catch (error) {
    return NextResponse.json({
      error: "Impossible de charger le Débrief Studio. La migration Supabase a-t-elle été appliquée ?",
      details: error instanceof Error ? error.message : "Erreur inconnue.",
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireActiveStaff({ write: true });
  if (authorization.error) return authorization.error;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Données de débrief invalides." }, { status: 400 });
  }
  const { date, chapters } = body as Record<string, unknown>;
  if (typeof date !== "string" || !isEveningDate(date) || !Array.isArray(chapters) || chapters.length < 1 || chapters.length > 12) {
    return NextResponse.json({ error: "La date ou la liste des chapitres est invalide (1 à 12 chapitres)." }, { status: 400 });
  }
  const normalized = sanitizeDebriefChapters(chapters);
  if (normalized.length !== chapters.length || normalized.some((chapter, index) =>
    !Array.isArray((chapters[index] as Record<string, unknown>)?.media) ||
    chapter.media.length !== ((chapters[index] as Record<string, unknown>).media as unknown[]).length
  )) {
    return NextResponse.json({ error: "Un chapitre ou un média est invalide. Seules les images HTTPS et vidéos Twitch/YouTube sont acceptées." }, { status: 400 });
  }
  try {
    const { data, error } = await createAdminClient()
      .from("evening_debriefs")
      .upsert({
        club_id: CLUB_ID,
        evening_date: date,
        chapters: normalized,
        updated_by: authorization.profile?.userId ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "club_id,evening_date" })
      .select("updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, updatedAt: data.updated_at });
  } catch (error) {
    return NextResponse.json({
      error: "Impossible d'enregistrer le débrief. Vérifie la migration Supabase.",
      details: error instanceof Error ? error.message : "Erreur inconnue.",
    }, { status: 500 });
  }
}
