import { NextResponse } from "next/server";

const CLUB_ID = "1663";
const PLATFORM = "common-gen5";

type RawPlayer = Record<string, unknown>;

type RawMatch = {
  matchId?: string;
  timestamp?: number;
  players?: Record<string, RawPlayer[] | Record<string, RawPlayer>>;
};

type PlayerAggregate = {
  id: string;
  name: string;
  position: string;
  games: number;

  goals: number;
  assists: number;

  totalRating: number;
  ratingCount: number;

  shots: number;

  passesMade: number;
  passAttempts: number;

  tacklesMade: number;
  tackleAttempts: number;

  saves: number;
  redCards: number;

  recentRatings: number[];
};

function numberValue(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown): string {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  return String(value);
}

function firstValue(
  player: RawPlayer,
  keys: string[]
): unknown {
  for (const key of keys) {
    if (
      player[key] !== undefined &&
      player[key] !== null
    ) {
      return player[key];
    }
  }

  return undefined;
}

function normalizePlayers(
  value: RawPlayer[] | Record<string, RawPlayer> | undefined
) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((player, index) => ({
      id: textValue(
        firstValue(player, [
          "blazeId",
          "playerId",
          "personaId",
          "id",
        ])
      ) || `player-${index}`,

      player,
    }));
  }

  return Object.entries(value).map(
    ([id, player]) => ({
      id,
      player,
    })
  );
}

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
        },
        {
          status: response.status,
        }
      );
    }

    const matches: RawMatch[] =
      await response.json();

    const aggregates = new Map<
      string,
      PlayerAggregate
    >();

    for (const match of matches) {
      const clubPlayers =
        match.players?.[CLUB_ID];

      const players =
        normalizePlayers(clubPlayers);

      for (const item of players) {
        const player = item.player;

        const name =
          textValue(
            firstValue(player, [
              "playername",
              "playerName",
              "name",
              "gamertag",
              "personaName",
            ])
          ) || `Joueur ${item.id}`;

        const position =
          textValue(
            firstValue(player, [
              "pos",
              "position",
              "vproPosition",
              "vproposition",
            ])
          ) || "-";

        const rating = numberValue(
          firstValue(player, [
            "rating",
            "matchRating",
          ])
        );

        const goals = numberValue(
          firstValue(player, ["goals"])
        );

        const assists = numberValue(
          firstValue(player, ["assists"])
        );

        const shots = numberValue(
          firstValue(player, ["shots"])
        );

        const passesMade = numberValue(
          firstValue(player, [
            "passesmade",
            "passesMade",
          ])
        );

        const passAttempts = numberValue(
          firstValue(player, [
            "passattempts",
            "passAttempts",
          ])
        );

        const tacklesMade = numberValue(
          firstValue(player, [
            "tacklesmade",
            "tacklesMade",
          ])
        );

        const tackleAttempts = numberValue(
          firstValue(player, [
            "tackleattempts",
            "tackleAttempts",
          ])
        );

        const saves = numberValue(
          firstValue(player, ["saves"])
        );

        const redCards = numberValue(
          firstValue(player, [
            "redcards",
            "redCards",
          ])
        );

        const key =
          name.toLowerCase().trim();

        if (!aggregates.has(key)) {
          aggregates.set(key, {
            id: item.id,
            name,
            position,
            games: 0,

            goals: 0,
            assists: 0,

            totalRating: 0,
            ratingCount: 0,

            shots: 0,

            passesMade: 0,
            passAttempts: 0,

            tacklesMade: 0,
            tackleAttempts: 0,

            saves: 0,
            redCards: 0,

            recentRatings: [],
          });
        }

        const aggregate =
          aggregates.get(key)!;

        aggregate.games += 1;
        aggregate.goals += goals;
        aggregate.assists += assists;
        aggregate.shots += shots;

        aggregate.passesMade += passesMade;
        aggregate.passAttempts += passAttempts;

        aggregate.tacklesMade += tacklesMade;
        aggregate.tackleAttempts += tackleAttempts;

        aggregate.saves += saves;
        aggregate.redCards += redCards;

        if (
          position &&
          position !== "-"
        ) {
          aggregate.position = position;
        }

        if (rating > 0) {
          aggregate.totalRating += rating;
          aggregate.ratingCount += 1;

          if (
            aggregate.recentRatings.length < 5
          ) {
            aggregate.recentRatings.push(
              Number(rating.toFixed(2))
            );
          }
        }
      }
    }

    const players = Array.from(
      aggregates.values()
    )
      .map((player) => {
        const averageRating =
          player.ratingCount > 0
            ? player.totalRating /
              player.ratingCount
            : 0;

        const passSuccess =
          player.passAttempts > 0
            ? (player.passesMade /
                player.passAttempts) *
              100
            : 0;

        const tackleSuccess =
          player.tackleAttempts > 0
            ? (player.tacklesMade /
                player.tackleAttempts) *
              100
            : 0;

        return {
          id: player.id,
          name: player.name,
          position: player.position,

          games: player.games,

          goals: player.goals,
          assists: player.assists,

          averageRating:
            Number(
              averageRating.toFixed(2)
            ),

          shots: player.shots,

          passesMade:
            player.passesMade,

          passAttempts:
            player.passAttempts,

          passSuccess:
            Number(
              passSuccess.toFixed(1)
            ),

          tacklesMade:
            player.tacklesMade,

          tackleAttempts:
            player.tackleAttempts,

          tackleSuccess:
            Number(
              tackleSuccess.toFixed(1)
            ),

          saves: player.saves,

          redCards:
            player.redCards,

          recentRatings:
            player.recentRatings,
        };
      })
      .sort(
        (a, b) =>
          b.averageRating -
          a.averageRating
      );

    return NextResponse.json(players);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les statistiques joueurs",

        details:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      {
        status: 500,
      }
    );
  }
}