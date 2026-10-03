import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";

const BUCKET = "opponent-logos";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function extensionFor(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return "png";
}

export async function POST(request: Request) {
  const authorization = await requireActiveStaff({ write: true });
  if (authorization.error) return authorization.error;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Aucun logo n'a été envoyé." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Le logo doit être au format PNG, JPG ou WEBP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Le logo ne doit pas dépasser 2 Mo." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const extension = extensionFor(file.type);
  const path = `club-1663/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    return NextResponse.json(
      {
        error: "Impossible d'enregistrer le logo adverse.",
        details: error.message,
      },
      { status: 500 }
    );
  }

  const { data } = admin.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return NextResponse.json({
    success: true,
    url: data.publicUrl,
    path,
  });
}
