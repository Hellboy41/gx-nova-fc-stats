export type Role = "goalkeeper" | "defender" | "midfielder" | "forward";
export type FormTrend = "up" | "stable" | "down" | "insufficient";

export type IntelligenceMatch = {
  id: number;
  played_at: string | null;
  result: "V" | "N" | "D";
  goals_for: number;
  goals_against: number;
};

export type IntelligencePerformance = {
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
  raw_data: Record<string, unknown> | null;
};

export type PlayerFormReport = {
  key: string;
  name: string;
  role: Role;
  appearances: number;
  recentCount: number;
  previousCount: number;
  recentRating: number | null;
  previousRating: number | null;
  overallRating: number;
  ratingDelta: number | null;
  trend: FormTrend;
  recentGoals: number;
  recentAssists: number;
  recentTackles: number;
  recentSaves: number;
  matchDates: string[];
};

export type RolePerformanceReport = {
  key: string;
  name: string;
  role: Role;
  matches: number;
  rating: number;
  goalsPerMatch: number;
  assistsPerMatch: number;
  shotsPerMatch: number;
  tacklesPerMatch: number;
  savesPerMatch: number;
  passesPct: number | null;
  tacklesPct: number | null;
  cleanSheetCount: number;
  mvpCount: number;
};

export type PairReport = {
  key: string;
  playerA: string;
  playerB: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  pointsPerMatch: number;
  winRate: number;
  baselineWinRate: number;
};

export type SportIntelligenceData = {
  matches: number;
  minDate: string | null;
  maxDate: string | null;
  truncated: boolean;
  teamWinRate: number;
  players: PlayerFormReport[];
  roles: RolePerformanceReport[];
  pairs: PairReport[];
};

type Row = IntelligencePerformance & { key: string; role: Role; played_at: string };
const ROLES: Role[] = ["goalkeeper", "defender", "midfielder", "forward"];

