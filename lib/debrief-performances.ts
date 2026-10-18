export const PERFORMANCE_FIELDS = [
  "goals", "assists", "shots", "passesMade", "passAttempts",
  "tacklesMade", "tackleAttempts", "saves", "redCards", "rating",
] as const;

export type PerformanceField = (typeof PERFORMANCE_FIELDS)[number];
export type PerformanceValues = Record<PerformanceField, number>;
export type PerformanceOverrides = Partial<PerformanceValues>;

export type DebriefPerformanceRow = {
  matchId: number;
  playerName: string;
  playerEaId: string | null;
  position: string | null;
  original: PerformanceValues;
  overrides: PerformanceOverrides;
  corrected: PerformanceValues;
  updatedAt: string | null;
};

export type DebriefPerformanceMatch = {
  id: number;
  opponent: string;
  time: string;
  goalsFor: number;
  goalsAgainst: number;
  players: DebriefPerformanceRow[];
};

export type DebriefPerformancesResponse = {
  date: string;
  matches: DebriefPerformanceMatch[];
};

export const PERFORMANCE_LABELS: Record<PerformanceField, string> = {
  goals: "Buts",
  assists: "Passes D",
  shots: "Tirs",
  passesMade: "Passes réussies",
  passAttempts: "Passes tentées",
  tacklesMade: "Tacles réussis",
  tackleAttempts: "Tacles tentés",
  saves: "Arrêts",
  redCards: "Cartons rouges",
  rating: "Note EA",
};

export function sanitizePerformanceOverrides(input: unknown): PerformanceOverrides | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  if (Object.keys(source).some((key) => !PERFORMANCE_FIELDS.includes(key as PerformanceField))) return null;
  const overrides: PerformanceOverrides = {};
  for (const field of PERFORMANCE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(source, field)) continue;
    const value = source[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
    if (field === "rating") {
      if (value > 10 || Math.round(value * 100) !== value * 100) return null;
    } else if (!Number.isInteger(value) || value > 10000) return null;
    overrides[field] = value;
  }
  return overrides;
}

export function withOverrides(original: PerformanceValues, overrides: PerformanceOverrides): PerformanceValues {
  return { ...original, ...overrides };
}

export function sumPlayerPerformances(matches: DebriefPerformanceMatch[]) {
  const totals = new Map<string, {
    playerName: string;
    matches: number;
    goals: number;
    assists: number;
    shots: number;
    passesMade: number;
    passAttempts: number;
    tacklesMade: number;
    tackleAttempts: number;
    saves: number;
    redCards: number;
    ratingSum: number;
    ratingCount: number;
    correctedFields: number;
  }>();
  for (const match of matches) for (const player of match.players) {
    const key = player.playerEaId || player.playerName.trim().toLocaleLowerCase("fr");
    const result = totals.get(key) ?? {
      playerName: player.playerName, matches: 0, goals: 0, assists: 0,
      shots: 0, passesMade: 0, passAttempts: 0, tacklesMade: 0,
      tackleAttempts: 0, saves: 0, redCards: 0, ratingSum: 0, ratingCount: 0,
      correctedFields: 0,
    };
    result.matches += 1;
    for (const field of PERFORMANCE_FIELDS) {
      if (field === "rating") continue;
      result[field] += player.corrected[field];
    }
    if (player.corrected.rating > 0) {
      result.ratingSum += player.corrected.rating;
      result.ratingCount += 1;
    }
    result.correctedFields += Object.keys(player.overrides).length;
    totals.set(key, result);
  }
  return [...totals.values()].sort((a, b) => (b.goals - a.goals) || (b.assists - a.assists) || a.playerName.localeCompare(b.playerName, "fr"));
}

export function performancesDiscordText(matches: DebriefPerformanceMatch[]): string[] {
  const totals = sumPlayerPerformances(matches);
  if (!totals.length) return [];
  return [
    "**PERFORMANCES INDIVIDUELLES (STATISTIQUES VALIDÉES STAFF)**",
    ...totals.map((p) =>
      `• ${p.playerName} — ${p.matches} match(s) | ${p.goals} but(s) | ${p.assists} PD | ${p.shots} tir(s) | note ${p.ratingCount ? (p.ratingSum / p.ratingCount).toFixed(2) : "N/D"}${p.correctedFields ? " ✏️" : ""}`
    ),
    "",
  ];
}
