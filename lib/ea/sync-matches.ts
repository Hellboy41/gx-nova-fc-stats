import { createAdminClient } from "@/lib/supabase/admin";

const CLUB_ID = "1663";
const PLATFORM = "common-gen5";
const MATCH_TYPE = "friendlyMatch";
const FULL_MATCH_SECONDS = 90 * 60;
const REGULATION_DRAW_MAX_SECONDS = 105 * 60;
const MAX_RESULT_COUNT = 50;

type RawClub = {
  goals?: string | number;
  goalsAgainst?: string | number;
  winnerByDnf?: string | number;
  details?: {
    name?: string;
    clubId?: number | string;
  };
};

type RawAggregate = {
  goals?: string | number;
  gameTime?: string | number;
  secondsPlayed?: string | number;
};

type RawPlayer = Record<string, unknown>;

type RawMatch = {
  matchId?: string | number;
  timestamp?: string | number;
  clubs?: Record<string, RawClub>;
  aggregate?: Record<string, RawAggregate>;
  players?: Record<
    string,
    RawPlayer[] | Record<string, RawPlayer>
  >;
};

type PlayerRow = {
  match_id: number;
  player_ea_id: string | null;
  player_name: string;
  position: string | null;
  rating: number;
  goals: number;
  assists: number;
  shots: number;
  passes_made: number;
  pass_attempts: number;
  tackles_made: number;
  tackle_attempts: number;
  saves: number;
  red_cards: number;
  raw_data: RawPlayer;
  updated_at: string;
};

type MatchAnalysis = {
  eaMatchId: string;
  opponentClubId: string | null;
  opponentName: string;
  durationSeconds: number | null;
  officialGoalsFor: number;
  officialGoalsAgainst: number;
  aggregateGoalsFor: number | null;
  aggregateGoalsAgainst: number | null;
  goalsFor: number;
  goalsAgainst: number;
  result: "V" | "N" | "D";
  isShortMatch: boolean;
  artificialDrawCorrected: boolean;
};

type RepairResult = {
  removedEaMatchIds: string[];
  correctedEaMatchIds: string[];
  programmeLinksCleared: number;
};

export type EaSyncResult = {
  success: true;
  clubId: string;
  platform: string;
  matchType: string;
  matchesFound: number;
  matchesAccepted: number;
  matchesSynchronized: number;
  playerPerformancesSynchronized: number;
  ignoredInvalidPlayers: number;
  matchesWithoutDurationEvidence: number;
  shortMatchesExcluded: number;
  artificialDrawsCorrected: number;
  storedMatchesRemoved: number;
  storedArtificialDrawsCorrected: number;
  programmeLinksCleared: number;
};

export class EaSyncError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "EaSyncError";
    this.status = status;
  }
}

