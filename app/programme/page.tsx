"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CircleCheck,
  Clock3,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  ImagePlus,
  Link2,
  Plus,
  Users,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  Unlink,
  X,
  Check,
} from "lucide-react";

type StaffRole = "admin" | "staff" | "viewer";

type Competition = {
  id: number;
  name: string;
  short_name: string | null;
  competition_type: string;
};

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

type OpponentAlias = {
  id: number;
  programme_name: string;
  ea_name: string;
  ea_club_id: string | null;
  updated_at: string;
};

type LinkCandidate = {
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

type AvailabilityStatus = "available" | "maybe" | "absent" | "unknown";

type RosterPlayer = {
  id: string;
  name: string;
  position: string;
  lastSeen: string;
};

type AvailabilityEntry = {
  playerId: string;
  name: string;
  status: AvailabilityStatus;
};

type EventLineupEntry = {
  slot: string;
  playerId: string;
  name: string;
};

type EventPlan = {
  id?: number;
  weekStart: string;
  eventDate: string;
  eventId: string;
  formation: string;
  availability: Record<string, AvailabilityEntry>;
  lineup: EventLineupEntry[];
  bench: EventLineupEntry[];
  notes: string;
  updatedAt?: string;
};

type CurrentLineup = {
  formation: string;
  lineup: Array<{ slot?: string; name?: string; x?: number; y?: number }>;
  bench: Array<{ slot?: string; name?: string }>;
};

type ProgrammeSchedule = Record<string, ProgrammeItem[]>;

type ProgrammeResponse = {
  weekStart: string;
  schedule: ProgrammeSchedule;
  updatedAt: string | null;
  competitions: Competition[];
  aliases: OpponentAlias[];
  currentUser: {
    userId: string;
    displayName: string;
    role: StaffRole;
  } | null;
};

const CLUB_LOGO = "/logo-gx-nova.png";
const DAY_NAMES = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

const FORMATION_SLOTS: Record<string, string[]> = {
  "3-1-4-2": ["GK", "DCG", "DC", "DCD", "MDC", "MG", "MCG", "MCD", "MD", "ATG", "ATD"],
  "3-5-2": ["GK", "DCG", "DC", "DCD", "MDG", "MDD", "MOC", "MG", "MD", "ATG", "ATD"],
  "4-3-3": ["GK", "DG", "DCG", "DCD", "DD", "MCG", "MC", "MCD", "AG", "BU", "AD"],
  "4-2-2-2": ["GK", "DG", "DCG", "DCD", "DD", "MDCG", "MDCD", "MOG", "MOD", "BUG", "BUD"],
  "4-3-1-2": ["GK", "DG", "DCG", "DCD", "DD", "MCG", "MC", "MCD", "MOC", "BUG", "BUD"],
};

const FORMATION_COORDS: Record<string, Record<string, { x: number; y: number }>> = {
  "3-1-4-2": {
    GK: { x: 50, y: 89 },
    DCG: { x: 25, y: 72 },
    DC: { x: 50, y: 75 },
    DCD: { x: 75, y: 72 },
    MDC: { x: 50, y: 58 },
    MG: { x: 11, y: 43 },
    MCG: { x: 37, y: 43 },
    MCD: { x: 63, y: 43 },
    MD: { x: 89, y: 43 },
    ATG: { x: 35, y: 18 },
    ATD: { x: 65, y: 18 },
  },
  "3-5-2": {
    GK: { x: 50, y: 89 },
    DCG: { x: 25, y: 72 },
    DC: { x: 50, y: 75 },
    DCD: { x: 75, y: 72 },
    MDG: { x: 35, y: 57 },
    MDD: { x: 65, y: 57 },
    MOC: { x: 50, y: 37 },
    MG: { x: 11, y: 43 },
    MD: { x: 89, y: 43 },
    ATG: { x: 35, y: 18 },
    ATD: { x: 65, y: 18 },
  },
  "4-3-3": {
    GK: { x: 50, y: 89 },
    DG: { x: 12, y: 70 },
    DCG: { x: 37, y: 75 },
    DCD: { x: 63, y: 75 },
    DD: { x: 88, y: 70 },
    MCG: { x: 30, y: 49 },
    MC: { x: 50, y: 55 },
    MCD: { x: 70, y: 49 },
    AG: { x: 18, y: 22 },
    BU: { x: 50, y: 16 },
    AD: { x: 82, y: 22 },
  },
  "4-2-2-2": {
    GK: { x: 50, y: 89 },
    DG: { x: 12, y: 70 },
    DCG: { x: 37, y: 75 },
    DCD: { x: 63, y: 75 },
    DD: { x: 88, y: 70 },
    MDCG: { x: 38, y: 54 },
    MDCD: { x: 62, y: 54 },
    MOG: { x: 24, y: 35 },
    MOD: { x: 76, y: 35 },
    BUG: { x: 38, y: 16 },
    BUD: { x: 62, y: 16 },
  },
  "4-3-1-2": {
    GK: { x: 50, y: 89 },
    DG: { x: 12, y: 70 },
    DCG: { x: 37, y: 75 },
    DCD: { x: 63, y: 75 },
    DD: { x: 88, y: 70 },
    MCG: { x: 30, y: 50 },
    MC: { x: 50, y: 55 },
    MCD: { x: 70, y: 50 },
    MOC: { x: 50, y: 34 },
    BUG: { x: 38, y: 15 },
    BUD: { x: 62, y: 15 },
  },
};

function positionLabel(position: string) {
  if (position === "goalkeeper") return "Gardien";
  if (position === "defender") return "Défenseur";
  if (position === "midfielder") return "Milieu";
  if (position === "forward") return "Attaquant";
  return "Joueur";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getSunday(date = new Date()) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  return result;
}

function formatDayDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatEaTime(value: string) {
  if (!value) return "--:--";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function resultBadgeClass(result: ProgrammeItem["result"]) {
  if (result === "V") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (result === "D") return "border-red-400/30 bg-red-400/10 text-red-300";
  return "border-slate-400/20 bg-slate-400/10 text-slate-300";
}

function newItem(type: ProgrammeItem["type"]): ProgrammeItem {
  return {
    id: crypto.randomUUID(),
    type,
    competitionId: null,
    title: type === "tournament" ? "Tournoi" : "",
    time: "21:20",
    opponentName: "",
    opponentLogoUrl: "",
    notes: "",
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

function competitionLabel(
  item: ProgrammeItem,
  competitions: Competition[]
) {
  if (item.type === "tournament") {
    return item.title.trim() || "Tournoi";
  }

  const competition = competitions.find(
    (entry) => entry.id === item.competitionId
  );

  return (
    competition?.short_name ??
    competition?.name ??
    "Compétition"
  );
}

function fallbackInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "?";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image introuvable : ${src}`));
    image.src = src;
  });
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize = 20
) {
  let size = startSize;
  while (size > minSize) {
    context.font = `800 ${size}px Arial, sans-serif`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

export default function ProgrammePage() {
  const [weekStart, setWeekStart] = useState(() =>
    toDateKey(getSunday())
  );
  const [schedule, setSchedule] = useState<ProgrammeSchedule>({});
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [aliases, setAliases] = useState<OpponentAlias[]>([]);
  const [plansByEventId, setPlansByEventId] = useState<Record<string, EventPlan>>({});
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [currentLineup, setCurrentLineup] = useState<CurrentLineup>({ formation: "3-1-4-2", lineup: [], bench: [] });
  const [planningEvent, setPlanningEvent] = useState<{ dateKey: string; item: ProgrammeItem } | null>(null);
  const [requestedPlanLink, setRequestedPlanLink] = useState<{
    weekStart: string;
    eventId: string;
  } | null>(null);
  const [requestedPlanOpened, setRequestedPlanOpened] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [linkCandidates, setLinkCandidates] = useState<Record<string, LinkCandidate[]>>({});
  const [matching, setMatching] = useState(false);
  const [linkingKey, setLinkingKey] = useState<string | null>(null);
  const [deletingAliasId, setDeletingAliasId] = useState<number | null>(null);
  const [role, setRole] = useState<StaffRole>("viewer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canEdit = role === "admin" || role === "staff";
  const sunday = useMemo(() => parseDateKey(weekStart), [weekStart]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(sunday, index);
        return {
          date,
          key: toDateKey(date),
          name: DAY_NAMES[index],
        };
      }),
    [sunday]
  );

  const weekLabel = useMemo(() => {
    const saturday = addDays(sunday, 6);
    return `Du ${formatShortDate(sunday)} au ${formatShortDate(saturday)}`;
  }, [sunday]);

  const loadProgramme = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [response, plansResponse] = await Promise.all([
        fetch(`/api/programme?weekStart=${encodeURIComponent(weekStart)}`, { cache: "no-store" }),
        fetch(`/api/programme/plans?weekStart=${encodeURIComponent(weekStart)}`, { cache: "no-store" }),
      ]);

      const data = (await response.json()) as ProgrammeResponse & { error?: string };
      const plansData = (await plansResponse.json()) as {
        plans?: EventPlan[];
        roster?: RosterPlayer[];
        currentLineup?: CurrentLineup;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger le programme.");
      }
      if (!plansResponse.ok) {
        throw new Error(plansData.error ?? "Impossible de charger les disponibilités.");
      }

      setSchedule(data.schedule ?? {});
      setCompetitions(data.competitions ?? []);
      setAliases(data.aliases ?? []);
      setPlansByEventId(
        Object.fromEntries((plansData.plans ?? []).map((plan) => [plan.eventId, plan]))
      );
      setRoster(plansData.roster ?? []);
      setCurrentLineup(plansData.currentLineup ?? { formation: "3-1-4-2", lineup: [], bench: [] });
      setLinkCandidates({});
      setRole(data.currentUser?.role ?? "viewer");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedWeekStart = params.get("weekStart") ?? "";
    const requestedEventId = params.get("eventId") ?? "";
    const shouldOpenPlan = params.get("openPlan") === "1";

    if (
      shouldOpenPlan &&
      /^\d{4}-\d{2}-\d{2}$/.test(requestedWeekStart) &&
      requestedEventId
    ) {
      setRequestedPlanLink({
        weekStart: requestedWeekStart,
        eventId: requestedEventId,
      });
      if (requestedWeekStart !== weekStart) {
        setWeekStart(requestedWeekStart);
      }
    }
  }, []);

  useEffect(() => {
    void loadProgramme();
  }, [loadProgramme]);

  useEffect(() => {
    if (
      loading ||
      requestedPlanOpened ||
      !requestedPlanLink ||
      requestedPlanLink.weekStart !== weekStart
    ) {
      return;
    }

    for (const [dateKey, items] of Object.entries(schedule)) {
      const item = items.find(
        (candidate) => candidate.id === requestedPlanLink.eventId
      );

      if (item) {
        setPlanningEvent({ dateKey, item });
        setRequestedPlanOpened(true);
        return;
      }
    }

    setRequestedPlanOpened(true);
  }, [
    loading,
    requestedPlanLink,
    requestedPlanOpened,
    schedule,
    weekStart,
  ]);

  function changeWeek(offset: number) {
    setWeekStart(toDateKey(addDays(sunday, offset * 7)));
  }

  function goCurrentWeek() {
    setWeekStart(toDateKey(getSunday()));
  }

  function updateDay(dateKey: string, items: ProgrammeItem[]) {
    setSchedule((current) => ({
      ...current,
      [dateKey]: items,
    }));
  }

  function addProgrammeItem(
    dateKey: string,
    type: ProgrammeItem["type"]
  ) {
    if (!canEdit) return;
    updateDay(dateKey, [...(schedule[dateKey] ?? []), newItem(type)]);
  }

  function patchItem(
    dateKey: string,
    id: string,
    patch: Partial<ProgrammeItem>
  ) {
    if (!canEdit) return;
    const linkSensitive =
      Object.prototype.hasOwnProperty.call(patch, "opponentName") ||
      Object.prototype.hasOwnProperty.call(patch, "time") ||
      Object.prototype.hasOwnProperty.call(patch, "competitionId") ||
      Object.prototype.hasOwnProperty.call(patch, "type");

    updateDay(
      dateKey,
      (schedule[dateKey] ?? []).map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        if (!linkSensitive || !item.linkedMatchId) return updated;
        return {
          ...updated,
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
      })
    );
    setLinkCandidates((current) => {
      const next = { ...current };
      delete next[`${dateKey}::${id}`];
      return next;
    });
  }

  function removeItem(dateKey: string, id: string) {
    if (!canEdit) return;
    updateDay(
      dateKey,
      (schedule[dateKey] ?? []).filter((item) => item.id !== id)
    );
  }

  async function saveEventPlan(plan: EventPlan) {
    if (!canEdit) return;
    try {
      setSavingPlan(true);
      setError("");
      setMessage("");
      const response = await fetch("/api/programme/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'enregistrer le plan d'équipe.");
      }
      setPlansByEventId((current) => ({ ...current, [data.plan.eventId]: data.plan }));
      setPlanningEvent(null);
      setMessage("Disponibilités et composition enregistrées.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement du plan d'équipe.");
    } finally {
      setSavingPlan(false);
    }
  }

  async function copyCompositionToSameDay(sourcePlan: EventPlan) {
    if (!canEdit) return;

    const sameDayItems = (schedule[sourcePlan.eventDate] ?? []).filter(
      (item) => item.id !== sourcePlan.eventId
    );

    if (!sameDayItems.length) {
      setMessage("Il n'y a aucun autre match programmé sur cette journée.");
      return;
    }

    const targetWithExistingComposition = sameDayItems.filter(
      (item) => (plansByEventId[item.id]?.lineup.length ?? 0) > 0
    ).length;

    const confirmationMessage =
      `Copier cette composition sur ${sameDayItems.length} autre${sameDayItems.length > 1 ? "s" : ""} match${sameDayItems.length > 1 ? "s" : ""} de la journée ?\n\n` +
      "La formation, les titulaires et le banc seront copiés. Les disponibilités et les notes propres à chaque match seront conservées." +
      (targetWithExistingComposition > 0
        ? `\n\nAttention : ${targetWithExistingComposition} match${targetWithExistingComposition > 1 ? "s ont" : " a"} déjà une composition qui sera remplacée.`
        : "");

    if (!window.confirm(confirmationMessage)) return;

    try {
      setSavingPlan(true);
      setError("");
      setMessage("");

      const plansToSave: EventPlan[] = [
        sourcePlan,
        ...sameDayItems.map((item) => {
          const existing = plansByEventId[item.id];
          return {
            weekStart: sourcePlan.weekStart,
            eventDate: sourcePlan.eventDate,
            eventId: item.id,
            formation: sourcePlan.formation,
            availability: existing?.availability ?? {},
            lineup: sourcePlan.lineup.map((entry) => ({ ...entry })),
            bench: sourcePlan.bench.map((entry) => ({ ...entry })),
            notes: existing?.notes ?? "",
          };
        }),
      ];

      const savedPlans = await Promise.all(
        plansToSave.map(async (planToSave) => {
          const response = await fetch("/api/programme/plans", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(planToSave),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(
              data.error ?? `Impossible d'enregistrer la composition pour l'événement ${planToSave.eventId}.`
            );
          }
          return data.plan as EventPlan;
        })
      );

      setPlansByEventId((current) => {
        const next = { ...current };
        for (const savedPlan of savedPlans) {
          next[savedPlan.eventId] = savedPlan;
        }
        return next;
      });

      setPlanningEvent(null);
      setMessage(
        `Composition enregistrée et copiée sur ${sameDayItems.length} autre${sameDayItems.length > 1 ? "s" : ""} match${sameDayItems.length > 1 ? "s" : ""} de la journée.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la copie de la composition sur la journée."
      );
    } finally {
      setSavingPlan(false);
    }
  }

  async function uploadOpponentLogo(
    dateKey: string,
    itemId: string,
    file: File
  ) {
    if (!canEdit) return;

    try {
      setUploadingId(itemId);
      setError("");
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/programme/logo", {
        method: "POST",
        body: form,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Impossible d'envoyer le logo adverse."
        );
      }

      patchItem(dateKey, itemId, {
        opponentLogoUrl: data.url,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur d'envoi du logo."
      );
    } finally {
      setUploadingId(null);
    }
  }

  async function refreshAliases() {
    try {
      const response = await fetch("/api/programme/aliases", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setAliases(data.aliases ?? []);
    } catch {
      // L'absence de rafraîchissement des alias ne bloque pas le programme.
    }
  }

  async function scanEaMatches() {
    if (!canEdit) return;
    try {
      setMatching(true);
      setError("");
      setMessage("");
      const response = await fetch("/api/programme/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan",
          weekStart,
          schedule,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details ?? data.error ?? "Impossible de rechercher les matchs EA.");
      }
      setSchedule(data.schedule ?? schedule);
      setLinkCandidates(data.suggestions ?? {});
      const autoLinked = Number(data.autoLinked ?? 0);
      const probable = Number(data.probable ?? 0);
      setMessage(
        autoLinked > 0 || probable > 0
          ? `${autoLinked} match(s) lié(s) automatiquement • ${probable} correspondance(s) à confirmer.`
          : "Recherche EA terminée : aucune nouvelle correspondance fiable pour cette semaine."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de recherche EA.");
    } finally {
      setMatching(false);
    }
  }

  async function confirmEaMatch(dateKey: string, itemId: string, matchId: number) {
    if (!canEdit) return;
    const key = `${dateKey}::${itemId}`;
    try {
      setLinkingKey(key);
      setError("");
      const response = await fetch("/api/programme/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          weekStart,
          dateKey,
          itemId,
          matchId,
          rememberAlias: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details ?? data.error ?? "Impossible de confirmer ce match EA.");
      }
      setSchedule(data.schedule ?? schedule);
      setLinkCandidates((current) => {
        const next: Record<string, LinkCandidate[]> = {};
        for (const [candidateKey, values] of Object.entries(current) as Array<[string, LinkCandidate[]]>) {
          if (candidateKey === key) continue;
          const filtered = values.filter((candidate) => candidate.matchId !== matchId);
          if (filtered.length) next[candidateKey] = filtered;
        }
        return next;
      });
      await refreshAliases();
      setMessage("Match EA confirmé. La correspondance adversaire a été mémorisée.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de confirmation.");
    } finally {
      setLinkingKey(null);
    }
  }

  async function unlinkEaMatch(dateKey: string, itemId: string) {
    if (!canEdit) return;
    const key = `${dateKey}::${itemId}`;
    try {
      setLinkingKey(key);
      setError("");
      const response = await fetch("/api/programme/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink", weekStart, dateKey, itemId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details ?? data.error ?? "Impossible de délier ce match.");
      }
      setSchedule(data.schedule ?? schedule);
      setMessage("Liaison EA retirée du programme.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de suppression de liaison.");
    } finally {
      setLinkingKey(null);
    }
  }

  async function deleteAlias(id: number) {
    if (!canEdit) return;
    try {
      setDeletingAliasId(id);
      setError("");
      const response = await fetch(`/api/programme/aliases?id=${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Impossible de supprimer cette correspondance.");
      setAliases((current) => current.filter((alias) => alias.id !== id));
      setMessage("Correspondance adversaire supprimée.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de suppression.");
    } finally {
      setDeletingAliasId(null);
    }
  }

  async function saveProgramme() {
    if (!canEdit) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/programme", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekStart,
          schedule,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Impossible d'enregistrer le programme."
        );
      }

      setSchedule(data.schedule ?? schedule);
      setMessage("Programme de la semaine enregistré.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur d'enregistrement."
      );
    } finally {
      setSaving(false);
    }
  }

  async function exportDiscordPoster() {
    try {
      setExporting(true);
      setError("");

      const posterWidth = 1920;
      const pagePadding = 52;
      const headerHeight = 250;
      const footerHeight = 76;
      const sectionGap = 26;
      const cardGap = 24;
      const imageCache = new Map<string, HTMLImageElement | null>();

      const getCachedImage = async (src: string) => {
        if (!src) return null;
        if (imageCache.has(src)) return imageCache.get(src) ?? null;

        try {
          const image = await loadImage(src);
          imageCache.set(src, image);
          return image;
        } catch {
          imageCache.set(src, null);
          return null;
        }
      };

      const clubLogo = await getCachedImage(CLUB_LOGO);

      const getItemPalette = (type: ProgrammeItem["type"]) => {
        if (type === "competition") {
          return {
            cardA: "rgba(8, 89, 112, 0.96)",
            cardB: "rgba(4, 34, 56, 0.98)",
            glow: "rgba(41, 222, 255, 0.28)",
            chipBg: "rgba(0, 214, 255, 0.18)",
            chipText: "#72e6ff",
            accent: "#11d8ff",
            edge: "rgba(71, 224, 255, 0.45)",
            label: "COMPÉTITION",
          };
        }

        return {
          cardA: "rgba(113, 64, 12, 0.96)",
          cardB: "rgba(48, 29, 8, 0.98)",
          glow: "rgba(255, 179, 31, 0.20)",
          chipBg: "rgba(255, 208, 64, 0.17)",
          chipText: "#ffd24f",
          accent: "#ffb224",
          edge: "rgba(255, 204, 63, 0.35)",
          label: "TOURNOI",
        };
      };

      const drawGlowRect = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        color: string,
        alpha = 0.14,
        radius = 24
      ) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = color;
        ctx.shadowBlur = 34;
        ctx.fillStyle = color;
        roundedRect(ctx, x, y, w, h, radius);
        ctx.fill();
        ctx.restore();
      };

      const drawTrophyGlyph = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        color: string
      ) => {
        const w = size;
        const h = size;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = Math.max(2, size * 0.06);
        ctx.lineJoin = "round";

        roundedRect(ctx, x + w * 0.28, y + h * 0.12, w * 0.44, h * 0.24, 8);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + w * 0.28, y + h * 0.18);
        ctx.bezierCurveTo(
          x + w * 0.10,
          y + h * 0.16,
          x + w * 0.10,
          y + h * 0.42,
          x + w * 0.26,
          y + h * 0.44
        );
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + w * 0.72, y + h * 0.18);
        ctx.bezierCurveTo(
          x + w * 0.90,
          y + h * 0.16,
          x + w * 0.90,
          y + h * 0.42,
          x + w * 0.74,
          y + h * 0.44
        );
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + w * 0.40, y + h * 0.36);
        ctx.quadraticCurveTo(x + w * 0.50, y + h * 0.62, x + w * 0.60, y + h * 0.36);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + w * 0.50, y + h * 0.60);
        ctx.lineTo(x + w * 0.50, y + h * 0.78);
        ctx.stroke();

        roundedRect(ctx, x + w * 0.35, y + h * 0.78, w * 0.30, h * 0.08, 5);
        ctx.fill();
        ctx.restore();
      };

      const getRowHeight = (itemCount: number) => {
        if (itemCount >= 4) return 96;
        if (itemCount === 3) return 112;
        if (itemCount === 2) return 126;
        return 142;
      };

      const getDayCardHeight = (dayKey: string) => {
        const items = schedule[dayKey] ?? [];
        if (!items.length) return 292;
        const rowHeight = getRowHeight(items.length);
        return 112 + items.length * rowHeight + (items.length - 1) * 12 + 26;
      };

      const createPosterCanvas = (height: number) => {
        const canvas = document.createElement("canvas");
        canvas.width = posterWidth;
        canvas.height = Math.ceil(height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Impossible de créer l'affiche.");
        }
        return { canvas, ctx };
      };

      const downloadCanvas = async (canvas: HTMLCanvasElement, filename: string) => {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png", 1)
        );

        if (!blob) {
          throw new Error("Impossible de générer le fichier PNG.");
        }

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      };

      const drawPosterBackground = (
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number
      ) => {
        const bg = ctx.createLinearGradient(0, 0, width, height);
        bg.addColorStop(0, "#020814");
        bg.addColorStop(0.52, "#031629");
        bg.addColorStop(1, "#01060d");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "rgba(250, 204, 21, 0.055)";
        for (let x = -120; x < width + 260; x += 160) {
          ctx.save();
          ctx.translate(x, -40);
          ctx.rotate(-0.17);
          ctx.fillRect(0, 0, 42, height + 180);
          ctx.restore();
        }

        const cyanLine = ctx.createLinearGradient(0, 0, width, 0);
        cyanLine.addColorStop(0, "rgba(40,220,255,0.90)");
        cyanLine.addColorStop(0.5, "rgba(40,220,255,0.15)");
        cyanLine.addColorStop(1, "rgba(40,220,255,0.90)");
        ctx.fillStyle = cyanLine;
        ctx.fillRect(0, 166, width * 0.58, 4);

        const topLine = ctx.createLinearGradient(0, 0, width, 0);
        topLine.addColorStop(0, "rgba(250,204,21,0.95)");
        topLine.addColorStop(0.5, "rgba(250,204,21,0.25)");
        topLine.addColorStop(1, "rgba(250,204,21,0.95)");
        ctx.fillStyle = topLine;
        ctx.fillRect(0, 0, width, 10);

        if (clubLogo) {
          ctx.save();
          ctx.globalAlpha = 0.06;
          ctx.drawImage(clubLogo, width - 410, 16, 350, 350);
          ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = "#11d8ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(width * 0.73, 110, 120, 0, Math.PI * 1.35);
        ctx.stroke();
        ctx.restore();
      };

      const drawHeader = (
        ctx: CanvasRenderingContext2D,
        title: string,
        partTitle: string,
        subtitle: string,
        pageIndex: number,
        pageCount: number
      ) => {
        drawGlowRect(ctx, 52, 42, 144, 144, "#11d8ff", 0.1, 30);
        roundedRect(ctx, 52, 42, 144, 144, 30);
        ctx.fillStyle = "rgba(5, 22, 36, 0.96)";
        ctx.fill();
        ctx.strokeStyle = "rgba(23, 216, 255, 0.35)";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (clubLogo) {
          ctx.drawImage(clubLogo, 68, 58, 112, 112);
        }

        ctx.fillStyle = "#ffd332";
        ctx.font = "900 28px Arial, sans-serif";
        ctx.fillText("GX NOVA • FC27", 224, 88);

        const titleSize = fitText(ctx, title, 980, 66, 40);
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 ${titleSize}px Arial, sans-serif`;
        ctx.fillText(title, 224, 154);

        ctx.fillStyle = "#a7b8cd";
        ctx.font = "800 28px Arial, sans-serif";
        ctx.fillText(subtitle.toUpperCase(), 224, 200);

        drawGlowRect(ctx, 1326, 48, 518, 124, "#11d8ff", 0.05, 28);
        roundedRect(ctx, 1326, 48, 518, 124, 28);
        ctx.fillStyle = "rgba(8, 23, 38, 0.82)";
        ctx.fill();
        ctx.strokeStyle = "rgba(31, 209, 255, 0.2)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#39d7ff";
        ctx.font = "900 14px Arial, sans-serif";
        ctx.fillText("WEEKLY MATCH PLAN / 週間プログラム", 1358, 82);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 32px Arial, sans-serif";
        ctx.fillText(partTitle, 1358, 124);
        ctx.fillStyle = "#8fa6bc";
        ctx.font = "800 15px Arial, sans-serif";
        ctx.fillText(subtitle, 1358, 152);

        ctx.save();
        ctx.translate(1900, headerHeight + 90);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.font = "900 12px Arial, sans-serif";
        ctx.fillText("GX NOVA // BLUELOCK MODE // OFFICIAL STAFF", 0, 0);
        ctx.restore();

        ctx.fillStyle = "rgba(255,255,255,0.34)";
        ctx.font = "800 16px Arial, sans-serif";
        ctx.fillText("GX NOVA • PROGRAMME OFFICIEL STAFF & JOUEURS", 54, ctx.canvas.height - 28);

        ctx.fillStyle = "#facc15";
        ctx.font = "900 16px Arial, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`${String(pageIndex).padStart(2, "0")} / ${String(pageCount).padStart(2, "0")}`, ctx.canvas.width - 54, ctx.canvas.height - 28);
        ctx.textAlign = "left";
      };

      const drawEventRow = async (
        ctx: CanvasRenderingContext2D,
        item: ProgrammeItem,
        x: number,
        y: number,
        width: number,
        height: number
      ) => {
        const palette = getItemPalette(item.type);
        drawGlowRect(ctx, x, y, width, height, palette.glow, 0.08, 18);

        const bg = ctx.createLinearGradient(x, y, x + width, y);
        bg.addColorStop(0, palette.cardA);
        bg.addColorStop(1, palette.cardB);
        roundedRect(ctx, x, y, width, height, 18);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.strokeStyle = palette.edge;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = palette.accent;
        ctx.fillRect(x, y, 8, height);

        roundedRect(ctx, x + 18, y + 18, 102, height - 36, 16);
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fill();
        ctx.fillStyle = "#ffd332";
        ctx.font = `900 ${height >= 120 ? 26 : 24}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(item.time || "--:--", x + 69, y + height / 2 + 10);
        ctx.textAlign = "left";

        const logoSize = Math.min(82, height - 28);
        const logoX = x + width - logoSize - 18;
        const logoY = y + (height - logoSize) / 2;
        const textX = x + 146;
        const textW = logoX - textX - 20;

        roundedRect(ctx, textX, y + 18, 126, 24, 10);
        ctx.fillStyle = palette.chipBg;
        ctx.fill();
        ctx.fillStyle = palette.chipText;
        ctx.font = "900 12px Arial, sans-serif";
        ctx.fillText(palette.label, textX + 12, y + 35);

        ctx.strokeStyle = palette.accent;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(textX + 142, y + 31);
        ctx.lineTo(x + width - logoSize - 34, y + 31);
        ctx.stroke();
        ctx.globalAlpha = 1;

        let mainLine = "";
        let metaLine = "";
        let bottomLine = "";

        const rawNotes = item.notes.trim();
        const usefulNotes =
          rawNotes.toUpperCase() === "FC27" ? "" : rawNotes;

        if (item.type === "competition") {
          const competitionName = competitionLabel(item, competitions);
          const opponentName = item.opponentName.trim();
          mainLine = opponentName || competitionName;
          metaLine = competitionName;
          bottomLine = usefulNotes;
        } else {
          mainLine = item.title.trim() || "Tournoi";
          const opponentName = item.opponentName.trim();

          if (opponentName) {
            metaLine = `VS ${opponentName}`;
            bottomLine = usefulNotes || "FC27";
          } else {
            metaLine = usefulNotes || "FC27";
            bottomLine = "";
          }
        }

        const mainSize = fitText(ctx, mainLine, textW, height >= 120 ? 28 : 26, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 ${mainSize}px Arial, sans-serif`;
        ctx.fillText(mainLine, textX, y + (height >= 120 ? 64 : 58));

        const metaSize = fitText(
          ctx,
          metaLine,
          textW,
          item.type === "competition"
            ? height >= 120
              ? 20
              : 18
            : height >= 120
            ? 18
            : 17,
          12
        );
        ctx.fillStyle = item.type === "competition" ? "#d9f7ff" : "#ffe4af";
        ctx.font = `900 ${metaSize}px Arial, sans-serif`;
        ctx.fillText(metaLine, textX, y + (height >= 120 ? 94 : 84));

        if (bottomLine) {
          ctx.fillStyle = "#a8bbcd";
          ctx.font = `700 ${height >= 120 ? 14 : 13}px Arial, sans-serif`;
          ctx.fillText(bottomLine, textX, y + height - 14);
        }

        roundedRect(ctx, logoX, logoY, logoSize, logoSize, 18);
        const logoBg = ctx.createLinearGradient(logoX, logoY, logoX + logoSize, logoY + logoSize);
        logoBg.addColorStop(0, "rgba(255,255,255,0.14)");
        logoBg.addColorStop(1, "rgba(255,255,255,0.08)");
        ctx.fillStyle = logoBg;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const opponentLogo = item.opponentLogoUrl
          ? await getCachedImage(item.opponentLogoUrl)
          : null;

        if (opponentLogo) {
          ctx.save();
          roundedRect(ctx, logoX, logoY, logoSize, logoSize, 18);
          ctx.clip();
          ctx.drawImage(opponentLogo, logoX + 6, logoY + 6, logoSize - 12, logoSize - 12);
          ctx.restore();
        } else if (item.type === "tournament") {
          drawTrophyGlyph(ctx, logoX + 18, logoY + 16, logoSize - 36, "#ffd332");
        } else if (item.opponentName.trim()) {
          ctx.fillStyle = "#ffffff";
          ctx.font = "900 24px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            fallbackInitials(item.opponentName),
            logoX + logoSize / 2,
            logoY + logoSize / 2 + 8
          );
          ctx.textAlign = "left";
        }
      };

      const drawDayCard = async (
        ctx: CanvasRenderingContext2D,
        day: (typeof days)[number],
        index: number,
        x: number,
        y: number,
        width: number,
        height: number
      ) => {
        const items = schedule[day.key] ?? [];

        drawGlowRect(ctx, x, y, width, height, "#0ed4ff", 0.05, 30);
        roundedRect(ctx, x, y, width, height, 30);
        ctx.fillStyle = "rgba(5, 19, 33, 0.98)";
        ctx.fill();
        ctx.strokeStyle = "rgba(17, 216, 255, 0.25)";
        ctx.lineWidth = 2;
        ctx.stroke();

        const headerGradient = ctx.createLinearGradient(x, y, x + width, y);
        headerGradient.addColorStop(0, "rgba(10, 57, 87, 0.52)");
        headerGradient.addColorStop(0.45, "rgba(1, 37, 69, 0.16)");
        headerGradient.addColorStop(1, "rgba(250, 204, 21, 0.08)");
        roundedRect(ctx, x + 16, y + 16, width - 32, 76, 22);
        ctx.fillStyle = headerGradient;
        ctx.fill();

        ctx.fillStyle = "#ffd332";
        ctx.font = "900 24px Arial, sans-serif";
        ctx.fillText(day.name.toUpperCase(), x + 34, y + 52);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 26px Arial, sans-serif";
        ctx.fillText(formatDayDate(day.date), x + 34, y + 84);

        ctx.fillStyle = "rgba(255,255,255,0.13)";
        ctx.font = "900 44px Arial, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(String(index + 1).padStart(2, "0"), x + width - 28, y + 66);
        ctx.textAlign = "left";

        const contentX = x + 16;
        const contentY = y + 108;
        const contentW = width - 32;
        const contentH = height - 124;

        if (!items.length) {
          roundedRect(ctx, contentX, contentY, contentW, Math.max(120, contentH - 10), 22);
          ctx.fillStyle = "rgba(255,255,255,0.02)";
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.setLineDash([10, 10]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = "#7f95ae";
          ctx.font = "900 22px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("AUCUNE PROGRAMMATION", x + width / 2, y + height / 2 + 6);
          ctx.fillStyle = "#58708a";
          ctx.font = "700 16px Arial, sans-serif";
          ctx.fillText("Repos / entraînement libre", x + width / 2, y + height / 2 + 42);
          ctx.textAlign = "left";
          return;
        }

        const rowHeight = getRowHeight(items.length);
        let currentY = contentY;
        for (const item of items) {
          await drawEventRow(ctx, item, contentX, currentY, contentW, rowHeight);
          currentY += rowHeight + 12;
        }
      };

      const drawPosterPage = async (
        daysSubset: (typeof days),
        pageIndex: number,
        partTitle: string,
        partSubtitle: string,
        fileSuffix: string,
        columns: number
      ) => {
        const cardWidth =
          columns === 3
            ? (posterWidth - pagePadding * 2 - cardGap * 2) / 3
            : (posterWidth - pagePadding * 2 - cardGap) / 2;

        const independentColumns = columns === 2 && daysSubset.length === 4;

        let posterHeight = 0;
        const { canvas, ctx } = (() => {
          if (independentColumns) {
            const leftDays = [daysSubset[0], daysSubset[2]];
            const rightDays = [daysSubset[1], daysSubset[3]];
            const leftHeight = leftDays.reduce((sum, day, index) => sum + getDayCardHeight(day.key) + (index > 0 ? sectionGap : 0), 0);
            const rightHeight = rightDays.reduce((sum, day, index) => sum + getDayCardHeight(day.key) + (index > 0 ? sectionGap : 0), 0);
            const contentHeight = Math.max(leftHeight, rightHeight);
            posterHeight = headerHeight + contentHeight + footerHeight + 18;
            return createPosterCanvas(posterHeight);
          }

          let rowHeights: number[] = [];
          if (columns === 3) {
            rowHeights = [Math.max(...daysSubset.map((day) => getDayCardHeight(day.key)))];
          } else {
            for (let i = 0; i < daysSubset.length; i += columns) {
              rowHeights.push(
                Math.max(
                  ...daysSubset
                    .slice(i, i + columns)
                    .map((day) => getDayCardHeight(day.key))
                )
              );
            }
          }

          const contentHeight = rowHeights.reduce((sum, value) => sum + value, 0) + (rowHeights.length - 1) * sectionGap;
          posterHeight = headerHeight + contentHeight + footerHeight + 18;
          return createPosterCanvas(posterHeight);
        })();

        drawPosterBackground(ctx, posterWidth, posterHeight);
        drawHeader(ctx, "PROGRAMME DE LA SEMAINE", partTitle, weekLabel, pageIndex, 2);

        if (independentColumns) {
          const leftDays = [daysSubset[0], daysSubset[2]];
          const rightDays = [daysSubset[1], daysSubset[3]];
          const leftX = pagePadding;
          const rightX = pagePadding + cardWidth + cardGap;
          let leftY = headerHeight;
          let rightY = headerHeight;

          for (const day of leftDays) {
            const dayHeight = getDayCardHeight(day.key);
            await drawDayCard(
              ctx,
              day,
              days.findIndex((entry) => entry.key === day.key),
              leftX,
              leftY,
              cardWidth,
              dayHeight
            );
            leftY += dayHeight + sectionGap;
          }

          for (const day of rightDays) {
            const dayHeight = getDayCardHeight(day.key);
            await drawDayCard(
              ctx,
              day,
              days.findIndex((entry) => entry.key === day.key),
              rightX,
              rightY,
              cardWidth,
              dayHeight
            );
            rightY += dayHeight + sectionGap;
          }
        } else {
          let rowHeights: number[] = [];
          if (columns === 3) {
            rowHeights = [Math.max(...daysSubset.map((day) => getDayCardHeight(day.key)))];
          } else {
            for (let i = 0; i < daysSubset.length; i += columns) {
              rowHeights.push(
                Math.max(
                  ...daysSubset
                    .slice(i, i + columns)
                    .map((day) => getDayCardHeight(day.key))
                )
              );
            }
          }

          let rowIndex = 0;
          let dayIndex = 0;
          let currentY = headerHeight;

          while (dayIndex < daysSubset.length) {
            const rowDays = daysSubset.slice(dayIndex, dayIndex + columns);
            const rowHeight = rowHeights[rowIndex];

            for (const [colIndex, day] of rowDays.entries()) {
              const x = pagePadding + colIndex * (cardWidth + cardGap);
              await drawDayCard(
                ctx,
                day,
                days.findIndex((entry) => entry.key === day.key),
                x,
                currentY,
                cardWidth,
                rowHeight
              );
            }

            currentY += rowHeight + sectionGap;
            dayIndex += columns;
            rowIndex += 1;
          }
        }

        await downloadCanvas(canvas, `GX-NOVA-programme-${fileSuffix}-${weekStart}.png`);
      };

      await drawPosterPage(
        days.slice(0, 4),
        1,
        "MATCH DAYS 01",
        "Partie 1 • Dimanche → Mercredi",
        "partie-1",
        2
      );

      await drawPosterPage(
        days.slice(4, 7),
        2,
        "MATCH DAYS 02",
        "Partie 2 • Jeudi → Samedi",
        "partie-2",
        3
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur pendant l'export PNG."
      );
    } finally {
      setExporting(false);
    }
  }
  return (
    <main className="min-h-screen bg-[#030914] text-white">
      <header className="border-b border-white/10 bg-[#06111f]">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-5 px-5 py-5 lg:px-8">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition hover:border-yellow-400/30 hover:text-yellow-400"
              title="Retour au dashboard"
            >
              <ArrowLeft size={19} />
            </a>

            <img
              src={CLUB_LOGO}
              alt="GX NOVA"
              className="h-14 w-14 rounded-2xl object-contain"
            />

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-400">
                GX NOVA • FC27
              </p>
              <h1 className="mt-1 text-2xl font-black lg:text-3xl">
                Programme de la semaine
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-gray-500 md:flex">
            <Shield size={15} className="text-yellow-400" />
            {role === "viewer" ? "Lecture seule" : "Édition staff"}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1700px] px-5 py-6 lg:px-8">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm font-bold text-green-300">
            {message}
          </div>
        )}

        <section className="mb-6 rounded-3xl border border-yellow-400/15 bg-gradient-to-r from-yellow-400/[0.07] via-[#091626] to-[#07111f] p-5 lg:p-6">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
            <div>
              <div className="flex items-center gap-2 text-yellow-400">
                <CalendarDays size={19} />
                <p className="text-xs font-black uppercase tracking-[0.2em]">
                  Semaine sélectionnée
                </p>
              </div>
              <p className="mt-2 text-2xl font-black">{weekLabel}</p>
              <p className="mt-2 text-sm text-gray-500">
                Planifie les compétitions et tournois, puis exporte une affiche PNG premium en 2 affiches, prêtes pour Discord.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => changeWeek(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
              >
                <ChevronLeft size={19} />
              </button>
              <button
                type="button"
                onClick={goCurrentWeek}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-gray-300 hover:bg-white/10"
              >
                Cette semaine
              </button>
              <button
                type="button"
                onClick={() => changeWeek(1)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
              >
                <ChevronRight size={19} />
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => void scanEaMatches()}
                  disabled={matching || loading}
                  className="ml-0 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-400/15 disabled:opacity-50 xl:ml-3"
                >
                  <RefreshCw size={17} className={matching ? "animate-spin" : ""} />
                  {matching ? "Recherche EA..." : "Rechercher matchs EA"}
                </button>
              )}

              <button
                type="button"
                onClick={() => void exportDiscordPoster()}
                disabled={exporting || loading}
                className="ml-0 flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 py-3 text-sm font-black text-blue-300 transition hover:bg-blue-400/15 disabled:opacity-50 xl:ml-3"
              >
                <Download size={17} />
                {exporting ? "Création des 2 affiches..." : "Exporter Discord (2 affiches)"}
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => void saveProgramme()}
                  disabled={saving || loading}
                  className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:opacity-50"
                >
                  <Save size={17} />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              )}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#091626] p-20 text-center text-gray-500">
            Chargement du programme...
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {days.map((day) => {
              const items = schedule[day.key] ?? [];

              return (
                <section
                  key={day.key}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#071321]"
                >
                  <div className="flex items-center justify-between border-b border-white/5 bg-[#091626] px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10 text-sm font-black text-yellow-400">
                        {formatDayDate(day.date)}
                      </div>
                      <div>
                        <h2 className="text-lg font-black">{day.name}</h2>
                        <p className="text-xs text-gray-600">
                          {formatLongDate(day.date)}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-black text-gray-500">
                      {items.length} événement{items.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-4 p-4 lg:p-5">
                    {items.map((item) => (
                      <ProgrammeEditorCard
                        key={item.id}
                        item={item}
                        competitions={competitions}
                        canEdit={canEdit}
                        uploading={uploadingId === item.id}
                        linking={linkingKey === `${day.key}::${item.id}`}
                        candidates={linkCandidates[`${day.key}::${item.id}`] ?? []}
                        plan={plansByEventId[item.id] ?? null}
                        onOpenPlan={() => setPlanningEvent({ dateKey: day.key, item })}
                        onPatch={(patch) =>
                          patchItem(day.key, item.id, patch)
                        }
                        onRemove={() => removeItem(day.key, item.id)}
                        onUpload={(file) =>
                          void uploadOpponentLogo(day.key, item.id, file)
                        }
                        onConfirm={(matchId) =>
                          void confirmEaMatch(day.key, item.id, matchId)
                        }
                        onUnlink={() => void unlinkEaMatch(day.key, item.id)}
                      />
                    ))}

                    {!items.length && (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 py-8 text-center">
                        <CalendarDays
                          size={28}
                          className="mx-auto text-gray-700"
                        />
                        <p className="mt-3 text-sm font-bold text-gray-500">
                          Aucun événement prévu.
                        </p>
                      </div>
                    )}

                    {canEdit && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            addProgrammeItem(day.key, "competition")
                          }
                          className="flex items-center justify-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.06] px-3 py-3 text-xs font-black text-yellow-300 transition hover:bg-yellow-400/10"
                        >
                          <Trophy size={15} />
                          Compétition
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            addProgrammeItem(day.key, "tournament")
                          }
                          className="flex items-center justify-center gap-2 rounded-xl border border-blue-400/20 bg-blue-400/[0.06] px-3 py-3 text-xs font-black text-blue-300 transition hover:bg-blue-400/10"
                        >
                          <Sparkles size={15} />
                          Tournoi
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {!!aliases.length && (
          <section className="mt-6 rounded-3xl border border-cyan-400/15 bg-[#071321] p-5 lg:p-6">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2 text-cyan-300">
                  <Link2 size={18} />
                  <h2 className="font-black">Correspondances adversaires apprises</h2>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Quand tu confirmes manuellement un nom différent de celui d'EA, le site le retient pour les prochaines semaines.
                </p>
              </div>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-black text-gray-500">
                {aliases.length} correspondance{aliases.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {aliases.map((alias) => (
                <div key={alias.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/15 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{alias.programme_name}</p>
                    <p className="mt-1 truncate text-xs font-bold text-cyan-300">EA → {alias.ea_name}</p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void deleteAlias(alias.id)}
                      disabled={deletingAliasId === alias.id}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-400/15 bg-red-400/[0.05] text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                      title="Supprimer la correspondance"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {planningEvent && (
        <EventPlanModal
          weekStart={weekStart}
          eventDate={planningEvent.dateKey}
          item={planningEvent.item}
          competitionName={competitionLabel(planningEvent.item, competitions)}
          plan={plansByEventId[planningEvent.item.id] ?? null}
          roster={roster}
          currentLineup={currentLineup}
          canEdit={canEdit}
          saving={savingPlan}
          sameDayOtherMatchesCount={Math.max(
            0,
            (schedule[planningEvent.dateKey] ?? []).length - 1
          )}
          onClose={() => setPlanningEvent(null)}
          onSave={(plan) => void saveEventPlan(plan)}
          onCopyToSameDay={(plan) => void copyCompositionToSameDay(plan)}
        />
      )}
    </main>
  );
}

function ProgrammeEditorCard({
  item,
  competitions,
  canEdit,
  uploading,
  linking,
  candidates,
  plan,
  onOpenPlan,
  onPatch,
  onRemove,
  onUpload,
  onConfirm,
  onUnlink,
}: {
  item: ProgrammeItem;
  competitions: Competition[];
  canEdit: boolean;
  uploading: boolean;
  linking: boolean;
  candidates: LinkCandidate[];
  plan: EventPlan | null;
  onOpenPlan: () => void;
  onPatch: (patch: Partial<ProgrammeItem>) => void;
  onRemove: () => void;
  onUpload: (file: File) => void;
  onConfirm: (matchId: number) => void;
  onUnlink: () => void;
}) {
  const isCompetition = item.type === "competition";

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isCompetition
          ? "border-yellow-400/15 bg-yellow-400/[0.035]"
          : "border-blue-400/15 bg-blue-400/[0.035]"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              isCompetition
                ? "bg-yellow-400/10 text-yellow-400"
                : "bg-blue-400/10 text-blue-300"
            }`}
          >
            {isCompetition ? <Trophy size={17} /> : <Sparkles size={17} />}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
              {isCompetition ? "Compétition" : "Tournoi"}
            </p>
            <p className="text-sm font-black">
              {competitionLabel(item, competitions)}
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/15 bg-red-400/[0.05] text-red-400 transition hover:bg-red-400/10"
            title="Supprimer"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {isCompetition ? (
          <Field label="Compétition">
            <select
              value={item.competitionId ?? ""}
              disabled={!canEdit}
              onChange={(event) =>
                onPatch({
                  competitionId: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              className="w-full rounded-xl border border-white/10 bg-[#050d18] px-3 py-3 text-sm text-white outline-none transition focus:border-yellow-400/35 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Choisir...</option>
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.short_name ?? competition.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Nom du tournoi">
            <input
              type="text"
              value={item.title}
              disabled={!canEdit}
              onChange={(event) => onPatch({ title: event.target.value })}
              placeholder="Ex. Cash Prize Kiks"
              className="w-full rounded-xl border border-white/10 bg-[#050d18] px-3 py-3 text-sm text-white outline-none transition focus:border-yellow-400/35 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </Field>
        )}

        <Field label="Horaire">
          <input
            type="time"
            value={item.time}
            disabled={!canEdit}
            onChange={(event) => onPatch({ time: event.target.value })}
            className="w-full rounded-xl border border-white/10 bg-[#050d18] px-3 py-3 text-sm text-white outline-none transition focus:border-yellow-400/35 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </Field>

        <Field label="Adversaire">
          <input
            type="text"
            value={item.opponentName}
            disabled={!canEdit}
            onChange={(event) =>
              onPatch({ opponentName: event.target.value })
            }
            placeholder={
              isCompetition ? "Nom du club adverse" : "Optionnel"
            }
            className="w-full rounded-xl border border-white/10 bg-[#050d18] px-3 py-3 text-sm text-white outline-none transition focus:border-yellow-400/35 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </Field>

        <Field label="Logo adverse">
          <div className="flex items-center gap-2">
            {item.opponentLogoUrl ? (
              <img
                src={item.opponentLogoUrl}
                alt="Logo adverse"
                className="h-11 w-11 shrink-0 rounded-xl border border-white/10 bg-white/5 object-contain p-1"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-gray-700">
                <Shield size={19} />
              </div>
            )}

            {canEdit ? (
              <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#050d18] px-3 text-xs font-black text-gray-400 transition hover:border-yellow-400/25 hover:text-yellow-300">
                <ImagePlus size={15} />
                {uploading
                  ? "Envoi..."
                  : item.opponentLogoUrl
                  ? "Changer"
                  : "Ajouter"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUpload(file);
                    event.target.value = "";
                  }}
                />
              </label>
            ) : (
              <div className="flex min-h-11 flex-1 items-center rounded-xl border border-white/10 bg-[#050d18] px-3 text-xs text-gray-600">
                {item.opponentLogoUrl ? "Logo enregistré" : "Aucun logo"}
              </div>
            )}
          </div>
        </Field>
      </div>

      <Field label="Note / précision" className="mt-3">
        <input
          type="text"
          value={item.notes}
          disabled={!canEdit}
          onChange={(event) => onPatch({ notes: event.target.value })}
          placeholder="Ex. BO3, présence 20h45, quart de finale..."
          className="w-full rounded-xl border border-white/10 bg-[#050d18] px-3 py-3 text-sm text-white outline-none transition focus:border-yellow-400/35 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </Field>

      <EventPlanSummary plan={plan} canEdit={canEdit} onOpen={onOpenPlan} />

      {item.linkedMatchId ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] p-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-black text-emerald-300">
                  <CircleCheck size={16} /> Joué
                </span>
                <span className={`rounded-lg border px-2 py-1 text-[10px] font-black ${resultBadgeClass(item.result)}`}>
                  {item.result ?? "-"}
                </span>
                {item.linkConfidence !== null && (
                  <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-black text-gray-400">
                    {item.linkMethod === "auto" ? "Auto" : "Confirmé"} • {item.linkConfidence}%
                  </span>
                )}
              </div>
              <p className="mt-2 text-lg font-black text-white">
                GX NOVA <span className="text-yellow-400">{item.goalsFor ?? "-"}</span> - <span className="text-cyan-300">{item.goalsAgainst ?? "-"}</span> {item.eaOpponentName || item.opponentName}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
                <span>Prévu : {item.time || "--:--"}</span>
                <span>•</span>
                <span>EA : {formatEaTime(item.eaPlayedAt)}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={`/match-center?matchId=${item.linkedMatchId}`}
                className="flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/15"
              >
                <ExternalLink size={14} /> Match Center
              </a>
              {canEdit && (
                <button
                  type="button"
                  onClick={onUnlink}
                  disabled={linking}
                  className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs font-black text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                >
                  <Unlink size={14} /> Délier
                </button>
              )}
            </div>
          </div>
        </div>
      ) : candidates.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle size={16} />
            <p className="text-xs font-black uppercase tracking-[0.14em]">Correspondance EA à confirmer</p>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Le nom EA peut être différent de celui saisi. Confirme le bon match une fois : le site mémorisera ensuite cette correspondance.
          </p>
          <div className="mt-3 space-y-2">
            {candidates.map((candidate) => (
              <div key={candidate.matchId} className="flex flex-col justify-between gap-3 rounded-xl border border-white/8 bg-black/15 p-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {candidate.opponent} • GX NOVA {candidate.goalsFor}-{candidate.goalsAgainst}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-gray-500">
                    <Clock3 size={12} /> EA {formatEaTime(candidate.playedAt)}
                    <span>•</span>
                    <span>Confiance {candidate.confidence}%</span>
                    {candidate.aliasKnown && <span className="text-cyan-300">• Alias connu</span>}
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onConfirm(candidate.matchId)}
                    disabled={linking}
                    className="shrink-0 rounded-xl bg-yellow-400 px-3 py-2 text-xs font-black text-black transition hover:bg-yellow-300 disabled:opacity-50"
                  >
                    {linking ? "Confirmation..." : "Confirmer"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : item.opponentName && item.time ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-[11px] font-semibold text-gray-600">
          <Link2 size={13} /> À venir • utilise « Rechercher matchs EA » après la soirée.
        </div>
      ) : null}
    </div>
  );
}

function EventPlanSummary({
  plan,
  canEdit,
  onOpen,
}: {
  plan: EventPlan | null;
  canEdit: boolean;
  onOpen: () => void;
}) {
  const entries = Object.values(plan?.availability ?? {});
  const available = entries.filter((entry) => entry.status === "available").length;
  const maybe = entries.filter((entry) => entry.status === "maybe").length;
  const absent = entries.filter((entry) => entry.status === "absent").length;
  const lineupCount = plan?.lineup.length ?? 0;

  return (
    <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.035] p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-cyan-300">
            <Users size={16} />
            <p className="text-xs font-black uppercase tracking-[0.14em]">Disponibilités & composition</p>
          </div>
          {plan ? (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
              <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-300">{available} dispo</span>
              <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-amber-300">{maybe} incertain</span>
              <span className="rounded-lg border border-red-400/20 bg-red-400/10 px-2 py-1 text-red-300">{absent} absent</span>
              <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-gray-400">Compo {lineupCount}/11 • {plan.formation}</span>
            </div>
          ) : (
            <p className="mt-2 text-xs font-semibold text-gray-500">Aucun plan d'équipe enregistré pour cet événement.</p>
          )}
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/15"
        >
          <ClipboardList size={14} /> {plan ? "Modifier" : canEdit ? "Préparer l'équipe" : "Consulter"}
        </button>
      </div>
    </div>
  );
}

function EventPlanModal({
  weekStart,
  eventDate,
  item,
  competitionName,
  plan,
  roster,
  currentLineup,
  canEdit,
  saving,
  sameDayOtherMatchesCount,
  onClose,
  onSave,
  onCopyToSameDay,
}: {
  weekStart: string;
  eventDate: string;
  item: ProgrammeItem;
  competitionName: string;
  plan: EventPlan | null;
  roster: RosterPlayer[];
  currentLineup: CurrentLineup;
  canEdit: boolean;
  saving: boolean;
  sameDayOtherMatchesCount: number;
  onClose: () => void;
  onSave: (plan: EventPlan) => void;
  onCopyToSameDay: (plan: EventPlan) => void;
}) {
  const [exportingComposition, setExportingComposition] = useState(false);
  const [draft, setDraft] = useState<EventPlan>(() => ({
    weekStart,
    eventDate,
    eventId: item.id,
    formation: plan?.formation ?? currentLineup.formation ?? "3-1-4-2",
    availability: plan?.availability ?? {},
    lineup: plan?.lineup ?? [],
    bench: plan?.bench ?? [],
    notes: plan?.notes ?? "",
  }));

  const slots = FORMATION_SLOTS[draft.formation] ?? FORMATION_SLOTS["3-1-4-2"];
  const selectedIds = new Set(draft.lineup.map((entry) => entry.playerId));
  const availabilityEntries = roster.map((player) =>
    draft.availability[player.id] ?? { playerId: player.id, name: player.name, status: "unknown" as AvailabilityStatus }
  );
  const availableCount = availabilityEntries.filter((entry) => entry.status === "available").length;
  const maybeCount = availabilityEntries.filter((entry) => entry.status === "maybe").length;
  const absentCount = availabilityEntries.filter((entry) => entry.status === "absent").length;

  function setAvailability(player: RosterPlayer, status: AvailabilityStatus) {
    if (!canEdit) return;
    setDraft((current) => {
      const availability = {
        ...current.availability,
        [player.id]: { playerId: player.id, name: player.name, status },
      };
      const lineup = status === "absent"
        ? current.lineup.filter((entry) => entry.playerId !== player.id)
        : current.lineup;
      const bench = status === "absent"
        ? current.bench.filter((entry) => entry.playerId !== player.id)
        : current.bench;
      return { ...current, availability, lineup, bench };
    });
  }

  function setFormation(formation: string) {
    if (!canEdit) return;
    const nextSlots = FORMATION_SLOTS[formation] ?? [];
    setDraft((current) => ({
      ...current,
      formation,
      lineup: current.lineup.filter((entry) => nextSlots.includes(entry.slot)),
    }));
  }

  function assignPlayer(slot: string, playerId: string) {
    if (!canEdit) return;
    setDraft((current) => {
      const withoutSlot = current.lineup.filter((entry) => entry.slot !== slot);
      if (!playerId) return { ...current, lineup: withoutSlot };
      const player = roster.find((candidate) => candidate.id === playerId);
      if (!player) return current;
      const withoutPlayer = withoutSlot.filter((entry) => entry.playerId !== playerId);
      return {
        ...current,
        lineup: [...withoutPlayer, { slot, playerId: player.id, name: player.name }],
        bench: current.bench.filter((entry) => entry.playerId !== player.id),
      };
    });
  }

  function copyCurrentLineup() {
    if (!canEdit) return;
    const mapped: EventLineupEntry[] = [];
    for (const entry of currentLineup.lineup ?? []) {
      const slot = String(entry.slot ?? "").trim();
      const name = String(entry.name ?? "").trim();
      if (!slot || !name) continue;
      const player = roster.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase());
      if (!player) continue;
      if ((draft.availability[player.id]?.status ?? "unknown") === "absent") continue;
      mapped.push({ slot, playerId: player.id, name: player.name });
    }
    const formation = FORMATION_SLOTS[currentLineup.formation] ? currentLineup.formation : draft.formation;
    const allowedSlots = new Set(FORMATION_SLOTS[formation] ?? []);
    setDraft((current) => ({
      ...current,
      formation,
      lineup: mapped.filter((entry) => allowedSlots.has(entry.slot)).slice(0, 11),
    }));
  }

  function toggleBench(player: RosterPlayer) {
    if (!canEdit || selectedIds.has(player.id)) return;
    setDraft((current) => {
      const exists = current.bench.some((entry) => entry.playerId === player.id);
      return {
        ...current,
        bench: exists
          ? current.bench.filter((entry) => entry.playerId !== player.id)
          : [...current.bench, { slot: "BENCH", playerId: player.id, name: player.name }],
      };
    });
  }

  async function exportCompositionPoster() {
    if (!draft.lineup.length) return;

    try {
      setExportingComposition(true);

      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 900;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Impossible de générer l'affiche.");

      const width = canvas.width;
      const height = canvas.height;

      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, "#020814");
      background.addColorStop(0.55, "#07182a");
      background.addColorStop(1, "#02060d");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.fillStyle = "rgba(250,204,21,0.045)";
      for (let x = -100; x < width + 160; x += 180) {
        context.save();
        context.translate(x, 0);
        context.rotate(-0.15);
        context.fillRect(0, -80, 34, height + 180);
        context.restore();
      }

      context.fillStyle = "#facc15";
      context.fillRect(0, 0, width, 10);
      context.fillStyle = "#22d3ee";
      context.fillRect(0, 176, 980, 4);

      let clubLogo: HTMLImageElement | null = null;
      let opponentLogo: HTMLImageElement | null = null;

      try {
        clubLogo = await loadImage(CLUB_LOGO);
      } catch {
        clubLogo = null;
      }

      if (item.opponentLogoUrl) {
        try {
          opponentLogo = await loadImage(item.opponentLogoUrl);
        } catch {
          opponentLogo = null;
        }
      }

      if (clubLogo) {
        context.drawImage(clubLogo, 54, 30, 130, 130);
      }

      context.fillStyle = "#facc15";
      context.font = "900 24px Arial, sans-serif";
      context.fillText("GX NOVA • FC27", 215, 66);

      context.fillStyle = "#ffffff";
      context.font = "900 54px Arial, sans-serif";
      context.fillText("COMPOSITION OFFICIELLE", 215, 124);

      context.fillStyle = "#9fb2c8";
      context.font = "800 20px Arial, sans-serif";
      context.fillText(
        `${formatLongDate(parseDateKey(eventDate)).toUpperCase()} • ${item.time || "--:--"} • ${competitionName.toUpperCase()}`,
        215,
        158
      );

      const opponentName = item.opponentName.trim() || "ADVERSAIRE À CONFIRMER";
      const opponentBoxX = 1210;
      roundedRect(context, opponentBoxX, 32, 330, 124, 24);
      context.fillStyle = "rgba(255,255,255,0.045)";
      context.fill();
      context.strokeStyle = "rgba(34,211,238,0.18)";
      context.lineWidth = 1.5;
      context.stroke();

      if (opponentLogo) {
        roundedRect(context, opponentBoxX + 18, 48, 90, 90, 20);
        context.fillStyle = "rgba(255,255,255,0.04)";
        context.fill();
        context.drawImage(opponentLogo, opponentBoxX + 28, 58, 70, 70);
      } else {
        roundedRect(context, opponentBoxX + 18, 48, 90, 90, 20);
        context.fillStyle = "rgba(255,255,255,0.04)";
        context.fill();
        context.fillStyle = "#64748b";
        context.font = "900 24px Arial, sans-serif";
        context.textAlign = "center";
        context.fillText(fallbackInitials(opponentName), opponentBoxX + 63, 102);
        context.textAlign = "left";
      }

      context.fillStyle = "#22d3ee";
      context.font = "900 13px Arial, sans-serif";
      context.fillText("ADVERSAIRE", opponentBoxX + 124, 66);
      const opponentFont = fitText(context, opponentName.toUpperCase(), 182, 28, 18);
      context.fillStyle = "#ffffff";
      context.font = `900 ${opponentFont}px Arial, sans-serif`;
      context.fillText(opponentName.toUpperCase(), opponentBoxX + 124, 101);

      context.fillStyle = "#94a3b8";
      context.font = "800 15px Arial, sans-serif";
      context.fillText(competitionName.toUpperCase(), opponentBoxX + 124, 126);

      const note = draft.notes.trim();
      const hasBench = draft.bench.length > 0;
      const hasNote = note.length > 0;
      const showSidePanel = hasBench || hasNote;

      const pitchX = 70;
      const pitchY = 220;
      const pitchW = showSidePanel ? 1060 : 1460;
      const pitchH = 610;

      roundedRect(context, pitchX, pitchY, pitchW, pitchH, 32);
      const pitchBg = context.createLinearGradient(pitchX, pitchY, pitchX + pitchW, pitchY + pitchH);
      pitchBg.addColorStop(0, "#09263a");
      pitchBg.addColorStop(0.5, "#0a3043");
      pitchBg.addColorStop(1, "#071f31");
      context.fillStyle = pitchBg;
      context.fill();
      context.strokeStyle = "rgba(34,211,238,0.28)";
      context.lineWidth = 2;
      context.stroke();

      context.save();
      roundedRect(context, pitchX + 18, pitchY + 18, pitchW - 36, pitchH - 36, 24);
      context.clip();

      for (let i = 0; i < 8; i += 1) {
        context.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.018)" : "rgba(250,204,21,0.018)";
        context.fillRect(
          pitchX + 18 + i * ((pitchW - 36) / 8),
          pitchY + 18,
          (pitchW - 36) / 8,
          pitchH - 36
        );
      }

      context.strokeStyle = "rgba(255,255,255,0.22)";
      context.lineWidth = 2;
      context.strokeRect(pitchX + 46, pitchY + 42, pitchW - 92, pitchH - 84);

      context.beginPath();
      context.moveTo(pitchX + 46, pitchY + pitchH / 2);
      context.lineTo(pitchX + pitchW - 46, pitchY + pitchH / 2);
      context.stroke();

      context.beginPath();
      context.arc(pitchX + pitchW / 2, pitchY + pitchH / 2, 76, 0, Math.PI * 2);
      context.stroke();

      const penaltyWidth = pitchW * 0.44;
      const penaltyX = pitchX + (pitchW - penaltyWidth) / 2;
      context.strokeRect(penaltyX, pitchY + 42, penaltyWidth, 96);
      context.strokeRect(penaltyX, pitchY + pitchH - 138, penaltyWidth, 96);

      context.restore();

      roundedRect(context, pitchX + 30, pitchY + 24, 210, 48, 18);
      context.fillStyle = "rgba(2,8,20,0.78)";
      context.fill();
      context.fillStyle = "#facc15";
      context.font = "900 17px Arial, sans-serif";
      context.fillText(`FORMATION ${draft.formation}`, pitchX + 50, pitchY + 55);

      const coords = FORMATION_COORDS[draft.formation] ?? FORMATION_COORDS["3-1-4-2"];
      const playerCardW = showSidePanel ? 184 : 212;
      const playerCardH = showSidePanel ? 62 : 66;
      const roleBoxW = showSidePanel ? 42 : 46;
      const nameAreaW = playerCardW - roleBoxW - 24;

      for (const slot of FORMATION_SLOTS[draft.formation] ?? []) {
        const position = coords[slot];
        if (!position) continue;

        const entry = draft.lineup.find((candidate) => candidate.slot === slot);
        const centerX = pitchX + (position.x / 100) * pitchW;
        const centerY = pitchY + (position.y / 100) * pitchH;

        if (!entry) {
          roundedRect(context, centerX - 64, centerY - 24, 128, 48, 17);
          context.fillStyle = "rgba(2,8,20,0.54)";
          context.fill();
          context.strokeStyle = "rgba(255,255,255,0.09)";
          context.stroke();
          context.fillStyle = "#64748b";
          context.font = "900 12px Arial, sans-serif";
          context.textAlign = "center";
          context.fillText(slot, centerX, centerY + 5);
          context.textAlign = "left";
          continue;
        }

        const cardX = centerX - playerCardW / 2;
        const cardY = centerY - playerCardH / 2;

        context.shadowColor = "rgba(250,204,21,0.15)";
        context.shadowBlur = 14;
        roundedRect(context, cardX, cardY, playerCardW, playerCardH, 20);
        context.fillStyle = "rgba(3,12,24,0.94)";
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = "rgba(250,204,21,0.34)";
        context.lineWidth = 1.5;
        context.stroke();

        roundedRect(
          context,
          cardX + 4,
          cardY + 4,
          roleBoxW,
          playerCardH - 8,
          16
        );
        context.fillStyle = "rgba(34,211,238,0.11)";
        context.fill();

        context.fillStyle = "#22d3ee";
        context.font = `900 ${showSidePanel ? 12 : 13}px Arial, sans-serif`;
        context.textAlign = "center";
        context.fillText(
          slot,
          cardX + 4 + roleBoxW / 2,
          centerY + 4
        );

        const nameFont = fitText(
          context,
          entry.name,
          nameAreaW,
          showSidePanel ? 17 : 19,
          11
        );
        context.fillStyle = "#ffffff";
        context.font = `900 ${nameFont}px Arial, sans-serif`;
        context.textAlign = "left";
        context.fillText(
          entry.name,
          cardX + roleBoxW + 14,
          centerY + 5
        );
      }

      context.textAlign = "left";

      if (showSidePanel) {
        const sideX = 1165;
        const sideY = 220;
        const sideW = 365;
        const sideH = 610;

        roundedRect(context, sideX, sideY, sideW, sideH, 30);
        context.fillStyle = "rgba(6,17,31,0.95)";
        context.fill();
        context.strokeStyle = "rgba(250,204,21,0.20)";
        context.lineWidth = 1.5;
        context.stroke();

        let cursorY = sideY + 44;

        if (hasBench) {
          context.fillStyle = "#facc15";
          context.font = "900 18px Arial, sans-serif";
          context.fillText("BANC / RÉSERVE", sideX + 28, cursorY);

          const benchToShow = draft.bench.slice(0, 7);
          benchToShow.forEach((entry, index) => {
            const y = cursorY + 26 + index * 56;
            roundedRect(context, sideX + 24, y, sideW - 48, 44, 14);
            context.fillStyle =
              index % 2 === 0
                ? "rgba(34,211,238,0.055)"
                : "rgba(255,255,255,0.035)";
            context.fill();
            context.fillStyle = "#22d3ee";
            context.font = "900 13px Arial, sans-serif";
            context.fillText(
              String(index + 1).padStart(2, "0"),
              sideX + 40,
              y + 28
            );
            const benchFont = fitText(context, entry.name, 245, 16, 12);
            context.fillStyle = "#ffffff";
            context.font = `900 ${benchFont}px Arial, sans-serif`;
            context.fillText(entry.name, sideX + 78, y + 28);
          });

          if (draft.bench.length > 7) {
            context.fillStyle = "#94a3b8";
            context.font = "800 14px Arial, sans-serif";
            context.fillText(
              `+ ${draft.bench.length - 7} autre(s) joueur(s)`,
              sideX + 28,
              cursorY + 426
            );
          }

          cursorY = hasNote ? sideY + 500 : sideY + 550;
        }

        if (hasNote) {
          if (!hasBench) {
            cursorY = sideY + 52;
          }

          context.fillStyle = "#22d3ee";
          context.font = "900 18px Arial, sans-serif";
          context.fillText("NOTE STAFF", sideX + 28, cursorY);

          const noteBoxY = cursorY + 18;
          const noteBoxH = hasBench ? 70 : 170;
          roundedRect(
            context,
            sideX + 24,
            noteBoxY,
            sideW - 48,
            noteBoxH,
            16
          );
          context.fillStyle = "rgba(255,255,255,0.035)";
          context.fill();

          const clippedNote =
            note.length > (hasBench ? 90 : 170)
              ? `${note.slice(0, hasBench ? 87 : 167)}...`
              : note;
          const noteFont = fitText(
            context,
            clippedNote,
            sideW - 88,
            hasBench ? 16 : 18,
            12
          );
          context.fillStyle = "#cbd5e1";
          context.font = `800 ${noteFont}px Arial, sans-serif`;
          context.fillText(
            clippedNote,
            sideX + 40,
            noteBoxY + (hasBench ? 41 : 58)
          );
        }
      }

      context.fillStyle = "rgba(255,255,255,0.34)";
      context.font = "800 15px Arial, sans-serif";
      context.fillText("GX NOVA • PROGRAMME OFFICIEL • FC27", 54, 872);

      const safeOpponent = opponentName
        .replace(/[^a-zA-Z0-9À-ÿ_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "adversaire";

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `GX-NOVA-composition-${eventDate}-${safeOpponent}.png`;
        anchor.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (error) {
      console.error(error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Impossible de générer l'affiche de composition."
      );
    } finally {
      setExportingComposition(false);
    }
  }

  const eligibleBench = roster.filter((player) => {
    if (selectedIds.has(player.id)) return false;
    const status = draft.availability[player.id]?.status ?? "unknown";
    return status === "available" || status === "maybe";
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
      <div className="my-4 w-full max-w-7xl overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#06111f] shadow-2xl shadow-cyan-950/40">
        <div className="flex items-start justify-between gap-4 border-b border-white/8 bg-[#091626] p-5 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Plan d'équipe</p>
            <h2 className="mt-2 text-2xl font-black text-white">
              {item.opponentName ? `GX NOVA vs ${item.opponentName}` : competitionName}
            </h2>
            <p className="mt-1 text-sm font-semibold text-gray-500">{formatLongDate(parseDateKey(eventDate))} • {item.time || "--:--"}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-gray-400 transition hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[0.9fr_1.1fr] xl:p-6">
          <section className="rounded-3xl border border-white/10 bg-[#081522] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">Disponibilités</p>
                <p className="mt-1 text-sm font-semibold text-gray-500">Indique l'état de chaque joueur pour ce match.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-black">
                <span className="rounded-lg bg-emerald-400/10 px-2 py-1 text-emerald-300">{availableCount} dispo</span>
                <span className="rounded-lg bg-amber-400/10 px-2 py-1 text-amber-300">{maybeCount} ?</span>
                <span className="rounded-lg bg-red-400/10 px-2 py-1 text-red-300">{absentCount} absent</span>
              </div>
            </div>

            <div className="mt-5 max-h-[600px] space-y-2 overflow-y-auto pr-1">
              {roster.map((player) => {
                const status = draft.availability[player.id]?.status ?? "unknown";
                return (
                  <div key={player.id} className="rounded-2xl border border-white/8 bg-black/15 p-3">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{player.name}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-600">{positionLabel(player.position)}</p>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        <StatusButton label="✓" title="Disponible" active={status === "available"} tone="available" disabled={!canEdit} onClick={() => setAvailability(player, "available")} />
                        <StatusButton label="?" title="Incertain" active={status === "maybe"} tone="maybe" disabled={!canEdit} onClick={() => setAvailability(player, "maybe")} />
                        <StatusButton label="✕" title="Absent" active={status === "absent"} tone="absent" disabled={!canEdit} onClick={() => setAvailability(player, "absent")} />
                        <StatusButton label="—" title="Sans réponse" active={status === "unknown"} tone="unknown" disabled={!canEdit} onClick={() => setAvailability(player, "unknown")} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#081522] p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Composition du match</p>
                <p className="mt-1 text-sm font-semibold text-gray-500">
                  La composition est enregistrée pour cet événement. Tu peux la recopier sur la journée puis générer directement l'affiche Discord.
                </p>
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyCurrentLineup}
                    className="flex items-center justify-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.06] px-3 py-2 text-xs font-black text-yellow-300 transition hover:bg-yellow-400/10"
                  >
                    <Copy size={14} /> Copier la compo actuelle
                  </button>
                  {sameDayOtherMatchesCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onCopyToSameDay(draft)}
                      disabled={saving || draft.lineup.length === 0}
                      className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Copie la formation, les titulaires et le banc sur les autres matchs de la même journée."
                    >
                      <Copy size={14} />
                      Copier sur la journée ({sameDayOtherMatchesCount})
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-[220px_1fr]">
              <Field label="Formation">
                <select value={draft.formation} disabled={!canEdit} onChange={(event) => setFormation(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#050d18] px-3 py-3 text-sm font-black text-white outline-none disabled:opacity-60">
                  {Object.keys(FORMATION_SLOTS).map((formation) => <option key={formation} value={formation}>{formation}</option>)}
                </select>
              </Field>
              <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
                <p className="text-xs font-black text-gray-400">Titulaires</p>
                <p className="mt-1 text-2xl font-black text-white">{draft.lineup.length}<span className="text-sm text-gray-600"> / 11</span></p>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((slot) => {
                const selected = draft.lineup.find((entry) => entry.slot === slot);
                return (
                  <div key={slot} className="rounded-2xl border border-white/8 bg-black/15 p-3">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-300">{slot}</p>
                    <select
                      value={selected?.playerId ?? ""}
                      disabled={!canEdit}
                      onChange={(event) => assignPlayer(slot, event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#050d18] px-2 py-2.5 text-xs font-bold text-white outline-none disabled:opacity-60"
                    >
                      <option value="">-- Vide --</option>
                      {roster.map((player) => {
                        const status = draft.availability[player.id]?.status ?? "unknown";
                        const usedElsewhere = selectedIds.has(player.id) && selected?.playerId !== player.id;
                        const disabled = status === "absent" || usedElsewhere;
                        const marker = status === "available" ? "✓" : status === "maybe" ? "?" : status === "absent" ? "✕" : "•";
                        return <option key={player.id} value={player.id} disabled={disabled}>{marker} {player.name}</option>;
                      })}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">Banc / réserve</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {eligibleBench.map((player) => {
                  const active = draft.bench.some((entry) => entry.playerId === player.id);
                  return (
                    <button key={player.id} type="button" disabled={!canEdit} onClick={() => toggleBench(player)} className={`rounded-xl border px-3 py-2 text-xs font-black transition ${active ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300" : "border-white/10 bg-white/[0.03] text-gray-500 hover:text-white"} disabled:opacity-60`}>
                      {active && <Check size={12} className="mr-1 inline" />} {player.name}
                    </button>
                  );
                })}
                {!eligibleBench.length && <p className="text-xs font-semibold text-gray-600">Aucun joueur disponible hors du onze.</p>}
              </div>
            </div>

            <Field label="Note staff" className="mt-5">
              <textarea value={draft.notes} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="Ex. capitaine, consigne, arrivée tardive..." className="w-full resize-none rounded-xl border border-white/10 bg-[#050d18] px-3 py-3 text-sm text-white outline-none disabled:opacity-60" />
            </Field>
          </section>
        </div>

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-white/8 bg-[#091626] p-5 sm:flex-row sm:items-center sm:px-6">
          <p className="text-xs font-semibold text-gray-600">Les joueurs absents sont automatiquement retirés du onze et du banc.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-black text-gray-400 transition hover:text-white">Fermer</button>
            <button
              type="button"
              disabled={exportingComposition || draft.lineup.length === 0}
              onClick={() => void exportCompositionPoster()}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2.5 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40"
              title={draft.lineup.length === 0 ? "Ajoute au moins un joueur à la composition avant d'exporter." : "Génère une affiche PNG prête pour Discord."}
            >
              <Download size={14} />
              {exportingComposition ? "Génération..." : "Exporter Discord"}
            </button>
            {canEdit && (
              <button type="button" disabled={saving} onClick={() => onSave({ ...draft, bench: draft.bench.filter((entry) => !draft.lineup.some((starter) => starter.playerId === entry.playerId)) })} className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-xs font-black text-black transition hover:bg-yellow-300 disabled:opacity-50">
                <Save size={14} /> {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusButton({
  label,
  title,
  active,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  title: string;
  active: boolean;
  tone: AvailabilityStatus;
  disabled: boolean;
  onClick: () => void;
}) {
  const activeClass =
    tone === "available"
      ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
      : tone === "maybe"
      ? "border-amber-400/30 bg-amber-400/15 text-amber-300"
      : tone === "absent"
      ? "border-red-400/30 bg-red-400/15 text-red-300"
      : "border-slate-400/20 bg-slate-400/10 text-slate-300";
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} className={`h-9 min-w-9 rounded-lg border text-xs font-black transition ${active ? activeClass : "border-white/8 bg-white/[0.02] text-gray-600 hover:text-gray-300"} disabled:cursor-not-allowed disabled:opacity-50`}>
      {label}
    </button>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">
        {label}
      </span>
      {children}
    </label>
  );
}
