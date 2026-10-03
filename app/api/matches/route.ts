import { NextResponse } from "next/server";

const CLUB_ID = "1663";
const PLATFORM = "common-gen5";

type ClubData = {
  goals?: string;
  goalsAgainst?: string;
  details?: {
    name?: string;
    clubId?: number;
  };
};

type EaMatch = {
  matchId?: string;
  timestamp?: number;
  clubs?: Record<string, ClubData>;
};

export async function GET() {
  try {
    const url =
      `https://proclubs.ea.com/api/fc/clubs/matches` +
      `?platform=${PLATFORM}` +
      `&clubIds=${CLUB_ID}` +
      `&matchType=friendlyMatch` +
      `&maxResultCount=20`;

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

    const data: EaMatch[] = await response.json();

    const matches = data.map((match) => {
      const clubs = match.clubs ?? {};

      const gxNova = clubs[CLUB_ID];

      const opponentEntry = Object.entries(clubs).find(
        ([clubId]) => clubId !== CLUB_ID
      );

      const opponent = opponentEntry?.[1];

      const goalsFor = Number(gxNova?.goals ?? 0);
      const goalsAgainst = Number(gxNova?.goalsAgainst ?? 0);

      let result = "N";

      if (goalsFor > goalsAgainst) {
        result = "V";
      }

      if (goalsFor < goalsAgainst) {
        result = "D";
      }

      return {
        matchId: match.matchId,
        timestamp: match.timestamp,

        date: match.timestamp
          ? new Date(match.timestamp * 1000).toISOString()
          : null,

        club: gxNova?.details?.name ?? "GX NOVA",

        opponent:
          opponent?.details?.name ??
          "Adversaire inconnu",

        goalsFor,
        goalsAgainst,

        score: `${goalsFor} - ${goalsAgainst}`,

        result,
      };
    });

    return NextResponse.json(matches);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Impossible de contacter EA",
        details:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}