import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";

const CLUB_ID = "1663";
const GX_NOVA_LOGO = "/logo-gx-nova.png";

function crestProxyUrl(assetId: unknown) {
  const value = String(assetId ?? "").trim();
  return /^\d+$/.test(value) && Number(value) > 0
    ? `/api/ea-crest?id=${encodeURIComponent(value)}`
    : "";
}

type JsonRecord = Record<string, unknown>;

type MatchRow = {
  id: number;
  ea_match_id: string;
  played_at: string | null;
  opponent_name: string;
  goals_for: number;
  goals_against: number;
  result: "V" | "N" | "D";
  season_id: number | null;
  competition_id: number | null;
  raw_data: JsonRecord | null;
};

type PlayerRow = {
  match_id: number;
  player_ea_id: string | null;
  player_name: string;
  position: string | null;
  rating: number | string;
  goals: number;
  assists: number;
  shots: number;
  passes_made: number;
  pass_attempts: number;
  tackles_made: number;
  tackle_attempts: number;
  saves: number;
  red_cards: number;
  raw_data: JsonRecord | null;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pct(made: number, attempts: number) {
  if (attempts <= 0) return 0;
  return Math.round((made / attempts) * 1000) / 10;
}

function average(total: number, count: number) {
  if (count <= 0) return 0;
  return Math.round((total / count) * 100) / 100;
}

function getRawPlayerValue(raw: JsonRecord | null, key: string) {
  return raw ? raw[key] : undefined;
}

function getMatchRawClubIds(raw: JsonRecord | null) {
  const clubs = raw?.clubs;
  if (!clubs || typeof clubs !== "object" || Array.isArray(clubs)) return [];
  return Object.keys(clubs as JsonRecord);
}

function getRawObject(raw: JsonRecord | null, key: string): JsonRecord {
  const value = raw?.[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function getNestedObject(source: JsonRecord, key: string): JsonRecord {
  const value = source[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonRecord;
}


function getClubRecord(raw: JsonRecord | null, clubId: string) {
  const clubs = getRawObject(raw, "clubs");
  return getNestedObject(clubs, clubId);
}

function getClubDetails(raw: JsonRecord | null, clubId: string) {
  return getNestedObject(getClubRecord(raw, clubId), "details");
}

function getClubCustomKit(raw: JsonRecord | null, clubId: string) {
  return getNestedObject(getClubDetails(raw, clubId), "customKit");
}

function getClubCrestUrls(raw: JsonRecord | null, clubId: string) {
  if (clubId === CLUB_ID) {
    return [GX_NOVA_LOGO];
  }

  const club = getClubRecord(raw, clubId);
  const details = getClubDetails(raw, clubId);
  const customKit = getClubCustomKit(raw, clubId);

  const team = club.TEAM;
  const teamId = details.teamId;
  const crestAssetId = customKit.crestAssetId;
  const selectedKitType = String(customKit.selectedKitType ?? "");

  /*
   * On revient volontairement au comportement qui donnait les bons logos
   * pour la majorité des équipes :
   *
   * 1. TEAM en priorité
   * 2. teamId / crestAssetId selon le type de kit
   *
   * Pour certains clubs comme MGT ESPORT, TEAM renvoie l'écusson gris EA.
   * On préfère conserver ce comportement plutôt que d'afficher un mauvais
   * écusson personnalisé pour les autres adversaires.
   */
  const orderedIds: unknown[] = [team];

  if (selectedKitType === "0") {
    orderedIds.push(teamId, crestAssetId);
  } else {
    orderedIds.push(crestAssetId, teamId);
  }

  const urls: string[] = [];

  for (const assetId of orderedIds) {
    const url = crestProxyUrl(assetId);
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
}

function getOpponentClubId(raw: JsonRecord | null) {
  return getMatchRawClubIds(raw).find((clubId) => clubId !== CLUB_ID) ?? "";
}

function getClubName(raw: JsonRecord | null, clubId: string) {
  const clubs = getRawObject(raw, "clubs");
  const club = getNestedObject(clubs, clubId);
  const details = getNestedObject(club, "details");
  return stringValue(details.name) || `Club ${clubId}`;
}

function getClubAggregate(raw: JsonRecord | null, clubId: string) {
  const aggregate = getRawObject(raw, "aggregate");
  return getNestedObject(aggregate, clubId);
}

function getClubPlayers(raw: JsonRecord | null, clubId: string) {
  const players = getRawObject(raw, "players");
  return getNestedObject(players, clubId);
}

function teamFromRaw(raw: JsonRecord | null, clubId: string) {
  const aggregate = getClubAggregate(raw, clubId);
  const players = getClubPlayers(raw, clubId);
  const playerCount = Object.keys(players).length;
  const passesMade = numberValue(aggregate.passesmade);
  const passAttempts = numberValue(aggregate.passattempts);
  const tacklesMade = numberValue(aggregate.tacklesmade);
  const tackleAttempts = numberValue(aggregate.tackleattempts);
  const ratingTotal = numberValue(aggregate.rating);

  return {
    clubId,
    name: getClubName(raw, clubId),
    players: playerCount,
    shots: numberValue(aggregate.shots),
    passesMade,
    passAttempts,
    passSuccess: pct(passesMade, passAttempts),
    tacklesMade,
    tackleAttempts,
    tackleSuccess: pct(tacklesMade, tackleAttempts),
    saves: numberValue(aggregate.saves),
    redCards: numberValue(aggregate.redcards),
    averageRating: average(ratingTotal, playerCount),
    crestUrls: getClubCrestUrls(raw, clubId),
  };
}

export async function GET(request: Request) {
  const authorization = await requireActiveStaff();
  if (authorization.error) return authorization.error;

  try {
    const admin = createAdminClient();
    const url = new URL(request.url);
    const requestedMatchId = Number(url.searchParams.get("matchId") ?? 0);

    const { data: matchRowsData, error: matchesError } = await admin
      .from("matches")
      .select(
        "id, ea_match_id, played_at, opponent_name, goals_for, goals_against, result, season_id, competition_id, raw_data"
      )
      .eq("club_id", CLUB_ID)
      .order("played_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (matchesError) {
      throw new Error(matchesError.message);
    }

    const matchRows = (matchRowsData ?? []) as MatchRow[];

    const [{ data: competitions }, { data: seasons }] = await Promise.all([
      admin
        .from("competitions")
        .select("id, name, short_name, competition_type")
        .eq("club_id", CLUB_ID)
        .order("id", { ascending: true }),
      admin
        .from("seasons")
        .select("id, name, is_active")
        .eq("club_id", CLUB_ID)
        .order("id", { ascending: true }),
    ]);

    const competitionMap = new Map(
      (competitions ?? []).map((row) => [Number(row.id), row.short_name ?? row.name])
    );
    const seasonMap = new Map((seasons ?? []).map((row) => [Number(row.id), row.name]));

    const matches = matchRows.map((match) => {
      const opponentClubId = getOpponentClubId(match.raw_data);

      return {
        id: match.id,
        eaMatchId: match.ea_match_id,
        playedAt: match.played_at,
        opponent: match.opponent_name,
        goalsFor: Number(match.goals_for),
        goalsAgainst: Number(match.goals_against),
        result: match.result,
        competitionId: match.competition_id,
        competitionName:
          match.competition_id !== null
            ? competitionMap.get(match.competition_id) ?? null
            : null,
        seasonId: match.season_id,
        seasonName:
          match.season_id !== null ? seasonMap.get(match.season_id) ?? null : null,
        opponentCrestUrls: opponentClubId
          ? getClubCrestUrls(match.raw_data, opponentClubId)
          : [],
      };
    });

    if (!matchRows.length) {
      return NextResponse.json({
        matches: [],
        selected: null,
        advancedPlayers: [],
        goalkeepers: [],
        seasons: seasons ?? [],
        competitions: competitions ?? [],
        currentUser: authorization.profile,
      });
    }

    const selectedMatch =
      matchRows.find((match) => match.id === requestedMatchId) ?? matchRows[0];

    const allMatchIds = matchRows.map((match) => match.id);
    const { data: playerRowsData, error: playersError } = await admin
      .from("match_players")
      .select(
        "match_id, player_ea_id, player_name, position, rating, goals, assists, shots, passes_made, pass_attempts, tackles_made, tackle_attempts, saves, red_cards, raw_data"
      )
      .in("match_id", allMatchIds);

    if (playersError) {
      throw new Error(playersError.message);
    }

    const playerRows = (playerRowsData ?? []) as PlayerRow[];
    const selectedPlayerRows = playerRows.filter(
      (row) => row.match_id === selectedMatch.id
    );

    const raw = selectedMatch.raw_data;
    const opponentClubId = getOpponentClubId(raw);

    const gxTeam = teamFromRaw(raw, CLUB_ID);
    const opponentTeam = opponentClubId
      ? teamFromRaw(raw, opponentClubId)
      : {
          clubId: "",
          name: selectedMatch.opponent_name,
          players: 0,
          shots: 0,
          passesMade: 0,
          passAttempts: 0,
          passSuccess: 0,
          tacklesMade: 0,
          tackleAttempts: 0,
          tackleSuccess: 0,
          saves: 0,
          redCards: 0,
          averageRating: 0,
          crestUrls: [],
        };

    const selectedPlayers = selectedPlayerRows
      .map((row) => {
        const rawPlayer = row.raw_data ?? {};
        const manOfTheMatch = numberValue(getRawPlayerValue(rawPlayer, "mom")) > 0;
        const cleanSheetAny = numberValue(getRawPlayerValue(rawPlayer, "cleansheetsany")) > 0;
        const cleanSheetDef = numberValue(getRawPlayerValue(rawPlayer, "cleansheetsdef")) > 0;
        const cleanSheetGk = numberValue(getRawPlayerValue(rawPlayer, "cleansheetsgk")) > 0;
        return {
          id: row.player_ea_id ?? row.player_name,
          name: row.player_name,
          position: row.position ?? "unknown",
          rating: numberValue(row.rating),
          goals: Number(row.goals),
          assists: Number(row.assists),
          shots: Number(row.shots),
          passesMade: Number(row.passes_made),
          passAttempts: Number(row.pass_attempts),
          passSuccess: pct(Number(row.passes_made), Number(row.pass_attempts)),
          tacklesMade: Number(row.tackles_made),
          tackleAttempts: Number(row.tackle_attempts),
          tackleSuccess: pct(Number(row.tackles_made), Number(row.tackle_attempts)),
          saves: Number(row.saves),
          redCards: Number(row.red_cards),
          manOfTheMatch,
          cleanSheetAny,
          cleanSheetDef,
          cleanSheetGk,
          crossSaves: numberValue(getRawPlayerValue(rawPlayer, "crossSaves")),
          punchSaves: numberValue(getRawPlayerValue(rawPlayer, "punchSaves")),
          reflexSaves: numberValue(getRawPlayerValue(rawPlayer, "reflexSaves")),
          directionSaves: numberValue(
            getRawPlayerValue(rawPlayer, "goodDirectionSaves")
          ),
        };
      })
      .sort((a, b) => b.rating - a.rating);

    const opponentRawPlayers = opponentClubId
      ? getClubPlayers(raw, opponentClubId)
      : {};

    const opponentPlayers = Object.entries(opponentRawPlayers)
      .map(([id, value]) => {
        const player =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as JsonRecord)
            : {};
        const passesMade = numberValue(player.passesmade);
        const passAttempts = numberValue(player.passattempts);
        const tacklesMade = numberValue(player.tacklesmade);
        const tackleAttempts = numberValue(player.tackleattempts);
        return {
          id,
          name: stringValue(player.playername) || "Adversaire",
          position: stringValue(player.pos) || "unknown",
          rating: numberValue(player.rating),
          goals: numberValue(player.goals),
          assists: numberValue(player.assists),
          shots: numberValue(player.shots),
          passesMade,
          passAttempts,
          passSuccess: pct(passesMade, passAttempts),
          tacklesMade,
          tackleAttempts,
          tackleSuccess: pct(tacklesMade, tackleAttempts),
          saves: numberValue(player.saves),
          redCards: numberValue(player.redcards),
          manOfTheMatch: numberValue(player.mom) > 0,
        };
      })
      .sort((a, b) => b.rating - a.rating);

    const aggregated = new Map<
      string,
      {
        id: string;
        name: string;
        position: string;
        games: number;
        ratingTotal: number;
        goals: number;
        assists: number;
        shots: number;
        passesMade: number;
        passAttempts: number;
        tacklesMade: number;
        tackleAttempts: number;
        saves: number;
        redCards: number;
        mom: number;
        cleanSheetsAny: number;
        cleanSheetsDef: number;
        cleanSheetsGk: number;
        crossSaves: number;
        punchSaves: number;
        reflexSaves: number;
        directionSaves: number;
      }
    >();

    for (const row of playerRows) {
      const key = row.player_ea_id ?? normalizeName(row.player_name);
      const current = aggregated.get(key) ?? {
        id: key,
        name: row.player_name,
        position: row.position ?? "unknown",
        games: 0,
        ratingTotal: 0,
        goals: 0,
        assists: 0,
        shots: 0,
        passesMade: 0,
        passAttempts: 0,
        tacklesMade: 0,
        tackleAttempts: 0,
        saves: 0,
        redCards: 0,
        mom: 0,
        cleanSheetsAny: 0,
        cleanSheetsDef: 0,
        cleanSheetsGk: 0,
        crossSaves: 0,
        punchSaves: 0,
        reflexSaves: 0,
        directionSaves: 0,
      };

      const rawPlayer = row.raw_data ?? {};
      current.games += 1;
      current.ratingTotal += numberValue(row.rating);
      current.goals += Number(row.goals);
      current.assists += Number(row.assists);
      current.shots += Number(row.shots);
      current.passesMade += Number(row.passes_made);
      current.passAttempts += Number(row.pass_attempts);
      current.tacklesMade += Number(row.tackles_made);
      current.tackleAttempts += Number(row.tackle_attempts);
      current.saves += Number(row.saves);
      current.redCards += Number(row.red_cards);
      current.mom += numberValue(getRawPlayerValue(rawPlayer, "mom")) > 0 ? 1 : 0;
      current.cleanSheetsAny +=
        numberValue(getRawPlayerValue(rawPlayer, "cleansheetsany")) > 0 ? 1 : 0;
      current.cleanSheetsDef +=
        numberValue(getRawPlayerValue(rawPlayer, "cleansheetsdef")) > 0 ? 1 : 0;
      current.cleanSheetsGk +=
        numberValue(getRawPlayerValue(rawPlayer, "cleansheetsgk")) > 0 ? 1 : 0;
      current.crossSaves += numberValue(getRawPlayerValue(rawPlayer, "crossSaves"));
      current.punchSaves += numberValue(getRawPlayerValue(rawPlayer, "punchSaves"));
      current.reflexSaves += numberValue(getRawPlayerValue(rawPlayer, "reflexSaves"));
      current.directionSaves += numberValue(
        getRawPlayerValue(rawPlayer, "goodDirectionSaves")
      );

      aggregated.set(key, current);
    }

    const advancedPlayers = Array.from(aggregated.values())
      .map((player) => ({
        id: player.id,
        name: player.name,
        position: player.position,
        games: player.games,
        averageRating: average(player.ratingTotal, player.games),
        goals: player.goals,
        assists: player.assists,
        contributions: player.goals + player.assists,
        contributionsPerGame: average(player.goals + player.assists, player.games),
        shots: player.shots,
        shootingEfficiency: pct(player.goals, player.shots),
        passesMade: player.passesMade,
        passAttempts: player.passAttempts,
        passSuccess: pct(player.passesMade, player.passAttempts),
        tacklesMade: player.tacklesMade,
        tackleAttempts: player.tackleAttempts,
        tackleSuccess: pct(player.tacklesMade, player.tackleAttempts),
        saves: player.saves,
        redCards: player.redCards,
        manOfTheMatch: player.mom,
        cleanSheetsAny: player.cleanSheetsAny,
        cleanSheetsDef: player.cleanSheetsDef,
        cleanSheetsGk: player.cleanSheetsGk,
        crossSaves: player.crossSaves,
        punchSaves: player.punchSaves,
        reflexSaves: player.reflexSaves,
        directionSaves: player.directionSaves,
      }))
      .sort((a, b) => b.averageRating - a.averageRating);

    const matchById = new Map(matchRows.map((match) => [match.id, match]));
    const goalkeepers = advancedPlayers
      .filter((player) => player.position === "goalkeeper")
      .map((player) => {
        const keeperRows = playerRows.filter(
          (row) =>
            (row.player_ea_id ?? normalizeName(row.player_name)) === player.id &&
            row.position === "goalkeeper"
        );
        let goalsAgainst = 0;
        for (const row of keeperRows) {
          goalsAgainst += Number(matchById.get(row.match_id)?.goals_against ?? 0);
        }
        const savePct = pct(player.saves, player.saves + goalsAgainst);
        return {
          ...player,
          goalsAgainst,
          savePct,
        };
      })
      .sort((a, b) => b.averageRating - a.averageRating);

    const normalizedOpponent = normalizeName(selectedMatch.opponent_name);
    const h2hMatches = matchRows.filter(
      (match) => normalizeName(match.opponent_name) === normalizedOpponent
    );
    const h2h = {
      opponent: selectedMatch.opponent_name,
      matches: h2hMatches.length,
      wins: h2hMatches.filter((match) => match.result === "V").length,
      draws: h2hMatches.filter((match) => match.result === "N").length,
      losses: h2hMatches.filter((match) => match.result === "D").length,
      goalsFor: h2hMatches.reduce((sum, match) => sum + Number(match.goals_for), 0),
      goalsAgainst: h2hMatches.reduce(
        (sum, match) => sum + Number(match.goals_against),
        0
      ),
      recent: h2hMatches.slice(0, 5).map((match) => ({
        id: match.id,
        playedAt: match.played_at,
        score: `${match.goals_for}-${match.goals_against}`,
        result: match.result,
      })),
    };

    const sameDayMatches = selectedMatch.played_at
      ? matches.filter(
          (match) => match.playedAt?.slice(0, 10) === selectedMatch.played_at?.slice(0, 10)
        )
      : [];

    const sameDayMatchIds = new Set(sameDayMatches.map((match) => match.id));
    const sessionRows = playerRows.filter((row) => sameDayMatchIds.has(row.match_id));
    const sessionAggregated = new Map<
      string,
      {
        id: string;
        name: string;
        position: string;
        games: number;
        ratingTotal: number;
        goals: number;
        assists: number;
        shots: number;
        passesMade: number;
        passAttempts: number;
        tacklesMade: number;
        tackleAttempts: number;
        saves: number;
        redCards: number;
        mom: number;
        cleanSheetsAny: number;
        cleanSheetsDef: number;
        cleanSheetsGk: number;
        crossSaves: number;
        punchSaves: number;
        reflexSaves: number;
        directionSaves: number;
      }
    >();

    for (const row of sessionRows) {
      const key = row.player_ea_id ?? normalizeName(row.player_name);
      const current = sessionAggregated.get(key) ?? {
        id: key,
        name: row.player_name,
        position: row.position ?? "unknown",
        games: 0,
        ratingTotal: 0,
        goals: 0,
        assists: 0,
        shots: 0,
        passesMade: 0,
        passAttempts: 0,
        tacklesMade: 0,
        tackleAttempts: 0,
        saves: 0,
        redCards: 0,
        mom: 0,
        cleanSheetsAny: 0,
        cleanSheetsDef: 0,
        cleanSheetsGk: 0,
        crossSaves: 0,
        punchSaves: 0,
        reflexSaves: 0,
        directionSaves: 0,
      };

      const rawPlayer = row.raw_data ?? {};
      current.games += 1;
      current.ratingTotal += numberValue(row.rating);
      current.goals += Number(row.goals);
      current.assists += Number(row.assists);
      current.shots += Number(row.shots);
      current.passesMade += Number(row.passes_made);
      current.passAttempts += Number(row.pass_attempts);
      current.tacklesMade += Number(row.tackles_made);
      current.tackleAttempts += Number(row.tackle_attempts);
      current.saves += Number(row.saves);
      current.redCards += Number(row.red_cards);
      current.mom += numberValue(getRawPlayerValue(rawPlayer, "mom")) > 0 ? 1 : 0;
      current.cleanSheetsAny +=
        numberValue(getRawPlayerValue(rawPlayer, "cleansheetsany")) > 0 ? 1 : 0;
      current.cleanSheetsDef +=
        numberValue(getRawPlayerValue(rawPlayer, "cleansheetsdef")) > 0 ? 1 : 0;
      current.cleanSheetsGk +=
        numberValue(getRawPlayerValue(rawPlayer, "cleansheetsgk")) > 0 ? 1 : 0;
      current.crossSaves += numberValue(getRawPlayerValue(rawPlayer, "crossSaves"));
      current.punchSaves += numberValue(getRawPlayerValue(rawPlayer, "punchSaves"));
      current.reflexSaves += numberValue(getRawPlayerValue(rawPlayer, "reflexSaves"));
      current.directionSaves += numberValue(
        getRawPlayerValue(rawPlayer, "goodDirectionSaves")
      );

      sessionAggregated.set(key, current);
    }

    const sessionPlayers = Array.from(sessionAggregated.values())
      .map((player) => ({
        id: player.id,
        name: player.name,
        position: player.position,
        games: player.games,
        averageRating: average(player.ratingTotal, player.games),
        goals: player.goals,
        assists: player.assists,
        contributions: player.goals + player.assists,
        contributionsPerGame: average(player.goals + player.assists, player.games),
        shots: player.shots,
        shootingEfficiency: pct(player.goals, player.shots),
        passesMade: player.passesMade,
        passAttempts: player.passAttempts,
        passSuccess: pct(player.passesMade, player.passAttempts),
        tacklesMade: player.tacklesMade,
        tackleAttempts: player.tackleAttempts,
        tackleSuccess: pct(player.tacklesMade, player.tackleAttempts),
        saves: player.saves,
        redCards: player.redCards,
        manOfTheMatch: player.mom,
        cleanSheetsAny: player.cleanSheetsAny,
        cleanSheetsDef: player.cleanSheetsDef,
        cleanSheetsGk: player.cleanSheetsGk,
        crossSaves: player.crossSaves,
        punchSaves: player.punchSaves,
        reflexSaves: player.reflexSaves,
        directionSaves: player.directionSaves,
      }))
      .sort((a, b) => b.averageRating - a.averageRating);

    return NextResponse.json({
      matches,
      selected: {
        match: matches.find((match) => match.id === selectedMatch.id),
        gxTeam,
        opponentTeam,
        players: selectedPlayers,
        opponentPlayers,
        h2h,
        sameDayMatches,
        sessionPlayers,
      },
      advancedPlayers,
      goalkeepers,
      seasons: seasons ?? [],
      competitions: competitions ?? [],
      currentUser: authorization.profile,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Impossible de charger le Match Center.",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
