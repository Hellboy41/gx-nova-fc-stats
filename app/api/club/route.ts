import { NextResponse } from "next/server";

const CLUB_ID = "1663";
const PLATFORM = "common-gen5";

export async function GET() {
  try {
    const url =
      `https://proclubs.ea.com/api/fc/clubs/info` +
      `?platform=${PLATFORM}` +
      `&clubIds=${CLUB_ID}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
        Referer: "https://www.ea.com/",
        Origin: "https://www.ea.com",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "EA a refusé la requête",
          status: response.status,
          statusText: response.statusText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Impossible de contacter EA",
        details:
          error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}