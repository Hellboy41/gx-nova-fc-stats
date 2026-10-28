import { CLUB_ID } from "@/lib/platform/server-club";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { isEveningDate, sanitizeDebriefChapters } from "@/lib/debrief-studio";
import { DEBRIEF_MEDIA_BUCKET, DEBRIEF_MEDIA_URL_TTL, isValidDebriefMediaPath } from "@/lib/debrief-media";



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
    const chapters = sanitizeDebriefChapters(data?.chapters ?? []);
    const paths = [...new Set(chapters.flatMap((chapter) =>
      chapter.media.flatMap((media) => media.storagePath &&
        isValidDebriefMediaPath(media.storagePath, date, media.kind, CLUB_ID) ? [media.storagePath] : [])
    ))];
    const signed = new Map<string, string>();
    if (paths.length) {
      const result = await createAdminClient().storage
        .from(DEBRIEF_MEDIA_BUCKET).createSignedUrls(paths, DEBRIEF_MEDIA_URL_TTL);
      if (result.error) throw result.error;
      for (let index = 0; index < paths.length; index++) {
        const link = result.data?.[index]?.signedUrl;
        if (typeof link === "string" && link) signed.set(paths[index], link);
      }
    }
    const hydrated = chapters.map((chapter) => ({
      ...chapter,
      media: chapter.media.map((media) => ({
        ...media,
        ...(media.storagePath ? { url: signed.get(media.storagePath) ?? "" } : {}),
      })),
    }));
    return NextResponse.json({
      date,
      chapters: hydrated,
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
  // Les anciennes soirées sans objectifs ni annotations restent compatibles.
  // Pour les nouvelles données, rejeter une saisie invalide plutôt que
  // tronquer silencieusement des dessins ou consignes.
  const invalid = normalized.length !== chapters.length || normalized.some((chapter, index) => {
    const source = chapters[index];
    if (!source || typeof source !== "object" || Array.isArray(source)) return true;
    const raw = source as Record<string, unknown>;
    const rawMedia = Array.isArray(raw.media) ? raw.media : null;
    if (!rawMedia || chapter.media.length !== rawMedia.length || rawMedia.length > 8) return true;
    const rawObjectives = raw.objectives === undefined ? [] : Array.isArray(raw.objectives) ? raw.objectives : null;
    if (!rawObjectives || rawObjectives.length > 8 ||
        (chapter.objectives ?? []).length !== rawObjectives.length) return true;
    return rawMedia.some((sourceMedia, mediaIndex) => {
      if (!sourceMedia || typeof sourceMedia !== "object" || Array.isArray(sourceMedia)) return true;
      const item = sourceMedia as Record<string, unknown>;
      if (item.storagePath !== undefined && !isValidDebriefMediaPath(item.storagePath, date, item.kind === "image" ? "image" : "video", CLUB_ID)) return true;
      const originalAnnotations = item.annotations === undefined ? [] : Array.isArray(item.annotations) ? item.annotations : null;
      if (!originalAnnotations || originalAnnotations.length > 30) return true;
      if (item.kind !== "image" && originalAnnotations.length > 0) return true;
      return (chapter.media[mediaIndex]?.annotations ?? []).length !== originalAnnotations.length;
    });
  });
  if (invalid) {
    return NextResponse.json({
      error: "Débrief invalide. Vérifie les médias HTTPS, les annotations (30 maximum par capture) et les objectifs (8 maximum par chapitre).",
    }, { status: 400 });
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
