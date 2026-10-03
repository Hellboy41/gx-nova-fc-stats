import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveStaff } from "@/lib/auth/require-staff";

const CLUB_ID = "1663";
const TIME_ZONE = "Europe/Paris";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const GENERIC_WORDS = new Set(["fc", "esport", "esports", "club", "team", "gaming"]);

type JsonRecord = Record<string, unknown>;

type ProgrammeItem = {
  id: string;
  type: "competition" | "tournament";
  competitionId: number | null;
  title: string;
  time: string;
  opponentName: string;
  opponentLogoUrl: string;
  notes: string;
  status: "upcoming" | "played";
  linkedMatchId: number | null;
  linkedEaMatchId: string;
  linkedAt: string;
  linkConfidence: number | null;
  linkMethod: "auto" | "manual" | null;
  eaOpponentName: string;
  eaPlayedAt: string;
  goalsFor: number | null;
  goalsAgainst: number | null;
  result: "V" | "N" | "D" | null;
};

type ProgrammeSchedule = Record<string, ProgrammeItem[]>;

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

type AliasRow = {
  id: number;
  programme_name: string;
  programme_normalized: string;
  ea_name: string;
  ea_normalized: string;
  ea_club_id: string | null;
};

type Candidate = {
  matchId: number;
  eaMatchId: string;
  opponent: string;
  eaClubId: string;
  playedAt: string;
  goalsFor: number;
  goalsAgainst: number;
  result: "V" | "N" | "D";
  confidence: number;
  nameScore: number;
  timeScore: number;
  timeDiffMinutes: number;
  aliasKnown: boolean;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeName(value: string) {
  const cleaned = value
    .replace(/[Øø]/g, "o")
    .replace(/[Œœ]/g, "oe")
    .replace(/[Ææ]/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const filtered = tokens.filter((token) => !GENERIC_WORDS.has(token));
  return (filtered.length ? filtered : tokens).join(" ");
}

function tokens(value: string) {
  return normalizeName(value).split(/\s+/).filter(Boolean);
}

function nameSimilarity(a: string, b: string) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;

  const ta = tokens(a);
  const tb = tokens(b);
  const setA = new Set(ta);
  const setB = new Set(tb);
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...ta, ...tb]).size || 1;
  const jaccard = (intersection / union) * 100;

  const compactA = na.replace(/\s+/g, "");
  const compactB = nb.replace(/\s+/g, "");
  const shorter = compactA.length <= compactB.length ? compactA : compactB;
  const longer = compactA.length > compactB.length ? compactA : compactB;
  const prefixBonus = longer.startsWith(shorter) && shorter.length >= 4 ? 78 : 0;

  return Math.round(Math.max(jaccard, prefixBonus));
}

function sanitizeItem(value: unknown): ProgrammeItem | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const type =
    candidate.type === "competition" || candidate.type === "tournament"
      ? candidate.type
      : null;
  if (!type) return null;

  const competitionId =
    typeof candidate.competitionId === "number" &&
    Number.isInteger(candidate.competitionId) &&
    candidate.competitionId > 0
      ? candidate.competitionId
      : null;
  const timeRaw = cleanText(candidate.time, 5);
  const linkedMatchId = cleanNumber(candidate.linkedMatchId);
  const confidence = cleanNumber(candidate.linkConfidence);
  const goalsFor = cleanNumber(candidate.goalsFor);
  const goalsAgainst = cleanNumber(candidate.goalsAgainst);
  const result =
    candidate.result === "V" || candidate.result === "N" || candidate.result === "D"
      ? candidate.result
      : null;

  return {
    id: cleanText(candidate.id, 80) || crypto.randomUUID(),
    type,
    competitionId,
    title: cleanText(candidate.title, 120),
    time: TIME_RE.test(timeRaw) ? timeRaw : "",
    opponentName: cleanText(candidate.opponentName, 120),
    opponentLogoUrl: cleanText(candidate.opponentLogoUrl, 700),
    notes: cleanText(candidate.notes, 300),
    status: candidate.status === "played" && linkedMatchId ? "played" : "upcoming",
    linkedMatchId: linkedMatchId && linkedMatchId > 0 ? Math.trunc(linkedMatchId) : null,
    linkedEaMatchId: cleanText(candidate.linkedEaMatchId, 80),
    linkedAt: cleanText(candidate.linkedAt, 40),
    linkConfidence:
      confidence !== null ? Math.max(0, Math.min(100, Math.round(confidence))) : null,
    linkMethod:
      candidate.linkMethod === "auto" || candidate.linkMethod === "manual"
        ? candidate.linkMethod
        : null,
    eaOpponentName: cleanText(candidate.eaOpponentName, 120),
    eaPlayedAt: cleanText(candidate.eaPlayedAt, 50),
    goalsFor,
    goalsAgainst,
    result,
  };
}

