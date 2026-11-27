import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";
import { activeRosterById } from "@/lib/platform/rosters";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseIntelligenceExportOptions, loadIntelligenceExport, type IntelligenceExportOptions } from "@/lib/sport-intelligence/export";
import { renderIntelligenceExport } from "@/lib/sport-intelligence/export-image";
import { decryptWebhook, parseWebhook } from "@/lib/discord/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ROSTER_ID = "gx-nova-legacy";
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const HEADERS = { "Cache-Control": "private, no-store" };
const invalid = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status, headers: HEADERS });

function filename(options: IntelligenceExportOptions) {
  return "atyom-intelligence-" + options.kind + "-" +
    (options.seasonId === "all" ? "toutes-saisons" : "saison-" + options.seasonId) + ".png";
}
async function generate(options: IntelligenceExportOptions) {
  const roster = await activeRosterById(ROSTER_ID);
  if (!roster) throw new Error("Roster GX NØVA indisponible.");
  const result = await loadIntelligenceExport(options);
  const png = await renderIntelligenceExport(roster, result);
  return { png, result, roster };
}

export async function GET(request: Request) {
  const auth = await requireActiveStaff({ rosterId: ROSTER_ID });
  if (auth.error) return auth.error;
  try {
    const params = new URL(request.url).searchParams;
    const options = parseIntelligenceExportOptions(params);
    const { png } = await generate(options);
    return new Response(Uint8Array.from(png).buffer, { headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
      "Content-Disposition": (params.get("download") === "1" ? "attachment" : "inline") +
        '; filename="' + filename(options) + '"',
    } });
  } catch (error) {
    console.error("ATYOM Intelligence export GET", error);
    return invalid(error instanceof Error ? error.message : "Génération de l'image impossible.", 400);
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return invalid("Origine interdite.", 403);
  const auth = await requireActiveStaff({ rosterId: ROSTER_ID, write: true });
  if (auth.error) return auth.error;
  if (process.env.VERCEL_ENV === "preview") return invalid("Publication Discord interdite sur la prévisualisation.", 403);
  const body = await request.json().catch(() => null) as Record<string,unknown> | null;
  if (!body || typeof body.channelId !== "string" || !UUID.test(body.channelId))
    return invalid("Sélectionne un salon Discord configuré dans ATYOM.");
  try {
    const params = new URLSearchParams();
    for (const key of ["kind", "seasonId", "competitionId", "startDate", "endDate", "role",
      "search", "minSamples", "pairMinimum", "includeDormant"]) {
      const value = body[key];
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
        params.set(key, String(value));
    }
    const options = parseIntelligenceExportOptions(params);
    const admin = createAdminClient();
    const { data: channel, error } = await admin.from("atyom_discord_channels")
      .select("id,webhook_ciphertext,label").eq("roster_id", ROSTER_ID)
      .eq("id", body.channelId).maybeSingle();
    if (error || !channel) return invalid("Ce salon Discord n'est pas associé à GX NØVA.", 404);
    const { png, result, roster } = await generate(options);
    const total = options.kind === "form" ? result.players.length :
      options.kind === "roles" ? result.roles.length : result.pairs.length;
    if (!result.report.matches || !total) return invalid("Aucune donnée à publier avec ces filtres.", 409);
    const { apiUrl } = parseWebhook(decryptWebhook(channel.webhook_ciphertext));
    const heading = options.kind === "form" ? "Forme des joueurs" :
      options.kind === "roles" ? "Analyse par poste" : "Associations";
    const imageName = filename(options);
    const payload = {
      username: roster.name.slice(0, 70),
      content: "📊 **" + heading + "** · " + roster.name +
        "\nAnalyse basée sur les matchs EA et les corrections staff.",
      allowed_mentions: { parse: [] as string[] },
      embeds: [{ image: { url: "attachment://" + imageName } }],
      attachments: [{ id: 0, filename: imageName, description: heading }],
    };
    const form = new FormData();
    form.set("payload_json", JSON.stringify(payload));
    form.set("files[0]", new Blob([new Uint8Array(png)], { type: "image/png" }), imageName);
    const response = await fetch(apiUrl + "?wait=true", {
      method: "POST", body: form, cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error("Discord a refusé la publication (" + response.status + ").");
    const message = await response.json().catch(() => null) as {id?:string} | null;
    if (!message?.id) throw new Error("Discord n'a pas confirmé la publication.");
    return NextResponse.json({ success: true, messageId: message.id,
      channel: channel.label, kind: options.kind }, { headers: HEADERS });
  } catch (error) {
    console.error("ATYOM Intelligence Discord export", error);
    return invalid(error instanceof Error ? error.message : "Publication impossible.", 502);
  }
}
