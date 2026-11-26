import { CLUB_ID } from "@/lib/platform/server-club";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyStaffPerformanceCorrections } from "@/lib/stats/apply-staff-corrections";
import { getArchivedPlayerKeys, getPlayerKey } from "@/lib/players/status";
import {
  buildSportIntelligence, type IntelligenceMatch, type IntelligencePerformance,
  type SportIntelligenceData, type Role,
} from "@/lib/sport-intelligence";

export type ExportKind = "form" | "roles" | "pairs";
export type IntelligenceExportOptions = {
  kind: ExportKind;
  seasonId: string;
  competitionId: string;
  startDate: string;
  endDate: string;
  role: Role | "all";
  search: string;
  minSamples: boolean;
  pairMinimum: number;
  includeDormant: boolean;
};
export type IntelligenceExportResult = {
  report: SportIntelligenceData;
  players: SportIntelligenceData["players"];
  roles: SportIntelligenceData["roles"];
  pairs: SportIntelligenceData["pairs"];
  competitionName: string | null;
  seasonName: string | null;
  options: IntelligenceExportOptions;
};

const POSITIVE_ID = /^[1-9]\d*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ROLES = new Set(["all", "goalkeeper", "defender", "midfielder", "forward"]);
const KINDS = new Set(["form", "roles", "pairs"]);
const MAX_MATCHES = 250;
const PAGE_SIZE = 1000;

function validDate(value: string) {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validId(value: string) {
  return value === "all" || POSITIVE_ID.test(value) && Number.isSafeInteger(Number(value));
}
export function parseIntelligenceExportOptions(input: URLSearchParams): IntelligenceExportOptions {
  const kind = input.get("kind") ?? "form";
  const seasonId = input.get("seasonId") ?? "all";
  const competitionId = input.get("competitionId") ?? "all";
  const role = input.get("role") ?? "all";
  const startDate = input.get("startDate") ?? "";
  const endDate = input.get("endDate") ?? "";
  const search = (input.get("search") ?? "").trim().slice(0, 60);
  const pairMinimum = Number(input.get("pairMinimum") ?? "8");
  if (!KINDS.has(kind) || !validId(seasonId) || !validId(competitionId) || !ROLES.has(role))
    throw new Error("Type d'analyse, saison, compétition ou poste invalide.");
  if ((startDate && !validDate(startDate)) || (endDate && !validDate(endDate)) ||
      (startDate && endDate && startDate > endDate))
    throw new Error("Plage de dates invalide.");
  if (!Number.isInteger(pairMinimum) || pairMinimum < 8 || pairMinimum > 250)
    throw new Error("Minimum de matchs communs invalide.");
  return {
    kind: kind as ExportKind, seasonId, competitionId, startDate, endDate,
    role: role as IntelligenceExportOptions["role"], search,
    minSamples: input.get("minSamples") !== "false",
    pairMinimum, includeDormant: input.get("includeDormant") === "true",
  };
}

export async function loadIntelligenceExport(options: IntelligenceExportOptions): Promise<IntelligenceExportResult> {
  const admin = createAdminClient();
  let seasonName: string | null = null;
  if (options.seasonId !== "all") {
    const { data, error } = await admin.from("seasons").select("name")
      .eq("club_id", CLUB_ID).eq("id", Number(options.seasonId)).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Cette saison n'appartient pas au club.");
    seasonName = data.name;
  }
  let competitionName: string | null = null;
  if (options.competitionId !== "all") {
    const { data, error } = await admin.from("competitions").select("name")
      .eq("club_id", CLUB_ID).eq("id", Number(options.competitionId)).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Cette compétition n'appartient pas au club.");
    competitionName = data.name;
  }
  let query = admin.from("matches")
    .select("id,played_at,result,goals_for,goals_against")
    .eq("club_id", CLUB_ID)
    .order("played_at", { ascending: false, nullsFirst: false })
    .limit(MAX_MATCHES + 1);
  if (options.seasonId !== "all") query = query.eq("season_id", Number(options.seasonId));
  if (options.competitionId !== "all") query = query.eq("competition_id", Number(options.competitionId));
  if (options.startDate) query = query.gte("played_at", options.startDate + "T00:00:00Z");
  if (options.endDate) {
    const next = new Date(options.endDate + "T12:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    query = query.lt("played_at", next.toISOString().slice(0, 10) + "T00:00:00Z");
  }
  const [matchResponse, dormantKeys] = await Promise.all([
    query,
    options.includeDormant ? Promise.resolve(new Set<string>()) : getArchivedPlayerKeys(CLUB_ID),
  ]);
  if (matchResponse.error) throw matchResponse.error;
  const selected = (matchResponse.data ?? []) as IntelligenceMatch[];
  const truncated = selected.length > MAX_MATCHES;
  const matches = selected.slice(0, MAX_MATCHES);
  const ids = matches.map(match => match.id);
  const raw: IntelligencePerformance[] = [];
  if (ids.length) {
    for (let start = 0; ; start += PAGE_SIZE) {
      const { data, error } = await admin.from("match_players")
        .select("id,match_id,player_ea_id,player_name,position,rating,goals,assists,shots,passes_made,pass_attempts,tackles_made,tackle_attempts,saves,red_cards,raw_data")
        .in("match_id", ids)
        .order("id", { ascending: true })
        .range(start, start + PAGE_SIZE - 1);
      if (error) throw error;
      const page = (data ?? []) as IntelligencePerformance[];
      raw.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }
  const corrected = await applyStaffPerformanceCorrections(CLUB_ID, raw);
  const report = buildSportIntelligence(matches, corrected, dormantKeys, getPlayerKey, truncated);
  const search = options.search.toLocaleLowerCase("fr-FR");
  const nameFilter = (value: string) => !search || value.toLocaleLowerCase("fr-FR").includes(search);
  const roleFilter = (value: Role) => options.role === "all" || options.role === value;
  const players = report.players.filter(p => roleFilter(p.role) && nameFilter(p.name) &&
    (!options.minSamples || p.trend !== "insufficient"));
  const roles = report.roles.filter(p => roleFilter(p.role) && nameFilter(p.name) &&
    (!options.minSamples || p.matches >= 5));
  const pairs = report.pairs.filter(p => p.games >= options.pairMinimum &&
    (nameFilter(p.playerA) || nameFilter(p.playerB)));
  return { report, players, roles, pairs, options, competitionName, seasonName };
}
