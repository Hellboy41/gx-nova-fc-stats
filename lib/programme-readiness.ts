import { isProgrammeDateKey } from "@/lib/programme-period";

export type ReadinessMatch = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  competition: string;
  finished?: boolean;
  // Les indicateurs de coaching sont facultatifs. Ils ne bloquent jamais le partage.
  lineupCount?: number;
  availabilityCount?: number;
};

export type ReadinessFinding = {
  match: ReadinessMatch;
  problems: string[];
  coaching: string[];
};

const PLACEHOLDERS = new Set([
  "a definir", "adversaire a definir", "adversaire a confirmer",
  "a confirmer", "tbd", "inconnu", "-",
]);
const GENERIC_COMPETITIONS = new Set(["competition", "evenement", "a definir", "a confirmer", "-"]);
const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function canonical(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

export function isPendingOpponent(value: string): boolean {
  return value.trim().length < 2 || PLACEHOLDERS.has(canonical(value));
}

export function auditReadiness(matches: ReadinessMatch[]) {
  const upcoming = matches.filter(match => !match.finished);
  const frequencies = new Map<string, number>();
  for (const match of upcoming) {
    if (isProgrammeDateKey(match.date) && TIME_RE.test(match.time)) {
      const key = match.date + "|" + match.time;
      frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
    }
  }
  const findings: ReadinessFinding[] = upcoming.map(match => {
    const problems: string[] = [];
    if (isPendingOpponent(match.opponent)) problems.push("Adversaire à renseigner");
    if (!isProgrammeDateKey(match.date)) problems.push("Date invalide");
    if (!TIME_RE.test(match.time)) problems.push("Horaire à renseigner");
    if (canonical(match.competition).length < 2 || GENERIC_COMPETITIONS.has(canonical(match.competition)))
      problems.push("Compétition à préciser");
    if ((frequencies.get(match.date + "|" + match.time) ?? 0) > 1)
      problems.push("Horaire déjà utilisé pour cette journée");
    const coaching: string[] = [];
    if (typeof match.availabilityCount === "number" && match.availabilityCount === 0)
      coaching.push("Disponibilités non renseignées");
    if (typeof match.lineupCount === "number" && match.lineupCount < 11)
      coaching.push("Composition à compléter");
    return { match, problems, coaching };
  }).sort((a, b) => a.match.date.localeCompare(b.match.date) ||
    a.match.time.localeCompare(b.match.time) || a.match.opponent.localeCompare(b.match.opponent, "fr"));
  const blocking = findings.filter(finding => finding.problems.length > 0);
  const coaching = findings.filter(finding => finding.coaching.length > 0);
  return {
    total: upcoming.length,
    ready: upcoming.length - blocking.length,
    blocking,
    coaching,
  };
}
