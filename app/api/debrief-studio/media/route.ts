import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEBRIEF_ALLOWED_MIME_TYPES, DEBRIEF_MAX_UPLOAD_BYTES, DEBRIEF_MEDIA_BUCKET,
  DEBRIEF_MEDIA_URL_TTL, isValidDebriefMediaPath, validUpload,
} from "@/lib/debrief-media";

export const runtime = "nodejs";

async function ensurePrivateBucket() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  const found = data?.find((b) => b.name === DEBRIEF_MEDIA_BUCKET);
  if (found) {
    if (found.public) throw new Error("Le stockage des débriefs doit rester privé.");
    return supabase;
  }
  // Création uniquement lors du premier import, sans migration de la base
  // des débriefs, avec restriction de types et taille côté Supabase.
  const created = await supabase.storage.createBucket(DEBRIEF_MEDIA_BUCKET, {
    public: false,
    fileSizeLimit: DEBRIEF_MAX_UPLOAD_BYTES,
    allowedMimeTypes: [...DEBRIEF_ALLOWED_MIME_TYPES],
  });
  if (created.error) {
    const existing = await supabase.storage.getBucket(DEBRIEF_MEDIA_BUCKET);
    if (existing.error || !existing.data || existing.data.public) throw created.error;
  }
  return supabase;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const action = payload.action;
  if (action !== "prepare" && action !== "view") {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }
  const authorization = await requireActiveStaff({ write: action === "prepare" });
  if (authorization.error) return authorization.error;

  try {
    if (action === "prepare") {
      const data = {
        fileName: typeof payload.fileName === "string" ? payload.fileName : "",
        mimeType: typeof payload.mimeType === "string" ? payload.mimeType : "",
        size: typeof payload.size === "number" ? payload.size : NaN,
        date: typeof payload.date === "string" ? payload.date : "",
      };
      const validated = validUpload(data);
      if (!validated) {
        return NextResponse.json({
          error: "Fichier non autorisé. Formats : PNG, JPG, WebP ou MP4 (45 Mo maximum).",
        }, { status: 400 });
      }
      const storagePath = `1663/${data.date}/${crypto.randomUUID()}.${validated.extension}`;
      const supabase = await ensurePrivateBucket();
      const { data: signed, error } = await supabase.storage
        .from(DEBRIEF_MEDIA_BUCKET).createSignedUploadUrl(storagePath);
      if (error || !signed?.token) throw error ?? new Error("Jeton d'envoi non obtenu.");
      return NextResponse.json({
        path: storagePath, token: signed.token, kind: validated.kind,
        bucket: DEBRIEF_MEDIA_BUCKET,
        maxBytes: DEBRIEF_MAX_UPLOAD_BYTES,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const date = typeof payload.date === "string" ? payload.date : "";
    const path = payload.path;
    if (!isValidDebriefMediaPath(path, date)) {
      return NextResponse.json({ error: "Média non reconnu." }, { status: 400 });
    }
    const { data, error } = await createAdminClient().storage
      .from(DEBRIEF_MEDIA_BUCKET).createSignedUrl(path, DEBRIEF_MEDIA_URL_TTL);
    if (error || !data?.signedUrl) throw error ?? new Error("Lien de lecture indisponible.");
    return NextResponse.json({ url: data.signedUrl }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({
      error: "Import ou lecture du média impossible.",
      details: error instanceof Error ? error.message : "Erreur de stockage.",
    }, { status: 500 });
  }
}
