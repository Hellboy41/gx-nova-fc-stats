import { addProgrammeDays, isProgrammeDateKey } from "@/lib/programme-period";

export type TemplateSlot = {
  weekday: number; // lundi = 0, dimanche = 6
  time: string;
  type: "competition" | "tournament" | "friendly";
  competition: string;
  competitionId: number | null;
};

export type EveningTemplate = {
  id: string;
  rosterId: string;
  name: string;
  slots: TemplateSlot[];
  updatedAt: string;
};

const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function weekdayOf(date: string): number {
  const day = new Date(date + "T12:00:00Z").getUTCDay();
  return (day + 6) % 7;
}

export function dateForTemplateWeekday(periodStart: string, weekday: number): string {
  const offset = (weekday - weekdayOf(periodStart) + 7) % 7;
  return addProgrammeDays(periodStart, offset);
}

export function sanitizeTemplateSlots(value: unknown, allowFriendly: boolean): TemplateSlot[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 42) return null;
  const slots: TemplateSlot[] = [];
  const unique = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const raw = item as Record<string, unknown>;
    const weekday = raw.weekday;
    const time = raw.time;
    const type = raw.type;
    const competition = raw.competition;
    const competitionId = raw.competitionId;
    if (typeof weekday !== "number" || !Number.isInteger(weekday) || weekday < 0 || weekday > 6 ||
      typeof time !== "string" || !TIME_RE.test(time) ||
      (type !== "competition" && type !== "tournament" && !(allowFriendly && type === "friendly")) ||
      typeof competition !== "string" || competition.trim().length < 2 || competition.trim().length > 90 ||
      !(competitionId == null || (typeof competitionId === "number" && Number.isSafeInteger(competitionId) && competitionId > 0))) return null;
    const uniqueKey = String(weekday) + ":" + time;
    if (unique.has(uniqueKey)) return null;
    unique.add(uniqueKey);
    slots.push({ weekday, time, type, competition: competition.trim(), competitionId: typeof competitionId === "number" ? competitionId : null });
  }
  const counts = new Map<number, number>();
  for (const slot of slots) {
    const count = (counts.get(slot.weekday) ?? 0) + 1;
    if (count > 12) return null;
    counts.set(slot.weekday, count);
  }
  return slots.sort((a, b) => a.weekday - b.weekday || a.time.localeCompare(b.time));
}

export function validTemplateDate(value: unknown): value is string {
  return isProgrammeDateKey(value);
}
