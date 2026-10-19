// Ordre chronologique commun au formulaire, à l'API et aux exports.
// Les horaires manquants/invalides restent à la fin ; à horaire égal,
// on conserve l'ordre de saisie et les identifiants des événements.
const VALID_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function sortProgrammeItemsByTime<T extends { time: string }>(
  items: readonly T[]
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aTime = VALID_TIME.test(a.item.time) ? a.item.time : "99:99";
      const bTime = VALID_TIME.test(b.item.time) ? b.item.time : "99:99";
      return aTime.localeCompare(bTime) || a.index - b.index;
    })
    .map(({ item }) => item);
}

export function sortProgrammeSchedule<T extends { time: string }>(
  schedule: Record<string, T[]>
): Record<string, T[]> {
  return Object.fromEntries(
    Object.entries(schedule).map(([date, items]) => [
      date,
      sortProgrammeItemsByTime(items),
    ])
  );
}
