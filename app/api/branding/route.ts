import { NextResponse } from "next/server";
import { CLUB_ID } from "@/lib/platform/server-club";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import {
  BRANDING_BUCKET, BRANDING_IMAGE_MAX_SIZE, BRANDING_IMAGE_MIME,
  brandingDefaults, type BrandingScope, type BrandingSettings, type BrandingResponse,
} from "@/lib/platform/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_CACHE = { "Cache-Control": "private, no-store" };
const scopes: BrandingScope[] = ["structure", "roster"];

function currentEnvironment() {
  const production = process.env.VERCEL_ENV === "production";
  const branch = (process.env.VERCEL_GIT_COMMIT_REF || "local")
    .toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 65);
  return { label: (production ? "production" : "preview") as "production" | "preview", key: production ? "production" : `preview-${branch}` };
}
function folder(scope: BrandingScope) {
  return `${CLUB_ID}/${currentEnvironment().key}/${scope}`;
}
function configPath(scope: BrandingScope) { return `${folder(scope)}/settings.json`; }
function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}
function isLogoPath(path: unknown, scope: BrandingScope): path is string {
  return typeof path === "string" &&
    path.startsWith(folder(scope) + "/assets/") &&
    /^\w[\w/.-]{0,200}\.(png|jpg|webp)$/.test(path) &&
    !path.includes("..");
}
function validName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 80;
}
function validEdition(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9 -]{2,20}$/.test(value.trim());
}
function isMissing(error: { message?: string; statusCode?: number | string } | null) {
  return !!error && (/not found|does not exist|object not found/i.test(error.message || "") ||
    String(error.statusCode) === "404");
}
function verifyImage(file: File, bytes: Uint8Array): "png" | "jpg" | "webp" | null {
  if (!BRANDING_IMAGE_MIME.includes(file.type as typeof BRANDING_IMAGE_MIME[number])) return null;
  if (file.size < 12 || file.size > BRANDING_IMAGE_MAX_SIZE) return null;
  if (file.type === "image/png" && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "png";
  if (file.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (file.type === "image/webp" && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "webp";
  return null;
}
async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw error;
  const exists = buckets?.find(b => b.name === BRANDING_BUCKET);
  if (exists) {
    if (exists.public) throw new Error("Le stockage des identités doit être privé.");
    return true;
  }
  const created = await admin.storage.createBucket(BRANDING_BUCKET, {
    public: false,
    fileSizeLimit: BRANDING_IMAGE_MAX_SIZE,
    allowedMimeTypes: [...BRANDING_IMAGE_MIME, "application/json"],
  });
  if (created.error) {
    const checked = await admin.storage.getBucket(BRANDING_BUCKET);
    if (checked.error || checked.data.public) throw created.error;
  }
  return true;
}
async function readConfig(admin: ReturnType<typeof createAdminClient>, scope: BrandingScope): Promise<BrandingSettings> {
  const defaults = brandingDefaults()[scope];
  const { data, error } = await admin.storage.from(BRANDING_BUCKET).download(configPath(scope));
  if (error) {
    if (isMissing(error)) return defaults;
    throw error;
  }
  const raw = JSON.parse(await data.text()) as Record<string, unknown>;
  if (!validName(raw.name) || !isHex(raw.primaryColor) || !isHex(raw.secondaryColor)) {
    throw new Error("Paramètres du thème enregistrés invalides.");
  }
  const path = raw.logoPath === null ? null : isLogoPath(raw.logoPath,scope) ? raw.logoPath : null;
  const image = path
    ? await admin.storage.from(BRANDING_BUCKET).createSignedUrl(path, 6 * 60 * 60)
    : null;
  if (image?.error) throw image.error;
  return {
    name: raw.name.trim(),
    primaryColor: raw.primaryColor,
    secondaryColor: raw.secondaryColor,
    logoPath: path,
    logoUrl: path ? image?.data?.signedUrl ?? null : defaults.logoUrl,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

export async function GET() {
  const auth = await requireActiveStaff();
  if (auth.error) return auth.error;
  try {
    const admin = createAdminClient();
    const { data: buckets, error } = await admin.storage.listBuckets();
    if (error) throw error;
    const exists = buckets?.some(b => b.name === BRANDING_BUCKET);
    const defaults = brandingDefaults();
    const [structure, roster] = exists ? await Promise.all(scopes.map(s => readConfig(admin,s))) : [defaults.structure, defaults.roster];
    const result: BrandingResponse = {
      structure,
      roster: { ...roster, gameEdition: defaults.roster.gameEdition, eaClubId: CLUB_ID },
      canEdit: auth.profile?.role === "admin",
      environment: currentEnvironment().label,
    };
    return NextResponse.json(result, { headers: NO_CACHE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Paramètres indisponibles." }, { status: 500, headers: NO_CACHE });
  }
}

export async function POST(request: Request) {
  const auth = await requireActiveStaff({ write: true });
  if (auth.error) return auth.error;
  if (auth.profile?.role !== "admin") {
    return NextResponse.json({ error: "Seul un administrateur peut modifier les identités des clubs." }, { status: 403, headers: NO_CACHE });
  }
  try {
    const form = await request.formData();
    const scope = form.get("scope");
    if (scope !== "structure" && scope !== "roster") {
      return NextResponse.json({ error: "Espace de personnalisation invalide." }, { status: 400, headers: NO_CACHE });
    }
    const name = form.get("name");
    const primaryColor = form.get("primaryColor");
    const secondaryColor = form.get("secondaryColor");
    const file = form.get("logo");
    const remove = form.get("removeLogo") === "true";
    if (!validName(name) || !isHex(primaryColor) || !isHex(secondaryColor)) {
      return NextResponse.json({ error: "Nom (2 à 80 caractères) et couleurs hexadécimales obligatoires." }, { status: 400, headers: NO_CACHE });
    }
    if (file !== null && !(file instanceof File)) {
      return NextResponse.json({ error: "Logo invalide." }, { status: 400, headers: NO_CACHE });
    }
    if (file instanceof File && (file.size === 0 || file.size > BRANDING_IMAGE_MAX_SIZE)) {
      return NextResponse.json({ error: "Logo trop volumineux (5 Mo maximum)." }, { status: 400, headers: NO_CACHE });
    }
    // L'ID EA reste géré par le serveur de chaque installation et ne peut
    // jamais être changé par un formulaire de personnalisation.
    const admin = createAdminClient();
    await ensureBucket(admin);
    const previous = await readConfig(admin, scope);
    let logoPath = remove ? null : previous.logoPath;
    if (file instanceof File) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ext = verifyImage(file, bytes);
      if (!ext) return NextResponse.json({ error: "Image invalide : PNG, JPG ou WebP uniquement." }, { status: 400, headers: NO_CACHE });
      const path = `${folder(scope)}/assets/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await admin.storage.from(BRANDING_BUCKET)
        .upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "3600" });
      if (uploadError) throw uploadError;
      logoPath = path;
    }
    // Fichier JSON privé, modifié seulement après validation admin.
    const updatedAt = new Date().toISOString();
    const settings = { name: name.trim(), primaryColor, secondaryColor, logoPath, updatedAt };
    const { error: saveError } = await admin.storage.from(BRANDING_BUCKET)
      .upload(configPath(scope), new Blob([JSON.stringify(settings)], { type: "application/json" }), {
        contentType: "application/json", upsert: true, cacheControl: "0",
      });
    if (saveError) throw saveError;
    const saved = await readConfig(admin, scope);
    return NextResponse.json({ success: true, scope, settings: saved, environment: currentEnvironment().label }, { headers: NO_CACHE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Enregistrement impossible." }, { status: 500, headers: NO_CACHE });
  }
}