export async function syncEaMatches(): Promise<EaSyncResult> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const url =
    `https://proclubs.ea.com/api/fc/clubs/matches` +
    `?platform=${PLATFORM}` +
    `&clubIds=${CLUB_ID}` +
    `&matchType=${MATCH_TYPE}` +
    `&maxResultCount=${MAX_RESULT_COUNT}`;

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
    throw new EaSyncError(
      `Impossible de récupérer les matchs EA. Erreur EA ${response.status}.`,
      502
    );
  }

  const data = (await response.json()) as unknown;

  if (!Array.isArray(data)) {
    throw new EaSyncError(
      "La réponse EA n'est pas au format attendu.",
      502
    );
  }

  const uniqueMatches = new Map<string, RawMatch>();

  for (const rawValue of data) {
    const match = toRawMatch(rawValue);
    if (!match || match.matchId === undefined || match.matchId === null) {
      continue;
    }

    const key = String(match.matchId);
    if (!uniqueMatches.has(key)) {
      uniqueMatches.set(key, match);
    }
  }

  const preparedMatches = Array.from(uniqueMatches.values()).map((match) => ({
    match,
    analysis: analyzeMatch(match),
  }));

  const acceptedMatches = preparedMatches.filter(
    ({ analysis }) => !analysis.isShortMatch
  );

  const incomingShortEaIds = preparedMatches
    .filter(({ analysis }) => analysis.isShortMatch)
    .map(({ analysis }) => analysis.eaMatchId);

  const incomingCorrectedEaIds = acceptedMatches
    .filter(({ analysis }) => analysis.artificialDrawCorrected)
    .map(({ analysis }) => analysis.eaMatchId);

  const matchesWithoutDurationEvidence = preparedMatches.filter(
    ({ analysis }) => analysis.durationSeconds === null
  ).length;

  const matchRows = acceptedMatches.map(({ match, analysis }) => {
    const timestamp = numberValue(match.timestamp);

    return {
      platform: PLATFORM,
      ea_match_id: analysis.eaMatchId,
      club_id: CLUB_ID,
      played_at:
        timestamp > 0 ? new Date(timestamp * 1000).toISOString() : null,
      match_type: MATCH_TYPE,
      opponent_name: analysis.opponentName,
      goals_for: analysis.goalsFor,
      goals_against: analysis.goalsAgainst,
      result: analysis.result,
      raw_data: match,
      imported_at: now,
      updated_at: now,
    };
  });

  let savedMatches: Array<{ id: number; ea_match_id: string }> = [];

  if (matchRows.length > 0) {
    const { data: saved, error } = await supabase
      .from("matches")
      .upsert(matchRows, {
        onConflict: "platform,ea_match_id",
      })
      .select("id, ea_match_id");

    if (error) {
      throw new EaSyncError(
        `Erreur lors de l'enregistrement des matchs : ${error.message}`
      );
    }

    savedMatches = (saved ?? []).map((row) => ({
      id: Number(row.id),
      ea_match_id: String(row.ea_match_id),
    }));
  }

  const matchIdMap = new Map<string, number>();
  for (const savedMatch of savedMatches) {
    matchIdMap.set(savedMatch.ea_match_id, savedMatch.id);
  }

  const playerRowsMap = new Map<string, PlayerRow>();
  let ignoredPlayers = 0;

  for (const { match, analysis } of acceptedMatches) {
    const databaseMatchId = matchIdMap.get(analysis.eaMatchId);
    if (!databaseMatchId) continue;

    const clubPlayers = match.players?.[CLUB_ID];
    const normalizedPlayers = normalizePlayers(clubPlayers);

    for (const item of normalizedPlayers) {
      const player = item.player;
      const playerName = textValue(
        firstValue(player, [
          "playername",
          "playerName",
          "name",
          "gamertag",
          "personaName",
        ])
      ).trim();

      if (!isValidPlayerName(playerName)) {
        ignoredPlayers++;
        continue;
      }

      const playerEaId =
        textValue(
          firstValue(player, [
            "blazeId",
            "playerId",
            "personaId",
            "id",
          ])
        ) ||
        item.id ||
        null;

      const position = textValue(
        firstValue(player, [
          "pos",
          "position",
          "vproPosition",
          "vproposition",
        ])
      );

      const playerRow: PlayerRow = {
        match_id: databaseMatchId,
        player_ea_id: playerEaId,
        player_name: playerName,
        position: position || null,
        rating: numberValue(firstValue(player, ["rating", "matchRating"])),
        goals: numberValue(firstValue(player, ["goals"])),
        assists: numberValue(firstValue(player, ["assists"])),
        shots: numberValue(firstValue(player, ["shots"])),
        passes_made: numberValue(
          firstValue(player, ["passesmade", "passesMade"])
        ),
        pass_attempts: numberValue(
          firstValue(player, ["passattempts", "passAttempts"])
        ),
        tackles_made: numberValue(
          firstValue(player, ["tacklesmade", "tacklesMade"])
        ),
        tackle_attempts: numberValue(
          firstValue(player, ["tackleattempts", "tackleAttempts"])
        ),
        saves: numberValue(firstValue(player, ["saves"])),
        red_cards: numberValue(firstValue(player, ["redcards", "redCards"])),
        raw_data: player,
        updated_at: now,
      };

      playerRowsMap.set(`${databaseMatchId}::${playerName}`, playerRow);
    }
  }

  const playerRows = Array.from(playerRowsMap.values());

  if (playerRows.length > 0) {
    const { error } = await supabase
      .from("match_players")
      .upsert(playerRows, {
        onConflict: "match_id,player_name",
      });

    if (error) {
      throw new EaSyncError(
        `Les matchs ont été enregistrés mais une erreur est survenue avec les joueurs : ${error.message}`
      );
    }
  }

  const repair = await repairStoredMatches(supabase, now);

  const shortMatchesExcluded = new Set([
    ...incomingShortEaIds,
    ...repair.removedEaMatchIds,
  ]).size;

  const artificialDrawsCorrected = new Set([
    ...incomingCorrectedEaIds,
    ...repair.correctedEaMatchIds,
  ]).size;

  return {
    success: true,
    clubId: CLUB_ID,
    platform: PLATFORM,
    matchType: MATCH_TYPE,
    matchesFound: preparedMatches.length,
    matchesAccepted: acceptedMatches.length,
    matchesSynchronized: savedMatches.length,
    playerPerformancesSynchronized: playerRows.length,
    ignoredInvalidPlayers: ignoredPlayers,
    matchesWithoutDurationEvidence,
    shortMatchesExcluded,
    artificialDrawsCorrected,
    storedMatchesRemoved: repair.removedEaMatchIds.length,
    storedArtificialDrawsCorrected: repair.correctedEaMatchIds.length,
    programmeLinksCleared: repair.programmeLinksCleared,
  };
}