function number(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function round(n: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(n * scale) / scale;
}
function average(rows: Row[]): number | null {
  const valid = rows.map((row) => number(row.rating)).filter((value) => value > 0);
  return valid.length ? round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
}
function pct(n: number, d: number): number | null {
  return d > 0 ? round((n * 100) / d, 1) : null;
}
function normRole(value: string | null): Role | null {
  const v = String(value ?? "").toLowerCase();
  return ROLES.includes(v as Role) ? (v as Role) : null;
}
function count(rows: Row[], prop: keyof IntelligencePerformance): number {
  return rows.reduce((sum, row) => sum + number(row[prop]), 0);
}
function title(raw: Record<string, unknown> | null, key: string): boolean {
  return number(raw?.[key]) > 0;
}

/**
 * Calculs descriptifs: la forme compare les 5 dernières apparitions du joueur
 * aux 5 précédentes (3 notes minimum par fenêtre). Un duo signifie seulement
 * présence sur les mêmes feuilles de match, pas causalité ni simultanéité exacte.
 */
export function buildSportIntelligence(
  matches: IntelligenceMatch[],
  performances: IntelligencePerformance[],
  excludedPlayerKeys: ReadonlySet<string>,
  getKey: (id: string | null, name: string) => string,
  truncated = false
): SportIntelligenceData {
  const orderedMatches = [...matches].sort((a, b) =>
    String(b.played_at ?? "").localeCompare(String(a.played_at ?? ""))
  );
  const matchById = new Map(orderedMatches.map((match) => [match.id, match]));
  const allRows: Row[] = [];

  for (const row of performances) {
    const match = matchById.get(row.match_id);
    const role = normRole(row.position);
    const key = getKey(row.player_ea_id, row.player_name);
    if (!match || !role || excludedPlayerKeys.has(key)) continue;
    allRows.push({ ...row, role, key, played_at: match.played_at ?? "" });
  }

  const playerMap = new Map<string, Row[]>();
  for (const row of allRows) {
    if (!playerMap.has(row.key)) playerMap.set(row.key, []);
    playerMap.get(row.key)!.push(row);
  }

  const names = new Map<string, string>();
  const players: PlayerFormReport[] = [];
  const roles: RolePerformanceReport[] = [];

  for (const [key, unsorted] of playerMap) {
    const rows = [...unsorted].sort((a, b) => b.played_at.localeCompare(a.played_at));
    names.set(key, rows[0].player_name);
    const topRole = [...ROLES].sort((a, b) =>
      rows.filter((row) => row.role === b).length - rows.filter((row) => row.role === a).length
    )[0];
    const recent = rows.slice(0, 5);
    const previous = rows.slice(5, 10);
    const recentRating = average(recent);
    const previousRating = average(previous);
    const hasEnough = recent.length >= 3 && previous.length >= 3 &&
      recentRating !== null && previousRating !== null;
    const delta = hasEnough ? round(recentRating! - previousRating!) : null;
    const trend: FormTrend = delta === null ? "insufficient" : delta >= 0.35
      ? "up" : delta <= -0.35 ? "down" : "stable";
    players.push({
      key, name: rows[0].player_name, role: topRole, appearances: rows.length,
      recentCount: recent.length, previousCount: previous.length,
      recentRating, previousRating, overallRating: average(rows) ?? 0,
      ratingDelta: delta, trend,
      recentGoals: count(recent, "goals"),
      recentAssists: count(recent, "assists"),
      recentTackles: count(recent, "tackles_made"),
      recentSaves: count(recent, "saves"),
      matchDates: recent.map((row) => row.played_at),
    });
    for (const role of ROLES) {
      const roleRows = rows.filter((row) => row.role === role);
      if (roleRows.length < 3) continue;
      const games = roleRows.length;
      const success = count(roleRows, "passes_made");
      const attempts = count(roleRows, "pass_attempts");
      const tacklesMade = count(roleRows, "tackles_made");
      const tacklesAttempted = count(roleRows, "tackle_attempts");
      roles.push({
        key, name: rows[0].player_name, role, matches: games,
        rating: average(roleRows) ?? 0,
        goalsPerMatch: round(count(roleRows, "goals") / games),
        assistsPerMatch: round(count(roleRows, "assists") / games),
        shotsPerMatch: round(count(roleRows, "shots") / games),
        tacklesPerMatch: round(tacklesMade / games),
        savesPerMatch: round(count(roleRows, "saves") / games),
        passesPct: pct(success, attempts),
        tacklesPct: pct(tacklesMade, tacklesAttempted),
        cleanSheetCount: roleRows.filter((row) =>
          title(row.raw_data, role === "goalkeeper" ? "cleansheetsgk" : "cleansheetsdef")
        ).length,
        mvpCount: roleRows.filter((row) => title(row.raw_data, "mom")).length,
      });
    }
  }

  players.sort((a, b) =>
    (b.ratingDelta ?? -999) - (a.ratingDelta ?? -999) ||
    b.recentCount - a.recentCount || b.appearances - a.appearances
  );
  roles.sort((a, b) => b.rating - a.rating || b.matches - a.matches);

  const pairsMap = new Map<string, { a: string; b: string; games: number; wins: number; draws: number; losses: number }>();
  const rowsByMatch = new Map<number, Set<string>>();
  for (const row of allRows) {
    if (!rowsByMatch.has(row.match_id)) rowsByMatch.set(row.match_id, new Set());
    rowsByMatch.get(row.match_id)!.add(row.key);
  }
  for (const match of orderedMatches) {
    const members = [...(rowsByMatch.get(match.id) ?? new Set<string>())].sort();
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const a = members[i], b = members[j];
        const id = JSON.stringify([a, b]);
        const pair = pairsMap.get(id) ?? { a, b, games: 0, wins: 0, draws: 0, losses: 0 };
        pair.games++;
        if (match.result === "V") pair.wins++;
        else if (match.result === "N") pair.draws++;
        else pair.losses++;
        pairsMap.set(id, pair);
      }
    }
  }
  const baselineWinRate = orderedMatches.length
    ? round(100 * orderedMatches.filter((match) => match.result === "V").length / orderedMatches.length, 1) : 0;
  const pairs: PairReport[] = [...pairsMap.values()]
    .filter((pair) => pair.games >= 8)
    .map((pair) => ({
      key: JSON.stringify([pair.a, pair.b]),
      playerA: names.get(pair.a) ?? pair.a,
      playerB: names.get(pair.b) ?? pair.b,
      games: pair.games, wins: pair.wins, draws: pair.draws, losses: pair.losses,
      pointsPerMatch: round((3 * pair.wins + pair.draws) / pair.games),
      winRate: round(pair.wins * 100 / pair.games, 1),
      baselineWinRate,
    }))
    .sort((a, b) => b.pointsPerMatch - a.pointsPerMatch || b.games - a.games)
    .slice(0, 100);

  return {
    matches: orderedMatches.length,
    minDate: orderedMatches.at(-1)?.played_at ?? null,
    maxDate: orderedMatches[0]?.played_at ?? null,
    truncated,
    teamWinRate: baselineWinRate,
    players,
    roles,
    pairs,
  };
}
