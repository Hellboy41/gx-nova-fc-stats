import { NextResponse } from "next/server";
import { requireActiveStaff } from "@/lib/auth/require-staff";

const CREST_URL_TEMPLATE =
  "https://eafc24.content.easports.com/fifa/fltOnlineAssets/" +
  "24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l{id}.png";

function validAssetId(value: string | null) {
  return Boolean(value && /^\d+$/.test(value) && Number(value) > 0);
}

async function fetchImage(url: string) {
  return fetch(url, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
      Referer: "https://www.ea.com/",
    },
    next: {
      revalidate: 60 * 60 * 24 * 7,
    },
  });
}

export async function GET(request: Request) {
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;

  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("id");

  if (!validAssetId(assetId)) {
    return NextResponse.json(
      { error: "Identifiant de logo EA invalide." },
      { status: 400 }
    );
  }

  const crestUrl = CREST_URL_TEMPLATE.replace("{id}", assetId!);

  try {
    const response = await fetchImage(crestUrl);

    /*
     * IMPORTANT : ne jamais remplacer ici une erreur EA par le blason gris
     * "not found" avec un statut 200.
     *
     * Le Match Center possède plusieurs candidats pour un même club :
     * TEAM -> crestAssetId -> teamId (ou l'ordre défini par l'API).
     * En renvoyant une vraie erreur 404, le composant <TeamCrest> déclenche
     * son onError et essaie automatiquement le candidat suivant.
     * C'est notamment indispensable pour les écussons personnalisés Clubs.
     */
    if (!response.ok) {
      return NextResponse.json(
        { error: "Ce logo EA n'est pas disponible." },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json(
        { error: "La ressource EA reçue n'est pas une image." },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Impossible de récupérer le logo EA." },
      { status: 502 }
    );
  }
}