async function repairStoredMatches(
  supabase: ReturnType<typeof createAdminClient>,
  now: string
): Promise<RepairResult> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, ea_match_id, goals_for, goals_against, result, raw_data"
    )
    .eq("club_id", CLUB_ID)
    .eq("platform", PLATFORM)
    .eq("match_type", MATCH_TYPE)
    .limit(5000);

  if (error) {
    throw new EaSyncError(
      `Impossible de vérifier les anciens matchs EA : ${error.message}`
    );
  }

  const idsToDelete: number[] = [];
  const removedEaMatchIds: string[] = [];
  const correctedEaMatchIds: string[] = [];

  for (const row of data ?? []) {
    const rawMatch = toRawMatch(row.raw_data);
    if (!rawMatch) continue;

    const analysis = analyzeMatch(rawMatch);

    if (analysis.isShortMatch) {
      idsToDelete.push(Number(row.id));
      removedEaMatchIds.push(String(row.ea_match_id));
      continue;
    }

    if (!analysis.artificialDrawCorrected) continue;

    const currentGoalsFor = numberValue(row.goals_for);
    const currentGoalsAgainst = numberValue(row.goals_against);
    const currentResult = textValue(row.result);

    if (
      currentGoalsFor === analysis.goalsFor &&
      currentGoalsAgainst === analysis.goalsAgainst &&
      currentResult === analysis.result
    ) {
      continue;
    }

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        goals_for: analysis.goalsFor,
        goals_against: analysis.goalsAgainst,
        result: analysis.result,
        updated_at: now,
      })
      .eq("id", row.id);

    if (updateError) {
      throw new EaSyncError(
        `Impossible de corriger le match ${row.ea_match_id} : ${updateError.message}`
      );
    }

    correctedEaMatchIds.push(String(row.ea_match_id));
  }

  let programmeLinksCleared = 0;

  if (idsToDelete.length > 0) {
    programmeLinksCleared = await clearProgrammeLinks(
      supabase,
      new Set(idsToDelete),
      now
    );

    const { error: deleteError } = await supabase
      .from("matches")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      throw new EaSyncError(
        `Impossible de supprimer les matchs interrompus : ${deleteError.message}`
      );
    }
  }

  return {
    removedEaMatchIds,
    correctedEaMatchIds,
    programmeLinksCleared,
  };
}

async function clearProgrammeLinks(
  supabase: ReturnType<typeof createAdminClient>,
  deletedMatchIds: Set<number>,
  now: string
) {
  const { data, error } = await supabase
    .from("weekly_programs")
    .select("id, schedule")
    .eq("club_id", CLUB_ID);

  if (error) {
    throw new EaSyncError(
      `Impossible de vérifier les liens du programme : ${error.message}`
    );
  }

  let cleared = 0;

  for (const row of data ?? []) {
    const cleaned = clearDeletedMatchLinks(row.schedule, deletedMatchIds);
    if (!cleaned.changed) continue;

    const { error: updateError } = await supabase
      .from("weekly_programs")
      .update({
        schedule: cleaned.schedule,
        updated_at: now,
      })
      .eq("id", row.id);

    if (updateError) {
      throw new EaSyncError(
        `Impossible de nettoyer un lien du programme : ${updateError.message}`
      );
    }

    cleared += cleaned.cleared;
  }

  return cleared;
}

function clearDeletedMatchLinks(
  value: unknown,
  deletedMatchIds: Set<number>
): {
  schedule: Record<string, unknown>;
  changed: boolean;
  cleared: number;
} {
  if (!isRecord(value)) {
    return {
      schedule: {},
      changed: false,
      cleared: 0,
    };
  }

  let changed = false;
  let cleared = 0;
  const schedule: Record<string, unknown> = {};

  for (const [date, rawItems] of Object.entries(value)) {
    if (!Array.isArray(rawItems)) {
      schedule[date] = rawItems;
      continue;
    }

    schedule[date] = rawItems.map((rawItem) => {
      if (!isRecord(rawItem)) return rawItem;

      const linkedMatchId = numberOrNull(rawItem.linkedMatchId);
      if (
        linkedMatchId === null ||
        !deletedMatchIds.has(Math.trunc(linkedMatchId))
      ) {
        return rawItem;
      }

      changed = true;
      cleared++;

      return {
        ...rawItem,
        status: "upcoming",
        linkedMatchId: null,
        linkedEaMatchId: "",
        linkedAt: "",
        linkConfidence: null,
        linkMethod: null,
        eaOpponentName: "",
        eaPlayedAt: "",
        goalsFor: null,
        goalsAgainst: null,
        result: null,
      };
    });
  }

  return {
    schedule,
    changed,
    cleared,
  };
}

