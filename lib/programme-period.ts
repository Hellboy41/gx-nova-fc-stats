// Périodes personnalisées de sept jours ; stockage toujours par semaine calendaire (dimanche).
export function isProgrammeDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addProgrammeDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function programmeCanonicalWeek(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return addProgrammeDays(dateKey, -date.getUTCDay());
}

export function programmePeriodDates(startDate: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addProgrammeDays(startDate, index));
}

export function programmePeriodWeeks(startDate: string): string[] {
  return [...new Set(programmePeriodDates(startDate).map(programmeCanonicalWeek))];
}