function sanitizeSchedule(value: unknown): ProgrammeSchedule {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: ProgrammeSchedule = {};
  for (const [date, items] of Object.entries(source)) {
    if (!DATE_RE.test(date) || !Array.isArray(items)) continue;
    result[date] = items
      .slice(0, 12)
      .map(sanitizeItem)
      .filter((item): item is ProgrammeItem => Boolean(item));
  }
  return result;
}

function addDateKey(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(dateKey: string, time: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const firstGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const firstOffset = getTimeZoneOffsetMs(firstGuess, TIME_ZONE);
  const secondGuess = new Date(firstGuess.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(secondGuess, TIME_ZONE);
  return new Date(firstGuess.getTime() - secondOffset);
}

function getOpponentClubId(raw: JsonRecord | null) {
  const clubs = raw?.clubs;
  if (!clubs || typeof clubs !== "object" || Array.isArray(clubs)) return "";
  return Object.keys(clubs as JsonRecord).find((id) => id !== CLUB_ID) ?? "";
}

function timeScore(diffMinutes: number) {
  if (diffMinutes >= -5 && diffMinutes <= 35) return 100;
  if (diffMinutes >= -15 && diffMinutes <= 50) return 85;
  if (diffMinutes >= -20 && diffMinutes <= 70) return 65;
  if (diffMinutes >= -30 && diffMinutes <= 90) return 40;
  return 0;
}

function aliasMatches(alias: AliasRow | undefined, match: MatchRow, eaClubId: string) {
  if (!alias) return false;
  if (alias.ea_club_id && eaClubId && alias.ea_club_id === eaClubId) return true;
  return alias.ea_normalized === normalizeName(match.opponent_name);
}

function scoreCandidate(
  item: ProgrammeItem,
  dateKey: string,
  match: MatchRow,
  alias: AliasRow | undefined
): Candidate | null {
  if (!match.played_at || !item.time) return null;
  const scheduled = zonedDateTimeToUtc(dateKey, item.time);
  const actual = new Date(match.played_at);
  const diffMinutes = Math.round((actual.getTime() - scheduled.getTime()) / 60000);
  const tScore = timeScore(diffMinutes);
  if (tScore === 0) return null;

  const eaClubId = getOpponentClubId(match.raw_data);
  const knownAlias = aliasMatches(alias, match, eaClubId);
  const nScore = item.opponentName
    ? knownAlias
      ? 100
      : nameSimilarity(item.opponentName, match.opponent_name)
    : 0;

  const confidence = item.opponentName
    ? Math.round(nScore * 0.75 + tScore * 0.25)
    : Math.round(tScore * 0.45);

  return {
    matchId: match.id,
    eaMatchId: match.ea_match_id,
    opponent: match.opponent_name,
    eaClubId,
    playedAt: match.played_at,
    goalsFor: Number(match.goals_for),
    goalsAgainst: Number(match.goals_against),
    result: match.result,
    confidence,
    nameScore: nScore,
    timeScore: tScore,
    timeDiffMinutes: diffMinutes,
    aliasKnown: knownAlias,
  };
}

function clearLink(item: ProgrammeItem): ProgrammeItem {
  return {
    ...item,
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
}

function applyLink(
  item: ProgrammeItem,
  match: MatchRow,
  confidence: number,
  method: "auto" | "manual"
): ProgrammeItem {
  return {
    ...item,
    status: "played",
    linkedMatchId: match.id,
    linkedEaMatchId: match.ea_match_id,
    linkedAt: new Date().toISOString(),
    linkConfidence: Math.max(0, Math.min(100, Math.round(confidence))),
    linkMethod: method,
    eaOpponentName: match.opponent_name,
    eaPlayedAt: match.played_at ?? "",
    goalsFor: Number(match.goals_for),
    goalsAgainst: Number(match.goals_against),
    result: match.result,
  };
}

async function classifyMatch(
  admin: ReturnType<typeof createAdminClient>,
  matchId: number,
  item: ProgrammeItem,
  activeSeasonId: number | null
) {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (activeSeasonId) update.season_id = activeSeasonId;
  if (item.type === "competition" && item.competitionId) {
    update.competition_id = item.competitionId;
  }
  await admin.from("matches").update(update).eq("id", matchId).eq("club_id", CLUB_ID);
}

async function saveSchedule(
  admin: ReturnType<typeof createAdminClient>,
  weekStart: string,
  schedule: ProgrammeSchedule,
  userId: string | null | undefined
) {
  const { data, error } = await admin
    .from("weekly_programs")
    .upsert(
      {
        club_id: CLUB_ID,
        week_start: weekStart,
        schedule,
        updated_by: userId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "club_id,week_start" }
    )
    .select("schedule")
    .single();

  if (error) throw new Error(error.message);
  return sanitizeSchedule(data.schedule);
}

export async function POST(request: Request) {
  const authorization = await requireActiveStaff({ write: true });
  if (authorization.error) return authorization.error;

  try {
    const body = await request.json().catch(() => ({}));
    const action = cleanText(body.action, 20);
    const weekStart = cleanText(body.weekStart, 10);
    if (!DATE_RE.test(weekStart)) {
      return NextResponse.json({ error: "Semaine invalide." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: season } = await admin
      .from("seasons")
      .select("id")
      .eq("club_id", CLUB_ID)
      .eq("is_active", true)
      .maybeSingle();
    const activeSeasonId = season?.id ? Number(season.id) : null;

    if (action === "scan") {
      const schedule = sanitizeSchedule(body.schedule);
      const rangeStart = new Date(zonedDateTimeToUtc(weekStart, "00:00").getTime() - 2 * 60 * 60 * 1000);
      const rangeEnd = new Date(
        zonedDateTimeToUtc(addDateKey(weekStart, 7), "03:00").getTime() + 2 * 60 * 60 * 1000
      );

      const [{ data: matchesData, error: matchesError }, { data: aliasesData, error: aliasesError }] =
        await Promise.all([
          admin
            .from("matches")
            .select(
              "id, ea_match_id, played_at, opponent_name, goals_for, goals_against, result, season_id, competition_id, raw_data"
            )
            .eq("club_id", CLUB_ID)
            .gte("played_at", rangeStart.toISOString())
            .lt("played_at", rangeEnd.toISOString())
            .order("played_at", { ascending: true }),
          admin
            .from("opponent_aliases")
            .select(
              "id, programme_name, programme_normalized, ea_name, ea_normalized, ea_club_id"
            )
            .eq("club_id", CLUB_ID),
        ]);

      if (matchesError) throw new Error(matchesError.message);
      if (aliasesError) throw new Error(aliasesError.message);

      const matches = (matchesData ?? []) as MatchRow[];
      const aliases = (aliasesData ?? []) as AliasRow[];
      const aliasesByProgramme = new Map(
        aliases.map((alias) => [alias.programme_normalized, alias])
      );
      const used = new Set<number>();
      for (const items of Object.values(schedule)) {
        for (const item of items) {
          if (item.linkedMatchId) used.add(item.linkedMatchId);
        }
      }

      const suggestions: Record<string, Candidate[]> = {};
      let autoLinked = 0;
      let probable = 0;

      const refs = Object.entries(schedule)
        .flatMap(([dateKey, items]) => items.map((item) => ({ dateKey, item })))
        .sort((a, b) => {
          const da = a.item.time ? zonedDateTimeToUtc(a.dateKey, a.item.time).getTime() : 0;
          const db = b.item.time ? zonedDateTimeToUtc(b.dateKey, b.item.time).getTime() : 0;
          return da - db;
        });

      for (const ref of refs) {
        const { dateKey, item } = ref;
        if (item.linkedMatchId || !item.time) continue;
        const key = `${dateKey}::${item.id}`;
        const alias = item.opponentName
          ? aliasesByProgramme.get(normalizeName(item.opponentName))
          : undefined;

        const candidates = matches
          .filter((match) => !used.has(match.id))
          .map((match) => scoreCandidate(item, dateKey, match, alias))
          .filter((candidate): candidate is Candidate => Boolean(candidate))
          .sort((a, b) => b.confidence - a.confidence || Math.abs(a.timeDiffMinutes) - Math.abs(b.timeDiffMinutes))
          .slice(0, 5);

        if (!candidates.length) continue;
        const top = candidates[0];
        const second = candidates[1];
        const gap = top.confidence - (second?.confidence ?? 0);
        const strongName = top.aliasKnown || top.nameScore >= 98;
        const auto = Boolean(item.opponentName) && strongName && top.timeScore >= 65 && top.confidence >= 88 && gap >= 7;

        if (auto) {
          const linked = applyLink(item, matches.find((match) => match.id === top.matchId)!, top.confidence, "auto");
          schedule[dateKey] = schedule[dateKey].map((entry) =>
            entry.id === item.id ? linked : entry
          );
          used.add(top.matchId);
          await classifyMatch(admin, top.matchId, linked, activeSeasonId);
          autoLinked += 1;
        } else {
          suggestions[key] = candidates;
          if (top.confidence >= 60) probable += 1;
        }
      }

      const savedSchedule = await saveSchedule(
        admin,
        weekStart,
        schedule,
        authorization.profile?.userId
      );

      return NextResponse.json({
        success: true,
        schedule: savedSchedule,
        suggestions,
        autoLinked,
        probable,
        activeSeasonId,
      });
    }

    if (action === "confirm" || action === "unlink") {
      const dateKey = cleanText(body.dateKey, 10);
      const itemId = cleanText(body.itemId, 80);
      if (!DATE_RE.test(dateKey) || !itemId) {
        return NextResponse.json({ error: "Événement invalide." }, { status: 400 });
      }

      const { data: programmeRow, error: programmeError } = await admin
        .from("weekly_programs")
        .select("schedule")
        .eq("club_id", CLUB_ID)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (programmeError) throw new Error(programmeError.message);

      const schedule = sanitizeSchedule(programmeRow?.schedule ?? {});
      const items = schedule[dateKey] ?? [];
      const itemIndex = items.findIndex((item) => item.id === itemId);
      if (itemIndex < 0) {
        return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
      }

      if (action === "unlink") {
        schedule[dateKey][itemIndex] = clearLink(schedule[dateKey][itemIndex]);
        const savedSchedule = await saveSchedule(
          admin,
          weekStart,
          schedule,
          authorization.profile?.userId
        );
        return NextResponse.json({ success: true, schedule: savedSchedule });
      }

      const matchId = Number(body.matchId ?? 0);
      if (!Number.isInteger(matchId) || matchId <= 0) {
        return NextResponse.json({ error: "Match EA invalide." }, { status: 400 });
      }

      const { data: matchData, error: matchError } = await admin
        .from("matches")
        .select(
          "id, ea_match_id, played_at, opponent_name, goals_for, goals_against, result, season_id, competition_id, raw_data"
        )
        .eq("id", matchId)
        .eq("club_id", CLUB_ID)
        .maybeSingle();
      if (matchError) throw new Error(matchError.message);
      if (!matchData) {
        return NextResponse.json({ error: "Match EA introuvable." }, { status: 404 });
      }

      const match = matchData as MatchRow;

      const alreadyLinkedElsewhere = Object.entries(schedule).some(([otherDate, otherItems]) =>
        otherItems.some(
          (entry) =>
            entry.linkedMatchId === matchId &&
            !(otherDate === dateKey && entry.id === itemId)
        )
      );
      if (alreadyLinkedElsewhere) {
        return NextResponse.json(
          { error: "Ce match EA est déjà lié à un autre événement du programme." },
          { status: 409 }
        );
      }

      const linked = applyLink(schedule[dateKey][itemIndex], match, 100, "manual");
      schedule[dateKey][itemIndex] = linked;
      await classifyMatch(admin, matchId, linked, activeSeasonId);

      if (body.rememberAlias !== false && linked.opponentName) {
        const eaClubId = getOpponentClubId(match.raw_data);
        await admin.from("opponent_aliases").upsert(
          {
            club_id: CLUB_ID,
            programme_name: linked.opponentName,
            programme_normalized: normalizeName(linked.opponentName),
            ea_name: match.opponent_name,
            ea_normalized: normalizeName(match.opponent_name),
            ea_club_id: eaClubId || null,
            created_by: authorization.profile?.userId ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "club_id,programme_normalized" }
        );
      }

      const savedSchedule = await saveSchedule(
        admin,
        weekStart,
        schedule,
        authorization.profile?.userId
      );

      return NextResponse.json({ success: true, schedule: savedSchedule });
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Impossible de faire la liaison avec les matchs EA.",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