function analyzeMatch(match: RawMatch): MatchAnalysis {
  const eaMatchId = textValue(match.matchId);
  const clubs = match.clubs ?? {};
  const gxNova = clubs[CLUB_ID];
  const opponentEntry = Object.entries(clubs).find(
    ([clubId]) => clubId !== CLUB_ID
  );

  const opponentClubId = opponentEntry?.[0] ?? null;
  const opponent = opponentEntry?.[1];
  const officialGoalsFor = numberValue(gxNova?.goals);
  const officialGoalsAgainst =
    gxNova?.goalsAgainst !== undefined
      ? numberValue(gxNova.goalsAgainst)
      : numberValue(opponent?.goals);

  const durationSeconds = getMatchDurationSeconds(match);
  const isShortMatch =
    durationSeconds !== null && durationSeconds < FULL_MATCH_SECONDS;

  const aggregateGoalsFor = aggregateGoals(match, CLUB_ID);
  const aggregateGoalsAgainst = opponentClubId
    ? aggregateGoals(match, opponentClubId)
    : null;

  const looksLikeDefaultThreeNil =
    (officialGoalsFor === 3 && officialGoalsAgainst === 0) ||
    (officialGoalsFor === 0 && officialGoalsAgainst === 3);

  const isRegulationEnd =
    durationSeconds !== null &&
    durationSeconds >= FULL_MATCH_SECONDS &&
    durationSeconds < REGULATION_DRAW_MAX_SECONDS;

  const aggregateShowsDraw =
    aggregateGoalsFor !== null &&
    aggregateGoalsAgainst !== null &&
    aggregateGoalsFor === aggregateGoalsAgainst;

  const artificialDrawCorrected =
    !isShortMatch &&
    isRegulationEnd &&
    looksLikeDefaultThreeNil &&
    aggregateShowsDraw;

  const goalsFor = artificialDrawCorrected
    ? aggregateGoalsFor ?? officialGoalsFor
    : officialGoalsFor;

  const goalsAgainst = artificialDrawCorrected
    ? aggregateGoalsAgainst ?? officialGoalsAgainst
    : officialGoalsAgainst;

  return {
    eaMatchId,
    opponentClubId,
    opponentName: opponent?.details?.name ?? "Adversaire inconnu",
    durationSeconds,
    officialGoalsFor,
    officialGoalsAgainst,
    aggregateGoalsFor,
    aggregateGoalsAgainst,
    goalsFor,
    goalsAgainst,
    result: resultFromScore(goalsFor, goalsAgainst),
    isShortMatch,
    artificialDrawCorrected,
  };
}

function getMatchDurationSeconds(match: RawMatch) {
  let maxSeconds = 0;
  let hasEvidence = false;

  for (const clubPlayers of Object.values(match.players ?? {})) {
    for (const { player } of normalizePlayers(clubPlayers)) {
      for (const key of ["secondsPlayed", "gameTime"]) {
        const value = numberOrNull(player[key]);
        if (value === null || value <= 0) continue;
        hasEvidence = true;
        maxSeconds = Math.max(maxSeconds, value);
      }
    }
  }

  return hasEvidence ? Math.round(maxSeconds) : null;
}

function aggregateGoals(match: RawMatch, clubId: string) {
  const aggregate = match.aggregate?.[clubId];
  return aggregate ? numberOrNull(aggregate.goals) : null;
}

function resultFromScore(
  goalsFor: number,
  goalsAgainst: number
): "V" | "N" | "D" {
  if (goalsFor > goalsAgainst) return "V";
  if (goalsFor < goalsAgainst) return "D";
  return "N";
}

function isValidPlayerName(playerName: string) {
  const invalidNames = [
    "",
    "-",
    "--",
    "---",
    "null",
    "undefined",
  ];

  return !invalidNames.includes(playerName.toLowerCase());
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textValue(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function firstValue(player: RawPlayer, keys: string[]) {
  for (const key of keys) {
    if (player[key] !== undefined && player[key] !== null) {
      return player[key];
    }
  }

  return undefined;
}

function normalizePlayers(
  value:
    | RawPlayer[]
    | Record<string, RawPlayer>
    | undefined
) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((player, index) => ({
      id:
        textValue(
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

  return Object.entries(value).map(([id, player]) => ({
    id,
    player,
  }));
}

function toRawMatch(value: unknown): RawMatch | null {
  return isRecord(value) ? (value as RawMatch) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
