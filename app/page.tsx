"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Copy,
  Database,
  FileText,
  Eye,
  Filter,
  Home as HomeIcon,
  LockKeyhole,
  LogOut,
  Medal,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  Star,
  Swords,
  Trash2,
  Trophy,
  UserCircle2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

const CLUB_LOGO_CANDIDATES = [
  "/logo-gx-nova.png",
  "/gx-nova.png",
  "/logo.png",
  "/logo-gx-nova.webp",
  "/gx-nova.webp",
  "/logo.svg",
];

/* =========================================================
   TYPES
========================================================= */

type Match = {
  id?: number;
  matchId: string;
  timestamp: number;
  date: string;
  club: string;
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  score: string;
  result: "V" | "N" | "D";
  matchType?: string | null;
  seasonId?: number | null;
  competitionId?: number | null;
};

type PlayerPositionStats = {
  position: string;
  games: number;
  goals: number;
  assists: number;
  averageRating: number;
  shots: number;
  passesMade: number;
  passAttempts: number;
  passSuccess: number;
  tacklesMade: number;
  tackleAttempts: number;
  tackleSuccess: number;
  saves: number;
  redCards: number;
  recentRatings: number[];
};

type Player = {
  id: string;
  name: string;
  position: string;
  games: number;
  goals: number;
  assists: number;
  averageRating: number;
  shots: number;
  passesMade: number;
  passAttempts: number;
  passSuccess: number;
  tacklesMade: number;
  tackleAttempts: number;
  tackleSuccess: number;
  saves: number;
  redCards: number;
  recentRatings: number[];
  positionStats: PlayerPositionStats[];
};

type PlayerMatchHistoryItem = {
  matchId: number;
  eaMatchId: string;
  playedAt: string | null;
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  result: "V" | "N" | "D";
  seasonId: number | null;
  seasonName: string | null;
  competitionId: number | null;
  competitionName: string | null;
  competitionShortName: string | null;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  shots: number;
  passesMade: number;
  passAttempts: number;
  passSuccess: number;
  tacklesMade: number;
  tackleAttempts: number;
  tackleSuccess: number;
  saves: number;
  redCards: number;
};

type PlayerHistoryResponse = {
  playerId: string;
  playerName: string;
  performances: PlayerMatchHistoryItem[];
};

type LineupSpot = {
  slot: string;
  name: string;
  x: number;
  y: number;
};

type FormationSlot = {
  slot: string;
  label: string;
  x: number;
  y: number;
};

type FormationDefinition = {
  name: string;
  slots: FormationSlot[];
};

type LineupResponse = {
  formation: string;
  lineup: LineupSpot[];
  bench: string[];
  formations: FormationDefinition[];
};

type Season = {
  id: number;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
};

type Competition = {
  id: number;
  name: string;
  short_name: string | null;
  competition_type: string;
};

type MatchAssignment = {
  id: number;
  ea_match_id: string;
  played_at: string | null;
  match_type: string | null;
  opponent_name: string;
  goals_for: number;
  goals_against: number;
  result: "V" | "N" | "D";
  season_id: number | null;
  competition_id: number | null;
};

type HistoryResponse = {
  source: string;

  matches: Match[];

  players: Player[];

  totals?: {
    matches: number;
    playerPerformances: number;
    players: number;
  };
};

type CompetitionResponse = {
  seasons: Season[];
  competitions: Competition[];
};

type MatchDetailPlayer = {
  id: number;
  name: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  shots: number;
  passesMade: number;
  passAttempts: number;
  passSuccess: number;
  tacklesMade: number;
  tackleAttempts: number;
  tackleSuccess: number;
  saves: number;
  redCards: number;
  manOfTheMatch: boolean;
  goalsConceded: number;
  secondsPlayed: number;
};

type MatchDetail = {
  match: {
    id: number;
    playedAt: string | null;
    opponent: string;
    goalsFor: number;
    goalsAgainst: number;
    result: "V" | "N" | "D";
    seasonName: string | null;
    competitionName: string | null;
    competitionShortName: string | null;
  };

  detectedStructure: string | null;

  players: MatchDetailPlayer[];

  teamTotals: {
    players: number;
    averageRating: number;
    shots: number;
    passesMade: number;
    passAttempts: number;
    passSuccess: number;
    tacklesMade: number;
    tackleAttempts: number;
    tackleSuccess: number;
    saves: number;
    redCards: number;
  };
};

type TabName =
  | "overview"
  | "roster"
  | "lineup"
  | "matches"
  | "competitions"
  | "stats"
  | "analysis"
  | "report"
  | "settings";

type WindowStats = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  winRate: number;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
  goalDifferencePerMatch: number;
};

type AnalysisSignal = {
  title: string;
  description: string;
  tone: "positive" | "warning" | "neutral";
};

type AnalysisRecommendation = {
  priority: 1 | 2 | 3;
  title: string;
  reason: string;
  action: string;
};

type EveningReportMatch = {
  id: number;
  eaMatchId: string;
  playedAt: string | null;
  time: string;
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  result: "V" | "N" | "D";
  competitionId: number | null;
  competitionName: string | null;
  competitionShortName: string | null;
};

type EveningReportPlayer = {
  id: string;
  name: string;
  games: number;
  positions: string[];
  averageRating: number;
  goals: number;
  assists: number;
  shots: number;
  passesMade: number;
  passAttempts: number;
  passSuccess: number;
  tacklesMade: number;
  tackleAttempts: number;
  tackleSuccess: number;
  saves: number;
  redCards: number;
  firstRating: number | null;
  lastRating: number | null;
  trendDelta: number | null;
  ratings: Array<{
    matchId: number;
    rating: number;
    position: string;
  }>;
};

type EveningReportResponse = {
  date: string;
  matches: EveningReportMatch[];
  players: EveningReportPlayer[];
  mvp: EveningReportPlayer | null;
  mvpMinimumGames: number;
  totals: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    cleanSheets: number;
  };
};

type StaffRole =
  | "admin"
  | "staff"
  | "viewer";

type CurrentStaffUser = {
  id: string;
  email: string | null;
  displayName: string;
  role: StaffRole;
};

type StaffMember = {
  userId: string;
  email: string | null;
  displayName: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
};

type AvailableAuthUser = {
  userId: string;
  email: string | null;
};

type DashboardProgrammeEvent = {
  weekStart: string;
  eventDate: string;
  eventId: string;
  time: string;
  type: "competition" | "tournament";
  competitionId: number | null;
  competitionName: string;
  title: string;
  opponentName: string;
  opponentLogoUrl: string;
  notes: string;
  status: "upcoming" | "played";
  linkedMatchId: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  result: "V" | "N" | "D" | null;
  plan: null | {
    formation: string;
    lineupCount: number;
    benchCount: number;
    available: number;
    maybe: number;
    absent: number;
  };
};

type DashboardResponse = {
  currentWeekStart: string;
  nextEvent: DashboardProgrammeEvent | null;
  weekEvents: DashboardProgrammeEvent[];
  upcomingEvents: DashboardProgrammeEvent[];
};

/* =========================================================
   PAGE
========================================================= */

export default function Home() {
  const [activeTab, setActiveTab] =
    useState<TabName>("overview");

  const [
    selectedSeason,
    setSelectedSeason,
  ] = useState("all");

  const [
    selectedCompetition,
    setSelectedCompetition,
  ] = useState("all");

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [allMatches, setAllMatches] =
    useState<Match[]>([]);

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [allPlayers, setAllPlayers] =
    useState<Player[]>([]);

  const [lineup, setLineup] =
    useState<LineupSpot[]>([]);

  const [formation, setFormation] =
    useState("3-5-2");

  const [bench, setBench] =
    useState<string[]>([]);

  const [formations, setFormations] =
    useState<FormationDefinition[]>([]);

  const [editLineup, setEditLineup] =
    useState<LineupSpot[]>([]);

  const [
    editFormation,
    setEditFormation,
  ] = useState("3-5-2");

  const [editBench, setEditBench] =
    useState<string[]>([]);

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [
    matchAssignments,
    setMatchAssignments,
  ] = useState<MatchAssignment[]>([]);

  const [
    editedAssignments,
    setEditedAssignments,
  ] = useState<
    Record<
      number,
      {
        seasonId: number | null;
        competitionId: number | null;
      }
    >
  >({});

  const [
    selectedPlayer,
    setSelectedPlayer,
  ] = useState<Player | null>(null);

  const [
    selectedMatchId,
    setSelectedMatchId,
  ] = useState<number | null>(null);

  const [
    matchDetail,
    setMatchDetail,
  ] = useState<MatchDetail | null>(null);

  const [
    matchDetailLoading,
    setMatchDetailLoading,
  ] = useState(false);

  const [
    matchDetailError,
    setMatchDetailError,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [syncing, setSyncing] =
    useState(false);

  const [
    savingLineup,
    setSavingLineup,
  ] = useState(false);

  const [
    savingMatchId,
    setSavingMatchId,
  ] = useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [dashboardData, setDashboardData] =
    useState<DashboardResponse | null>(null);

  const [dashboardLoading, setDashboardLoading] =
    useState(true);

  const [dashboardError, setDashboardError] =
    useState("");

  const [
    totalPlayerPerformances,
    setTotalPlayerPerformances,
  ] = useState(0);

  const [
    competitionFilter,
    setCompetitionFilter,
  ] = useState("all");

  const [
    matchSearch,
    setMatchSearch,
  ] = useState("");

  /* =======================================================
     CHARGEMENT
  ======================================================= */

  const loadData =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          setError("");

          const params =
            new URLSearchParams();

          if (
            selectedSeason !==
            "all"
          ) {
            params.set(
              "seasonId",
              selectedSeason
            );
          }

          if (
            selectedCompetition !==
            "all"
          ) {
            params.set(
              "competitionId",
              selectedCompetition
            );
          }

          const historyUrl =
            params.toString()
              ? `/api/history?${params.toString()}`
              : "/api/history";

          const [
            historyResponse,
            allHistoryResponse,
            lineupResponse,
            competitionsResponse,
            assignmentsResponse,
          ] =
            await Promise.all([
              fetch(historyUrl, {
                cache: "no-store",
              }),

              fetch("/api/history", {
                cache: "no-store",
              }),

              fetch("/api/lineup", {
                cache: "no-store",
              }),

              fetch("/api/competitions", {
                cache: "no-store",
              }),

              fetch("/api/match-competition", {
                cache: "no-store",
              }),
            ]);

          if (
            !historyResponse.ok ||
            !allHistoryResponse.ok
          ) {
            throw new Error(
              "Impossible de récupérer l'historique."
            );
          }

          if (!lineupResponse.ok) {
            throw new Error(
              "Impossible de récupérer la composition."
            );
          }

          if (
            !competitionsResponse.ok
          ) {
            throw new Error(
              "Impossible de récupérer les compétitions."
            );
          }

          if (
            !assignmentsResponse.ok
          ) {
            throw new Error(
              "Impossible de récupérer les matchs."
            );
          }

          const historyData:
            HistoryResponse =
            await historyResponse.json();

          const allHistoryData:
            HistoryResponse =
            await allHistoryResponse.json();

          const lineupData:
            LineupResponse =
            await lineupResponse.json();

          const competitionData:
            CompetitionResponse =
            await competitionsResponse.json();

          const assignmentData:
            MatchAssignment[] =
            await assignmentsResponse.json();

          setMatches(
            historyData.matches ??
              []
          );

          setAllMatches(
            allHistoryData.matches ??
              []
          );

          setPlayers(
            historyData.players ??
              []
          );

          setAllPlayers(
            allHistoryData.players ??
              []
          );

          setTotalPlayerPerformances(
            historyData
              .totals
              ?.playerPerformances ??
              0
          );

          setFormation(
            lineupData.formation ??
              "3-5-2"
          );

          setLineup(
            lineupData.lineup ??
              []
          );

          setBench(
            lineupData.bench ??
              []
          );

          setFormations(
            lineupData.formations ??
              []
          );

          setEditFormation(
            lineupData.formation ??
              "3-5-2"
          );

          setEditLineup(
            lineupData.lineup ??
              []
          );

          setEditBench(
            lineupData.bench ??
              []
          );

          setSeasons(
            competitionData.seasons ??
              []
          );

          setCompetitions(
            competitionData.competitions ??
              []
          );

          setMatchAssignments(
            assignmentData ??
              []
          );

          const initial:
            Record<
              number,
              {
                seasonId:
                  number | null;

                competitionId:
                  number | null;
              }
            > = {};

          for (
            const match of
            assignmentData
          ) {
            initial[
              match.id
            ] = {
              seasonId:
                match.season_id,

              competitionId:
                match.competition_id,
            };
          }

          setEditedAssignments(
            initial
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Une erreur est survenue."
          );
        } finally {
          if (showLoader) {
            setLoading(false);
          }
        }
      },
      [
        selectedSeason,
        selectedCompetition,
      ]
    );

  useEffect(
    () => {
      void loadData(true);
    },
    [loadData]
  );

  const loadDashboard = useCallback(
    async () => {
      try {
        setDashboardLoading(true);
        setDashboardError("");

        const response = await fetch(
          "/api/dashboard",
          {
            cache: "no-store",
          }
        );

        const data =
          (await response.json()) as DashboardResponse & {
            error?: string;
            details?: string;
          };

        if (!response.ok) {
          throw new Error(
            data.details ??
              data.error ??
              "Impossible de charger le cockpit."
          );
        }

        setDashboardData(data);
      } catch (err) {
        setDashboardError(
          err instanceof Error
            ? err.message
            : "Impossible de charger le cockpit."
        );
      } finally {
        setDashboardLoading(false);
      }
    },
    []
  );

  useEffect(
    () => {
      void loadDashboard();
    },
    [loadDashboard]
  );

  /* =======================================================
     SYNCHRONISATION
  ======================================================= */

  async function syncEaMatches() {
    try {
      setSyncing(true);

      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/sync-matches",
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.details ??
            data.error ??
            "La synchronisation EA a échoué."
        );
      }

      await loadData(false);
      await loadDashboard();

      setMessage(
        `${data.matchesSynchronized ?? 0} matchs amicaux synchronisés`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur de synchronisation."
      );
    } finally {
      setSyncing(false);
    }
  }

  /* =======================================================
     FICHE MATCH
  ======================================================= */

  async function openMatchDetail(
    matchId: number
  ) {
    try {
      setSelectedMatchId(
        matchId
      );

      setMatchDetail(null);
      setMatchDetailError("");
      setMatchDetailLoading(
        true
      );

      const response =
        await fetch(
          `/api/match/${matchId}`,
          {
            cache:
              "no-store",
          }
        );

      const text =
        await response.text();

      let data;

      try {
        data =
          JSON.parse(text);
      } catch {
        throw new Error(
          "L'API du match n'a pas renvoyé de JSON valide."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.details ??
            data.error ??
            "Impossible de récupérer la fiche du match."
        );
      }

      setMatchDetail(data);
    } catch (err) {
      setMatchDetailError(
        err instanceof Error
          ? err.message
          : "Erreur pendant le chargement du match."
      );
    } finally {
      setMatchDetailLoading(
        false
      );
    }
  }

  function closeMatchDetail() {
    setSelectedMatchId(null);
    setMatchDetail(null);
    setMatchDetailError("");
  }

  /* =======================================================
     STATS GLOBALES
  ======================================================= */

  const lastMatch =
    matches[0];

  const stats =
    useMemo(
      () => {
        const played =
          matches.length;

        const wins =
          matches.filter(
            (match) =>
              match.result ===
              "V"
          ).length;

        const draws =
          matches.filter(
            (match) =>
              match.result ===
              "N"
          ).length;

        const losses =
          matches.filter(
            (match) =>
              match.result ===
              "D"
          ).length;

        const goalsFor =
          matches.reduce(
            (
              total,
              match
            ) =>
              total +
              match.goalsFor,
            0
          );

        const goalsAgainst =
          matches.reduce(
            (
              total,
              match
            ) =>
              total +
              match.goalsAgainst,
            0
          );

        const winRate =
          played > 0
            ? Math.round(
                (wins /
                  played) *
                  100
              )
            : 0;

        return {
          played,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          winRate,

          goalDifference:
            goalsFor -
            goalsAgainst,

          goalsPerMatch:
            played > 0
              ? (
                  goalsFor /
                  played
                ).toFixed(
                  2
                )
              : "0.00",
        };
      },
      [matches]
    );

  const currentFilterLabel =
    useMemo(
      () => {
        const season =
          seasons.find(
            (item) =>
              String(
                item.id
              ) ===
              selectedSeason
          );

        const competition =
          competitions.find(
            (item) =>
              String(
                item.id
              ) ===
              selectedCompetition
          );

        if (
          season &&
          competition
        ) {
          return `${season.name} • ${
            competition.short_name ??
            competition.name
          }`;
        }

        if (competition) {
          return (
            competition.short_name ??
            competition.name
          );
        }

        if (season) {
          return season.name;
        }

        return "Toutes les données";
      },
      [
        seasons,
        competitions,
        selectedSeason,
        selectedCompetition,
      ]
    );

  /* =======================================================
     MATCHS
  ======================================================= */

  const filteredAssignments =
    useMemo(
      () =>
        matchAssignments.filter(
          (match) => {
            const assignment =
              editedAssignments[
                match.id
              ];

            const competitionId =
              assignment
                ?.competitionId ??
              match.competition_id;

            if (
              competitionFilter ===
                "unassigned" &&
              competitionId !==
                null
            ) {
              return false;
            }

            if (
              competitionFilter !==
                "all" &&
              competitionFilter !==
                "unassigned" &&
              competitionId !==
                Number(
                  competitionFilter
                )
            ) {
              return false;
            }

            if (
              matchSearch.trim() &&
              !match.opponent_name
                .toLowerCase()
                .includes(
                  matchSearch
                    .trim()
                    .toLowerCase()
                )
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        matchAssignments,
        editedAssignments,
        competitionFilter,
        matchSearch,
      ]
    );

  const classifiedMatches =
    matchAssignments.filter(
      (match) =>
        match.competition_id !==
        null
    ).length;

  const unclassifiedMatches =
    matchAssignments.length -
    classifiedMatches;

  function changeMatchSeason(
    matchId: number,
    seasonId:
      | number
      | null
  ) {
    setEditedAssignments(
      (current) => ({
        ...current,

        [matchId]: {
          seasonId,

          competitionId:
            current[
              matchId
            ]
              ?.competitionId ??
            null,
        },
      })
    );
  }

  function changeMatchCompetition(
    matchId: number,
    competitionId:
      | number
      | null
  ) {
    setEditedAssignments(
      (current) => ({
        ...current,

        [matchId]: {
          seasonId:
            current[
              matchId
            ]
              ?.seasonId ??
            null,

          competitionId,
        },
      })
    );
  }

  async function saveMatchAssignment(
    matchId: number
  ) {
    try {
      setSavingMatchId(
        matchId
      );

      const assignment =
        editedAssignments[
          matchId
        ];

      const response =
        await fetch(
          "/api/match-competition",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                matchId,

                seasonId:
                  assignment
                    ?.seasonId ??
                  null,

                competitionId:
                  assignment
                    ?.competitionId ??
                  null,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Impossible d'enregistrer le match."
        );
      }

      await loadData(false);

      setMessage(
        "Match mis à jour."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur d'enregistrement."
      );
    } finally {
      setSavingMatchId(
        null
      );
    }
  }

  /* =======================================================
     COMPOSITION
  ======================================================= */

  function changeFormation(
    formationName: string
  ) {
    const definition =
      formations.find(
        (item) =>
          item.name ===
          formationName
      );

    if (!definition) {
      return;
    }

    const newLineup =
      remapLineup(
        editLineup,
        definition
      );

    setEditFormation(
      formationName
    );

    setEditLineup(
      newLineup
    );

    const starters =
      new Set(
        newLineup.map(
          (spot) =>
            normalizePlayerName(
              spot.name
            )
        )
      );

    setEditBench(
      (current) =>
        current.filter(
          (name) =>
            !starters.has(
              normalizePlayerName(
                name
              )
            )
        )
    );
  }

  function changeLineupPlayer(
    slot: string,
    playerName: string
  ) {
    setEditLineup(
      (current) =>
        current.map(
          (spot) =>
            spot.slot ===
            slot
              ? {
                  ...spot,
                  name:
                    playerName,
                }
              : spot
        )
    );

    setEditBench(
      (current) =>
        current.filter(
          (name) =>
            normalizePlayerName(
              name
            ) !==
            normalizePlayerName(
              playerName
            )
        )
    );
  }

  function addBenchPlayer(
    playerName: string
  ) {
    if (!playerName) {
      return;
    }

    const alreadyUsed =
      editLineup.some(
        (spot) =>
          normalizePlayerName(
            spot.name
          ) ===
          normalizePlayerName(
            playerName
          )
      ) ||
      editBench.some(
        (name) =>
          normalizePlayerName(
            name
          ) ===
          normalizePlayerName(
            playerName
          )
      );

    if (alreadyUsed) {
      return;
    }

    setEditBench(
      (current) => [
        ...current,
        playerName,
      ]
    );
  }

  function removeBenchPlayer(
    playerName: string
  ) {
    setEditBench(
      (current) =>
        current.filter(
          (name) =>
            normalizePlayerName(
              name
            ) !==
            normalizePlayerName(
              playerName
            )
        )
    );
  }

  function resetLineupDraft() {
    setEditFormation(
      formation
    );

    setEditLineup(
      lineup.map(
        (spot) => ({
          ...spot,
        })
      )
    );

    setEditBench(
      [...bench]
    );
  }

  async function saveLineup() {
    try {
      setSavingLineup(
        true
      );

      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/lineup",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                formation:
                  editFormation,

                lineup:
                  editLineup,

                bench:
                  editBench,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            data.details ??
            "Impossible d'enregistrer la composition."
        );
      }

      setFormation(
        data.formation
      );

      setLineup(
        data.lineup
      );

      setBench(
        data.bench ??
          []
      );

      setEditFormation(
        data.formation
      );

      setEditLineup(
        data.lineup
      );

      setEditBench(
        data.bench ??
          []
      );

      setMessage(
        `Composition ${data.formation} enregistrée.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur d'enregistrement."
      );
    } finally {
      setSavingLineup(
        false
      );
    }
  }

  /* =======================================================
     AFFICHAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#030914] text-white">

      <div className="flex min-h-screen">

        {/* SIDEBAR */}

        <aside className="hidden w-[240px] shrink-0 border-r border-white/10 bg-gradient-to-b from-[#071422] to-[#030914] xl:flex xl:flex-col">

          <div className="border-b border-white/5 px-6 py-7">

            <div className="flex items-center gap-4">

              <ClubLogo
                size={56}
                className="shrink-0 shadow-[0_0_24px_rgba(250,204,21,0.18)]"
              />

              <div>

                <h1 className="text-xl font-black">

                  GX{" "}

                  <span className="text-yellow-400">
                    NOVA
                  </span>

                </h1>

                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
                  FC27 CLUB
                </p>

              </div>

            </div>

          </div>

          <nav className="flex-1 space-y-2 p-4">

            <SidebarItem
              icon={
                <HomeIcon
                  size={19}
                />
              }
              label="Accueil"
              active={
                activeTab ===
                "overview"
              }
              onClick={() =>
                setActiveTab(
                  "overview"
                )
              }
            />

            <a
              href="/match-center"
              className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-400 transition hover:bg-cyan-400/[0.06] hover:text-cyan-300"
            >
              <Medal size={19} />
              Match Center
            </a>

            <SidebarItem
              icon={
                <Users
                  size={19}
                />
              }
              label="Joueurs"
              active={
                activeTab ===
                "roster"
              }
              onClick={() =>
                setActiveTab(
                  "roster"
                )
              }
            />

            <SidebarItem
              icon={
                <Shield
                  size={19}
                />
              }
              label="Composition"
              active={
                activeTab ===
                "lineup"
              }
              onClick={() =>
                setActiveTab(
                  "lineup"
                )
              }
            />

            <SidebarItem
              icon={
                <Trophy
                  size={19}
                />
              }
              label="Compétitions"
              active={
                activeTab ===
                "competitions"
              }
              onClick={() =>
                setActiveTab(
                  "competitions"
                )
              }
            />

            <a
              href="/programme"
              className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-400 transition hover:bg-white/5 hover:text-yellow-400"
            >
              <CalendarDays size={19} />
              Programme semaine
            </a>

            <SidebarItem
              icon={
                <BarChart3
                  size={19}
                />
              }
              label="Statistiques"
              active={
                activeTab ===
                "stats"
              }
              onClick={() =>
                setActiveTab(
                  "stats"
                )
              }
            />

            <SidebarItem
              icon={
                <Activity
                  size={19}
                />
              }
              label="Analyses"
              active={
                activeTab ===
                "analysis"
              }
              onClick={() =>
                setActiveTab(
                  "analysis"
                )
              }
            />

            <SidebarItem
              icon={
                <FileText
                  size={19}
                />
              }
              label="Rapport soirée"
              active={
                activeTab ===
                "report"
              }
              onClick={() =>
                setActiveTab(
                  "report"
                )
              }
            />

            <div className="my-5 border-t border-white/5" />

            <SidebarItem
              icon={
                <Settings
                  size={19}
                />
              }
              label="Paramètres"
              active={
                activeTab ===
                "settings"
              }
              onClick={() =>
                setActiveTab(
                  "settings"
                )
              }
            />

          </nav>

          <div className="p-4">

            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">

              <Database
                size={22}
                className="text-yellow-400"
              />

              <p className="mt-3 text-sm font-black">
                Supabase actif
              </p>

              <p className="mt-1 text-xs text-gray-500">

                {
                  matchAssignments.length
                } matchs amicaux

              </p>

            </div>

          </div>

        </aside>

        {/* CONTENU */}

        <div className="min-w-0 flex-1">

          <header className="border-b border-white/10 bg-[#06111f]/95">

            <div className="flex min-h-[105px] items-center justify-between gap-8 px-7">

              <div className="flex items-center gap-4">

                <ClubLogo
                  size={62}
                  className="hidden sm:flex shadow-[0_0_28px_rgba(250,204,21,0.16)]"
                />

                <div>

                  <div className="flex items-center gap-3">

                  <h2 className="text-3xl font-black">

                    GX{" "}

                    <span className="text-yellow-400">
                      NOVA
                    </span>

                  </h2>

                  <Star
                    size={20}
                    className="text-yellow-400"
                  />

                </div>

                  <p className="mt-1 text-sm text-gray-400">
                    FC27 Performance Center
                  </p>

                </div>

              </div>

              <button
                onClick={
                  syncEaMatches
                }
                disabled={
                  syncing
                }
                className="hidden items-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm font-black text-yellow-400 lg:flex"
              >

                <RefreshCw
                  size={17}
                  className={
                    syncing
                      ? "animate-spin"
                      : ""
                  }
                />

                {syncing
                  ? "Synchronisation..."
                  : "Synchroniser EA"}

              </button>

            </div>

          </header>

          {/* ONGLETS */}

          <div className="border-b border-white/5 bg-[#071321] px-7">

            <div className="flex gap-9 overflow-x-auto">

              <TopTab
                label="APERÇU"
                active={
                  activeTab ===
                  "overview"
                }
                onClick={() =>
                  setActiveTab(
                    "overview"
                  )
                }
              />

              <TopTab
                label="EFFECTIF"
                active={
                  activeTab ===
                  "roster"
                }
                onClick={() =>
                  setActiveTab(
                    "roster"
                  )
                }
              />

              <TopTab
                label="COMPOSITION"
                active={
                  activeTab ===
                  "lineup"
                }
                onClick={() =>
                  setActiveTab(
                    "lineup"
                  )
                }
              />

              <a
                href="/match-center"
                className="border-b-2 border-transparent py-4 text-sm font-bold text-gray-500 transition hover:border-cyan-400/50 hover:text-cyan-300"
              >
                MATCH CENTER
              </a>

              <TopTab
                label="COMPÉTITIONS"
                active={
                  activeTab ===
                  "competitions"
                }
                onClick={() =>
                  setActiveTab(
                    "competitions"
                  )
                }
              />

              <a
                href="/programme"
                className="border-b-2 border-transparent py-4 text-sm font-bold text-gray-500 transition hover:border-yellow-400/40 hover:text-yellow-400"
              >
                PROGRAMME
              </a>

              <TopTab
                label="STATS"
                active={
                  activeTab ===
                  "stats"
                }
                onClick={() =>
                  setActiveTab(
                    "stats"
                  )
                }
              />

              <TopTab
                label="ANALYSES"
                active={
                  activeTab ===
                  "analysis"
                }
                onClick={() =>
                  setActiveTab(
                    "analysis"
                  )
                }
              />

              <TopTab
                label="RAPPORT SOIRÉE"
                active={
                  activeTab ===
                  "report"
                }
                onClick={() =>
                  setActiveTab(
                    "report"
                  )
                }
              />

            </div>

          </div>

          <div className="p-6">

            {error && (

              <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>

            )}

            {message && (

              <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-sm font-bold text-green-400">

                <CheckCircle2
                  size={18}
                />

                {message}

              </div>

            )}

            {(activeTab ===
                "roster" ||
              activeTab ===
                "stats" ||
              activeTab ===
                "analysis" ||
              activeTab ===
                "report") && (

              <GlobalFilters
                seasons={
                  seasons
                }
                competitions={
                  competitions
                }
                selectedSeason={
                  selectedSeason
                }
                selectedCompetition={
                  selectedCompetition
                }
                currentFilterLabel={
                  currentFilterLabel
                }
                setSelectedSeason={
                  setSelectedSeason
                }
                setSelectedCompetition={
                  setSelectedCompetition
                }
              />

            )}

            {loading && (

              <div className="mb-5 rounded-xl border border-blue-400/20 bg-[#091626] p-4 text-sm text-gray-400">
                Chargement des données...
              </div>

            )}

            {/* APERÇU */}

            {activeTab ===
              "overview" && (

              <OverviewDashboard
                matches={
                  allMatches
                }
                players={
                  allPlayers
                }
                competitions={
                  competitions
                }
                dashboardData={
                  dashboardData
                }
                dashboardLoading={
                  dashboardLoading
                }
                dashboardError={
                  dashboardError
                }
                formation={
                  formation
                }
                lineup={
                  lineup
                }
                onEditLineup={() =>
                  setActiveTab(
                    "lineup"
                  )
                }
                onRefreshDashboard={() =>
                  void loadDashboard()
                }
              />

            )}

            {/* EFFECTIF */}

            {activeTab ===
              "roster" && (

              <RosterManager
                players={
                  players
                }
                currentFilterLabel={
                  currentFilterLabel
                }
                onOpenPlayer={
                  setSelectedPlayer
                }
              />

            )}

            {/* COMPOSITION */}

            {activeTab ===
              "lineup" && (

              <LineupManager
                players={
                  allPlayers
                }
                lineup={
                  editLineup
                }
                bench={
                  editBench
                }
                formation={
                  editFormation
                }
                formations={
                  formations
                }
                saving={
                  savingLineup
                }
                onFormationChange={
                  changeFormation
                }
                onPlayerChange={
                  changeLineupPlayer
                }
                onBenchAdd={
                  addBenchPlayer
                }
                onBenchRemove={
                  removeBenchPlayer
                }
                onReset={
                  resetLineupDraft
                }
                onSave={
                  saveLineup
                }
              />

            )}

            {/* MATCHS */}

            {activeTab ===
              "matches" && (

              <MatchesManager
                matches={
                  filteredAssignments
                }
                allMatchesCount={
                  matchAssignments.length
                }
                classifiedMatches={
                  classifiedMatches
                }
                unclassifiedMatches={
                  unclassifiedMatches
                }
                seasons={
                  seasons
                }
                competitions={
                  competitions
                }
                editedAssignments={
                  editedAssignments
                }
                savingMatchId={
                  savingMatchId
                }
                competitionFilter={
                  competitionFilter
                }
                matchSearch={
                  matchSearch
                }
                setCompetitionFilter={
                  setCompetitionFilter
                }
                setMatchSearch={
                  setMatchSearch
                }
                changeMatchSeason={
                  changeMatchSeason
                }
                changeMatchCompetition={
                  changeMatchCompetition
                }
                saveMatchAssignment={
                  saveMatchAssignment
                }
                onOpenMatch={
                  openMatchDetail
                }
              />

            )}

            {/* COMPÉTITIONS */}

            {activeTab ===
              "competitions" && (

              <CompetitionsDashboard
                competitions={
                  competitions
                }
                seasons={
                  seasons
                }
                selectedSeason={
                  selectedSeason
                }
                setSelectedSeason={
                  setSelectedSeason
                }
                matchAssignments={
                  matchAssignments
                }
                onOpenPlayer={
                  setSelectedPlayer
                }
                onOpenMatch={
                  openMatchDetail
                }
              />

            )}

            {/* STATS */}

            {activeTab ===
              "stats" && (

              <StatsDashboard
                matches={
                  matches
                }
                allMatches={
                  allMatches
                }
                players={
                  players
                }
                seasons={
                  seasons
                }
                competitions={
                  competitions
                }
                selectedSeason={
                  selectedSeason
                }
                selectedCompetition={
                  selectedCompetition
                }
                currentFilterLabel={
                  currentFilterLabel
                }
                onOpenPlayer={
                  setSelectedPlayer
                }
                onOpenMatch={
                  openMatchDetail
                }
              />

            )}

            {/* ANALYSES */}

            {activeTab ===
              "analysis" && (

              <AnalysisDashboard
                matches={
                  matches
                }
                players={
                  players
                }
                competitions={
                  competitions
                }
                currentFilterLabel={
                  currentFilterLabel
                }
                onOpenPlayer={
                  setSelectedPlayer
                }
                onOpenMatch={
                  openMatchDetail
                }
              />

            )}

            {/* RAPPORT SOIRÉE */}

            {activeTab ===
              "report" && (

              <EveningReportDashboard
                matches={
                  matches
                }
                players={
                  players
                }
                selectedSeason={
                  selectedSeason
                }
                selectedCompetition={
                  selectedCompetition
                }
                currentFilterLabel={
                  currentFilterLabel
                }
                onOpenPlayer={
                  setSelectedPlayer
                }
                onOpenMatch={
                  openMatchDetail
                }
              />

            )}

            {/* PARAMÈTRES */}

            {activeTab ===
              "settings" && (

              <SettingsDashboard />

            )}

          </div>

        </div>

      </div>

      {/* FICHE JOUEUR */}

      {selectedPlayer && (

        <PlayerDetailModal
          player={
            selectedPlayer
          }
          currentFilterLabel={
            currentFilterLabel
          }
          seasonId={
            selectedSeason
          }
          competitionId={
            selectedCompetition
          }
          onClose={() =>
            setSelectedPlayer(
              null
            )
          }
        />

      )}

      {/* FICHE MATCH */}

      {selectedMatchId !==
        null && (

        <MatchDetailModal
          detail={
            matchDetail
          }
          loading={
            matchDetailLoading
          }
          error={
            matchDetailError
          }
          onClose={
            closeMatchDetail
          }
        />

      )}

    </main>
  );
}

/* =========================================================
   PARAMÈTRES / STAFF
========================================================= */

function SettingsDashboard() {
  const [currentUser, setCurrentUser] =
    useState<CurrentStaffUser | null>(null);

  const [staffMembers, setStaffMembers] =
    useState<StaffMember[]>([]);

  const [availableUsers, setAvailableUsers] =
    useState<AvailableAuthUser[]>([]);

  const [drafts, setDrafts] =
    useState<
      Record<
        string,
        {
          displayName: string;
          role: StaffRole;
          isActive: boolean;
        }
      >
    >({});

  const [selectedUserId, setSelectedUserId] =
    useState("");

  const [newDisplayName, setNewDisplayName] =
    useState("");

  const [newRole, setNewRole] =
    useState<StaffRole>("staff");

  const [loadingSettings, setLoadingSettings] =
    useState(true);

  const [savingUserId, setSavingUserId] =
    useState<string | null>(null);

  const [addingUser, setAddingUser] =
    useState(false);

  const [settingsError, setSettingsError] =
    useState("");

  const [settingsMessage, setSettingsMessage] =
    useState("");

  const loadSettings = useCallback(
    async () => {
      try {
        setLoadingSettings(true);
        setSettingsError("");

        const meResponse = await fetch(
          "/api/me",
          {
            cache: "no-store",
          }
        );

        const meData = await meResponse.json();

        if (!meResponse.ok) {
          throw new Error(
            meData.error ??
              "Impossible de récupérer le compte connecté."
          );
        }

        const user =
          meData.user as CurrentStaffUser;

        setCurrentUser(user);

        if (user.role !== "admin") {
          setStaffMembers([]);
          setAvailableUsers([]);
          setDrafts({});
          return;
        }

        const staffResponse = await fetch(
          "/api/staff",
          {
            cache: "no-store",
          }
        );

        const staffData =
          await staffResponse.json();

        if (!staffResponse.ok) {
          throw new Error(
            staffData.error ??
              "Impossible de récupérer les accès staff."
          );
        }

        const members =
          (staffData.staff ?? []) as StaffMember[];

        setStaffMembers(members);
        setAvailableUsers(
          (staffData.availableUsers ?? []) as AvailableAuthUser[]
        );

        const nextDrafts: Record<
          string,
          {
            displayName: string;
            role: StaffRole;
            isActive: boolean;
          }
        > = {};

        for (const member of members) {
          nextDrafts[member.userId] = {
            displayName: member.displayName,
            role: member.role,
            isActive: member.isActive,
          };
        }

        setDrafts(nextDrafts);
      } catch (err) {
        setSettingsError(
          err instanceof Error
            ? err.message
            : "Erreur pendant le chargement des paramètres."
        );
      } finally {
        setLoadingSettings(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function updateDraft(
    userId: string,
    patch: Partial<{
      displayName: string;
      role: StaffRole;
      isActive: boolean;
    }>
  ) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? {
          displayName: "",
          role: "staff" as StaffRole,
          isActive: true,
        }),
        ...patch,
      },
    }));
  }

  async function saveMember(
    userId: string
  ) {
    try {
      setSavingUserId(userId);
      setSettingsError("");
      setSettingsMessage("");

      const draft = drafts[userId];

      if (!draft) {
        return;
      }

      const response = await fetch(
        "/api/staff",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            displayName: draft.displayName,
            role: draft.role,
            isActive: draft.isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Impossible d'enregistrer ce membre."
        );
      }

      setSettingsMessage(
        "Accès staff mis à jour."
      );

      await loadSettings();
    } catch (err) {
      setSettingsError(
        err instanceof Error
          ? err.message
          : "Erreur d'enregistrement."
      );
    } finally {
      setSavingUserId(null);
    }
  }

  async function addStaffMember() {
    try {
      if (!selectedUserId) {
        setSettingsError(
          "Choisis d'abord un utilisateur Supabase."
        );
        return;
      }

      setAddingUser(true);
      setSettingsError("");
      setSettingsMessage("");

      const response = await fetch(
        "/api/staff",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: selectedUserId,
            displayName:
              newDisplayName.trim(),
            role: newRole,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Impossible d'autoriser cet utilisateur."
        );
      }

      setSelectedUserId("");
      setNewDisplayName("");
      setNewRole("staff");
      setSettingsMessage(
        "Nouveau membre staff autorisé."
      );

      await loadSettings();
    } catch (err) {
      setSettingsError(
        err instanceof Error
          ? err.message
          : "Erreur pendant l'ajout du membre."
      );
    } finally {
      setAddingUser(false);
    }
  }

  const roleLabel =
    currentUser?.role === "admin"
      ? "Administrateur"
      : currentUser?.role === "staff"
      ? "Staff"
      : "Lecture seule";

  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
          Administration
        </p>

        <h2 className="mt-2 text-3xl font-black">
          Paramètres
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          Gestion du compte connecté, des droits d'accès et des membres autorisés à utiliser le Performance Center GX NOVA.
        </p>
      </div>

      {settingsError && (
        <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-400">
          {settingsError}
        </div>
      )}

      {settingsMessage && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-sm font-bold text-green-400">
          <CheckCircle2 size={18} />
          {settingsMessage}
        </div>
      )}

      {loadingSettings ? (
        <div className="rounded-2xl border border-white/10 bg-[#091626] p-8 text-sm text-gray-500">
          Chargement des paramètres...
        </div>
      ) : (
        <div className="grid gap-5 2xl:grid-cols-12">
          <section className="rounded-2xl border border-yellow-400/25 bg-[#091626] 2xl:col-span-5">
            <PanelHeader
              title="MON COMPTE"
              right={roleLabel}
            />

            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-xl font-black text-yellow-400">
                  {getPlayerInitials(
                    currentUser?.displayName ||
                      currentUser?.email ||
                      "GX"
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-lg font-black">
                    {currentUser?.displayName ||
                      "Compte GX NOVA"}
                  </p>

                  <p className="mt-1 truncate text-sm text-gray-500">
                    {currentUser?.email ??
                      "Adresse e-mail indisponible"}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-[#06111f] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-600">
                  Niveau d'accès
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <LockKeyhole
                    size={19}
                    className="text-yellow-400"
                  />

                  <p className="font-black">
                    {roleLabel}
                  </p>
                </div>
              </div>

              <form
                action="/api/logout"
                method="post"
                className="mt-5"
              >
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-400/[0.06] px-4 py-3 text-sm font-black text-red-400 transition hover:bg-red-400/10"
                >
                  <LogOut size={17} />
                  Se déconnecter
                </button>
              </form>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-400/20 bg-[#091626] 2xl:col-span-7">
            <PanelHeader
              title="DROITS D'ACCÈS"
              right="3 niveaux"
            />

            <div className="grid gap-4 p-5 md:grid-cols-3">
              <PermissionCard
                title="Admin"
                subtitle="Contrôle complet"
                lines={[
                  "Lecture de toutes les statistiques",
                  "Synchronisation EA et modifications",
                  "Gestion composition et compétitions",
                  "Gestion des comptes staff",
                ]}
                active={
                  currentUser?.role === "admin"
                }
              />

              <PermissionCard
                title="Staff"
                subtitle="Gestion sportive"
                lines={[
                  "Lecture de toutes les statistiques",
                  "Synchronisation EA et modifications",
                  "Gestion composition et compétitions",
                  "Pas de gestion des comptes",
                ]}
                active={
                  currentUser?.role === "staff"
                }
              />

              <PermissionCard
                title="Viewer"
                subtitle="Lecture seule"
                lines={[
                  "Consultation du dashboard",
                  "Consultation matchs et joueurs",
                  "Aucune modification",
                  "Aucune gestion des accès",
                ]}
                active={
                  currentUser?.role === "viewer"
                }
              />
            </div>
          </section>

          {currentUser?.role === "admin" && (
            <>
              <section className="rounded-2xl border border-yellow-400/20 bg-[#091626] 2xl:col-span-12">
                <PanelHeader
                  title="AJOUTER UN MEMBRE"
                  right="Administrateur uniquement"
                />

                <div className="grid gap-3 p-5 lg:grid-cols-[1.3fr_1fr_180px_170px]">
                  <select
                    value={selectedUserId}
                    onChange={(event) => {
                      const userId =
                        event.target.value;

                      setSelectedUserId(userId);

                      const selected =
                        availableUsers.find(
                          (user) =>
                            user.userId === userId
                        );

                      if (
                        selected?.email &&
                        !newDisplayName.trim()
                      ) {
                        setNewDisplayName(
                          selected.email
                            .split("@")[0]
                            .replace(/[._-]+/g, " ")
                        );
                      }
                    }}
                    className="rounded-xl border border-white/10 bg-[#050d18] px-4 py-3 text-sm outline-none"
                  >
                    <option value="">
                      Choisir un utilisateur Supabase...
                    </option>

                    {availableUsers.map(
                      (user) => (
                        <option
                          key={user.userId}
                          value={user.userId}
                        >
                          {user.email ?? user.userId}
                        </option>
                      )
                    )}
                  </select>

                  <input
                    value={newDisplayName}
                    onChange={(event) =>
                      setNewDisplayName(
                        event.target.value
                      )
                    }
                    placeholder="Nom affiché"
                    className="rounded-xl border border-white/10 bg-[#050d18] px-4 py-3 text-sm outline-none placeholder:text-gray-600"
                  />

                  <select
                    value={newRole}
                    onChange={(event) =>
                      setNewRole(
                        event.target.value as StaffRole
                      )
                    }
                    className="rounded-xl border border-white/10 bg-[#050d18] px-4 py-3 text-sm outline-none"
                  >
                    <option value="admin">
                      Admin
                    </option>
                    <option value="staff">
                      Staff
                    </option>
                    <option value="viewer">
                      Viewer
                    </option>
                  </select>

                  <button
                    onClick={addStaffMember}
                    disabled={
                      addingUser ||
                      !selectedUserId
                    }
                    className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black disabled:opacity-40"
                  >
                    {addingUser ? (
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <UserPlus size={17} />
                    )}
                    Autoriser
                  </button>
                </div>

                <div className="border-t border-white/5 px-5 py-4 text-xs leading-5 text-gray-600">
                  Pour apparaître ici, la personne doit d'abord exister dans Supabase → Authentication → Users. Aucun mot de passe n'est visible ou stocké dans cette page.
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#091626] 2xl:col-span-12">
                <PanelHeader
                  title="MEMBRES AUTORISÉS"
                  right={`${staffMembers.length} compte${
                    staffMembers.length > 1
                      ? "s"
                      : ""
                  }`}
                />

                <div className="overflow-x-auto">
                  <div className="min-w-[1050px]">
                    <div className="grid grid-cols-[1.3fr_1.4fr_180px_150px_150px] border-b border-white/10 bg-[#071321] px-5 py-4 text-[9px] font-black uppercase tracking-wider text-gray-600">
                      <span>Nom affiché</span>
                      <span>E-mail</span>
                      <span>Rôle</span>
                      <span>État</span>
                      <span>Action</span>
                    </div>

                    {staffMembers.map(
                      (member) => {
                        const draft =
                          drafts[member.userId] ?? {
                            displayName:
                              member.displayName,
                            role: member.role,
                            isActive:
                              member.isActive,
                          };

                        const isSelf =
                          member.userId ===
                          currentUser?.id;

                        return (
                          <div
                            key={member.userId}
                            className="grid grid-cols-[1.3fr_1.4fr_180px_150px_150px] items-center gap-3 border-b border-white/5 px-5 py-4"
                          >
                            <input
                              value={draft.displayName}
                              onChange={(event) =>
                                updateDraft(
                                  member.userId,
                                  {
                                    displayName:
                                      event.target.value,
                                  }
                                )
                              }
                              className="rounded-lg border border-white/10 bg-[#050d18] px-3 py-2.5 text-sm outline-none"
                            />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-gray-300">
                                {member.email ?? "-"}
                              </p>

                              {isSelf && (
                                <p className="mt-1 text-[9px] font-black uppercase text-yellow-400">
                                  Votre compte
                                </p>
                              )}
                            </div>

                            <select
                              value={draft.role}
                              disabled={isSelf}
                              onChange={(event) =>
                                updateDraft(
                                  member.userId,
                                  {
                                    role: event.target.value as StaffRole,
                                  }
                                )
                              }
                              className="rounded-lg border border-white/10 bg-[#050d18] px-3 py-2.5 text-sm outline-none disabled:opacity-40"
                            >
                              <option value="admin">
                                Admin
                              </option>
                              <option value="staff">
                                Staff
                              </option>
                              <option value="viewer">
                                Viewer
                              </option>
                            </select>

                            <label className="flex items-center gap-3 text-sm font-bold text-gray-400">
                              <input
                                type="checkbox"
                                checked={draft.isActive}
                                disabled={isSelf}
                                onChange={(event) =>
                                  updateDraft(
                                    member.userId,
                                    {
                                      isActive:
                                        event.target.checked,
                                    }
                                  )
                                }
                                className="h-4 w-4 accent-yellow-400"
                              />
                              {draft.isActive
                                ? "Actif"
                                : "Bloqué"}
                            </label>

                            <button
                              onClick={() =>
                                saveMember(
                                  member.userId
                                )
                              }
                              disabled={
                                savingUserId ===
                                member.userId
                              }
                              className="flex items-center justify-center gap-2 rounded-lg border border-yellow-400/25 bg-yellow-400/[0.06] px-3 py-2.5 text-xs font-black text-yellow-400 disabled:opacity-40"
                            >
                              {savingUserId ===
                              member.userId ? (
                                <RefreshCw
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Save size={15} />
                              )}
                              Enregistrer
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </>
  );
}

function PermissionCard({
  title,
  subtitle,
  lines,
  active,
}: {
  title: string;
  subtitle: string;
  lines: string[];
  active: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        active
          ? "border-yellow-400/30 bg-yellow-400/[0.05]"
          : "border-white/10 bg-[#06111f]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-black">
            {title}
          </p>

          <p className="mt-1 text-[10px] text-gray-600">
            {subtitle}
          </p>
        </div>

        {active && (
          <CheckCircle2
            size={18}
            className="text-yellow-400"
          />
        )}
      </div>

      <div className="mt-5 space-y-3">
        {lines.map((line) => (
          <div
            key={line}
            className="flex gap-2 text-xs leading-5 text-gray-500"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400/70" />
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   COMPÉTITIONS
========================================================= */

function CompetitionsDashboard({
  competitions,
  seasons,
  selectedSeason,
  setSelectedSeason,
  matchAssignments,
  onOpenPlayer,
  onOpenMatch,
}: {
  competitions: Competition[];
  seasons: Season[];
  selectedSeason: string;
  setSelectedSeason: (value: string) => void;
  matchAssignments: MatchAssignment[];
  onOpenPlayer: (player: Player) => void;
  onOpenMatch: (matchId: number) => void;
}) {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(
    null
  );

  const [competitionHistory, setCompetitionHistory] =
    useState<HistoryResponse | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    if (
      competitions.length > 0 &&
      !competitions.some(
        (competition) => competition.id === selectedCompetitionId
      )
    ) {
      setSelectedCompetitionId(competitions[0].id);
    }
  }, [competitions, selectedCompetitionId]);

  useEffect(() => {
    if (selectedCompetitionId === null) {
      setCompetitionHistory(null);
      return;
    }

    let cancelled = false;

    async function loadCompetitionHistory() {
      try {
        setDetailLoading(true);
        setDetailError("");

        const params = new URLSearchParams();
        params.set("competitionId", String(selectedCompetitionId));

        if (selectedSeason !== "all") {
          params.set("seasonId", selectedSeason);
        }

        const response = await fetch(`/api/history?${params.toString()}`, {
          cache: "no-store",
        });

        const data: HistoryResponse & {
          error?: string;
          details?: string;
        } = await response.json();

        if (!response.ok) {
          throw new Error(
            data.details ??
              data.error ??
              "Impossible de charger cette compétition."
          );
        }

        if (!cancelled) {
          setCompetitionHistory(data);
        }
      } catch (err) {
        if (!cancelled) {
          setCompetitionHistory(null);
          setDetailError(
            err instanceof Error
              ? err.message
              : "Impossible de charger cette compétition."
          );
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void loadCompetitionHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedCompetitionId, selectedSeason]);

  const visibleMatches = useMemo(() => {
    if (selectedSeason === "all") {
      return matchAssignments;
    }

    return matchAssignments.filter(
      (match) => String(match.season_id ?? "") === selectedSeason
    );
  }, [matchAssignments, selectedSeason]);

  const competitionRows = useMemo(
    () =>
      competitions.map((competition) => {
        const competitionMatches = visibleMatches.filter(
          (match) => match.competition_id === competition.id
        );

        return {
          competition,
          stats: calculateCompetitionAssignmentStats(competitionMatches),
          matches: competitionMatches,
        };
      }),
    [competitions, visibleMatches]
  );

  const selectedCompetition = competitions.find(
    (competition) => competition.id === selectedCompetitionId
  );

  const selectedRow = competitionRows.find(
    (row) => row.competition.id === selectedCompetitionId
  );

  const selectedPlayers = competitionHistory?.players ?? [];
  const selectedMatches = competitionHistory?.matches ?? [];

  const minimumRatingGames = Math.max(
    1,
    Math.ceil((selectedRow?.stats.played ?? 0) * 0.25)
  );

  const qualifiedPlayers = selectedPlayers.filter(
    (player) => player.games >= minimumRatingGames
  );

  const bestRated =
    [...qualifiedPlayers].sort(
      (a, b) =>
        b.averageRating - a.averageRating || b.games - a.games
    )[0] ?? null;

  const topScorer =
    [...selectedPlayers].sort(
      (a, b) => b.goals - a.goals || b.assists - a.assists
    )[0] ?? null;

  const topAssister =
    [...selectedPlayers].sort(
      (a, b) => b.assists - a.assists || b.goals - a.goals
    )[0] ?? null;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
            GX NOVA
          </p>

          <h2 className="mt-2 text-3xl font-black">Compétitions</h2>

          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Compare les performances de GX NOVA compétition par compétition et
            ouvre le détail d&apos;un championnat pour retrouver ses matchs et
            ses meilleurs joueurs.
          </p>
        </div>

        <div className="min-w-[220px]">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-600">
            Saison
          </p>

          <select
            value={selectedSeason}
            onChange={(event) => setSelectedSeason(event.target.value)}
            className="w-full rounded-xl border border-yellow-400/20 bg-[#050d18] px-4 py-3 text-sm font-black text-white outline-none"
          >
            <option value="all">Toutes les saisons</option>

            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {competitionRows.map(({ competition, stats }) => {
          const active = competition.id === selectedCompetitionId;

          return (
            <button
              key={competition.id}
              onClick={() => setSelectedCompetitionId(competition.id)}
              className={`rounded-2xl border p-5 text-left transition ${
                active
                  ? "border-yellow-400/40 bg-yellow-400/[0.06]"
                  : "border-blue-400/15 bg-[#091626] hover:border-yellow-400/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                    {competition.competition_type === "friendly"
                      ? "Amicaux"
                      : "Compétition"}
                  </p>

                  <p className="mt-2 text-lg font-black">
                    {competition.short_name ?? competition.name}
                  </p>
                </div>

                <Trophy
                  size={20}
                  className={active ? "text-yellow-400" : "text-gray-700"}
                />
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2">
                <CompetitionMiniKpi label="MJ" value={stats.played} />
                <CompetitionMiniKpi label="V" value={stats.wins} />
                <CompetitionMiniKpi label="N" value={stats.draws} />
                <CompetitionMiniKpi label="D" value={stats.losses} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                <span className="text-xs text-gray-600">Taux victoire</span>

                <span className="font-black text-yellow-400">
                  {stats.winRate.toFixed(1)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <section className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-[#091626]">
        <PanelHeader
          title="COMPARATIF DES COMPÉTITIONS"
          right={
            selectedSeason === "all"
              ? "Toutes les saisons"
              : seasons.find((season) => String(season.id) === selectedSeason)
                  ?.name ?? "Saison"
          }
        />

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[230px_repeat(8,1fr)] border-b border-white/10 bg-[#071321] px-5 py-4 text-[9px] font-black uppercase tracking-wider text-gray-600">
              <span>Compétition</span>
              <span className="text-center">MJ</span>
              <span className="text-center">V</span>
              <span className="text-center">N</span>
              <span className="text-center">D</span>
              <span className="text-center">BP</span>
              <span className="text-center">BC</span>
              <span className="text-center">DB</span>
              <span className="text-center">% V</span>
            </div>

            {competitionRows.map(({ competition, stats }) => (
              <button
                key={competition.id}
                onClick={() => setSelectedCompetitionId(competition.id)}
                className={`grid w-full grid-cols-[230px_repeat(8,1fr)] items-center border-b border-white/5 px-5 py-4 text-left hover:bg-white/[0.03] ${
                  competition.id === selectedCompetitionId
                    ? "bg-yellow-400/[0.03]"
                    : ""
                }`}
              >
                <span className="font-black">
                  {competition.short_name ?? competition.name}
                </span>

                <CompetitionTableCell value={stats.played} />
                <CompetitionTableCell value={stats.wins} />
                <CompetitionTableCell value={stats.draws} />
                <CompetitionTableCell value={stats.losses} />
                <CompetitionTableCell value={stats.goalsFor} />
                <CompetitionTableCell value={stats.goalsAgainst} />
                <CompetitionTableCell
                  value={stats.goalDifference > 0 ? `+${stats.goalDifference}` : stats.goalDifference}
                  strong
                />
                <CompetitionTableCell
                  value={`${stats.winRate.toFixed(1)}%`}
                  strong
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedCompetition && (
        <div className="grid gap-5 2xl:grid-cols-12">
          <section className="rounded-2xl border border-yellow-400/25 bg-[#091626] 2xl:col-span-12">
            <div className="flex flex-col gap-4 border-b border-white/5 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                  Détail compétition
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  {selectedCompetition.name}
                </h3>
              </div>

              {selectedRow && (
                <div className="flex flex-wrap gap-2">
                  <CompetitionHeaderBadge
                    label="MJ"
                    value={selectedRow.stats.played}
                  />
                  <CompetitionHeaderBadge
                    label="V"
                    value={selectedRow.stats.wins}
                  />
                  <CompetitionHeaderBadge
                    label="N"
                    value={selectedRow.stats.draws}
                  />
                  <CompetitionHeaderBadge
                    label="D"
                    value={selectedRow.stats.losses}
                  />
                  <CompetitionHeaderBadge
                    label="DB"
                    value={
                      selectedRow.stats.goalDifference > 0
                        ? `+${selectedRow.stats.goalDifference}`
                        : selectedRow.stats.goalDifference
                    }
                  />
                </div>
              )}
            </div>

            {detailLoading && (
              <div className="p-10 text-center text-sm text-gray-500">
                Chargement des statistiques de la compétition...
              </div>
            )}

            {detailError && (
              <div className="m-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-400">
                {detailError}
              </div>
            )}
          </section>

          {!detailLoading && !detailError && selectedRow && selectedRow.stats.played > 0 && (
            <>
              <section className="rounded-2xl border border-blue-400/20 bg-[#091626] 2xl:col-span-5">
                <PanelHeader title="LEADERS" right={selectedCompetition.short_name ?? selectedCompetition.name} />

                <div className="divide-y divide-white/5">
                  <CompetitionLeader
                    label="Meilleur buteur"
                    player={topScorer}
                    value={topScorer ? `${topScorer.goals} buts` : "-"}
                    onOpenPlayer={onOpenPlayer}
                  />

                  <CompetitionLeader
                    label="Meilleur passeur"
                    player={topAssister}
                    value={topAssister ? `${topAssister.assists} PD` : "-"}
                    onOpenPlayer={onOpenPlayer}
                  />

                  <CompetitionLeader
                    label="Meilleure note"
                    player={bestRated}
                    value={bestRated ? bestRated.averageRating.toFixed(2) : "-"}
                    subtitle={`Minimum ${minimumRatingGames} match(s)`}
                    onOpenPlayer={onOpenPlayer}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-blue-400/20 bg-[#091626] 2xl:col-span-7">
                <PanelHeader title="DERNIERS MATCHS" right={`${selectedMatches.length} match(s)`} />

                <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {selectedMatches.slice(0, 6).map((match) => (
                    <button
                      key={match.id ?? match.matchId}
                      onClick={() => {
                        if (match.id) {
                          onOpenMatch(match.id);
                        }
                      }}
                      className={`rounded-xl border p-4 text-left transition ${getMatchCardStyle(
                        match.result
                      )}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black">{match.opponent}</p>
                          <p className="mt-1 text-[10px] text-gray-600">{formatDate(match.date)}</p>
                        </div>

                        <ResultBadge result={match.result} />
                      </div>

                      <p className="mt-5 text-2xl font-black">
                        {match.goalsFor} - {match.goalsAgainst}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#091626] 2xl:col-span-12">
                <PanelHeader title="JOUEURS DANS CETTE COMPÉTITION" right={`${selectedPlayers.length} joueur(s)`} />

                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-[220px_80px_90px_80px_80px_120px_100px] border-b border-white/10 bg-[#071321] px-5 py-4 text-[9px] font-black uppercase tracking-wider text-gray-600">
                      <span>Joueur</span>
                      <span className="text-center">MJ</span>
                      <span className="text-center">Note</span>
                      <span className="text-center">B</span>
                      <span className="text-center">PD</span>
                      <span className="text-center">Passes</span>
                      <span className="text-center">% Passes</span>
                    </div>

                    {[...selectedPlayers]
                      .sort(
                        (a, b) =>
                          b.averageRating - a.averageRating ||
                          b.games - a.games
                      )
                      .map((player) => (
                        <button
                          key={player.id}
                          onClick={() => onOpenPlayer(player)}
                          className="grid w-full grid-cols-[220px_80px_90px_80px_80px_120px_100px] items-center border-b border-white/5 px-5 py-4 text-left hover:bg-white/[0.03]"
                        >
                          <div className="flex items-center gap-3">
                            <PlayerAvatar player={player} />
                            <span className="truncate font-black">{formatPlayerName(player.name)}</span>
                          </div>

                          <CompetitionTableCell value={player.games} />

                          <div className="text-center">
                            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${getRatingStyle(player.averageRating)}`}>
                              {player.averageRating.toFixed(2)}
                            </span>
                          </div>

                          <CompetitionTableCell value={player.goals} />
                          <CompetitionTableCell value={player.assists} />
                          <CompetitionTableCell value={`${player.passesMade}/${player.passAttempts}`} />
                          <PercentageCell value={player.passSuccess} />
                        </button>
                      ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {!detailLoading && !detailError && selectedRow && selectedRow.stats.played === 0 && (
            <section className="rounded-2xl border border-dashed border-white/10 bg-[#091626] p-12 text-center 2xl:col-span-12">
              <Trophy size={40} className="mx-auto text-gray-700" />

              <p className="mt-4 font-black">Aucun match classé ici</p>

              <p className="mt-2 text-sm text-gray-600">
                Assigne des matchs à {selectedCompetition.short_name ?? selectedCompetition.name} depuis le Match Center.
              </p>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function CompetitionMiniKpi({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-white/5 p-2 text-center">
      <p className="text-sm font-black">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase text-gray-600">{label}</p>
    </div>
  );
}

function CompetitionHeaderBadge({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#06111f] px-4 py-2 text-center">
      <p className="text-[8px] font-black uppercase text-gray-600">{label}</p>
      <p className="mt-1 font-black text-yellow-400">{value}</p>
    </div>
  );
}

function CompetitionTableCell({
  value,
  strong = false,
}: {
  value: string | number;
  strong?: boolean;
}) {
  return (
    <span
      className={`text-center text-sm ${
        strong ? "font-black text-yellow-400" : "text-gray-400"
      }`}
    >
      {value}
    </span>
  );
}

function CompetitionLeader({
  label,
  player,
  value,
  subtitle,
  onOpenPlayer,
}: {
  label: string;
  player: Player | null;
  value: string | number;
  subtitle?: string;
  onOpenPlayer: (player: Player) => void;
}) {
  return (
    <button
      disabled={!player}
      onClick={() => {
        if (player) {
          onOpenPlayer(player);
        }
      }}
      className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-white/[0.03] disabled:cursor-default"
    >
      <div className="flex min-w-0 items-center gap-3">
        {player ? (
          <PlayerAvatar player={player} />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-gray-700">-</div>
        )}

        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-wider text-gray-600">{label}</p>
          <p className="mt-1 truncate font-black">{player ? formatPlayerName(player.name) : "Aucun joueur"}</p>
          {subtitle && <p className="mt-1 text-[10px] text-gray-600">{subtitle}</p>}
        </div>
      </div>

      <p className="shrink-0 text-lg font-black text-yellow-400">{value}</p>
    </button>
  );
}

function calculateCompetitionAssignmentStats(matches: MatchAssignment[]) {
  const played = matches.length;
  const wins = matches.filter((match) => match.result === "V").length;
  const draws = matches.filter((match) => match.result === "N").length;
  const losses = matches.filter((match) => match.result === "D").length;

  const goalsFor = matches.reduce(
    (total, match) => total + match.goals_for,
    0
  );

  const goalsAgainst = matches.reduce(
    (total, match) => total + match.goals_against,
    0
  );

  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    winRate: played > 0 ? (wins / played) * 100 : 0,
  };
}

/* =========================================================
   STATS
========================================================= */

function StatsDashboard({
  matches,
  allMatches,
  players,
  seasons,
  competitions,
  selectedSeason,
  selectedCompetition,
  currentFilterLabel,
  onOpenPlayer,
  onOpenMatch,
}: {
  matches: Match[];
  allMatches: Match[];
  players: Player[];
  seasons: Season[];
  competitions: Competition[];
  selectedSeason: string;
  selectedCompetition: string;
  currentFilterLabel: string;
  onOpenPlayer: (
    player: Player
  ) => void;
  onOpenMatch: (
    matchId: number
  ) => void;
}) {
  const [
    period,
    setPeriod,
  ] = useState<
    "all" | "5" | "10" | "20"
  >("all");

  const analysisMatches =
    useMemo(
      () =>
        period === "all"
          ? matches
          : matches.slice(
              0,
              Number(period)
            ),
      [
        matches,
        period,
      ]
    );

  const statistics =
    useMemo(
      () =>
        computeTeamStatistics(
          analysisMatches
        ),
      [
        analysisMatches,
      ]
    );

  const lastFiveStats =
    useMemo(
      () =>
        computeTeamStatistics(
          matches.slice(
            0,
            5
          )
        ),
      [
        matches,
      ]
    );

  const lastTenStats =
    useMemo(
      () =>
        computeTeamStatistics(
          matches.slice(
            0,
            10
          )
        ),
      [
        matches,
      ]
    );

  const previousFiveStats =
    useMemo(
      () =>
        computeTeamStatistics(
          matches.slice(
            5,
            10
          )
        ),
      [
        matches,
      ]
    );

  const streaks =
    useMemo(
      () =>
        computeTeamStreaks(
          matches
        ),
      [
        matches,
      ]
    );

  const competitionBreakdown =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            {
              id:
                number | null;
              name:
                string;
              matches:
                Match[];
            }
          >();

        for (
          const match
          of analysisMatches
        ) {
          const key =
            match.competitionId
              ? String(
                  match.competitionId
                )
              : "unassigned";

          const name =
            match.competitionId
              ? resolveCompetitionName(
                  competitions,
                  match.competitionId
                )
              : "Non attribué";

          if (
            !map.has(
              key
            )
          ) {
            map.set(
              key,
              {
                id:
                  match.competitionId ??
                  null,
                name,
                matches: [],
              }
            );
          }

          map.get(
            key
          )?.matches.push(
            match
          );
        }

        return Array.from(
          map.values()
        )
          .map(
            (group) => ({
              id:
                group.id,
              name:
                group.name,
              stats:
                computeTeamStatistics(
                  group.matches
                ),
            })
          )
          .sort(
            (a, b) =>
              b.stats.played -
              a.stats.played
          );
      },
      [
        analysisMatches,
        competitions,
      ]
    );

  const seasonBreakdown =
    useMemo(
      () => {
        let source =
          allMatches;

        if (
          selectedCompetition !==
          "all"
        ) {
          source =
            source.filter(
              (match) =>
                String(
                  match.competitionId ??
                    ""
                ) ===
                selectedCompetition
            );
        }

        if (
          selectedSeason !==
          "all"
        ) {
          source =
            source.filter(
              (match) =>
                String(
                  match.seasonId ??
                    ""
                ) ===
                selectedSeason
            );
        }

        const map =
          new Map<
            string,
            {
              id:
                number | null;
              name:
                string;
              matches:
                Match[];
            }
          >();

        for (
          const match
          of source
        ) {
          const key =
            match.seasonId
              ? String(
                  match.seasonId
                )
              : "unassigned";

          const name =
            match.seasonId
              ? resolveSeasonName(
                  seasons,
                  match.seasonId
                )
              : "Sans saison";

          if (
            !map.has(
              key
            )
          ) {
            map.set(
              key,
              {
                id:
                  match.seasonId ??
                  null,
                name,
                matches: [],
              }
            );
          }

          map.get(
            key
          )?.matches.push(
            match
          );
        }

        return Array.from(
          map.values()
        )
          .map(
            (group) => ({
              id:
                group.id,
              name:
                group.name,
              stats:
                computeTeamStatistics(
                  group.matches
                ),
            })
          )
          .sort(
            (a, b) =>
              b.stats.played -
              a.stats.played
          );
      },
      [
        allMatches,
        selectedCompetition,
        selectedSeason,
        seasons,
      ]
    );

  const playerLeaders =
    useMemo(
      () => {
        const minimumGames =
          Math.max(
            2,
            Math.ceil(
              matches.length *
                0.25
            )
          );

        const qualified =
          players.filter(
            (player) =>
              player.games >=
              minimumGames
          );

        const topScorer =
          [...players]
            .sort(
              (a, b) =>
                b.goals -
                  a.goals ||
                b.assists -
                  a.assists
            )[0] ??
          null;

        const topAssister =
          [...players]
            .sort(
              (a, b) =>
                b.assists -
                  a.assists ||
                b.goals -
                  a.goals
            )[0] ??
          null;

        const bestRating =
          [...qualified]
            .sort(
              (a, b) =>
                b.averageRating -
                  a.averageRating ||
                b.games -
                  a.games
            )[0] ??
          null;

        const bestGoalkeeper =
          players
            .map(
              (player) => ({
                player,
                stats:
                  getPlayerPositionStats(
                    player,
                    "goalkeeper"
                  ),
              })
            )
            .filter(
              (
                entry
              ): entry is {
                player:
                  Player;
                stats:
                  PlayerPositionStats;
              } =>
                Boolean(
                  entry.stats &&
                    entry.stats.games >
                      0
                )
            )
            .sort(
              (a, b) =>
                b.stats.saves -
                  a.stats.saves ||
                b.stats.averageRating -
                  a.stats.averageRating
            )[0] ??
          null;

        return {
          minimumGames,
          topScorer,
          topAssister,
          bestRating,
          bestGoalkeeper,
        };
      },
      [
        players,
        matches.length,
      ]
    );

  const periodLabel =
    period === "all"
      ? "Tous les matchs"
      : `${period} derniers matchs`;

  return (
    <>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

        <div>

          <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
            GX NOVA • STATISTIQUES 2.0
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Performance équipe
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Bilan collectif, forme, séries, comparaisons et évolution à partir des données EA réellement disponibles.
          </p>

          <p className="mt-2 text-xs font-bold text-cyan-300">
            {currentFilterLabel}
          </p>

        </div>

        <div className="rounded-2xl border border-white/10 bg-[#091626] p-3">

          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.15em] text-gray-600">
            Période du bilan
          </p>

          <div className="grid grid-cols-4 gap-2">

            {[
              [
                "all",
                "Tout",
              ],
              [
                "5",
                "5",
              ],
              [
                "10",
                "10",
              ],
              [
                "20",
                "20",
              ],
            ].map(
              ([
                value,
                label,
              ]) => (

                <button
                  key={
                    value
                  }
                  type="button"
                  onClick={() =>
                    setPeriod(
                      value as
                        | "all"
                        | "5"
                        | "10"
                        | "20"
                    )
                  }
                  className={`rounded-xl border px-4 py-2 text-xs font-black transition ${
                    period ===
                    value
                      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                      : "border-white/[0.07] bg-white/[0.02] text-gray-500 hover:text-white"
                  }`}
                >
                  {label}
                </button>

              )
            )}

          </div>

        </div>

      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">

        <StatsKpiCard
          label="Matchs"
          value={
            statistics.played
          }
          subtitle={periodLabel}
        />

        <StatsKpiCard
          label="Taux victoire"
          value={`${statistics.winRate.toFixed(
            1
          )}%`}
          subtitle={`${statistics.wins}V • ${statistics.draws}N • ${statistics.losses}D`}
          highlight
        />

        <StatsKpiCard
          label="Buts marqués"
          value={
            statistics.goalsFor
          }
          subtitle={`${statistics.averageGoalsFor.toFixed(
            2
          )} / match`}
        />

        <StatsKpiCard
          label="Buts encaissés"
          value={
            statistics.goalsAgainst
          }
          subtitle={`${statistics.averageGoalsAgainst.toFixed(
            2
          )} / match`}
        />

        <StatsKpiCard
          label="Diff. buts"
          value={
            statistics.goalDifference >
            0
              ? `+${statistics.goalDifference}`
              : statistics.goalDifference
          }
          subtitle={`${statistics.goalDifferencePerMatch >=
          0
            ? "+"
            : ""}${statistics.goalDifferencePerMatch.toFixed(
            2
          )} / match`}
        />

        <StatsKpiCard
          label="Clean sheets"
          value={
            statistics.cleanSheets
          }
          subtitle={`${statistics.cleanSheetRate.toFixed(
            1
          )}% des matchs`}
        />

      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <TeamStreakCard
          label="Série sans défaite"
          value={
            streaks.unbeaten
          }
          helper="depuis le dernier revers"
          tone="cyan"
        />

        <TeamStreakCard
          label="Victoires de suite"
          value={
            streaks.wins
          }
          helper="série actuelle"
          tone="green"
        />

        <TeamStreakCard
          label="Matchs avec but"
          value={
            streaks.scoring
          }
          helper="de suite"
          tone="yellow"
        />

        <TeamStreakCard
          label="Clean sheets"
          value={
            streaks.cleanSheets
          }
          helper="de suite"
          tone="blue"
        />

      </div>

      <div className="mb-5 grid gap-5 2xl:grid-cols-12">

        <section className="rounded-3xl border border-cyan-400/15 bg-[#091626] 2xl:col-span-7">

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-300">
                Évolution
              </p>

              <h3 className="mt-1 text-lg font-black">
                Buts marqués / encaissés
              </h3>

            </div>

            <span className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs font-black text-gray-500">
              {Math.min(
                analysisMatches.length,
                20
              )} derniers affichés
            </span>

          </div>

          <TeamEvolutionChart
            matches={
              analysisMatches
            }
          />

        </section>

        <section className="rounded-3xl border border-yellow-400/20 bg-[#091626] 2xl:col-span-5">

          <div className="border-b border-white/[0.07] px-5 py-4">

            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-yellow-300">
              Forme récente
            </p>

            <h3 className="mt-1 text-lg font-black">
              5 derniers vs 5 précédents
            </h3>

          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2">

            <TeamFormWindow
              label="5 derniers"
              stats={
                lastFiveStats
              }
              highlighted
            />

            <TeamFormWindow
              label="5 précédents"
              stats={
                previousFiveStats
              }
            />

          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-white/[0.07] p-5">

            <TeamStatMini
              label="Forme 5"
              value={`${lastFiveStats.winRate.toFixed(
                0
              )}%`}
            />

            <TeamStatMini
              label="Forme 10"
              value={`${lastTenStats.winRate.toFixed(
                0
              )}%`}
            />

            <TeamStatMini
              label="Écart"
              value={`${lastFiveStats.winRate -
              previousFiveStats.winRate >=
              0
                ? "+"
                : ""}${(
                lastFiveStats.winRate -
                previousFiveStats.winRate
              ).toFixed(
                0
              )} pts`}
            />

          </div>

        </section>

      </div>

      <div className="mb-5 grid gap-5 2xl:grid-cols-12">

        <section className="overflow-hidden rounded-3xl border border-blue-400/15 bg-[#091626] 2xl:col-span-7">

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-300">
                Comparatif
              </p>

              <h3 className="mt-1 text-lg font-black">
                Performances par compétition
              </h3>

            </div>

            <span className="text-xs font-black text-gray-600">
              {periodLabel}
            </span>

          </div>

          <TeamComparisonTable
            rows={
              competitionBreakdown
            }
            emptyLabel="Aucune compétition dans cette sélection."
          />

        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#091626] 2xl:col-span-5">

          <div className="border-b border-white/[0.07] px-5 py-4">

            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-yellow-300">
              Historique
            </p>

            <h3 className="mt-1 text-lg font-black">
              Performances par saison
            </h3>

            <p className="mt-1 text-[10px] font-semibold text-gray-600">
              Respecte le filtre compétition actif
            </p>

          </div>

          <TeamSeasonTable
            rows={
              seasonBreakdown
            }
          />

        </section>

      </div>

      <div className="mb-5 grid gap-5 2xl:grid-cols-12">

        <section className="rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.05] via-[#091626] to-[#091626] 2xl:col-span-5">

          <div className="border-b border-white/[0.07] px-5 py-4">

            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-yellow-300">
              Contributeurs
            </p>

            <h3 className="mt-1 text-lg font-black">
              Leaders joueurs
            </h3>

            <p className="mt-1 text-[10px] font-semibold text-gray-600">
              Saison / compétition actives • indépendamment du bouton de période
            </p>

          </div>

          <div className="divide-y divide-white/[0.05]">

            <StatLeader
              title="Meilleur buteur"
              player={
                playerLeaders.topScorer
              }
              value={
                playerLeaders.topScorer
                  ? `${playerLeaders.topScorer.goals} buts`
                  : "-"
              }
              onOpenPlayer={
                onOpenPlayer
              }
            />

            <StatLeader
              title="Meilleur passeur"
              player={
                playerLeaders.topAssister
              }
              value={
                playerLeaders.topAssister
                  ? `${playerLeaders.topAssister.assists} PD`
                  : "-"
              }
              onOpenPlayer={
                onOpenPlayer
              }
            />

            <StatLeader
              title="Meilleure note"
              player={
                playerLeaders.bestRating
              }
              value={
                playerLeaders.bestRating
                  ? playerLeaders.bestRating.averageRating.toFixed(
                      2
                    )
                  : "-"
              }
              subtitle={`Minimum ${playerLeaders.minimumGames} matchs`}
              onOpenPlayer={
                onOpenPlayer
              }
            />

            <StatLeader
              title="Gardien • arrêts"
              player={
                playerLeaders.bestGoalkeeper?.player ??
                null
              }
              value={
                playerLeaders.bestGoalkeeper
                  ? `${playerLeaders.bestGoalkeeper.stats.saves} arrêts`
                  : "-"
              }
              subtitle={
                playerLeaders.bestGoalkeeper
                  ? `${playerLeaders.bestGoalkeeper.stats.games} MJ • note ${playerLeaders.bestGoalkeeper.stats.averageRating.toFixed(
                      2
                    )}`
                  : undefined
              }
              onOpenPlayer={
                onOpenPlayer
              }
            />

          </div>

        </section>

        <section className="rounded-3xl border border-cyan-400/15 bg-[#091626] 2xl:col-span-7">

          <div className="border-b border-white/[0.07] px-5 py-4">

            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-300">
              Derniers matchs
            </p>

            <h3 className="mt-1 text-lg font-black">
              Forme détaillée
            </h3>

          </div>

          <div className="grid gap-2 p-4 md:grid-cols-2">

            {matches.slice(
              0,
              10
            ).map(
              (
                match,
                index
              ) => (

                <button
                  key={
                    match.id ??
                    match.matchId
                  }
                  type="button"
                  onClick={() => {
                    if (
                      match.id
                    ) {
                      onOpenMatch(
                        match.id
                      );
                    }
                  }}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-3 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.035]"
                >

                  <div className="flex min-w-0 items-center gap-3">

                    <span className="text-[10px] font-black text-gray-700">
                      {index + 1}
                    </span>

                    <ResultBadge
                      result={
                        match.result
                      }
                    />

                    <div className="min-w-0">

                      <p className="truncate text-sm font-black">
                        {match.opponent}
                      </p>

                      <p className="mt-1 text-[10px] font-bold text-gray-600">
                        {formatDate(
                          match.date
                        )}
                      </p>

                    </div>

                  </div>

                  <p className="text-lg font-black text-white">
                    {match.goalsFor}-{match.goalsAgainst}
                  </p>

                </button>

              )
            )}

          </div>

        </section>

      </div>

      <section className="rounded-3xl border border-white/10 bg-[#091626]">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">

          <div>

            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-gray-600">
              Synthèse
            </p>

            <h3 className="mt-1 text-lg font-black">
              Lecture du bilan collectif
            </h3>

          </div>

          <span className="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.05] px-3 py-2 text-xs font-black text-cyan-300">
            {periodLabel}
          </span>

        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">

          <TeamSummaryCard
            label="Efficacité"
            value={`${statistics.scoringRate.toFixed(
              0
            )}%`}
            helper="des matchs avec au moins un but marqué"
          />

          <TeamSummaryCard
            label="Solidité"
            value={`${statistics.cleanSheetRate.toFixed(
              0
            )}%`}
            helper="des matchs sans but encaissé"
          />

          <TeamSummaryCard
            label="Production"
            value={`${statistics.averageGoalsFor.toFixed(
              2
            )}`}
            helper="buts marqués par match"
          />

          <TeamSummaryCard
            label="Résistance"
            value={`${statistics.averageGoalsAgainst.toFixed(
              2
            )}`}
            helper="buts encaissés par match"
          />

        </div>

      </section>

    </>
  );
}

function computeTeamStatistics(
  matches: Match[]
) {
  const played =
    matches.length;

  const wins =
    matches.filter(
      (match) =>
        match.result ===
        "V"
    ).length;

  const draws =
    matches.filter(
      (match) =>
        match.result ===
        "N"
    ).length;

  const losses =
    matches.filter(
      (match) =>
        match.result ===
        "D"
    ).length;

  const goalsFor =
    matches.reduce(
      (
        total,
        match
      ) =>
        total +
        match.goalsFor,
      0
    );

  const goalsAgainst =
    matches.reduce(
      (
        total,
        match
      ) =>
        total +
        match.goalsAgainst,
      0
    );

  const cleanSheets =
    matches.filter(
      (match) =>
        match.goalsAgainst ===
        0
    ).length;

  const matchesScored =
    matches.filter(
      (match) =>
        match.goalsFor >
        0
    ).length;

  const goalDifference =
    goalsFor -
    goalsAgainst;

  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference,
    cleanSheets,

    winRate:
      played > 0
        ? (
            wins /
            played
          ) *
          100
        : 0,

    drawRate:
      played > 0
        ? (
            draws /
            played
          ) *
          100
        : 0,

    lossRate:
      played > 0
        ? (
            losses /
            played
          ) *
          100
        : 0,

    cleanSheetRate:
      played > 0
        ? (
            cleanSheets /
            played
          ) *
          100
        : 0,

    scoringRate:
      played > 0
        ? (
            matchesScored /
            played
          ) *
          100
        : 0,

    averageGoalsFor:
      played > 0
        ? goalsFor /
          played
        : 0,

    averageGoalsAgainst:
      played > 0
        ? goalsAgainst /
          played
        : 0,

    goalDifferencePerMatch:
      played > 0
        ? goalDifference /
          played
        : 0,
  };
}

function computeTeamStreaks(
  matches: Match[]
) {
  let unbeaten = 0;
  let wins = 0;
  let scoring = 0;
  let cleanSheets = 0;

  for (
    const match
    of matches
  ) {
    if (
      match.result !==
      "D"
    ) {
      unbeaten++;
    } else {
      break;
    }
  }

  for (
    const match
    of matches
  ) {
    if (
      match.result ===
      "V"
    ) {
      wins++;
    } else {
      break;
    }
  }

  for (
    const match
    of matches
  ) {
    if (
      match.goalsFor >
      0
    ) {
      scoring++;
    } else {
      break;
    }
  }

  for (
    const match
    of matches
  ) {
    if (
      match.goalsAgainst ===
      0
    ) {
      cleanSheets++;
    } else {
      break;
    }
  }

  return {
    unbeaten,
    wins,
    scoring,
    cleanSheets,
  };
}

function resolveCompetitionName(
  competitions: Competition[],
  competitionId: number
) {
  const competition =
    competitions.find(
      (item) =>
        item.id ===
        competitionId
    );

  return (
    competition?.short_name ??
    competition?.name ??
    `Compétition ${competitionId}`
  );
}

function resolveSeasonName(
  seasons: Season[],
  seasonId: number
) {
  return (
    seasons.find(
      (season) =>
        season.id ===
        seasonId
    )?.name ??
    `Saison ${seasonId}`
  );
}

function TeamStreakCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone:
    | "cyan"
    | "green"
    | "yellow"
    | "blue";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-300 border-emerald-400/15 bg-emerald-400/[0.04]"
      : tone === "yellow"
      ? "text-yellow-300 border-yellow-400/15 bg-yellow-400/[0.04]"
      : tone === "blue"
      ? "text-blue-300 border-blue-400/15 bg-blue-400/[0.04]"
      : "text-cyan-300 border-cyan-400/15 bg-cyan-400/[0.04]";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>

      <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-60">
        {label}
      </p>

      <div className="mt-2 flex items-end gap-2">

        <p className="text-3xl font-black">
          {value}
        </p>

        <p className="pb-1 text-xs font-black opacity-65">
          match{value > 1 ? "s" : ""}
        </p>

      </div>

      <p className="mt-1 text-[10px] font-bold text-gray-600">
        {helper}
      </p>

    </div>
  );
}

function TeamFormWindow({
  label,
  stats,
  highlighted = false,
}: {
  label: string;
  stats: ReturnType<
    typeof computeTeamStatistics
  >;
  highlighted?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${
      highlighted
        ? "border-yellow-400/20 bg-yellow-400/[0.045]"
        : "border-white/[0.07] bg-white/[0.018]"
    }`}>

      <div className="flex items-center justify-between gap-3">

        <p className="text-xs font-black text-white">
          {label}
        </p>

        <span className={`text-lg font-black ${
          highlighted
            ? "text-yellow-300"
            : "text-cyan-300"
        }`}>
          {stats.winRate.toFixed(
            0
          )}%
        </span>

      </div>

      <div className="mt-4 flex flex-wrap gap-2">

        <TeamFormBadge
          label="V"
          value={
            stats.wins
          }
          tone="green"
        />

        <TeamFormBadge
          label="N"
          value={
            stats.draws
          }
          tone="neutral"
        />

        <TeamFormBadge
          label="D"
          value={
            stats.losses
          }
          tone="red"
        />

      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">

        <TeamStatMini
          label="BP / match"
          value={stats.averageGoalsFor.toFixed(
            2
          )}
        />

        <TeamStatMini
          label="BC / match"
          value={stats.averageGoalsAgainst.toFixed(
            2
          )}
        />

      </div>

    </div>
  );
}

function TeamFormBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "green"
    | "red"
    | "neutral";
}) {
  const style =
    tone === "green"
      ? "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300"
      : tone === "red"
      ? "border-rose-400/15 bg-rose-400/[0.07] text-rose-300"
      : "border-white/[0.08] bg-white/[0.03] text-gray-400";

  return (
    <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black ${style}`}>
      {label} {value}
    </span>
  );
}

function TeamStatMini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3 text-center">

      <p className="text-[8px] font-black uppercase tracking-[0.12em] text-gray-700">
        {label}
      </p>

      <p className="mt-1 text-base font-black text-white">
        {value}
      </p>

    </div>
  );
}

function TeamEvolutionChart({
  matches,
}: {
  matches: Match[];
}) {
  const points =
    matches
      .slice(
        0,
        20
      )
      .reverse();

  if (
    points.length ===
    0
  ) {
    return (
      <div className="p-8 text-center text-sm font-bold text-gray-600">
        Aucun match à afficher.
      </div>
    );
  }

  const width = 900;
  const height = 280;
  const left = 42;
  const right = 28;
  const top = 28;
  const bottom = 48;
  const usableWidth =
    width -
    left -
    right;
  const usableHeight =
    height -
    top -
    bottom;

  const maxGoals =
    Math.max(
      3,
      ...points.map(
        (match) =>
          Math.max(
            match.goalsFor,
            match.goalsAgainst
          )
      )
    );

  const point =
    (
      value: number,
      index: number
    ) => {
      const x =
        points.length ===
        1
          ? left +
            usableWidth /
              2
          : left +
            (
              index /
              (
                points.length -
                1
              )
            ) *
              usableWidth;

      const y =
        top +
        (
          1 -
          value /
            maxGoals
        ) *
          usableHeight;

      return {
        x,
        y,
      };
    };

  const forLine =
    points
      .map(
        (
          match,
          index
        ) => {
          const item =
            point(
              match.goalsFor,
              index
            );

          return `${item.x},${item.y}`;
        }
      )
      .join(" ");

  const againstLine =
    points
      .map(
        (
          match,
          index
        ) => {
          const item =
            point(
              match.goalsAgainst,
              index
            );

          return `${item.x},${item.y}`;
        }
      )
      .join(" ");

  return (
    <div className="overflow-x-auto p-4">

      <div className="mb-2 flex flex-wrap gap-4 px-2 text-[10px] font-black uppercase tracking-[0.12em]">

        <span className="text-yellow-300">
          ● Buts marqués
        </span>

        <span className="text-cyan-300">
          ● Buts encaissés
        </span>

      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[285px] min-w-[760px] w-full"
        role="img"
        aria-label="Évolution des buts marqués et encaissés"
      >

        {Array.from(
          {
            length:
              maxGoals +
              1,
          },
          (
            _,
            value
          ) =>
            value
        ).map(
          (value) => {
            const y =
              point(
                value,
                0
              ).y;

            return (
              <g
                key={
                  value
                }
              >

                <line
                  x1={left}
                  x2={
                    width -
                    right
                  }
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />

                <text
                  x={
                    left -
                    10
                  }
                  y={
                    y +
                    4
                  }
                  fill="rgba(148,163,184,0.5)"
                  fontSize="10"
                  textAnchor="end"
                >
                  {value}
                </text>

              </g>
            );
          }
        )}

        {points.length >
          1 && (

          <>
            <polyline
              points={
                forLine
              }
              fill="none"
              stroke="rgb(250,204,21)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <polyline
              points={
                againstLine
              }
              fill="none"
              stroke="rgb(34,211,238)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.75"
            />
          </>

        )}

        {points.map(
          (
            match,
            index
          ) => {
            const forPoint =
              point(
                match.goalsFor,
                index
              );

            const againstPoint =
              point(
                match.goalsAgainst,
                index
              );

            return (
              <g
                key={
                  match.id ??
                  match.matchId
                }
              >

                <circle
                  cx={
                    forPoint.x
                  }
                  cy={
                    forPoint.y
                  }
                  r="5"
                  fill="rgb(250,204,21)"
                  stroke="#07111f"
                  strokeWidth="3"
                />

                <circle
                  cx={
                    againstPoint.x
                  }
                  cy={
                    againstPoint.y
                  }
                  r="4"
                  fill="rgb(34,211,238)"
                  stroke="#07111f"
                  strokeWidth="2"
                />

                <text
                  x={
                    forPoint.x
                  }
                  y={
                    height -
                    17
                  }
                  fill="rgba(148,163,184,0.6)"
                  fontSize="9"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {shortTeamOpponent(
                    match.opponent
                  )}
                </text>

              </g>
            );
          }
        )}

      </svg>

    </div>
  );
}

function TeamComparisonTable({
  rows,
  emptyLabel,
}: {
  rows: Array<{
    id:
      number | null;
    name:
      string;
    stats: ReturnType<
      typeof computeTeamStatistics
    >;
  }>;
  emptyLabel: string;
}) {
  if (
    rows.length ===
    0
  ) {
    return (
      <div className="p-8 text-center text-sm font-bold text-gray-600">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">

      <div className="min-w-[700px]">

        <div className="grid grid-cols-[1fr_70px_95px_85px_85px_85px_85px] border-b border-white/[0.07] bg-[#071321] px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-gray-600">

          <span>Compétition</span>
          <span className="text-center">MJ</span>
          <span className="text-center">V/N/D</span>
          <span className="text-center">% V</span>
          <span className="text-center">BP/M</span>
          <span className="text-center">BC/M</span>
          <span className="text-center">Diff</span>

        </div>

        {rows.map(
          (row) => (

            <div
              key={
                row.id ??
                row.name
              }
              className="grid grid-cols-[1fr_70px_95px_85px_85px_85px_85px] items-center border-b border-white/[0.045] px-4 py-3 text-xs"
            >

              <span className="truncate font-black text-white">
                {row.name}
              </span>

              <span className="text-center font-bold text-gray-400">
                {row.stats.played}
              </span>

              <span className="text-center font-black text-gray-300">
                {row.stats.wins}/{row.stats.draws}/{row.stats.losses}
              </span>

              <span className="text-center font-black text-yellow-300">
                {row.stats.winRate.toFixed(
                  0
                )}%
              </span>

              <span className="text-center font-bold text-gray-400">
                {row.stats.averageGoalsFor.toFixed(
                  2
                )}
              </span>

              <span className="text-center font-bold text-gray-400">
                {row.stats.averageGoalsAgainst.toFixed(
                  2
                )}
              </span>

              <span className={`text-center font-black ${
                row.stats.goalDifference >
                0
                  ? "text-emerald-300"
                  : row.stats.goalDifference <
                    0
                  ? "text-rose-300"
                  : "text-gray-400"
              }`}>
                {row.stats.goalDifference >
                0
                  ? "+"
                  : ""}
                {row.stats.goalDifference}
              </span>

            </div>

          )
        )}

      </div>

    </div>
  );
}

function TeamSeasonTable({
  rows,
}: {
  rows: Array<{
    id:
      number | null;
    name:
      string;
    stats: ReturnType<
      typeof computeTeamStatistics
    >;
  }>;
}) {
  if (
    rows.length ===
    0
  ) {
    return (
      <div className="p-8 text-center text-sm font-bold text-gray-600">
        Aucun historique de saison.
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/[0.05]">

      {rows.map(
        (row) => (

          <div
            key={
              row.id ??
              row.name
            }
            className="p-4"
          >

            <div className="flex items-center justify-between gap-3">

              <div className="min-w-0">

                <p className="truncate text-sm font-black text-white">
                  {row.name}
                </p>

                <p className="mt-1 text-[10px] font-bold text-gray-600">
                  {row.stats.played} matchs • {row.stats.wins}V {row.stats.draws}N {row.stats.losses}D
                </p>

              </div>

              <p className="text-xl font-black text-yellow-300">
                {row.stats.winRate.toFixed(
                  0
                )}%
              </p>

            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">

              <TeamStatMini
                label="BP/M"
                value={row.stats.averageGoalsFor.toFixed(
                  2
                )}
              />

              <TeamStatMini
                label="BC/M"
                value={row.stats.averageGoalsAgainst.toFixed(
                  2
                )}
              />

              <TeamStatMini
                label="Diff"
                value={`${row.stats.goalDifference >
                0
                  ? "+"
                  : ""}${row.stats.goalDifference}`}
              />

            </div>

          </div>

        )
      )}

    </div>
  );
}

function TeamSummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">

      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-600">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-white">
        {value}
      </p>

      <p className="mt-2 text-xs font-semibold text-gray-600">
        {helper}
      </p>

    </div>
  );
}

function shortTeamOpponent(
  value: string
) {
  const cleaned =
    value.trim();

  if (
    cleaned.length <=
    9
  ) {
    return cleaned;
  }

  return `${cleaned.slice(
    0,
    7
  )}…`;
}

/* =========================================================
   COMPOSANTS STATS
========================================================= */

function StatsKpiCard({
  label,
  value,
  subtitle,
  highlight = false,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight
          ? "border-yellow-400/30 bg-yellow-400/[0.06]"
          : "border-blue-400/15 bg-[#091626]"
      }`}
    >

      <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-black ${
          highlight
            ? "text-yellow-400"
            : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-gray-600">
        {subtitle}
      </p>

    </div>
  );
}

function ResultProgress({
  label,
  value,
  total,
  type,
}: {
  label: string;
  value: number;
  total: number;
  type:
    | "win"
    | "draw"
    | "loss";
}) {
  const percentage =
    total > 0
      ? (value /
          total) *
        100
      : 0;

  const style =
    type === "win"
      ? "bg-green-400"
      : type === "draw"
      ? "bg-yellow-400"
      : "bg-red-400";

  return (
    <div>

      <div className="mb-2 flex items-center justify-between">

        <span className="text-sm font-bold text-gray-400">
          {label}
        </span>

        <span className="text-sm font-black">

          {value}{" "}

          <span className="text-xs text-gray-600">
            (
            {
              percentage.toFixed(
                1
              )
            }
            %)
          </span>

        </span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/5">

        <div
          className={`h-full rounded-full ${style}`}
          style={{
            width:
              `${Math.min(
                100,
                percentage
              )}%`,
          }}
        />

      </div>

    </div>
  );
}

function StatLeader({
  title,
  player,
  value,
  subtitle,
  onOpenPlayer,
}: {
  title: string;

  player:
    Player | null;

  value:
    string | number;

  subtitle?:
    string;

  onOpenPlayer: (
    player: Player
  ) => void;
}) {
  return (
    <button
      onClick={() => {
        if (player) {
          onOpenPlayer(
            player
          );
        }
      }}
      disabled={
        !player
      }
      className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-white/[0.03]"
    >

      <div className="flex min-w-0 items-center gap-3">

        {player ? (

          <PlayerAvatar
            player={
              player
            }
          />

        ) : (

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
            -
          </div>

        )}

        <div className="min-w-0">

          <p className="text-[10px] font-black uppercase tracking-wider text-gray-600">
            {title}
          </p>

          <p className="mt-1 truncate font-black">

            {player
              ? formatPlayerName(
                  player.name
                )
              : "Aucun joueur"}

          </p>

          {subtitle && (

            <p className="mt-1 text-[10px] text-gray-600">
              {subtitle}
            </p>

          )}

        </div>

      </div>

      <p className="shrink-0 text-lg font-black text-yellow-400">
        {value}
      </p>

    </button>
  );
}

function SpecialistCard({
  label,
  player,
  value,
  subtitle,
  onOpenPlayer,
}: {
  label: string;

  player:
    Player | null;

  value:
    string | number;

  subtitle: string;

  onOpenPlayer: (
    player: Player
  ) => void;
}) {
  return (
    <button
      onClick={() => {
        if (player) {
          onOpenPlayer(
            player
          );
        }
      }}
      disabled={
        !player
      }
      className="rounded-2xl border border-white/10 bg-[#06111f] p-5 text-left transition hover:border-yellow-400/30"
    >

      <p className="text-[10px] font-black uppercase tracking-wider text-gray-600">
        {label}
      </p>

      <p className="mt-3 truncate text-sm font-black">

        {player
          ? formatPlayerName(
              player.name
            )
          : "Aucun joueur"}

      </p>

      <p className="mt-2 text-3xl font-black text-yellow-400">
        {value}
      </p>

      <p className="mt-2 text-[10px] text-gray-600">
        {subtitle}
      </p>

    </button>
  );
}

function MetricBox({
  label,
  value,
  max,
  suffix = "",
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
}) {
  const percentage =
    max > 0
      ? Math.min(
          100,
          (value /
            max) *
            100
        )
      : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#06111f] p-5">

      <div className="flex items-center justify-between">

        <p className="text-sm font-bold text-gray-400">
          {label}
        </p>

        <p className="font-black text-yellow-400">

          {
            value.toFixed(
              2
            )
          }
          {suffix}

        </p>

      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">

        <div
          className="h-full rounded-full bg-yellow-400"
          style={{
            width:
              `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}

/* =========================================================
   EFFECTIF
========================================================= */

function RosterManager({
  players,
  currentFilterLabel,
  onOpenPlayer,
}: {
  players: Player[];
  currentFilterLabel: string;
  onOpenPlayer: (player: Player) => void;
}) {
  const [search, setSearch] =
    useState("");

  const [
    positionFilter,
    setPositionFilter,
  ] = useState("all");

  const [sortBy, setSortBy] =
    useState("rating");

  const [
    compareLeftId,
    setCompareLeftId,
  ] = useState("");

  const [
    compareRightId,
    setCompareRightId,
  ] = useState("");

  const [
    comparePosition,
    setComparePosition,
  ] = useState("global");

  const [
    minimumRankingGames,
    setMinimumRankingGames,
  ] = useState(3);

  useEffect(() => {
    if (
      players.length > 0 &&
      !players.some(
        (player) =>
          player.id ===
          compareLeftId
      )
    ) {
      setCompareLeftId(
        players[0].id
      );
    }

    if (
      players.length > 1 &&
      !players.some(
        (player) =>
          player.id ===
          compareRightId
      )
    ) {
      setCompareRightId(
        players[1].id
      );
    }
  }, [
    players,
    compareLeftId,
    compareRightId,
  ]);

  const compareLeft =
    players.find(
      (player) =>
        player.id ===
        compareLeftId
    ) ?? null;

  const compareRight =
    players.find(
      (player) =>
        player.id ===
        compareRightId
    ) ?? null;

  const commonComparisonPositions =
    useMemo(() => {
      if (
        !compareLeft ||
        !compareRight
      ) {
        return [];
      }

      const positions = [
        "goalkeeper",
        "defender",
        "midfielder",
        "forward",
      ];

      return positions.filter(
        (position) =>
          Boolean(
            getPlayerPositionStats(
              compareLeft,
              position
            )
          ) &&
          Boolean(
            getPlayerPositionStats(
              compareRight,
              position
            )
          )
      );
    }, [
      compareLeft,
      compareRight,
    ]);

  useEffect(() => {
    if (
      comparePosition !==
        "global" &&
      !commonComparisonPositions.includes(
        comparePosition
      )
    ) {
      setComparePosition(
        commonComparisonPositions[0] ??
          "global"
      );
    }

    if (
      comparePosition ===
        "global" &&
      commonComparisonPositions.length >
        0
    ) {
      setComparePosition(
        commonComparisonPositions[0]
      );
    }
  }, [
    compareLeftId,
    compareRightId,
    commonComparisonPositions,
    comparePosition,
  ]);

  const filteredPlayers =
    useMemo(
      () => {
        let result =
          [...players];

        if (search.trim()) {
          const wanted =
            search
              .trim()
              .toLowerCase();

          result =
            result.filter(
              (player) =>
                formatPlayerName(
                  player.name
                )
                  .toLowerCase()
                  .includes(
                    wanted
                  )
            );
        }

        if (
          positionFilter !==
          "all"
        ) {
          result =
            result.filter(
              (player) =>
                Boolean(
                  getPlayerPositionStats(
                    player,
                    positionFilter
                  )
                )
            );
        }

        result.sort(
          (a, b) => {
            const aStats =
              getPlayerStatsForScope(
                a,
                positionFilter
              );

            const bStats =
              getPlayerStatsForScope(
                b,
                positionFilter
              );

            switch (sortBy) {
              case "games":
                return (
                  bStats.games -
                  aStats.games
                );

              case "goals":
                return (
                  bStats.goals -
                  aStats.goals
                );

              case "assists":
                return (
                  bStats.assists -
                  aStats.assists
                );

              case "passes":
                return (
                  bStats.passesMade -
                  aStats.passesMade
                );

              default:
                return (
                  bStats.averageRating -
                  aStats.averageRating
                );
            }
          }
        );

        return result;
      },
      [
        players,
        search,
        positionFilter,
        sortBy,
      ]
    );

  const countForPosition = (
    position: string
  ) =>
    players.filter(
      (player) =>
        Boolean(
          getPlayerPositionStats(
            player,
            position
          )
        )
    ).length;

  const leftComparisonStats =
    compareLeft
      ? getPlayerStatsForScope(
          compareLeft,
          comparePosition
        )
      : null;

  const rightComparisonStats =
    compareRight
      ? getPlayerStatsForScope(
          compareRight,
          comparePosition
        )
      : null;

  const ratingDifference =
    leftComparisonStats &&
    rightComparisonStats
      ? Math.abs(
          leftComparisonStats.averageRating -
            rightComparisonStats.averageRating
        )
      : 0;

  const comparisonLeader =
    leftComparisonStats &&
    rightComparisonStats
      ? leftComparisonStats.averageRating >
        rightComparisonStats.averageRating
        ? compareLeft
        : rightComparisonStats.averageRating >
          leftComparisonStats.averageRating
        ? compareRight
        : null
      : null;

  const roleRankings =
    useMemo(() => {
      const roles = [
        "goalkeeper",
        "defender",
        "midfielder",
        "forward",
      ];

      return Object.fromEntries(
        roles.map((position) => {
          const ranking =
            players
              .map((player) => {
                const stats =
                  getPlayerPositionStats(
                    player,
                    position
                  );

                return stats
                  ? {
                      player,
                      stats,
                    }
                  : null;
              })
              .filter(
                (
                  entry
                ): entry is {
                  player: Player;
                  stats: PlayerPositionStats;
                } =>
                  Boolean(
                    entry &&
                      entry.stats.games >=
                        minimumRankingGames
                  )
              )
              .sort((a, b) => {
                if (
                  b.stats.averageRating !==
                  a.stats.averageRating
                ) {
                  return (
                    b.stats.averageRating -
                    a.stats.averageRating
                  );
                }

                if (
                  b.stats.games !==
                  a.stats.games
                ) {
                  return (
                    b.stats.games -
                    a.stats.games
                  );
                }

                return (
                  b.stats.goals +
                  b.stats.assists -
                  (a.stats.goals +
                    a.stats.assists)
                );
              })
              .slice(0, 5);

          return [
            position,
            ranking,
          ];
        })
      ) as Record<
        string,
        Array<{
          player: Player;
          stats: PlayerPositionStats;
        }>
      >;
    }, [
      players,
      minimumRankingGames,
    ]);

  const versatilityRanking =
    useMemo(
      () =>
        players
          .map(
            (player) => {
              const eligiblePositions =
                (
                  player.positionStats ??
                  []
                )
                  .filter(
                    (stats) =>
                      stats.games >=
                      minimumRankingGames
                  )
                  .sort(
                    (a, b) =>
                      b.games -
                      a.games
                  );

              if (
                eligiblePositions.length <
                2
              ) {
                return null;
              }

              const averageRating =
                eligiblePositions.reduce(
                  (
                    total,
                    stats
                  ) =>
                    total +
                    stats.averageRating,
                  0
                ) /
                eligiblePositions.length;

              return {
                player,
                positions:
                  eligiblePositions,
                averageRating,
                totalGames:
                  eligiblePositions.reduce(
                    (
                      total,
                      stats
                    ) =>
                      total +
                      stats.games,
                    0
                  ),
              };
            }
          )
          .filter(
            (
              entry
            ): entry is {
              player: Player;
              positions: PlayerPositionStats[];
              averageRating: number;
              totalGames: number;
            } =>
              Boolean(entry)
          )
          .sort(
            (a, b) => {
              if (
                b.positions.length !==
                a.positions.length
              ) {
                return (
                  b.positions.length -
                  a.positions.length
                );
              }

              if (
                b.averageRating !==
                a.averageRating
              ) {
                return (
                  b.averageRating -
                  a.averageRating
                );
              }

              return (
                b.totalGames -
                a.totalGames
              );
            }
          )
          .slice(0, 5),
      [
        players,
        minimumRankingGames,
      ]
    );

  return (
    <>

      <div className="mb-6">

        <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
          GX NOVA • JOUEURS 2.0
        </p>

        <h2 className="mt-2 text-3xl font-black">
          Effectif & comparaison
        </h2>

        <p className="mt-2 max-w-3xl text-sm text-gray-500">

          Les notes sont maintenant séparées selon le poste réellement joué à chaque match.
          Un même joueur peut donc avoir une moyenne différente comme gardien, défenseur,
          milieu ou attaquant.

        </p>

      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-5">

        <SmallStatCard
          title="Joueurs"
          value={players.length}
          subtitle="Détectés"
        />

        <SmallStatCard
          title="Gardiens"
          value={countForPosition(
            "goalkeeper"
          )}
          subtitle="Au moins 1 match"
        />

        <SmallStatCard
          title="Défenseurs"
          value={countForPosition(
            "defender"
          )}
          subtitle="Au moins 1 match"
        />

        <SmallStatCard
          title="Milieux"
          value={countForPosition(
            "midfielder"
          )}
          subtitle="Au moins 1 match"
        />

        <SmallStatCard
          title="Attaquants"
          value={countForPosition(
            "forward"
          )}
          subtitle="Au moins 1 match"
        />

      </div>

      <section className="mb-5 overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.05] via-[#091626] to-cyan-400/[0.025]">

        <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">
              Classement interne GX NOVA
            </p>

            <h3 className="mt-1 text-xl font-black">
              Les meilleurs par poste
            </h3>

            <p className="mt-1 max-w-3xl text-xs font-semibold text-gray-500">
              Classement basé sur la note EA moyenne uniquement au poste concerné.
              Le nombre minimum de matchs évite qu&apos;une seule apparition suffise pour prendre la première place.
            </p>

          </div>

          <div className="flex items-center gap-3">

            <label className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">
              Minimum
            </label>

            <select
              value={minimumRankingGames}
              onChange={(event) =>
                setMinimumRankingGames(
                  Number(
                    event.target.value
                  )
                )
              }
              className="rounded-xl border border-yellow-400/20 bg-[#050d18] px-4 py-2.5 text-sm font-black text-yellow-300 outline-none"
            >
              <option value={1}>
                1 match
              </option>
              <option value={3}>
                3 matchs
              </option>
              <option value={5}>
                5 matchs
              </option>
              <option value={10}>
                10 matchs
              </option>
            </select>

          </div>

        </div>

        <div className="grid gap-4 p-5 xl:grid-cols-2 2xl:grid-cols-4">

          <RoleRankingCard
            title="Gardien"
            position="goalkeeper"
            entries={
              roleRankings.goalkeeper ??
              []
            }
            minimumGames={
              minimumRankingGames
            }
            onOpenPlayer={
              onOpenPlayer
            }
          />

          <RoleRankingCard
            title="Défenseur"
            position="defender"
            entries={
              roleRankings.defender ??
              []
            }
            minimumGames={
              minimumRankingGames
            }
            onOpenPlayer={
              onOpenPlayer
            }
          />

          <RoleRankingCard
            title="Milieu"
            position="midfielder"
            entries={
              roleRankings.midfielder ??
              []
            }
            minimumGames={
              minimumRankingGames
            }
            onOpenPlayer={
              onOpenPlayer
            }
          />

          <RoleRankingCard
            title="Attaquant"
            position="forward"
            entries={
              roleRankings.forward ??
              []
            }
            minimumGames={
              minimumRankingGames
            }
            onOpenPlayer={
              onOpenPlayer
            }
          />

        </div>

        <div className="border-t border-white/[0.07] p-5">

          <div className="mb-4">

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
              Polyvalence
            </p>

            <h4 className="mt-1 text-lg font-black">
              Joueurs performants à plusieurs postes
            </h4>

            <p className="mt-1 text-xs font-semibold text-gray-500">
              Un joueur apparaît ici s&apos;il atteint le minimum de matchs sur au moins deux postes.
              La moyenne affichée est simplement la moyenne de ses notes EA par poste, pas une nouvelle note calculée par le site.
            </p>

          </div>

          {versatilityRanking.length >
          0 ? (

            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">

              {versatilityRanking.map(
                (
                  entry,
                  index
                ) => (

                  <button
                    key={
                      entry.player.id
                    }
                    type="button"
                    onClick={() =>
                      onOpenPlayer(
                        entry.player
                      )
                    }
                    className="rounded-2xl border border-white/[0.07] bg-black/10 p-4 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.035]"
                  >

                    <div className="flex items-center justify-between gap-3">

                      <span className="text-xs font-black text-gray-600">
                        #{index + 1}
                      </span>

                      <span className="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.07] px-2 py-1 text-xs font-black text-cyan-300">
                        {entry.positions.length} postes
                      </span>

                    </div>

                    <p className="mt-3 truncate text-base font-black text-white">
                      {formatPlayerName(
                        entry.player.name
                      )}
                    </p>

                    <p className="mt-2 text-2xl font-black text-yellow-300">
                      {entry.averageRating.toFixed(
                        2
                      )}
                    </p>

                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-600">
                      moyenne multi-postes
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">

                      {entry.positions.map(
                        (stats) => (

                          <span
                            key={
                              stats.position
                            }
                            className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[9px] font-black text-gray-400"
                          >
                            {formatPosition(
                              stats.position
                            )} {stats.games} MJ • {stats.averageRating.toFixed(
                              2
                            )}
                          </span>

                        )
                      )}

                    </div>

                  </button>

                )
              )}

            </div>

          ) : (

            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm font-bold text-gray-600">
              Aucun joueur n&apos;atteint encore {minimumRankingGames} match{minimumRankingGames > 1 ? "s" : ""} sur au moins deux postes.
            </div>

          )}

        </div>

      </section>

      <section className="mb-5 overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.045] via-[#091626] to-yellow-400/[0.025]">

        <div className="border-b border-white/[0.07] p-5">

          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
            Comparateur par poste
          </p>

          <h3 className="mt-1 text-xl font-black">
            Comparer deux joueurs sur le même rôle
          </h3>

          <p className="mt-1 text-xs font-semibold text-gray-500">
            Pour une comparaison équitable, la note utilisée correspond uniquement aux matchs joués au poste sélectionné.
          </p>

        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_220px_1fr] lg:items-end">

          <div>

            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-gray-600">
              Joueur A
            </label>

            <select
              value={compareLeftId}
              onChange={(event) =>
                setCompareLeftId(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-white/10 bg-[#050d18] px-4 py-3 text-sm font-bold text-white outline-none"
            >

              {players.map(
                (player) => (

                  <option
                    key={player.id}
                    value={player.id}
                  >
                    {formatPlayerName(
                      player.name
                    )}
                  </option>

                )
              )}

            </select>

          </div>

          <div>

            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-gray-600">
              Poste comparé
            </label>

            <select
              value={comparePosition}
              onChange={(event) =>
                setComparePosition(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-yellow-400/20 bg-[#050d18] px-4 py-3 text-sm font-black text-yellow-300 outline-none"
            >

              {commonComparisonPositions.map(
                (position) => (

                  <option
                    key={position}
                    value={position}
                  >
                    {formatPositionLong(
                      position
                    )}
                  </option>

                )
              )}

              <option value="global">
                Global (indicatif)
              </option>

            </select>

          </div>

          <div>

            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-gray-600">
              Joueur B
            </label>

            <select
              value={compareRightId}
              onChange={(event) =>
                setCompareRightId(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-white/10 bg-[#050d18] px-4 py-3 text-sm font-bold text-white outline-none"
            >

              {players.map(
                (player) => (

                  <option
                    key={player.id}
                    value={player.id}
                  >
                    {formatPlayerName(
                      player.name
                    )}
                  </option>

                )
              )}

            </select>

          </div>

        </div>

        {compareLeft &&
        compareRight &&
        leftComparisonStats &&
        rightComparisonStats ? (

          <div className="grid gap-4 border-t border-white/[0.07] p-5 lg:grid-cols-[1fr_180px_1fr] lg:items-stretch">

            <ComparisonPlayerCard
              player={compareLeft}
              stats={leftComparisonStats}
              side="left"
            />

            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-black/10 p-4 text-center">

              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-600">
                Écart de note
              </p>

              <p className="mt-2 text-3xl font-black text-yellow-300">
                {ratingDifference.toFixed(
                  2
                )}
              </p>

              <p className="mt-2 text-xs font-bold text-gray-500">
                {comparisonLeader
                  ? `${formatPlayerName(
                      comparisonLeader.name
                    )} devant`
                  : "Égalité"}
              </p>

            </div>

            <ComparisonPlayerCard
              player={compareRight}
              stats={rightComparisonStats}
              side="right"
            />

          </div>

        ) : null}

        {comparePosition ===
          "global" && (

          <div className="border-t border-orange-400/10 bg-orange-400/[0.035] px-5 py-3 text-xs font-semibold text-orange-200/80">
            La vue globale mélange les postes joués. Elle reste informative, mais ne doit pas servir seule pour classer deux joueurs ayant des rôles différents.
          </div>

        )}

        {commonComparisonPositions.length ===
          0 &&
          compareLeft &&
          compareRight && (

          <div className="border-t border-yellow-400/10 bg-yellow-400/[0.035] px-5 py-3 text-xs font-semibold text-yellow-200/80">
            Ces deux joueurs n&apos;ont aucun poste en commun dans les matchs enregistrés. La comparaison par note de poste n&apos;est donc pas pertinente.
          </div>

        )}

      </section>

      <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-[#091626] p-4 lg:grid-cols-[1fr_220px_220px]">

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#050d18] px-4">

          <Search
            size={17}
            className="text-gray-500"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Rechercher un joueur..."
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-600"
          />

        </div>

        <select
          value={positionFilter}
          onChange={(event) =>
            setPositionFilter(
              event.target.value
            )
          }
          className="rounded-xl border border-white/10 bg-[#050d18] px-4 py-3 text-sm text-white outline-none"
        >

          <option value="all">
            Tous les postes
          </option>

          <option value="goalkeeper">
            Gardiens
          </option>

          <option value="defender">
            Défenseurs
          </option>

          <option value="midfielder">
            Milieux
          </option>

          <option value="forward">
            Attaquants
          </option>

        </select>

        <select
          value={sortBy}
          onChange={(event) =>
            setSortBy(
              event.target.value
            )
          }
          className="rounded-xl border border-white/10 bg-[#050d18] px-4 py-3 text-sm text-white outline-none"
        >

          <option value="rating">
            Trier : Note
          </option>

          <option value="games">
            Trier : Matchs
          </option>

          <option value="goals">
            Trier : Buts
          </option>

          <option value="assists">
            Trier : Passes décisives
          </option>

          <option value="passes">
            Trier : Passes réussies
          </option>

        </select>

      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">

        <p className="text-xs font-semibold text-gray-600">
          {currentFilterLabel}
        </p>

        <p className="text-xs font-black text-cyan-300">
          {positionFilter ===
          "all"
            ? "NOTE GLOBALE"
            : `NOTE ${formatPosition(
                positionFilter
              )} UNIQUEMENT`}
        </p>

      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#091626]">

        <div className="overflow-x-auto">

          <div className="min-w-[1180px]">

            <div className="grid grid-cols-[55px_210px_70px_75px_70px_70px_75px_105px_90px_105px_90px_70px_70px] border-b border-white/10 bg-[#071321] px-5 py-4 text-[9px] font-black uppercase tracking-wider text-gray-600">

              <span>#</span>
              <span>Joueur</span>

              <span className="text-center">
                MJ
              </span>

              <span className="text-center">
                Note
              </span>

              <span className="text-center">
                B
              </span>

              <span className="text-center">
                PD
              </span>

              <span className="text-center">
                Tirs
              </span>

              <span className="text-center">
                Passes
              </span>

              <span className="text-center">
                % Passes
              </span>

              <span className="text-center">
                Tacles
              </span>

              <span className="text-center">
                % Tacles
              </span>

              <span className="text-center">
                Arrêts
              </span>

              <span className="text-center">
                CR
              </span>

            </div>

            {filteredPlayers.length >
            0 ? (

              filteredPlayers.map(
                (
                  player,
                  index
                ) => {
                  const displayStats =
                    getPlayerStatsForScope(
                      player,
                      positionFilter
                    );

                  return (

                    <button
                      key={player.id}
                      onClick={() =>
                        onOpenPlayer(
                          player
                        )
                      }
                      className="grid w-full grid-cols-[55px_210px_70px_75px_70px_70px_75px_105px_90px_105px_90px_70px_70px] items-center border-b border-white/5 px-5 py-4 text-left transition hover:bg-white/[0.03]"
                    >

                      <span className="text-sm font-black text-gray-600">
                        {index + 1}
                      </span>

                      <div className="flex items-center gap-3">

                        <PlayerAvatar
                          player={player}
                        />

                        <div className="min-w-0">

                          <p className="truncate text-sm font-black">
                            {formatPlayerName(
                              player.name
                            )}
                          </p>

                          <p className="mt-1 text-[9px] font-bold uppercase text-gray-600">
                            {positionFilter ===
                            "all"
                              ? `${formatPosition(
                                  player.position
                                )} • ${formatPlayerRoleSummary(
                                  player
                                )}`
                              : `${formatPosition(
                                  positionFilter
                                )} • ${displayStats.games} match${
                                  displayStats.games >
                                  1
                                    ? "s"
                                    : ""
                                }`}
                          </p>

                        </div>

                      </div>

                      <StatCell
                        value={displayStats.games}
                      />

                      <div className="text-center">

                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${getRatingStyle(
                            displayStats.averageRating
                          )}`}
                        >
                          {displayStats.averageRating.toFixed(
                            2
                          )}
                        </span>

                      </div>

                      <StatCell
                        value={displayStats.goals}
                        strong
                      />

                      <StatCell
                        value={displayStats.assists}
                        strong
                      />

                      <StatCell
                        value={displayStats.shots}
                      />

                      <StatCell
                        value={`${displayStats.passesMade}/${displayStats.passAttempts}`}
                      />

                      <PercentageCell
                        value={displayStats.passSuccess}
                      />

                      <StatCell
                        value={`${displayStats.tacklesMade}/${displayStats.tackleAttempts}`}
                      />

                      <PercentageCell
                        value={displayStats.tackleSuccess}
                      />

                      <StatCell
                        value={displayStats.saves}
                      />

                      <StatCell
                        value={displayStats.redCards}
                      />

                    </button>

                  );
                }
              )

            ) : (

              <div className="py-16 text-center">

                <Users
                  size={40}
                  className="mx-auto text-gray-700"
                />

                <p className="mt-4 text-sm font-bold text-gray-500">
                  Aucun joueur trouvé.
                </p>

              </div>

            )}

          </div>

        </div>

      </div>

    </>
  );
}

function RoleRankingCard({
  title,
  position,
  entries,
  minimumGames,
  onOpenPlayer,
}: {
  title: string;
  position: string;
  entries: Array<{
    player: Player;
    stats: PlayerPositionStats;
  }>;
  minimumGames: number;
  onOpenPlayer: (player: Player) => void;
}) {
  function extraStats(
    stats: PlayerPositionStats
  ) {
    if (
      position ===
      "goalkeeper"
    ) {
      return `${stats.saves} arrêts • ${stats.saves && stats.games ? (stats.saves / stats.games).toFixed(1) : "0.0"}/match`;
    }

    if (
      position ===
      "defender"
    ) {
      return `${stats.tackleSuccess.toFixed(0)}% tacles • ${stats.passSuccess.toFixed(0)}% passes`;
    }

    if (
      position ===
      "midfielder"
    ) {
      return `${stats.assists} PD • ${stats.passSuccess.toFixed(0)}% passes`;
    }

    return `${stats.goals} buts • ${stats.assists} PD`;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#071321]">

      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">

        <div>

          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-600">
            TOP 5
          </p>

          <h4 className="mt-1 text-base font-black text-white">
            {title}
          </h4>

        </div>

        <Trophy
          size={20}
          className="text-yellow-300"
        />

      </div>

      <div className="p-2">

        {entries.length >
        0 ? (

          entries.map(
            (
              entry,
              index
            ) => (

              <button
                key={
                  entry.player.id
                }
                type="button"
                onClick={() =>
                  onOpenPlayer(
                    entry.player
                  )
                }
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04] ${
                  index === 0
                    ? "border border-yellow-400/15 bg-yellow-400/[0.045]"
                    : ""
                }`}
              >

                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                    index === 0
                      ? "bg-yellow-400 text-black"
                      : index === 1
                      ? "bg-slate-300/15 text-slate-300"
                      : index === 2
                      ? "bg-orange-400/10 text-orange-300"
                      : "bg-white/[0.04] text-gray-600"
                  }`}
                >
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">

                  <p className="truncate text-sm font-black text-white">
                    {formatPlayerName(
                      entry.player.name
                    )}
                  </p>

                  <p className="mt-1 truncate text-[9px] font-bold text-gray-600">
                    {entry.stats.games} MJ • {extraStats(
                      entry.stats
                    )}
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-lg font-black text-yellow-300">
                    {entry.stats.averageRating.toFixed(
                      2
                    )}
                  </p>

                  <p className="text-[8px] font-black uppercase text-gray-700">
                    note
                  </p>

                </div>

              </button>

            )
          )

        ) : (

          <div className="p-6 text-center">

            <Medal
              size={24}
              className="mx-auto text-gray-700"
            />

            <p className="mt-3 text-xs font-bold text-gray-600">
              Aucun joueur avec {minimumGames} match{minimumGames > 1 ? "s" : ""} minimum.
            </p>

          </div>

        )}

      </div>

    </div>
  );
}

function ComparisonPlayerCard({
  player,
  stats,
  side,
}: {
  player: Player;
  stats:
    | Player
    | PlayerPositionStats;
  side: "left" | "right";
}) {
  return (
    <div className={`rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 ${
      side === "right"
        ? "lg:text-right"
        : ""
    }`}>

      <div className={`flex items-center gap-3 ${
        side === "right"
          ? "lg:flex-row-reverse"
          : ""
      }`}>

        <PlayerAvatar
          player={player}
        />

        <div className="min-w-0">

          <p className="truncate text-lg font-black text-white">
            {formatPlayerName(
              player.name
            )}
          </p>

          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-gray-600">
            {stats.games} match{stats.games > 1 ? "s" : ""}
          </p>

        </div>

      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">

        <ComparisonMiniStat
          label="Note"
          value={stats.averageRating.toFixed(
            2
          )}
          highlight
        />

        <ComparisonMiniStat
          label="Buts"
          value={stats.goals}
        />

        <ComparisonMiniStat
          label="PD"
          value={stats.assists}
        />

        <ComparisonMiniStat
          label="% passes"
          value={`${stats.passSuccess.toFixed(
            0
          )}%`}
        />

        <ComparisonMiniStat
          label="% tacles"
          value={`${stats.tackleSuccess.toFixed(
            0
          )}%`}
        />

        <ComparisonMiniStat
          label="Arrêts"
          value={stats.saves}
        />

      </div>

    </div>
  );
}

function ComparisonMiniStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3 text-center">

      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-600">
        {label}
      </p>

      <p className={`mt-1 text-lg font-black ${
        highlight
          ? "text-yellow-300"
          : "text-white"
      }`}>
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   FICHE JOUEUR
========================================================= */

function PlayerDetailModal({
  player,
  currentFilterLabel,
  seasonId,
  competitionId,
  onClose,
}: {
  player: Player;
  currentFilterLabel: string;
  seasonId: string;
  competitionId: string;
  onClose: () => void;
}) {
  const [
    selectedPosition,
    setSelectedPosition,
  ] = useState("global");

  const [
    history,
    setHistory,
  ] = useState<PlayerMatchHistoryItem[]>(
    []
  );

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(true);

  const [
    historyError,
    setHistoryError,
  ] = useState("");

  const availablePositions =
    player.positionStats
      .filter(
        (stats) =>
          stats.games > 0
      )
      .sort(
        (a, b) =>
          b.games -
          a.games
      );

  const displayedStats =
    getPlayerStatsForScope(
      player,
      selectedPosition
    );

  useEffect(() => {
    let cancelled = false;

    async function loadPlayerHistory() {
      try {
        setHistoryLoading(true);
        setHistoryError("");

        const params =
          new URLSearchParams();

        params.set(
          "playerId",
          player.id
        );

        params.set(
          "playerName",
          player.name
        );

        if (
          seasonId !==
          "all"
        ) {
          params.set(
            "seasonId",
            seasonId
          );
        }

        if (
          competitionId !==
          "all"
        ) {
          params.set(
            "competitionId",
            competitionId
          );
        }

        const response =
          await fetch(
            `/api/player-history?${params.toString()}`,
            {
              cache:
                "no-store",
            }
          );

        const data =
          (await response.json()) as PlayerHistoryResponse & {
            error?: string;
            details?: string;
          };

        if (!response.ok) {
          throw new Error(
            data.details ??
              data.error ??
              "Impossible de charger l'historique du joueur."
          );
        }

        if (!cancelled) {
          setHistory(
            data.performances ??
              []
          );
        }
      } catch (err) {
        if (!cancelled) {
          setHistoryError(
            err instanceof Error
              ? err.message
              : "Impossible de charger l'historique du joueur."
          );
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(
            false
          );
        }
      }
    }

    void loadPlayerHistory();

    return () => {
      cancelled = true;
    };
  }, [
    player.id,
    player.name,
    seasonId,
    competitionId,
  ]);

  const filteredHistory =
    useMemo(
      () =>
        selectedPosition ===
        "global"
          ? history
          : history.filter(
              (performance) =>
                performance.position ===
                selectedPosition
            ),
      [
        history,
        selectedPosition,
      ]
    );

  const historySummary =
    useMemo(
      () => {
        const rated =
          filteredHistory.filter(
            (performance) =>
              performance.rating >
              0
          );

        const average =
          rated.length > 0
            ? rated.reduce(
                (
                  total,
                  performance
                ) =>
                  total +
                  performance.rating,
                0
              ) /
              rated.length
            : 0;

        const recent =
          rated.slice(
            0,
            5
          );

        const recentAverage =
          recent.length > 0
            ? recent.reduce(
                (
                  total,
                  performance
                ) =>
                  total +
                  performance.rating,
                0
              ) /
              recent.length
            : 0;

        return {
          average,
          recentAverage,
          delta:
            recentAverage -
            average,
          ratedMatches:
            rated.length,
        };
      },
      [
        filteredHistory,
      ]
    );

  const goalsPerGame =
    displayedStats.games > 0
      ? (
          displayedStats.goals /
          displayedStats.games
        ).toFixed(2)
      : "0.00";

  const assistsPerGame =
    displayedStats.games > 0
      ? (
          displayedStats.assists /
          displayedStats.games
        ).toFixed(2)
      : "0.00";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

      <div className="max-h-[94vh] w-full max-w-7xl overflow-y-auto rounded-3xl border border-yellow-400/20 bg-[#07111f]">

        <div className="relative border-b border-white/10 bg-gradient-to-r from-yellow-400/10 via-transparent to-cyan-400/[0.04] p-7">

          <button
            onClick={onClose}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-gray-400"
          >

            <X
              size={20}
            />

          </button>

          <div className="flex items-center gap-5">

            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-yellow-400/40 bg-yellow-400/10">

              <span className="text-3xl font-black text-yellow-400">

                {getPlayerInitials(
                  player.name
                )}

              </span>

            </div>

            <div className="min-w-0">

              <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
                GX NOVA • FICHE JOUEUR AVANCÉE
              </p>

              <h2 className="mt-2 truncate text-3xl font-black">

                {formatPlayerName(
                  player.name
                )}

              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-3">

                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-gray-400">

                  Poste principal :{" "}
                  {formatPositionLong(
                    player.position
                  )}

                </span>

                <span
                  className={`rounded-lg border px-3 py-1.5 text-xs font-black ${getRatingStyle(
                    displayedStats.averageRating
                  )}`}
                >

                  Note{" "}
                  {displayedStats.averageRating.toFixed(
                    2
                  )}

                </span>

              </div>

              <p className="mt-3 text-xs text-gray-600">
                {currentFilterLabel}
              </p>

            </div>

          </div>

          <div className="mt-6 flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                setSelectedPosition(
                  "global"
                )
              }
              className={`rounded-xl border px-4 py-2 text-xs font-black transition ${
                selectedPosition ===
                "global"
                  ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                  : "border-white/10 bg-white/[0.03] text-gray-500 hover:text-white"
              }`}
            >
              Global • {player.games} MJ
            </button>

            {availablePositions.map(
              (stats) => (

                <button
                  key={stats.position}
                  type="button"
                  onClick={() =>
                    setSelectedPosition(
                      stats.position
                    )
                  }
                  className={`rounded-xl border px-4 py-2 text-xs font-black transition ${
                    selectedPosition ===
                    stats.position
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                      : "border-white/10 bg-white/[0.03] text-gray-500 hover:text-white"
                  }`}
                >
                  {formatPosition(
                    stats.position
                  )} • {stats.games} MJ • {stats.averageRating.toFixed(
                    2
                  )}
                </button>

              )
            )}

          </div>

          {selectedPosition ===
            "global" &&
            availablePositions.length >
              1 && (

            <p className="mt-4 text-xs font-semibold text-orange-200/70">
              La moyenne globale regroupe plusieurs postes. Pour analyser ou comparer le joueur, sélectionne de préférence un poste précis.
            </p>

          )}

        </div>

        <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">

          <PlayerKpi
            label="Matchs"
            value={displayedStats.games}
          />

          <PlayerKpi
            label="Buts"
            value={displayedStats.goals}
            yellow
          />

          <PlayerKpi
            label="Passes décisives"
            value={displayedStats.assists}
            yellow
          />

          <PlayerKpi
            label="Note moyenne"
            value={displayedStats.averageRating.toFixed(
              2
            )}
          />

        </div>

        <div className="grid gap-5 px-6 pb-6 lg:grid-cols-2">

          <section className="rounded-2xl border border-white/10 bg-[#091626]">

            <PanelHeader
              title="ATTAQUE"
              right={
                selectedPosition ===
                "global"
                  ? "Tous postes"
                  : formatPositionLong(
                      selectedPosition
                    )
              }
            />

            <div className="p-5">

              <PlayerStatLine
                label="Buts"
                value={displayedStats.goals}
              />

              <PlayerStatLine
                label="Buts / match"
                value={goalsPerGame}
              />

              <PlayerStatLine
                label="Passes décisives"
                value={displayedStats.assists}
              />

              <PlayerStatLine
                label="PD / match"
                value={assistsPerGame}
              />

              <PlayerStatLine
                label="Tirs"
                value={displayedStats.shots}
              />

            </div>

          </section>

          <section className="rounded-2xl border border-white/10 bg-[#091626]">

            <PanelHeader
              title="PASSES"
              right={`${displayedStats.passSuccess.toFixed(
                1
              )}%`}
            />

            <div className="p-5">

              <PlayerStatLine
                label="Passes réussies"
                value={displayedStats.passesMade}
              />

              <PlayerStatLine
                label="Passes tentées"
                value={displayedStats.passAttempts}
              />

              <ProgressStat
                label="Précision"
                value={displayedStats.passSuccess}
              />

            </div>

          </section>

          <section className="rounded-2xl border border-white/10 bg-[#091626]">

            <PanelHeader
              title="DÉFENSE"
              right={`${displayedStats.tackleSuccess.toFixed(
                1
              )}%`}
            />

            <div className="p-5">

              <PlayerStatLine
                label="Tacles réussis"
                value={displayedStats.tacklesMade}
              />

              <PlayerStatLine
                label="Tacles tentés"
                value={displayedStats.tackleAttempts}
              />

              <ProgressStat
                label="Réussite tacles"
                value={displayedStats.tackleSuccess}
              />

              <PlayerStatLine
                label="Cartons rouges"
                value={displayedStats.redCards}
              />

            </div>

          </section>

          <section className="rounded-2xl border border-white/10 bg-[#091626]">

            <PanelHeader
              title="FORME RÉCENTE"
              right={
                selectedPosition ===
                "global"
                  ? "5 dernières notes"
                  : `5 dernières • ${formatPosition(
                      selectedPosition
                    )}`
              }
            />

            <div className="p-5">

              {displayedStats.recentRatings.length >
              0 ? (

                <div className="grid grid-cols-5 gap-3">

                  {displayedStats.recentRatings.map(
                    (
                      rating,
                      index
                    ) => (

                      <div
                        key={index}
                        className={`rounded-xl border p-3 text-center ${getRatingStyle(
                          rating
                        )}`}
                      >

                        <p className="text-lg font-black">
                          {rating.toFixed(
                            1
                          )}
                        </p>

                        <p className="mt-1 text-[8px] uppercase opacity-60">
                          M{index + 1}
                        </p>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <p className="text-sm text-gray-600">
                  Aucune note disponible.
                </p>

              )}

              {(selectedPosition ===
                "goalkeeper" ||
                displayedStats.saves >
                  0) && (

                <div className="mt-5">

                  <PlayerStatLine
                    label="Arrêts"
                    value={displayedStats.saves}
                  />

                  <PlayerStatLine
                    label="Arrêts / match"
                    value={
                      displayedStats.games >
                      0
                        ? (
                            displayedStats.saves /
                            displayedStats.games
                          ).toFixed(2)
                        : "0.00"
                    }
                  />

                </div>

              )}

            </div>

          </section>

        </div>

        <div className="border-t border-white/[0.07] px-6 py-6">

          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Historique détaillé
              </p>

              <h3 className="mt-1 text-2xl font-black">
                Évolution match par match
              </h3>

              <p className="mt-1 text-xs font-semibold text-gray-500">
                {selectedPosition ===
                "global"
                  ? "Tous les postes joués"
                  : `Uniquement les matchs joués comme ${formatPositionLong(
                      selectedPosition
                    ).toLowerCase()}`}
              </p>

            </div>

            {!historyLoading &&
              !historyError &&
              filteredHistory.length >
                0 && (

              <div className="flex flex-wrap gap-2">

                <PlayerHistorySummaryChip
                  label="Moyenne"
                  value={historySummary.average.toFixed(
                    2
                  )}
                />

                <PlayerHistorySummaryChip
                  label="5 derniers"
                  value={historySummary.recentAverage.toFixed(
                    2
                  )}
                />

                <PlayerHistorySummaryChip
                  label="Forme"
                  value={`${
                    historySummary.delta >
                    0
                      ? "+"
                      : ""
                  }${historySummary.delta.toFixed(
                    2
                  )}`}
                  tone={
                    historySummary.delta >
                    0.05
                      ? "green"
                      : historySummary.delta <
                        -0.05
                      ? "red"
                      : "neutral"
                  }
                />

              </div>

            )}

          </div>

          {historyLoading ? (

            <div className="rounded-2xl border border-white/[0.07] bg-[#091626] p-8 text-center">

              <RefreshCw
                size={22}
                className="mx-auto animate-spin text-cyan-300"
              />

              <p className="mt-3 text-sm font-bold text-gray-500">
                Chargement de l&apos;historique du joueur...
              </p>

            </div>

          ) : historyError ? (

            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] p-5 text-sm font-semibold text-rose-200">
              {historyError}
            </div>

          ) : filteredHistory.length ===
            0 ? (

            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">

              <BarChart3
                size={30}
                className="mx-auto text-gray-700"
              />

              <p className="mt-3 text-sm font-bold text-gray-600">
                Aucun match disponible pour ce poste et ces filtres.
              </p>

            </div>

          ) : (

            <div className="space-y-5">

              <PlayerRatingTrend
                performances={
                  filteredHistory
                }
                average={
                  historySummary.average
                }
              />

              <PlayerMatchHistoryTable
                performances={
                  filteredHistory
                }
              />

            </div>

          )}

        </div>

      </div>

    </div>
  );
}

function PlayerHistorySummaryChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?:
    | "green"
    | "red"
    | "neutral";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-300"
      : tone === "red"
      ? "text-rose-300"
      : "text-yellow-300";

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2">

      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-600">
        {label}
      </p>

      <p className={`mt-1 text-lg font-black ${valueClass}`}>
        {value}
      </p>

    </div>
  );
}

function PlayerRatingTrend({
  performances,
  average,
}: {
  performances: PlayerMatchHistoryItem[];
  average: number;
}) {
  const points =
    performances
      .filter(
        (performance) =>
          performance.rating >
          0
      )
      .slice(
        0,
        20
      )
      .reverse();

  const width = 900;
  const height = 250;
  const left = 46;
  const right = 28;
  const top = 24;
  const bottom = 42;

  const usableWidth =
    width -
    left -
    right;

  const usableHeight =
    height -
    top -
    bottom;

  const pointForIndex = (
    rating: number,
    index: number
  ) => {
    const x =
      points.length <= 1
        ? left +
          usableWidth /
            2
        : left +
          (index /
            (points.length -
              1)) *
            usableWidth;

    const y =
      top +
      (1 -
        Math.max(
          0,
          Math.min(
            10,
            rating
          )
        ) /
          10) *
        usableHeight;

    return {
      x,
      y,
    };
  };

  const polyline =
    points
      .map(
        (
          performance,
          index
        ) => {
          const point =
            pointForIndex(
              performance.rating,
              index
            );

          return `${point.x},${point.y}`;
        }
      )
      .join(" ");

  const averageY =
    top +
    (1 -
      Math.max(
        0,
        Math.min(
          10,
          average
        )
      ) /
        10) *
      usableHeight;

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#091626]">

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">

        <div>

          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">
            Courbe de forme
          </p>

          <h4 className="mt-1 text-base font-black">
            Note EA • {points.length} dernier{points.length > 1 ? "s" : ""} match{points.length > 1 ? "s" : ""}
          </h4>

        </div>

        <div className="rounded-lg border border-yellow-400/15 bg-yellow-400/[0.05] px-3 py-2 text-xs font-black text-yellow-300">
          Moy. {average.toFixed(
            2
          )}
        </div>

      </div>

      {points.length > 0 ? (

        <div className="overflow-x-auto p-4">

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[260px] min-w-[760px] w-full"
            role="img"
            aria-label="Évolution des notes du joueur"
          >

            {[2, 4, 6, 8, 10].map(
              (value) => {
                const y =
                  top +
                  (1 -
                    value /
                      10) *
                    usableHeight;

                return (
                  <g
                    key={
                      value
                    }
                  >

                    <line
                      x1={
                        left
                      }
                      x2={
                        width -
                        right
                      }
                      y1={y}
                      y2={y}
                      stroke="rgba(255,255,255,0.07)"
                      strokeWidth="1"
                    />

                    <text
                      x={
                        left -
                        12
                      }
                      y={
                        y +
                        4
                      }
                      fill="rgba(148,163,184,0.55)"
                      fontSize="11"
                      textAnchor="end"
                    >
                      {value}
                    </text>

                  </g>
                );
              }
            )}

            <line
              x1={left}
              x2={
                width -
                right
              }
              y1={
                averageY
              }
              y2={
                averageY
              }
              stroke="rgba(250,204,21,0.35)"
              strokeWidth="1.5"
              strokeDasharray="7 7"
            />

            {points.length >
              1 && (

              <polyline
                points={
                  polyline
                }
                fill="none"
                stroke="rgb(34,211,238)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

            )}

            {points.map(
              (
                performance,
                index
              ) => {
                const point =
                  pointForIndex(
                    performance.rating,
                    index
                  );

                return (
                  <g
                    key={`${performance.matchId}-${index}`}
                  >

                    <circle
                      cx={
                        point.x
                      }
                      cy={
                        point.y
                      }
                      r="6"
                      fill="rgb(250,204,21)"
                      stroke="#07111f"
                      strokeWidth="3"
                    />

                    <text
                      x={
                        point.x
                      }
                      y={
                        point.y -
                        12
                      }
                      fill="white"
                      fontSize="11"
                      fontWeight="900"
                      textAnchor="middle"
                    >
                      {performance.rating.toFixed(
                        1
                      )}
                    </text>

                    <text
                      x={
                        point.x
                      }
                      y={
                        height -
                        16
                      }
                      fill="rgba(148,163,184,0.65)"
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {shortOpponentName(
                        performance.opponent
                      )}
                    </text>

                  </g>
                );
              }
            )}

          </svg>

        </div>

      ) : (

        <div className="p-8 text-center text-sm font-bold text-gray-600">
          Aucune note à afficher.
        </div>

      )}

    </section>
  );
}

function PlayerMatchHistoryTable({
  performances,
}: {
  performances: PlayerMatchHistoryItem[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#091626]">

      <div className="border-b border-white/[0.07] px-5 py-4">

        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-yellow-300">
          Détail des matchs
        </p>

        <h4 className="mt-1 text-base font-black">
          {performances.length} performance{performances.length > 1 ? "s" : ""}
        </h4>

      </div>

      <div className="overflow-x-auto">

        <div className="min-w-[1180px]">

          <div className="grid grid-cols-[95px_190px_120px_85px_75px_70px_70px_90px_90px_80px_80px] border-b border-white/[0.07] bg-[#071321] px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-gray-600">

            <span>Date</span>
            <span>Adversaire</span>
            <span>Compétition</span>
            <span>Poste</span>
            <span className="text-center">Note</span>
            <span className="text-center">B</span>
            <span className="text-center">PD</span>
            <span className="text-center">% Passes</span>
            <span className="text-center">% Tacles</span>
            <span className="text-center">Arrêts</span>
            <span className="text-center">Score</span>

          </div>

          {performances.map(
            (performance) => (

              <a
                key={
                  performance.matchId
                }
                href={`/match-center?matchId=${performance.matchId}`}
                className="grid grid-cols-[95px_190px_120px_85px_75px_70px_70px_90px_90px_80px_80px] items-center border-b border-white/[0.045] px-4 py-3 text-xs transition hover:bg-cyan-400/[0.035]"
              >

                <span className="font-bold text-gray-500">
                  {formatPlayerHistoryDate(
                    performance.playedAt
                  )}
                </span>

                <span className="truncate font-black text-white">
                  {performance.opponent}
                </span>

                <span className="truncate font-bold text-gray-500">
                  {performance.competitionShortName ??
                    performance.competitionName ??
                    "Amical"}
                </span>

                <span className="font-black text-cyan-300">
                  {formatPosition(
                    performance.position
                  )}
                </span>

                <span className="text-center">

                  <span
                    className={`inline-flex rounded-lg border px-2 py-1 text-[11px] font-black ${getRatingStyle(
                      performance.rating
                    )}`}
                  >
                    {performance.rating.toFixed(
                      1
                    )}
                  </span>

                </span>

                <span className="text-center font-black text-white">
                  {performance.goals}
                </span>

                <span className="text-center font-black text-white">
                  {performance.assists}
                </span>

                <span className="text-center font-bold text-gray-400">
                  {performance.passSuccess.toFixed(
                    0
                  )}%
                </span>

                <span className="text-center font-bold text-gray-400">
                  {performance.tackleSuccess.toFixed(
                    0
                  )}%
                </span>

                <span className="text-center font-bold text-gray-400">
                  {performance.saves}
                </span>

                <span className="text-center">

                  <span
                    className={`font-black ${
                      performance.result ===
                      "V"
                        ? "text-emerald-300"
                        : performance.result ===
                          "D"
                        ? "text-rose-300"
                        : "text-gray-300"
                    }`}
                  >
                    {performance.goalsFor}-{performance.goalsAgainst}
                  </span>

                </span>

              </a>

            )
          )}

        </div>

      </div>

    </section>
  );
}

function formatPlayerHistoryDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
    }
  );
}

function shortOpponentName(
  value: string
) {
  const cleaned =
    value.trim();

  if (
    cleaned.length <=
    10
  ) {
    return cleaned;
  }

  return `${cleaned.slice(
    0,
    8
  )}…`;
}


/* =========================================================
   COMPOSITION
========================================================= */

function LineupManager({
  players,
  lineup,
  bench,
  formation,
  formations,
  saving,
  onFormationChange,
  onPlayerChange,
  onBenchAdd,
  onBenchRemove,
  onReset,
  onSave,
}: {
  players: Player[];
  lineup: LineupSpot[];
  bench: string[];
  formation: string;
  formations:
    FormationDefinition[];
  saving: boolean;

  onFormationChange: (
    formation: string
  ) => void;

  onPlayerChange: (
    slot: string,
    playerName: string
  ) => void;

  onBenchAdd: (
    playerName: string
  ) => void;

  onBenchRemove: (
    playerName: string
  ) => void;

  onReset: () => void;
  onSave: () => void;
}) {
  const [
    benchCandidate,
    setBenchCandidate,
  ] = useState("");

  const availableBenchPlayers =
    players.filter(
      (player) => {
        const normalized =
          normalizePlayerName(
            player.name
          );

        return (
          !lineup.some(
            (spot) =>
              normalizePlayerName(
                spot.name
              ) ===
              normalized
          ) &&
          !bench.some(
            (name) =>
              normalizePlayerName(
                name
              ) ===
              normalized
          )
        );
      }
    );

  function addBench() {
    if (!benchCandidate) {
      return;
    }

    onBenchAdd(
      benchCandidate
    );

    setBenchCandidate("");
  }

  return (
    <>

      <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

        <div>

          <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
            Gestion tactique
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Composition GX NOVA
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Choisis le dispositif, les 11 titulaires et les remplaçants.
          </p>

        </div>

        <div className="flex flex-wrap gap-3">

          <button
            onClick={
              onReset
            }
            disabled={
              saving
            }
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-gray-400 hover:bg-white/5"
          >

            <RotateCcw
              size={17}
            />

            Annuler les modifications

          </button>

          <button
            onClick={
              onSave
            }
            disabled={
              saving
            }
            className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black disabled:opacity-50"
          >

            {saving ? (

              <RefreshCw
                size={17}
                className="animate-spin"
              />

            ) : (

              <Save
                size={17}
              />

            )}

            {saving
              ? "Enregistrement..."
              : "Enregistrer la composition"}

          </button>

        </div>

      </div>

      <div className="grid gap-5 2xl:grid-cols-[1.45fr_0.8fr]">

        <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#091626]">

          <div className="flex flex-col gap-4 border-b border-white/5 p-5 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                Dispositif
              </p>

              <p className="mt-1 text-xl font-black text-yellow-400">
                {formation}
              </p>

            </div>

            <select
              value={
                formation
              }
              onChange={(
                event
              ) =>
                onFormationChange(
                  event.target
                    .value
                )
              }
              className="min-w-[190px] rounded-xl border border-yellow-400/20 bg-[#050d18] px-4 py-3 text-sm font-black text-white outline-none"
            >

              {formations.map(
                (item) => (

                  <option
                    key={
                      item.name
                    }
                    value={
                      item.name
                    }
                  >
                    {
                      item.name
                    }
                  </option>

                )
              )}

            </select>

          </div>

          <EditablePitch
            lineup={
              lineup
            }
            players={
              players
            }
            bench={
              bench
            }
            onPlayerChange={
              onPlayerChange
            }
          />

        </section>

        <div className="space-y-5">

          <section className="rounded-2xl border border-white/10 bg-[#091626]">

            <PanelHeader
              title="TITULAIRES"
              right="11 joueurs"
            />

            <div className="max-h-[570px] space-y-3 overflow-y-auto p-4">

              {lineup.map(
                (spot) => {
                  const player =
                    findPlayer(
                      players,
                      spot.name
                    );

                  return (

                    <div
                      key={
                        spot.slot
                      }
                      className="rounded-xl border border-white/10 bg-[#06111f] p-3"
                    >

                      <div className="mb-2 flex items-center justify-between">

                        <span className="text-xs font-black text-yellow-400">
                          {
                            spot.slot
                          }
                        </span>

                        {player && (

                          <span
                            className={`text-xs font-black ${getRatingTextStyle(
                              player.averageRating
                            )}`}
                          >
                            {
                              player.averageRating.toFixed(
                                2
                              )
                            }
                          </span>

                        )}

                      </div>

                      <select
                        value={
                          spot.name
                        }
                        onChange={(
                          event
                        ) =>
                          onPlayerChange(
                            spot.slot,
                            event.target
                              .value
                          )
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#050d18] px-3 py-2.5 text-sm outline-none"
                      >

                        <option value="">
                          Choisir un joueur
                        </option>

                        {players.map(
                          (candidate) => {
                            const usedElsewhere =
                              lineup.some(
                                (
                                  otherSpot
                                ) =>
                                  otherSpot.slot !==
                                    spot.slot &&
                                  normalizePlayerName(
                                    otherSpot.name
                                  ) ===
                                    normalizePlayerName(
                                      candidate.name
                                    )
                              ) ||
                              bench.some(
                                (
                                  benchName
                                ) =>
                                  normalizePlayerName(
                                    benchName
                                  ) ===
                                    normalizePlayerName(
                                      candidate.name
                                    )
                              );

                            return (

                              <option
                                key={
                                  candidate.id
                                }
                                value={
                                  candidate.name
                                }
                                disabled={
                                  usedElsewhere
                                }
                              >

                                {
                                  formatPlayerName(
                                    candidate.name
                                  )
                                }

                                {" • "}

                                {
                                  candidate.averageRating.toFixed(
                                    2
                                  )
                                }

                              </option>

                            );
                          }
                        )}

                      </select>

                    </div>

                  );
                }
              )}

            </div>

          </section>

          <section className="rounded-2xl border border-white/10 bg-[#091626]">

            <PanelHeader
              title="BANC / REMPLAÇANTS"
              right={`${bench.length} joueur${bench.length > 1 ? "s" : ""}`}
            />

            <div className="p-4">

              <div className="flex gap-2">

                <select
                  value={
                    benchCandidate
                  }
                  onChange={(
                    event
                  ) =>
                    setBenchCandidate(
                      event.target
                        .value
                    )
                  }
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#050d18] px-3 py-3 text-sm"
                >

                  <option value="">
                    Ajouter un joueur...
                  </option>

                  {availableBenchPlayers.map(
                    (player) => (

                      <option
                        key={
                          player.id
                        }
                        value={
                          player.name
                        }
                      >
                        {
                          formatPlayerName(
                            player.name
                          )
                        }
                      </option>

                    )
                  )}

                </select>

                <button
                  onClick={
                    addBench
                  }
                  disabled={
                    !benchCandidate
                  }
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400 text-black disabled:opacity-30"
                >

                  <Plus
                    size={19}
                  />

                </button>

              </div>

              <div className="mt-4 space-y-2">

                {bench.length ===
                0 ? (

                  <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-600">
                    Aucun remplaçant sélectionné.
                  </div>

                ) : (

                  bench.map(
                    (playerName) => {
                      const player =
                        findPlayer(
                          players,
                          playerName
                        );

                      return (

                        <div
                          key={
                            playerName
                          }
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-[#06111f] p-3"
                        >

                          <div className="flex items-center gap-3">

                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-yellow-400/20 bg-yellow-400/10 text-xs font-black text-yellow-400">

                              {
                                getPlayerInitials(
                                  playerName
                                )
                              }

                            </div>

                            <div>

                              <p className="text-sm font-black">
                                {
                                  formatPlayerName(
                                    playerName
                                  )
                                }
                              </p>

                              {player && (

                                <p className="text-[10px] text-gray-600">

                                  {
                                    player.games
                                  } MJ • note{" "}

                                  {
                                    player.averageRating.toFixed(
                                      2
                                    )
                                  }

                                </p>

                              )}

                            </div>

                          </div>

                          <button
                            onClick={() =>
                              onBenchRemove(
                                playerName
                              )
                            }
                            className="rounded-lg border border-red-400/20 p-2 text-red-400 hover:bg-red-400/10"
                          >

                            <Trash2
                              size={16}
                            />

                          </button>

                        </div>

                      );
                    }
                  )

                )}

              </div>

            </div>

          </section>

        </div>

      </div>

    </>
  );
}

/* =========================================================
   TERRAIN MODIFIABLE
========================================================= */

function EditablePitch({
  lineup,
  players,
  bench,
  onPlayerChange,
}: {
  lineup: LineupSpot[];
  players: Player[];
  bench: string[];

  onPlayerChange: (
    slot: string,
    playerName: string
  ) => void;
}) {
  return (
    <div className="relative min-h-[720px] overflow-hidden bg-gradient-to-b from-[#0b4a32] via-[#083323] to-[#061f17]">

      <div className="absolute inset-6 rounded-2xl border-2 border-white/20" />

      <div className="absolute left-6 right-6 top-1/2 border-t-2 border-white/15" />

      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/15" />

      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30" />

      <div className="absolute left-1/2 top-6 h-24 w-[42%] -translate-x-1/2 border border-t-0 border-white/15" />

      <div className="absolute bottom-6 left-1/2 h-24 w-[42%] -translate-x-1/2 border border-b-0 border-white/15" />

      {lineup.map(
        (spot) => {
          const player =
            findPlayer(
              players,
              spot.name
            );

          return (

            <div
              key={
                spot.slot
              }
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{
                left:
                  `${spot.x}%`,
                top:
                  `${spot.y}%`,
              }}
            >

              <div className="w-[125px] text-center">

                <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-yellow-400/50 bg-[#07111d] shadow-xl">

                  <UserCircle2
                    size={29}
                    className="text-gray-400"
                  />

                  <span className="absolute -left-2 -top-2 rounded-md bg-yellow-400 px-2 py-1 text-[9px] font-black text-black">
                    {
                      spot.slot
                    }
                  </span>

                </div>

                <select
                  value={
                    spot.name
                  }
                  onChange={(
                    event
                  ) =>
                    onPlayerChange(
                      spot.slot,
                      event.target
                        .value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#030914]/95 px-2 py-2 text-center text-[10px] font-black outline-none"
                >

                  <option value="">
                    Joueur
                  </option>

                  {players.map(
                    (candidate) => {
                      const usedElsewhere =
                        lineup.some(
                          (
                            otherSpot
                          ) =>
                            otherSpot.slot !==
                              spot.slot &&
                            normalizePlayerName(
                              otherSpot.name
                            ) ===
                              normalizePlayerName(
                                candidate.name
                              )
                        ) ||
                        bench.some(
                          (
                            benchName
                          ) =>
                            normalizePlayerName(
                              benchName
                            ) ===
                              normalizePlayerName(
                                candidate.name
                              )
                        );

                      return (

                        <option
                          key={
                            candidate.id
                          }
                          value={
                            candidate.name
                          }
                          disabled={
                            usedElsewhere
                          }
                        >

                          {
                            formatPlayerName(
                              candidate.name
                            )
                          }

                        </option>

                      );
                    }
                  )}

                </select>

                <div
                  className={`mx-auto mt-1 w-fit rounded-md border px-2 py-0.5 text-[10px] font-black ${
                    player
                      ? getRatingStyle(
                          player.averageRating
                        )
                      : "border-white/10 text-gray-600"
                  }`}
                >

                  {player
                    ? player.averageRating.toFixed(
                        2
                      )
                    : "--"}

                </div>

              </div>

            </div>

          );
        }
      )}

    </div>
  );
}

/* =========================================================
   MATCHS
========================================================= */

function MatchesManager({
  matches,
  allMatchesCount,
  classifiedMatches,
  unclassifiedMatches,
  seasons,
  competitions,
  editedAssignments,
  savingMatchId,
  competitionFilter,
  matchSearch,
  setCompetitionFilter,
  setMatchSearch,
  changeMatchSeason,
  changeMatchCompetition,
  saveMatchAssignment,
  onOpenMatch,
}: {
  matches:
    MatchAssignment[];

  allMatchesCount:
    number;

  classifiedMatches:
    number;

  unclassifiedMatches:
    number;

  seasons:
    Season[];

  competitions:
    Competition[];

  editedAssignments:
    Record<
      number,
      {
        seasonId:
          number | null;

        competitionId:
          number | null;
      }
    >;

  savingMatchId:
    number | null;

  competitionFilter:
    string;

  matchSearch:
    string;

  setCompetitionFilter: (
    value: string
  ) => void;

  setMatchSearch: (
    value: string
  ) => void;

  changeMatchSeason: (
    matchId: number,
    seasonId:
      number | null
  ) => void;

  changeMatchCompetition: (
    matchId: number,
    competitionId:
      number | null
  ) => void;

  saveMatchAssignment: (
    matchId: number
  ) => void;

  onOpenMatch: (
    matchId: number
  ) => void;
}) {
  return (
    <>

      <div className="mb-5 grid grid-cols-3 gap-4">

        <SmallStatCard
          title="Total"
          value={
            allMatchesCount
          }
          subtitle="Matchs amicaux"
        />

        <SmallStatCard
          title="Classés"
          value={
            classifiedMatches
          }
          subtitle="Avec compétition"
        />

        <SmallStatCard
          title="À classer"
          value={
            unclassifiedMatches
          }
          subtitle="Sans compétition"
        />

      </div>

      <div className="mb-5 flex gap-3 rounded-2xl border border-white/10 bg-[#091626] p-4">

        <div className="flex flex-1 items-center gap-3">

          <Search
            size={17}
          />

          <input
            value={
              matchSearch
            }
            onChange={(
              event
            ) =>
              setMatchSearch(
                event.target
                  .value
              )
            }
            placeholder="Rechercher adversaire..."
            className="w-full bg-transparent outline-none"
          />

        </div>

        <select
          value={
            competitionFilter
          }
          onChange={(
            event
          ) =>
            setCompetitionFilter(
              event.target
                .value
            )
          }
          className="rounded-xl bg-[#050d18] px-4"
        >

          <option value="all">
            Toutes
          </option>

          <option value="unassigned">
            Non classés
          </option>

          {competitions.map(
            (competition) => (

              <option
                key={
                  competition.id
                }
                value={
                  competition.id
                }
              >
                {
                  competition.short_name ??
                  competition.name
                }
              </option>

            )
          )}

        </select>

      </div>

      <div className="space-y-4">

        {matches.map(
          (match) => {
            const assignment =
              editedAssignments[
                match.id
              ] ?? {
                seasonId:
                  match.season_id,

                competitionId:
                  match.competition_id,
              };

            const changed =
              assignment.seasonId !==
                match.season_id ||
              assignment.competitionId !==
                match.competition_id;

            return (

              <div
                key={
                  match.id
                }
                className={`relative grid gap-4 overflow-hidden rounded-2xl border p-5 transition xl:grid-cols-[1fr_180px_200px_130px] ${getMatchCardStyle(
                  match.result
                )}`}
              >

                <div
                  className={`absolute bottom-0 left-0 top-0 w-1.5 ${getMatchAccentStyle(
                    match.result
                  )}`}
                />

                <button
                  onClick={() =>
                    onOpenMatch(
                      match.id
                    )
                  }
                  className="flex items-center justify-between rounded-xl p-2 text-left hover:bg-white/[0.04]"
                >

                  <div>

                    <p className="font-black">

                      GX NOVA{" "}

                      {
                        match.goals_for
                      }

                      {" - "}

                      {
                        match.goals_against
                      }

                      {" "}

                      {
                        match.opponent_name
                      }

                    </p>

                    <p className="mt-1 text-xs text-gray-500">

                      {
                        formatDateTime(
                          match.played_at
                        )
                      }

                    </p>

                  </div>

                  <div className="flex items-center gap-3">
                    <ResultBadge
                      result={
                        match.result
                      }
                    />

                    <Eye
                      size={17}
                      className="text-yellow-400"
                    />
                  </div>

                </button>

                <select
                  value={
                    assignment
                      .seasonId ??
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    changeMatchSeason(
                      match.id,

                      event.target
                        .value
                        ? Number(
                            event.target
                              .value
                          )
                        : null
                    )
                  }
                  className="rounded-xl bg-[#050d18] px-3"
                >

                  <option value="">
                    Aucune saison
                  </option>

                  {seasons.map(
                    (season) => (

                      <option
                        key={
                          season.id
                        }
                        value={
                          season.id
                        }
                      >
                        {
                          season.name
                        }
                      </option>

                    )
                  )}

                </select>

                <select
                  value={
                    assignment
                      .competitionId ??
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    changeMatchCompetition(
                      match.id,

                      event.target
                        .value
                        ? Number(
                            event.target
                              .value
                          )
                        : null
                    )
                  }
                  className="rounded-xl bg-[#050d18] px-3"
                >

                  <option value="">
                    Non classé
                  </option>

                  {competitions.map(
                    (competition) => (

                      <option
                        key={
                          competition.id
                        }
                        value={
                          competition.id
                        }
                      >
                        {
                          competition.short_name ??
                          competition.name
                        }
                      </option>

                    )
                  )}

                </select>

                <button
                  onClick={() =>
                    saveMatchAssignment(
                      match.id
                    )
                  }
                  disabled={
                    !changed ||
                    savingMatchId ===
                      match.id
                  }
                  className={`rounded-xl px-4 py-3 font-black ${
                    changed
                      ? "bg-yellow-400 text-black"
                      : "bg-white/5 text-gray-600"
                  }`}
                >

                  {savingMatchId ===
                  match.id
                    ? "..."
                    : changed
                    ? "Enregistrer"
                    : "Enregistré"}

                </button>

              </div>

            );
          }
        )}

      </div>

    </>
  );
}

/* =========================================================
   FICHE MATCH
========================================================= */

function MatchDetailModal({
  detail,
  loading,
  error,
  onClose,
}: {
  detail:
    MatchDetail | null;

  loading: boolean;

  error: string;

  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">

      <div className="max-h-[95vh] w-full max-w-[1450px] overflow-y-auto rounded-3xl border border-yellow-400/20 bg-[#06111f]">

        <div className="sticky top-0 z-30 flex justify-between border-b border-white/10 bg-[#06111f] p-5">

          <div>

            <p className="text-xs font-black uppercase tracking-widest text-yellow-400">
              Fiche de match
            </p>

            <h2 className="mt-1 text-xl font-black">
              GX NOVA
            </h2>

          </div>

          <button
            onClick={
              onClose
            }
          >
            <X />
          </button>

        </div>

        {loading && (

          <div className="p-20 text-center">
            Chargement...
          </div>

        )}

        {error && (

          <div className="m-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-400">
            {error}
          </div>

        )}

        {detail && (

          <div className="p-6">

            <div className="rounded-2xl border border-white/10 bg-[#091626] p-7 text-center">

              <p className="text-4xl font-black md:text-5xl">

                GX NOVA{" "}

                {
                  detail.match.goalsFor
                }

                <span className="mx-4 text-gray-600">
                  -
                </span>

                {
                  detail.match.goalsAgainst
                }

                {" "}

                {
                  detail.match.opponent
                }

              </p>

              <p className="mt-4 text-gray-500">

                {
                  formatDateTime(
                    detail.match.playedAt
                  )
                }

                {" • "}

                {
                  detail.match.competitionShortName ??
                  "Amicaux"
                }

              </p>

            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-6">

              <MatchStatCard
                label="Joueurs"
                value={
                  detail.teamTotals.players
                }
              />

              <MatchStatCard
                label="Note"
                value={
                  detail.teamTotals.averageRating.toFixed(
                    2
                  )
                }
              />

              <MatchStatCard
                label="Tirs"
                value={
                  detail.teamTotals.shots
                }
              />

              <MatchStatCard
                label="Passes"
                value={`${detail.teamTotals.passesMade}/${detail.teamTotals.passAttempts}`}
              />

              <MatchStatCard
                label="Tacles"
                value={`${detail.teamTotals.tacklesMade}/${detail.teamTotals.tackleAttempts}`}
              />

              <MatchStatCard
                label="Arrêts"
                value={
                  detail.teamTotals.saves
                }
              />

            </div>

            <div className="mt-5 grid gap-5 2xl:grid-cols-[1fr_1.3fr]">

              <section className="rounded-2xl border border-white/10 bg-[#091626] p-4">

                <p className="mb-4 font-black">

                  Structure détectée :{" "}

                  <span className="text-yellow-400">
                    {
                      detail.detectedStructure ??
                      "?"
                    }
                  </span>

                </p>

                <MatchPitch
                  players={
                    detail.players
                  }
                />

              </section>

              <section className="overflow-x-auto rounded-2xl border border-white/10 bg-[#091626]">

                <div className="min-w-[850px]">

                  <div className="grid grid-cols-[180px_repeat(8,1fr)] bg-[#071321] p-4 text-xs font-black text-gray-600">

                    <span>
                      Joueur
                    </span>

                    <span>
                      Note
                    </span>

                    <span>B</span>
                    <span>PD</span>
                    <span>Tirs</span>
                    <span>Passes</span>
                    <span>%</span>
                    <span>Tacles</span>
                    <span>Arrêts</span>

                  </div>

                  {detail.players.map(
                    (player) => (

                      <div
                        key={
                          player.id
                        }
                        className="grid grid-cols-[180px_repeat(8,1fr)] items-center border-t border-white/5 p-4 text-sm"
                      >

                        <div className="flex items-center gap-2">

                          <span className="font-black">
                            {
                              formatPlayerName(
                                player.name
                              )
                            }
                          </span>

                          {player.manOfTheMatch && (

                            <Medal
                              size={15}
                              className="text-yellow-400"
                            />

                          )}

                        </div>

                        <span>
                          {
                            player.rating.toFixed(
                              1
                            )
                          }
                        </span>

                        <span>
                          {
                            player.goals
                          }
                        </span>

                        <span>
                          {
                            player.assists
                          }
                        </span>

                        <span>
                          {
                            player.shots
                          }
                        </span>

                        <span>
                          {
                            player.passesMade
                          }/{
                            player.passAttempts
                          }
                        </span>

                        <span>
                          {
                            player.passSuccess.toFixed(
                              0
                            )
                          }%
                        </span>

                        <span>
                          {
                            player.tacklesMade
                          }/{
                            player.tackleAttempts
                          }
                        </span>

                        <span>
                          {
                            player.saves
                          }
                        </span>

                      </div>

                    )
                  )}

                </div>

              </section>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

/* =========================================================
   TERRAIN MATCH
========================================================= */

function MatchPitch({
  players,
}: {
  players:
    MatchDetailPlayer[];
}) {
  const positioned =
    buildPitchPlayers(
      players
    );

  return (
    <div className="relative min-h-[570px] overflow-hidden rounded-xl bg-gradient-to-b from-[#0b4a32] to-[#061f17]">

      <div className="absolute inset-5 rounded-xl border-2 border-white/20" />

      <div className="absolute left-5 right-5 top-1/2 border-t border-white/15" />

      {positioned.map(
        (item) => (

          <div
            key={
              item.player.id
            }
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{
              left:
                `${item.x}%`,
              top:
                `${item.y}%`,
            }}
          >

            <div className="w-[100px]">

              <UserCircle2
                size={38}
                className="mx-auto"
              />

              <p className="truncate rounded bg-black/70 px-2 py-1 text-[10px] font-black">
                {
                  formatPlayerName(
                    item.player.name
                  )
                }
              </p>

              <p className="text-xs font-black text-yellow-400">
                {
                  item.player.rating.toFixed(
                    1
                  )
                }
              </p>

            </div>

          </div>

        )
      )}

    </div>
  );
}

/* =========================================================
   FILTRES GLOBAUX
========================================================= */

function GlobalFilters({
  seasons,
  competitions,
  selectedSeason,
  selectedCompetition,
  currentFilterLabel,
  setSelectedSeason,
  setSelectedCompetition,
}: {
  seasons:
    Season[];

  competitions:
    Competition[];

  selectedSeason:
    string;

  selectedCompetition:
    string;

  currentFilterLabel:
    string;

  setSelectedSeason: (
    value: string
  ) => void;

  setSelectedCompetition: (
    value: string
  ) => void;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-yellow-400/20 bg-[#091626] p-4">

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

        <div>

          <div className="flex items-center gap-2 text-yellow-400">

            <Filter
              size={17}
            />

            <p className="text-xs font-black uppercase tracking-[0.2em]">
              Vue statistique
            </p>

          </div>

          <p className="mt-2 text-lg font-black">
            {
              currentFilterLabel
            }
          </p>

        </div>

        <div className="flex flex-col gap-3 md:flex-row">

          <select
            value={
              selectedSeason
            }
            onChange={(
              event
            ) =>
              setSelectedSeason(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-white/10 bg-[#050d18] px-4 py-3 text-sm"
          >

            <option value="all">
              Toutes les saisons
            </option>

            {seasons.map(
              (season) => (

                <option
                  key={
                    season.id
                  }
                  value={
                    season.id
                  }
                >
                  {
                    season.name
                  }
                </option>

              )
            )}

          </select>

          <select
            value={
              selectedCompetition
            }
            onChange={(
              event
            ) =>
              setSelectedCompetition(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-white/10 bg-[#050d18] px-4 py-3 text-sm"
          >

            <option value="all">
              Toutes les compétitions
            </option>

            {competitions.map(
              (competition) => (

                <option
                  key={
                    competition.id
                  }
                  value={
                    competition.id
                  }
                >
                  {
                    competition.short_name ??
                    competition.name
                  }
                </option>

              )
            )}

          </select>

          <button
            onClick={() => {
              setSelectedSeason(
                "all"
              );

              setSelectedCompetition(
                "all"
              );
            }}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-gray-400"
          >
            Réinitialiser
          </button>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   APERÇU
========================================================= */

function OverviewDashboard({
  matches,
  players,
  competitions,
  dashboardData,
  dashboardLoading,
  dashboardError,
  formation,
  lineup,
  onEditLineup,
  onRefreshDashboard,
}: {
  matches: Match[];
  players: Player[];
  competitions: Competition[];
  dashboardData: DashboardResponse | null;
  dashboardLoading: boolean;
  dashboardError: string;
  formation: string;
  lineup: LineupSpot[];
  onEditLineup: () => void;
  onRefreshDashboard: () => void;
}) {
  const cockpitStats = useMemo(() => {
    const played = matches.length;
    const wins = matches.filter((match) => match.result === "V").length;
    const draws = matches.filter((match) => match.result === "N").length;
    const losses = matches.filter((match) => match.result === "D").length;
    const goalsFor = matches.reduce(
      (total, match) => total + match.goalsFor,
      0
    );
    const goalsAgainst = matches.reduce(
      (total, match) => total + match.goalsAgainst,
      0
    );

    return {
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      winRate:
        played > 0
          ? Math.round((wins / played) * 100)
          : 0,
      goalDifference:
        goalsFor - goalsAgainst,
    };
  }, [matches]);

  const bestRecentPlayer = useMemo(() => {
    if (!players.length) return null;

    return [...players]
      .map((player) => {
        const ratings = player.recentRatings
          .filter((rating) => rating > 0)
          .slice(0, 5);

        const recentAverage =
          ratings.length > 0
            ? ratings.reduce(
                (total, rating) => total + rating,
                0
              ) / ratings.length
            : player.averageRating;

        return {
          player,
          recentAverage,
        };
      })
      .sort((a, b) => {
        if (b.recentAverage !== a.recentAverage) {
          return b.recentAverage - a.recentAverage;
        }

        return (
          b.player.goals +
          b.player.assists -
          (a.player.goals + a.player.assists)
        );
      })[0];
  }, [players]);

  const nextEvent =
    dashboardData?.nextEvent ?? null;

  const nextPlan =
    nextEvent?.plan ?? null;

  const nextPlanReady =
    (nextPlan?.lineupCount ?? 0) >= 11;

  const recentMatches =
    matches.slice(0, 5);

  const weekEvents =
    dashboardData?.weekEvents ?? [];

  const upcomingEvents =
    dashboardData?.upcomingEvents ?? [];

  const displayedWeekEvents =
    weekEvents.length > 0
      ? weekEvents.slice(0, 6)
      : upcomingEvents.slice(0, 6);

  function eventTitle(
    event: DashboardProgrammeEvent
  ) {
    if (event.opponentName) {
      return `GX NOVA vs ${event.opponentName}`;
    }

    return (
      event.title ||
      event.competitionName ||
      "Événement GX NOVA"
    );
  }

  function eventHref(
    event: DashboardProgrammeEvent
  ) {
    return `/programme?weekStart=${encodeURIComponent(
      event.weekStart
    )}&eventId=${encodeURIComponent(
      event.eventId
    )}&openPlan=1`;
  }

  function competitionNameForMatch(
    match: Match
  ) {
    if (!match.competitionId) {
      return "Amical";
    }

    const competition =
      competitions.find(
        (item) =>
          item.id ===
          match.competitionId
      );

    return (
      competition?.short_name ??
      competition?.name ??
      "Compétition"
    );
  }

  return (
    <div className="space-y-5">

      <section className="relative overflow-hidden rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-[#06192b] via-[#071321] to-[#030812] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.24)]">

        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-yellow-400/[0.08] blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex items-center gap-4">

            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.06] p-2">
              <ClubLogo size={70} />
            </div>

            <div>

              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-300">
                GX NOVA COMMAND CENTER
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Cockpit équipe
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-400">
                Programme, disponibilités, compositions et résultats réunis au même endroit.
              </p>

            </div>

          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">

            <a
              href="/programme"
              className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] px-4 py-3 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/[0.14]"
            >
              <CalendarDays size={16} />
              Programme
            </a>

            <a
              href="/match-center"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-white transition hover:bg-white/[0.08]"
            >
              <Swords size={16} />
              Match Center
            </a>

            <button
              type="button"
              onClick={onEditLineup}
              className="flex items-center justify-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.07] px-4 py-3 text-xs font-black text-yellow-300 transition hover:bg-yellow-400/[0.14]"
            >
              <Users size={16} />
              Composition
            </button>

            <button
              type="button"
              onClick={onRefreshDashboard}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.07]"
            >
              <RefreshCw size={15} />
              Actualiser
            </button>

          </div>

        </div>

      </section>

      {dashboardError && (

        <div className="rounded-2xl border border-orange-400/20 bg-orange-400/[0.06] p-4 text-sm font-semibold text-orange-200">
          Le cockpit du programme n&apos;a pas pu être chargé : {dashboardError}
        </div>

      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">

        <section className="relative overflow-hidden rounded-[26px] border border-yellow-400/20 bg-gradient-to-br from-[#101b2a] via-[#071321] to-[#050b13] p-6 xl:col-span-8">

          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.14),transparent_68%)]" />

          <div className="relative z-10">

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div>

                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">
                  Prochain rendez-vous
                </p>

                <h2 className="mt-1 text-2xl font-black text-white">
                  {dashboardLoading
                    ? "Chargement du programme..."
                    : nextEvent
                    ? eventTitle(nextEvent)
                    : "Aucun match à venir programmé"}
                </h2>

              </div>

              {nextEvent && (

                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] px-4 py-2 text-right">

                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
                    {formatDashboardEventDate(
                      nextEvent.eventDate
                    )}
                  </p>

                  <p className="mt-1 text-2xl font-black text-white">
                    {nextEvent.time || "--:--"}
                  </p>

                </div>

              )}

            </div>

            {nextEvent ? (

              <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">

                <div className="flex flex-col items-center text-center">

                  <div className="flex h-24 w-24 items-center justify-center rounded-[24px] border border-yellow-400/20 bg-yellow-400/[0.05]">
                    <ClubLogo size={72} />
                  </div>

                  <p className="mt-3 text-lg font-black">
                    GX NOVA
                  </p>

                </div>

                <div className="text-center">

                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                    {nextEvent.competitionName ||
                      (nextEvent.type === "tournament"
                        ? "Tournoi"
                        : "Compétition")}
                  </p>

                  <p className="mt-2 text-4xl font-black text-yellow-300">
                    VS
                  </p>

                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {nextEvent.notes || "FC27"}
                  </p>

                </div>

                <div className="flex flex-col items-center text-center">

                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[24px] border border-cyan-400/20 bg-cyan-400/[0.05]">

                    {nextEvent.opponentLogoUrl ? (

                      <img
                        src={nextEvent.opponentLogoUrl}
                        alt=""
                        className="h-20 w-20 object-contain"
                      />

                    ) : (

                      <span className="text-2xl font-black text-cyan-300">
                        {initials(
                          nextEvent.opponentName ||
                            nextEvent.title ||
                            "FC"
                        )}
                      </span>

                    )}

                  </div>

                  <p className="mt-3 max-w-[260px] truncate text-lg font-black">
                    {nextEvent.opponentName ||
                      nextEvent.title ||
                      "Adversaire à confirmer"}
                  </p>

                </div>

              </div>

            ) : (

              <div className="mt-7 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">

                <CalendarDays
                  size={30}
                  className="mx-auto text-slate-600"
                />

                <p className="mt-3 text-sm font-bold text-slate-500">
                  Ajoute le prochain rendez-vous dans le Programme de la semaine.
                </p>

              </div>

            )}

            {nextEvent && (

              <div className="mt-7 flex flex-wrap justify-center gap-2">

                <a
                  href={eventHref(nextEvent)}
                  className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black text-black transition hover:bg-yellow-300"
                >
                  {nextPlan
                    ? "Voir la préparation"
                    : "Préparer le match"}
                </a>

                {nextEvent.linkedMatchId && (

                  <a
                    href={`/match-center?matchId=${nextEvent.linkedMatchId}`}
                    className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-5 py-3 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/[0.14]"
                  >
                    Ouvrir Match Center
                  </a>

                )}

              </div>

            )}

          </div>

        </section>

        <section className="rounded-[26px] border border-cyan-400/20 bg-[#071321] p-5 xl:col-span-4">

          <div className="flex items-center justify-between gap-3">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                Préparation
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                État du prochain match
              </h2>

            </div>

            <CheckCircle2
              size={22}
              className={
                nextPlanReady
                  ? "text-emerald-300"
                  : "text-slate-600"
              }
            />

          </div>

          {nextEvent ? (

            <div className="mt-5 space-y-3">

              <DashboardPreparationRow
                label="Disponibles"
                value={nextPlan?.available ?? 0}
                tone="green"
              />

              <DashboardPreparationRow
                label="Incertains"
                value={nextPlan?.maybe ?? 0}
                tone="yellow"
              />

              <DashboardPreparationRow
                label="Absents"
                value={nextPlan?.absent ?? 0}
                tone="red"
              />

              <div className="my-4 border-t border-white/[0.07]" />

              <DashboardPreparationRow
                label="Composition"
                value={
                  nextPlan
                    ? `${nextPlan.lineupCount}/11`
                    : "0/11"
                }
                tone={
                  nextPlanReady
                    ? "green"
                    : "cyan"
                }
              />

              <DashboardPreparationRow
                label="Formation"
                value={nextPlan?.formation ?? "À définir"}
                tone="cyan"
              />

              <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">

                <p className="text-xs font-black text-white">
                  {nextPlanReady
                    ? "Composition prête"
                    : nextPlan
                    ? "Composition à compléter"
                    : "Préparation non commencée"}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {nextPlanReady
                    ? `${nextPlan?.lineupCount ?? 0} titulaires enregistrés${
                        nextPlan?.benchCount
                          ? ` • ${nextPlan.benchCount} banc`
                          : ""
                      }.`
                    : "Ouvre le Programme pour préparer l'équipe."}
                </p>

              </div>

            </div>

          ) : (

            <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm font-bold text-slate-600">
              Aucun événement à préparer.
            </div>

          )}

        </section>

      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        <DashboardKpiCard
          label="Matchs"
          value={cockpitStats.played}
          helper={`${cockpitStats.wins}V • ${cockpitStats.draws}N • ${cockpitStats.losses}D`}
        />

        <DashboardKpiCard
          label="Taux de victoire"
          value={`${cockpitStats.winRate}%`}
          helper="Historique global"
        />

        <DashboardKpiCard
          label="Différence buts"
          value={
            cockpitStats.goalDifference > 0
              ? `+${cockpitStats.goalDifference}`
              : String(cockpitStats.goalDifference)
          }
          helper={`${cockpitStats.goalsFor} BP • ${cockpitStats.goalsAgainst} BC`}
        />

        <DashboardKpiCard
          label="XI actuel"
          value={`${lineup.length}/11`}
          helper={`Formation ${formation}`}
        />

      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-12">

        <section className="rounded-[26px] border border-white/10 bg-[#071321] 2xl:col-span-7">

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                Planning
              </p>

              <h2 className="mt-1 text-lg font-black">
                Programme de la semaine
              </h2>

            </div>

            <a
              href="/programme"
              className="text-xs font-black text-yellow-300 transition hover:text-yellow-200"
            >
              Voir tout le programme →
            </a>

          </div>

          <div className="p-4">

            {dashboardLoading ? (

              <div className="rounded-2xl border border-white/[0.07] p-6 text-center text-sm font-bold text-slate-600">
                Chargement du programme...
              </div>

            ) : displayedWeekEvents.length ? (

              <div className="space-y-2">

                {displayedWeekEvents.map(
                  (event) => (

                    <a
                      key={event.eventId}
                      href={
                        event.status === "played" &&
                        event.linkedMatchId
                          ? `/match-center?matchId=${event.linkedMatchId}`
                          : eventHref(event)
                      }
                      className="grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.035] sm:grid-cols-[110px_1fr_auto] sm:items-center"
                    >

                      <div>

                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          {formatDashboardEventDate(
                            event.eventDate
                          )}
                        </p>

                        <p className="mt-1 text-lg font-black text-white">
                          {event.time || "--:--"}
                        </p>

                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-sm font-black text-white">
                          {eventTitle(event)}
                        </p>

                        <p className="mt-1 truncate text-xs font-bold text-slate-500">
                          {event.competitionName ||
                            (event.type === "tournament"
                              ? "Tournoi"
                              : "Compétition")}
                          {event.plan
                            ? ` • ${event.plan.lineupCount}/11`
                            : " • compo à préparer"}
                        </p>

                      </div>

                      <div className="sm:text-right">

                        {event.status === "played" ? (

                          <div>

                            <span
                              className={`inline-flex rounded-lg border px-2 py-1 text-[10px] font-black ${
                                event.result === "V"
                                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                  : event.result === "D"
                                  ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
                                  : "border-slate-400/20 bg-slate-400/10 text-slate-300"
                              }`}
                            >
                              JOUÉ
                            </span>

                            <p className="mt-1 text-xl font-black text-white">
                              {event.goalsFor ?? "-"} - {event.goalsAgainst ?? "-"}
                            </p>

                          </div>

                        ) : event.plan ? (

                          <div>

                            <span
                              className={`inline-flex rounded-lg border px-2 py-1 text-[10px] font-black ${
                                event.plan.lineupCount >= 11
                                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                  : "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
                              }`}
                            >
                              {event.plan.lineupCount >= 11
                                ? "COMPO PRÊTE"
                                : "À COMPLÉTER"}
                            </span>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {event.plan.available} dispo • {event.plan.maybe} ?
                            </p>

                          </div>

                        ) : (

                          <span className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-black text-slate-500">
                            À PRÉPARER
                          </span>

                        )}

                      </div>

                    </a>

                  )
                )}

              </div>

            ) : (

              <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center">

                <CalendarDays
                  size={28}
                  className="mx-auto text-slate-700"
                />

                <p className="mt-3 text-sm font-bold text-slate-600">
                  Aucun événement enregistré cette semaine.
                </p>

              </div>

            )}

          </div>

        </section>

        <section className="rounded-[26px] border border-white/10 bg-[#071321] 2xl:col-span-5">

          <div className="border-b border-white/[0.07] px-5 py-4">

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">
              Forme récente
            </p>

            <h2 className="mt-1 text-lg font-black">
              Derniers résultats
            </h2>

          </div>

          <div className="space-y-2 p-4">

            {recentMatches.length ? (

              recentMatches.map(
                (match) => (

                  <a
                    key={match.id ?? match.matchId}
                    href={
                      match.id
                        ? `/match-center?matchId=${match.id}`
                        : "/match-center"
                    }
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-3 transition hover:bg-white/[0.04]"
                  >

                    <div className="min-w-0">

                      <p className="truncate text-sm font-black">
                        vs {match.opponent}
                      </p>

                      <p className="mt-1 text-[11px] font-bold text-slate-600">
                        {formatDate(match.date)} • {competitionNameForMatch(match)}
                      </p>

                    </div>

                    <div className="flex items-center gap-3">

                      <ResultBadge
                        result={match.result}
                      />

                      <span className="min-w-[64px] text-right text-xl font-black text-white">
                        {match.goalsFor}-{match.goalsAgainst}
                      </span>

                    </div>

                  </a>

                )
              )

            ) : (

              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm font-bold text-slate-600">
                Aucun résultat disponible.
              </div>

            )}

          </div>

        </section>

      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        <section className="relative overflow-hidden rounded-[26px] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.07] via-[#071321] to-[#071321] p-5">

          <div className="absolute right-5 top-5 opacity-10">
            <Star
              size={96}
              className="text-yellow-300"
            />
          </div>

          <div className="relative z-10">

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">
              Joueur en forme
            </p>

            {bestRecentPlayer ? (

              <div className="mt-4">

                <div className="flex items-end gap-4">

                  <div>

                    <p className="text-3xl font-black text-white">
                      {bestRecentPlayer.player.name}
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {formatPositionLong(
                        bestRecentPlayer.player.position
                      )}
                    </p>

                  </div>

                  <div className="ml-auto text-right">

                    <p className="text-4xl font-black text-yellow-300">
                      {bestRecentPlayer.recentAverage.toFixed(2)}
                    </p>

                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                      moyenne récente
                    </p>

                  </div>

                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">

                  <DashboardPlayerStat
                    label="Matchs"
                    value={bestRecentPlayer.player.games}
                  />

                  <DashboardPlayerStat
                    label="Buts"
                    value={bestRecentPlayer.player.goals}
                  />

                  <DashboardPlayerStat
                    label="Passes D."
                    value={bestRecentPlayer.player.assists}
                  />

                </div>

              </div>

            ) : (

              <p className="mt-5 text-sm font-bold text-slate-600">
                Pas encore assez de données joueur.
              </p>

            )}

          </div>

        </section>

        <section className="rounded-[26px] border border-cyan-400/15 bg-[#071321] p-5">

          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
            Accès rapides
          </p>

          <h2 className="mt-1 text-lg font-black">
            Continuer la préparation
          </h2>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">

            <DashboardQuickLink
              href="/programme"
              icon={
                <CalendarDays
                  size={18}
                />
              }
              title="Programme"
              subtitle="Matchs, dispos et compositions"
            />

            <DashboardQuickLink
              href="/match-center"
              icon={
                <Swords
                  size={18}
                />
              }
              title="Match Center"
              subtitle="Résultats, stats et exports"
            />

            <button
              type="button"
              onClick={onEditLineup}
              className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition hover:border-yellow-400/20 hover:bg-yellow-400/[0.04]"
            >
              <div className="rounded-xl bg-yellow-400/10 p-2 text-yellow-300">
                <Users
                  size={18}
                />
              </div>

              <div>

                <p className="text-sm font-black text-white">
                  Composition globale
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-600">
                  Modifier le XI de référence
                </p>

              </div>
            </button>

            {nextEvent ? (

              <DashboardQuickLink
                href={eventHref(nextEvent)}
                icon={
                  <Eye
                    size={18}
                  />
                }
                title="Prochain plan"
                subtitle={
                  nextPlanReady
                    ? "Composition prête"
                    : "Préparation à compléter"
                }
              />

            ) : (

              <DashboardQuickLink
                href="/programme"
                icon={
                  <Plus
                    size={18}
                  />
                }
                title="Planifier"
                subtitle="Ajouter le prochain rendez-vous"
              />

            )}

          </div>

        </section>

      </div>

    </div>
  );
}

function DashboardPreparationRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone: "green" | "yellow" | "red" | "cyan";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "red"
      ? "text-rose-300"
      : "text-cyan-300";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] px-4 py-3">

      <span className="text-xs font-bold text-slate-500">
        {label}
      </span>

      <span className={`text-sm font-black ${toneClass}`}>
        {value}
      </span>

    </div>
  );
}

function DashboardKpiCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#071321] p-4">

      <p className="text-[10px] font-black uppercase tracking-[0.17em] text-slate-600">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-600">
        {helper}
      </p>

    </div>
  );
}

function DashboardPlayerStat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/10 p-3">

      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-600">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-white">
        {value}
      </p>

    </div>
  );
}

function DashboardQuickLink({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.04]"
    >

      <div className="rounded-xl bg-cyan-400/10 p-2 text-cyan-300">
        {icon}
      </div>

      <div>

        <p className="text-sm font-black text-white">
          {title}
        </p>

        <p className="mt-1 text-xs font-semibold text-slate-600">
          {subtitle}
        </p>

      </div>

    </a>
  );
}

function formatDashboardEventDate(
  value: string
) {
  if (!value) return "";

  const date = new Date(
    `${value}T12:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "fr-FR",
    {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    }
  );
}

/* =========================================================
   ANALYSES AUTOMATIQUES
========================================================= */


function EveningReportDashboard({
  matches,
  players,
  selectedSeason,
  selectedCompetition,
  currentFilterLabel,
  onOpenPlayer,
  onOpenMatch,
}: {
  matches: Match[];
  players: Player[];
  selectedSeason: string;
  selectedCompetition: string;
  currentFilterLabel: string;
  onOpenPlayer: (player: Player) => void;
  onOpenMatch: (matchId: number) => void;
}) {
  const availableDates =
    useMemo(
      () =>
        Array.from(
          new Set(
            matches
              .map(
                (match) =>
                  eveningDateKey(
                    match.date
                  )
              )
              .filter(
                (
                  value
                ): value is string =>
                  Boolean(value)
              )
          )
        ).sort(
          (a, b) =>
            b.localeCompare(
              a
            )
        ),
      [
        matches,
      ]
    );

  const [
    selectedDate,
    setSelectedDate,
  ] = useState("");

  const [
    report,
    setReport,
  ] = useState<EveningReportResponse | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    exporting,
    setExporting,
  ] = useState(false);

  useEffect(() => {
    if (
      availableDates.length ===
      0
    ) {
      setSelectedDate(
        ""
      );
      return;
    }

    if (
      !selectedDate ||
      !availableDates.includes(
        selectedDate
      )
    ) {
      setSelectedDate(
        availableDates[0]
      );
    }
  }, [
    availableDates,
    selectedDate,
  ]);

  useEffect(() => {
    let cancelled =
      false;

    async function loadReport() {
      if (
        !selectedDate
      ) {
        setReport(
          null
        );
        return;
      }

      try {
        setLoading(
          true
        );
        setError(
          ""
        );

        const params =
          new URLSearchParams();

        params.set(
          "date",
          selectedDate
        );

        if (
          selectedSeason !==
          "all"
        ) {
          params.set(
            "seasonId",
            selectedSeason
          );
        }

        if (
          selectedCompetition !==
          "all"
        ) {
          params.set(
            "competitionId",
            selectedCompetition
          );
        }

        const response =
          await fetch(
            `/api/evening-report?${params.toString()}`,
            {
              cache:
                "no-store",
            }
          );

        const data =
          (await response.json()) as EveningReportResponse & {
            error?: string;
            details?: string;
          };

        if (
          !response.ok
        ) {
          throw new Error(
            data.details ??
              data.error ??
              "Impossible de charger le rapport de soirée."
          );
        }

        if (
          !cancelled
        ) {
          setReport(
            data
          );
        }
      } catch (err) {
        if (
          !cancelled
        ) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger le rapport de soirée."
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false
          );
        }
      }
    }

    void loadReport();

    return () => {
      cancelled =
        true;
    };
  }, [
    selectedDate,
    selectedSeason,
    selectedCompetition,
  ]);

  const summary =
    useMemo(
      () =>
        buildEveningSummary(
          report
        ),
      [
        report,
      ]
    );

  const notableProgression =
    useMemo(
      () =>
        report?.players
          .filter(
            (player) =>
              player.trendDelta !==
                null &&
              player.trendDelta >=
                0.3
          )
          .sort(
            (a, b) =>
              (
                b.trendDelta ??
                0
              ) -
              (
                a.trendDelta ??
                0
              )
          )[0] ??
        null,
      [
        report,
      ]
    );

  const notableDrop =
    useMemo(
      () =>
        report?.players
          .filter(
            (player) =>
              player.trendDelta !==
                null &&
              player.trendDelta <=
                -0.3
          )
          .sort(
            (a, b) =>
              (
                a.trendDelta ??
                0
              ) -
              (
                b.trendDelta ??
                0
              )
          )[0] ??
        null,
      [
        report,
      ]
    );

  const findPagePlayer = (
    reportPlayer:
      EveningReportPlayer
  ) =>
    players.find(
      (player) =>
        player.id ===
        reportPlayer.id
    ) ??
    players.find(
      (player) =>
        normalizePlayerName(
          player.name
        ) ===
        normalizePlayerName(
          reportPlayer.name
        )
    ) ??
    null;

  const copyDiscordText =
    async () => {
      if (
        !report
      ) {
        return;
      }

      const text =
        buildEveningDiscordText(
          report,
          summary,
          notableProgression,
          notableDrop
        );

      try {
        await navigator.clipboard.writeText(
          text
        );
        setCopied(
          true
        );

        window.setTimeout(
          () =>
            setCopied(
              false
            ),
          1800
        );
      } catch {
        setError(
          "Le navigateur n'a pas autorisé la copie dans le presse-papiers."
        );
      }
    };

  const exportDiscordPoster =
    async () => {
      if (
        !report
      ) {
        return;
      }

      try {
        setExporting(
          true
        );
        setError(
          ""
        );

        await exportEveningReportPoster(
          report,
          summary,
          notableProgression,
          notableDrop
        );
      } catch (
        err
      ) {
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de générer l'image Discord."
        );
      } finally {
        setExporting(
          false
        );
      }
    };

  if (
    availableDates.length ===
    0
  ) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#091626] p-10 text-center">

        <FileText
          size={38}
          className="mx-auto text-gray-700"
        />

        <h2 className="mt-4 text-2xl font-black">
          Rapport de soirée
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Aucun match n&apos;est disponible avec les filtres actuels.
        </p>

      </section>
    );
  }

  return (
    <>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

        <div>

          <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
            GX NOVA • RAPPORT DE SOIRÉE
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Synthèse automatique staff
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-500">
            Une soirée, tous les matchs, le MVP, les tendances joueurs et les points à retenir dans un seul rapport.
          </p>

          <p className="mt-2 text-xs font-bold text-cyan-300">
            {currentFilterLabel}
          </p>

        </div>

        <div className="flex flex-wrap items-end gap-3">

          <label className="min-w-[220px]">

            <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.15em] text-gray-600">
              Soirée
            </span>

            <select
              value={
                selectedDate
              }
              onChange={
                (
                  event
                ) =>
                  setSelectedDate(
                    event.target.value
                  )
              }
              className="w-full rounded-xl border border-yellow-400/20 bg-[#050d18] px-4 py-3 text-sm font-black text-white outline-none"
            >

              {availableDates.map(
                (date) => (

                  <option
                    key={
                      date
                    }
                    value={
                      date
                    }
                  >
                    {formatEveningDateLabel(
                      date
                    )}
                  </option>

                )
              )}

            </select>

          </label>

          <button
            type="button"
            onClick={
              copyDiscordText
            }
            disabled={
              !report ||
              loading
            }
            className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-3 text-sm font-black text-cyan-300 disabled:opacity-40"
          >
            <Copy
              size={17}
            />
            {copied
              ? "Copié"
              : "Copier Discord"}
          </button>

          <button
            type="button"
            onClick={
              exportDiscordPoster
            }
            disabled={
              !report ||
              loading ||
              exporting
            }
            className="flex items-center gap-2 rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-sm font-black text-yellow-300 disabled:opacity-40"
          >
            <Save
              size={17}
            />
            {exporting
              ? "Export..."
              : "Exporter PNG"}
          </button>

        </div>

      </div>

      {error && (

        <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4 text-sm font-bold text-rose-200">
          {error}
        </div>

      )}

      {loading ? (

        <div className="rounded-3xl border border-white/10 bg-[#091626] p-12 text-center">

          <RefreshCw
            size={28}
            className="mx-auto animate-spin text-cyan-300"
          />

          <p className="mt-4 text-sm font-black text-gray-500">
            Construction du rapport...
          </p>

        </div>

      ) : report &&
        report.matches.length >
          0 ? (

        <>

          <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">

            <ReportKpi
              label="Matchs"
              value={
                report.totals.matches
              }
              helper={formatEveningDateLabel(
                report.date
              )}
            />

            <ReportKpi
              label="Victoires"
              value={
                report.totals.wins
              }
              helper={`${eveningWinRate(
                report
              ).toFixed(
                0
              )}%`}
              tone="green"
            />

            <ReportKpi
              label="Nuls"
              value={
                report.totals.draws
              }
              helper="soirée"
            />

            <ReportKpi
              label="Défaites"
              value={
                report.totals.losses
              }
              helper="soirée"
              tone="red"
            />

            <ReportKpi
              label="Buts"
              value={`${report.totals.goalsFor}-${report.totals.goalsAgainst}`}
              helper="marqués / encaissés"
              tone="yellow"
            />

            <ReportKpi
              label="Clean sheets"
              value={
                report.totals.cleanSheets
              }
              helper="match(s)"
              tone="cyan"
            />

          </div>

          <div className="mb-5 grid gap-5 2xl:grid-cols-12">

            <section className="overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.055] via-[#091626] to-cyan-400/[0.02] 2xl:col-span-5">

              <div className="border-b border-white/[0.07] px-5 py-4">

                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">
                  MVP de la soirée
                </p>

                <h3 className="mt-1 text-lg font-black">
                  Meilleure performance moyenne
                </h3>

              </div>

              {report.mvp ? (

                <div className="p-5">

                  <button
                    type="button"
                    onClick={() => {
                      const pagePlayer =
                        findPagePlayer(
                          report.mvp as EveningReportPlayer
                        );

                      if (
                        pagePlayer
                      ) {
                        onOpenPlayer(
                          pagePlayer
                        );
                      }
                    }}
                    className="w-full rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.045] p-5 text-left transition hover:bg-yellow-400/[0.07]"
                  >

                    <div className="flex items-center gap-4">

                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-xl font-black text-yellow-300">
                        {getPlayerInitials(
                          report.mvp.name
                        )}
                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="truncate text-xl font-black">
                          {formatPlayerName(
                            report.mvp.name
                          )}
                        </p>

                        <p className="mt-1 text-xs font-bold text-gray-600">
                          {report.mvp.games} match{report.mvp.games > 1 ? "s" : ""} • {report.mvp.positions.map(
                            formatPosition
                          ).join(
                            " / "
                          )}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-3xl font-black text-yellow-300">
                          {report.mvp.averageRating.toFixed(
                            2
                          )}
                        </p>

                        <p className="text-[9px] font-black uppercase text-gray-700">
                          note moyenne
                        </p>

                      </div>

                    </div>

                    <div className="mt-5 grid grid-cols-4 gap-2">

                      <ReportMiniStat
                        label="Buts"
                        value={
                          report.mvp.goals
                        }
                      />

                      <ReportMiniStat
                        label="PD"
                        value={
                          report.mvp.assists
                        }
                      />

                      <ReportMiniStat
                        label="Passes"
                        value={`${report.mvp.passSuccess.toFixed(
                          0
                        )}%`}
                      />

                      <ReportMiniStat
                        label="Arrêts"
                        value={
                          report.mvp.saves
                        }
                      />

                    </div>

                  </button>

                  <p className="mt-3 text-[10px] font-semibold leading-5 text-gray-600">
                    MVP automatique calculé sur la note EA moyenne avec au moins {report.mvpMinimumGames} apparition{report.mvpMinimumGames > 1 ? "s" : ""} quand la soirée comporte plusieurs matchs.
                  </p>

                </div>

              ) : (

                <p className="p-8 text-center text-sm font-bold text-gray-600">
                  Aucune note joueur disponible.
                </p>

              )}

            </section>

            <section className="rounded-3xl border border-cyan-400/15 bg-[#091626] 2xl:col-span-7">

              <PanelHeader
                title="RÉSUMÉ COLLECTIF"
                right={formatEveningDateLabel(
                  report.date
                )}
              />

              <div className="grid gap-3 p-5 md:grid-cols-2">

                {summary.headlines.map(
                  (
                    item,
                    index
                  ) => (

                    <EveningSummaryCard
                      key={`${item.title}-${index}`}
                      title={
                        item.title
                      }
                      description={
                        item.description
                      }
                      tone={
                        item.tone
                      }
                    />

                  )
                )}

              </div>

            </section>

          </div>

          <div className="mb-5 grid gap-5 2xl:grid-cols-12">

            <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#091626] 2xl:col-span-7">

              <PanelHeader
                title="MATCHS DE LA SOIRÉE"
                right={`${report.matches.length} match(s)`}
              />

              <div className="grid gap-3 p-5 md:grid-cols-2">

                {report.matches.map(
                  (
                    match
                  ) => (

                    <button
                      key={
                        match.id
                      }
                      type="button"
                      onClick={() =>
                        onOpenMatch(
                          match.id
                        )
                      }
                      className={`rounded-2xl border p-4 text-left transition hover:scale-[1.01] ${getMatchCardStyle(
                        match.result
                      )}`}
                    >

                      <div className="flex items-center justify-between gap-3">

                        <div className="min-w-0">

                          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-gray-600">
                            {match.time} • {match.competitionShortName ??
                              match.competitionName ??
                              "Amical"}
                          </p>

                          <p className="mt-2 truncate text-base font-black">
                            {match.opponent}
                          </p>

                        </div>

                        <ResultBadge
                          result={
                            match.result
                          }
                        />

                      </div>

                      <p className="mt-4 text-3xl font-black text-white">
                        {match.goalsFor} - {match.goalsAgainst}
                      </p>

                    </button>

                  )
                )}

              </div>

            </section>

            <section className="rounded-3xl border border-yellow-400/15 bg-[#091626] 2xl:col-span-5">

              <PanelHeader
                title="ÉVOLUTION JOUEURS"
                right="1er → dernier match"
              />

              <div className="space-y-3 p-5">

                <PlayerEveningTrendCard
                  title="Progression notable"
                  player={
                    notableProgression
                  }
                  positive
                  onOpenPlayer={(
                    reportPlayer
                  ) => {
                    const pagePlayer =
                      findPagePlayer(
                        reportPlayer
                      );

                    if (
                      pagePlayer
                    ) {
                      onOpenPlayer(
                        pagePlayer
                      );
                    }
                  }}
                />

                <PlayerEveningTrendCard
                  title="Baisse à surveiller"
                  player={
                    notableDrop
                  }
                  positive={
                    false
                  }
                  onOpenPlayer={(
                    reportPlayer
                  ) => {
                    const pagePlayer =
                      findPagePlayer(
                        reportPlayer
                      );

                    if (
                      pagePlayer
                    ) {
                      onOpenPlayer(
                        pagePlayer
                      );
                    }
                  }}
                />

              </div>

            </section>

          </div>

          <section className="mb-5 rounded-3xl border border-cyan-400/15 bg-[#091626]">

            <PanelHeader
              title="POINTS À RETENIR POUR LE STAFF"
              right="À vérifier avec le ressenti match"
            />

            <div className="grid gap-3 p-5 lg:grid-cols-3">

              {summary.staffPoints.map(
                (
                  point,
                  index
                ) => (

                  <div
                    key={`${point}-${index}`}
                    className="rounded-2xl border border-white/[0.07] bg-black/10 p-4"
                  >

                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-yellow-300">
                      Point {index + 1}
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-6 text-gray-300">
                      {point}
                    </p>

                  </div>

                )
              )}

            </div>

          </section>

          <section className="rounded-3xl border border-white/10 bg-[#07111f] p-5">

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">
              Lecture du rapport
            </p>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Le rapport automatise uniquement ce que les données permettent d&apos;observer : scores, résultats, notes EA et statistiques joueurs. Les points staff sont des indicateurs à confirmer dans le Match Center ; ils ne prétendent pas connaître la cause tactique d&apos;un résultat.
            </p>

          </section>

        </>

      ) : (

        <section className="rounded-3xl border border-white/10 bg-[#091626] p-10 text-center">

          <FileText
            size={36}
            className="mx-auto text-gray-700"
          />

          <p className="mt-4 text-sm font-black text-gray-500">
            Aucun match trouvé pour cette soirée avec les filtres actuels.
          </p>

        </section>

      )}

    </>
  );
}

function ReportKpi({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: "default" | "green" | "red" | "yellow" | "cyan";
}) {
  const valueClass =
    tone === "green"
      ? "text-emerald-300"
      : tone === "red"
      ? "text-rose-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "cyan"
      ? "text-cyan-300"
      : "text-white";

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#091626] p-4">

      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-600">
        {label}
      </p>

      <p className={`mt-2 text-3xl font-black ${valueClass}`}>
        {value}
      </p>

      <p className="mt-1 truncate text-[10px] font-bold text-gray-600">
        {helper}
      </p>

    </div>
  );
}

function ReportMiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/10 p-3 text-center">

      <p className="text-lg font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-gray-700">
        {label}
      </p>

    </div>
  );
}

function EveningSummaryCard({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: "positive" | "warning" | "neutral";
}) {
  const style =
    tone === "positive"
      ? "border-emerald-400/15 bg-emerald-400/[0.04]"
      : tone === "warning"
      ? "border-rose-400/15 bg-rose-400/[0.04]"
      : "border-white/[0.07] bg-black/10";

  return (
    <div className={`rounded-2xl border p-4 ${style}`}>

      <p className="text-sm font-black text-white">
        {title}
      </p>

      <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">
        {description}
      </p>

    </div>
  );
}

function PlayerEveningTrendCard({
  title,
  player,
  positive,
  onOpenPlayer,
}: {
  title: string;
  player: EveningReportPlayer | null | undefined;
  positive: boolean;
  onOpenPlayer: (player: EveningReportPlayer) => void;
}) {
  if (
    !player ||
    player.trendDelta ===
      null ||
    player.firstRating ===
      null ||
    player.lastRating ===
      null
  ) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-5">

        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-600">
          {title}
        </p>

        <p className="mt-2 text-xs font-semibold text-gray-700">
          Aucun écart notable avec au moins deux matchs notés.
        </p>

      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        onOpenPlayer(
          player
        )
      }
      className={`w-full rounded-2xl border p-4 text-left transition ${
        positive
          ? "border-emerald-400/15 bg-emerald-400/[0.035] hover:border-emerald-400/30"
          : "border-rose-400/15 bg-rose-400/[0.035] hover:border-rose-400/30"
      }`}
    >

      <div className="flex items-center justify-between gap-3">

        <div className="min-w-0">

          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-600">
            {title}
          </p>

          <p className="mt-2 truncate font-black text-white">
            {formatPlayerName(
              player.name
            )}
          </p>

          <p className="mt-1 text-[10px] font-bold text-gray-600">
            {player.positions.map(
              formatPosition
            ).join(
              " / "
            )}
          </p>

        </div>

        <div className="text-right">

          <p className={`text-xl font-black ${
            positive
              ? "text-emerald-300"
              : "text-rose-300"
          }`}>
            {player.trendDelta >
            0
              ? "+"
              : ""}
            {player.trendDelta.toFixed(
              2
            )}
          </p>

          <p className="mt-1 text-[9px] font-bold text-gray-600">
            {player.firstRating.toFixed(
              1
            )} → {player.lastRating.toFixed(
              1
            )}
          </p>

        </div>

      </div>

    </button>
  );
}

function buildEveningSummary(
  report: EveningReportResponse | null
) {
  if (
    !report
  ) {
    return {
      headlines: [] as Array<{
        title: string;
        description: string;
        tone: "positive" | "warning" | "neutral";
      }>,
      staffPoints: [] as string[],
    };
  }

  const totals =
    report.totals;

  const winRate =
    eveningWinRate(
      report
    );

  const goalsPerMatch =
    totals.matches >
    0
      ? totals.goalsFor /
        totals.matches
      : 0;

  const concededPerMatch =
    totals.matches >
    0
      ? totals.goalsAgainst /
        totals.matches
      : 0;

  const headlines:
    Array<{
      title: string;
      description: string;
      tone: "positive" | "warning" | "neutral";
    }> = [];

  if (
    winRate >=
    60
  ) {
    headlines.push({
      title:
        "Soirée positive en résultats",
      description: `${totals.wins} victoire(s) sur ${totals.matches} match(s), soit ${winRate.toFixed(
        0
      )}% de victoires.`,
      tone:
        "positive",
    });
  } else if (
    totals.losses >
    totals.wins
  ) {
    headlines.push({
      title:
        "Soirée difficile en résultats",
      description: `${totals.losses} défaite(s) pour ${totals.wins} victoire(s) sur la soirée.`,
      tone:
        "warning",
    });
  } else {
    headlines.push({
      title:
        "Soirée équilibrée",
      description: `${totals.wins}V • ${totals.draws}N • ${totals.losses}D sur ${totals.matches} match(s).`,
      tone:
        "neutral",
    });
  }

  if (
    goalsPerMatch >=
    2
  ) {
    headlines.push({
      title:
        "Bonne production offensive",
      description: `${goalsPerMatch.toFixed(
        2
      )} buts marqués par match sur la soirée.`,
      tone:
        "positive",
    });
  } else if (
    goalsPerMatch <
      1 &&
    totals.matches >=
      2
  ) {
    headlines.push({
      title:
        "Production offensive limitée",
      description: `${goalsPerMatch.toFixed(
        2
      )} but marqué par match sur la soirée.`,
      tone:
        "warning",
    });
  } else {
    headlines.push({
      title:
        "Production offensive",
      description: `${totals.goalsFor} but(s) marqués sur ${totals.matches} match(s).`,
      tone:
        "neutral",
    });
  }

  if (
    concededPerMatch <=
      1 &&
    totals.matches >
      0
  ) {
    headlines.push({
      title:
        "Soirée globalement solide",
      description: `${concededPerMatch.toFixed(
        2
      )} but encaissé par match et ${totals.cleanSheets} clean sheet(s).`,
      tone:
        "positive",
    });
  } else if (
    concededPerMatch >=
    2
  ) {
    headlines.push({
      title:
        "Buts encaissés à surveiller",
      description: `${concededPerMatch.toFixed(
        2
      )} buts encaissés par match sur la soirée.`,
      tone:
        "warning",
    });
  } else {
    headlines.push({
      title:
        "Bilan défensif",
      description: `${totals.goalsAgainst} but(s) encaissé(s) et ${totals.cleanSheets} clean sheet(s).`,
      tone:
        "neutral",
    });
  }

  const closeMatches =
    report.matches.filter(
      (match) =>
        Math.abs(
          match.goalsFor -
            match.goalsAgainst
        ) <=
        1
    );

  if (
    closeMatches.length >
    0
  ) {
    const closeWins =
      closeMatches.filter(
        (match) =>
          match.result ===
          "V"
      ).length;

    headlines.push({
      title:
        "Gestion des matchs serrés",
      description: `${closeWins} victoire(s) sur ${closeMatches.length} match(s) décidés par un but maximum.`,
      tone:
        closeWins /
          closeMatches.length >=
        0.5
          ? "positive"
          : "neutral",
    });
  }

  const staffPoints:
    string[] =
    [];

  if (
    totals.goalsAgainst >=
    totals.matches *
      2
  ) {
    staffPoints.push(
      "Revoir en priorité dans le Match Center les matchs à 2 buts encaissés ou plus afin d'identifier manuellement les situations récurrentes."
    );
  } else if (
    totals.cleanSheets >
    0
  ) {
    staffPoints.push(
      `La soirée contient ${totals.cleanSheets} clean sheet(s) : comparer ces matchs aux autres peut aider le staff à confirmer ce qui a mieux fonctionné défensivement.`
    );
  }

  if (
    totals.goalsFor <
    totals.matches
  ) {
    staffPoints.push(
      "La production offensive est inférieure à un but par match : regarder les matchs sans but permet de vérifier si le problème vient de la création, de la finition ou d'un autre facteur non visible dans les données EA."
    );
  } else {
    staffPoints.push(
      `${totals.goalsFor} but(s) marqués sur la soirée : conserver les séquences offensives qui ont produit les meilleurs résultats et les confronter au ressenti du staff.`
    );
  }

  if (
    report.mvp
  ) {
    staffPoints.push(
      `${formatPlayerName(
        report.mvp.name
      )} ressort MVP automatique avec ${report.mvp.averageRating.toFixed(
        2
      )} de moyenne sur ${report.mvp.games} apparition(s).`
    );
  } else {
    staffPoints.push(
      "Aucune note joueur suffisante pour désigner un MVP automatique."
    );
  }

  return {
    headlines:
      headlines.slice(
        0,
        4
      ),
    staffPoints:
      staffPoints.slice(
        0,
        3
      ),
  };
}

function buildEveningDiscordText(
  report: EveningReportResponse,
  summary: ReturnType<
    typeof buildEveningSummary
  >,
  progression: EveningReportPlayer | null | undefined,
  drop: EveningReportPlayer | null | undefined
) {
  const lines =
    [
      `📊 **GX NOVA — RAPPORT DE SOIRÉE**`,
      `📅 ${formatEveningDateLabel(
        report.date
      )}`,
      "",
      `**Bilan :** ${report.totals.wins}V • ${report.totals.draws}N • ${report.totals.losses}D`,
      `⚽ Buts : ${report.totals.goalsFor} marqués / ${report.totals.goalsAgainst} encaissés`,
      "",
      "**Matchs :**",
      ...report.matches.map(
        (match) =>
          `• ${match.time} — GX NOVA ${match.goalsFor}-${match.goalsAgainst} ${match.opponent} (${match.competitionShortName ??
            match.competitionName ??
            "Amical"})`
      ),
    ];

  if (
    report.mvp
  ) {
    lines.push(
      "",
      `🏆 **MVP : ${formatPlayerName(
        report.mvp.name
      )}** — ${report.mvp.averageRating.toFixed(
        2
      )} de moyenne • ${report.mvp.goals} B • ${report.mvp.assists} PD`
    );
  }

  if (
    progression &&
    progression.trendDelta !==
      null
  ) {
    lines.push(
      `📈 Progression : ${formatPlayerName(
        progression.name
      )} ${progression.trendDelta > 0 ? "+" : ""}${progression.trendDelta.toFixed(
        2
      )}`
    );
  }

  if (
    drop &&
    drop.trendDelta !==
      null
  ) {
    lines.push(
      `📉 À surveiller : ${formatPlayerName(
        drop.name
      )} ${drop.trendDelta.toFixed(
        2
      )}`
    );
  }

  lines.push(
    "",
    "**Points staff :**",
    ...summary.staffPoints.map(
      (
        point,
        index
      ) =>
        `${index + 1}. ${point}`
    )
  );

  return lines.join(
    "\n"
  );
}

function eveningWinRate(
  report: EveningReportResponse
) {
  return report.totals.matches >
    0
    ? (
        report.totals.wins /
        report.totals.matches
      ) *
        100
    : 0;
}

function eveningDateKey(
  value: string
) {
  if (
    !value
  ) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value.slice(
      0,
      10
    );
  }

  const parts =
    new Intl.DateTimeFormat(
      "fr-FR",
      {
        timeZone:
          "Europe/Paris",
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
      }
    ).formatToParts(
      date
    );

  const get =
    (
      type: string
    ) =>
      parts.find(
        (part) =>
          part.type ===
          type
      )?.value ??
      "";

  return `${get(
    "year"
  )}-${get(
    "month"
  )}-${get(
    "day"
  )}`;
}

function formatEveningDateLabel(
  value: string
) {
  const [
    year,
    month,
    day,
  ] =
    value.split(
      "-"
    ).map(
      Number
    );

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day,
        12
      )
    );

  const label =
    new Intl.DateTimeFormat(
      "fr-FR",
      {
        weekday:
          "long",
        day:
          "2-digit",
        month:
          "long",
        year:
          "numeric",
        timeZone:
          "Europe/Paris",
      }
    ).format(
      date
    );

  return (
    label.charAt(
      0
    ).toUpperCase() +
    label.slice(
      1
    )
  );
}

async function exportEveningReportPoster(
  report: EveningReportResponse,
  summary: ReturnType<
    typeof buildEveningSummary
  >,
  progression: EveningReportPlayer | null | undefined,
  drop: EveningReportPlayer | null | undefined
) {
  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    1600;
  canvas.height =
    900;

  const ctx =
    canvas.getContext(
      "2d"
    );

  if (
    !ctx
  ) {
    throw new Error(
      "Canvas indisponible."
    );
  }

  const bg =
    ctx.createLinearGradient(
      0,
      0,
      1600,
      900
    );

  bg.addColorStop(
    0,
    "#030812"
  );
  bg.addColorStop(
    0.58,
    "#071321"
  );
  bg.addColorStop(
    1,
    "#06101d"
  );

  ctx.fillStyle =
    bg;
  ctx.fillRect(
    0,
    0,
    1600,
    900
  );

  ctx.save();
  ctx.globalAlpha =
    0.18;
  ctx.strokeStyle =
    "#22d3ee";
  ctx.lineWidth =
    2;

  for (
    let x =
      -300;
    x <
    1800;
    x +=
    170
  ) {
    ctx.beginPath();
    ctx.moveTo(
      x,
      0
    );
    ctx.lineTo(
      x +
        520,
      900
    );
    ctx.stroke();
  }

  ctx.restore();

  const logo =
    await loadFirstCanvasImage(
      CLUB_LOGO_CANDIDATES
    );

  if (
    logo
  ) {
    ctx.drawImage(
      logo,
      72,
      55,
      130,
      130
    );
  }

  ctx.fillStyle =
    "#facc15";
  ctx.font =
    "900 27px Arial";
  ctx.fillText(
    "GX NOVA • RAPPORT DE SOIRÉE",
    235,
    92
  );

  ctx.fillStyle =
    "#ffffff";
  ctx.font =
    "900 54px Arial";
  ctx.fillText(
    formatEveningDateLabel(
      report.date
    ).toUpperCase(),
    235,
    151
  );

  drawPosterBox(
    ctx,
    72,
    220,
    570,
    245,
    "BILAN",
    "#facc15"
  );

  ctx.fillStyle =
    "#ffffff";
  ctx.font =
    "900 66px Arial";
  ctx.fillText(
    `${report.totals.wins}V  ${report.totals.draws}N  ${report.totals.losses}D`,
    110,
    330
  );

  ctx.fillStyle =
    "#94a3b8";
  ctx.font =
    "700 25px Arial";
  ctx.fillText(
    `${report.totals.goalsFor} buts marqués • ${report.totals.goalsAgainst} encaissés`,
    110,
    382
  );

  ctx.fillText(
    `${report.totals.cleanSheets} clean sheet(s) • ${eveningWinRate(
      report
    ).toFixed(
      0
    )}% de victoires`,
    110,
    422
  );

  drawPosterBox(
    ctx,
    670,
    220,
    858,
    245,
    "MVP DE LA SOIRÉE",
    "#22d3ee"
  );

  if (
    report.mvp
  ) {
    ctx.fillStyle =
      "#ffffff";
    ctx.font =
      "900 42px Arial";
    ctx.fillText(
      formatPlayerName(
        report.mvp.name
      ),
      710,
      320
    );

    ctx.fillStyle =
      "#facc15";
    ctx.font =
      "900 62px Arial";
    ctx.fillText(
      report.mvp.averageRating.toFixed(
        2
      ),
      710,
      397
    );

    ctx.fillStyle =
      "#94a3b8";
    ctx.font =
      "700 23px Arial";
    ctx.fillText(
      `${report.mvp.games} match(s) • ${report.mvp.goals} B • ${report.mvp.assists} PD • ${report.mvp.saves} arrêts`,
      885,
      390
    );
  } else {
    ctx.fillStyle =
      "#64748b";
    ctx.font =
      "700 28px Arial";
    ctx.fillText(
      "Aucune note joueur disponible",
      710,
      350
    );
  }

  drawPosterBox(
    ctx,
    72,
    495,
    960,
    330,
    "MATCHS",
    "#facc15"
  );

  const displayMatches =
    report.matches.slice(
      0,
      6
    );

  displayMatches.forEach(
    (
      match,
      index
    ) => {
      const y =
        575 +
        index *
          39;

      ctx.fillStyle =
        match.result ===
        "V"
          ? "#34d399"
          : match.result ===
            "D"
          ? "#fb7185"
          : "#cbd5e1";

      ctx.font =
        "900 21px Arial";
      ctx.fillText(
        match.result,
        110,
        y
      );

      ctx.fillStyle =
        "#94a3b8";
      ctx.font =
        "700 18px Arial";
      ctx.fillText(
        match.time,
        152,
        y
      );

      ctx.fillStyle =
        "#ffffff";
      ctx.font =
        "900 20px Arial";
      ctx.fillText(
        `GX NOVA ${match.goalsFor}-${match.goalsAgainst} ${truncateCanvasText(
          ctx,
          match.opponent,
          390
        )}`,
        220,
        y
      );

      ctx.fillStyle =
        "#64748b";
      ctx.font =
        "700 17px Arial";
      ctx.fillText(
        match.competitionShortName ??
          match.competitionName ??
          "Amical",
        770,
        y
      );
    }
  );

  drawPosterBox(
    ctx,
    1060,
    495,
    468,
    330,
    "À RETENIR",
    "#22d3ee"
  );

  let pointY =
    575;

  const posterPoints =
    [
      ...summary.staffPoints.slice(
        0,
        2
      ),
    ];

  if (
    progression &&
    progression.trendDelta !==
      null
  ) {
    posterPoints.push(
      `Progression : ${formatPlayerName(
        progression.name
      )} ${progression.trendDelta > 0 ? "+" : ""}${progression.trendDelta.toFixed(
        2
      )}`
    );
  } else if (
    drop &&
    drop.trendDelta !==
      null
  ) {
    posterPoints.push(
      `À surveiller : ${formatPlayerName(
        drop.name
      )} ${drop.trendDelta.toFixed(
        2
      )}`
    );
  }

  for (
    const point
    of posterPoints.slice(
      0,
      3
    )
  ) {
    ctx.fillStyle =
      "#facc15";
    ctx.beginPath();
    ctx.arc(
      1100,
      pointY -
        6,
      5,
      0,
      Math.PI *
        2
    );
    ctx.fill();

    ctx.fillStyle =
      "#cbd5e1";
    ctx.font =
      "700 18px Arial";

    const lines =
      wrapCanvasText(
        ctx,
        point,
        365
      ).slice(
        0,
        3
      );

    for (
      const line
      of lines
    ) {
      ctx.fillText(
        line,
        1120,
        pointY
      );
      pointY +=
        24;
    }

    pointY +=
      18;
  }

  ctx.fillStyle =
    "#475569";
  ctx.font =
    "700 17px Arial";
  ctx.fillText(
    "GX NOVA • FC27 PERFORMANCE CENTER",
    72,
    866
  );

  ctx.textAlign =
    "right";
  ctx.fillText(
    "Données EA • Synthèse automatique staff",
    1528,
    866
  );
  ctx.textAlign =
    "left";

  const blob =
    await new Promise<Blob | null>(
      (
        resolve
      ) =>
        canvas.toBlob(
          resolve,
          "image/png"
        )
    );

  if (
    !blob
  ) {
    throw new Error(
      "Impossible de générer le PNG."
    );
  }

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    url;
  link.download =
    `GX-NOVA-rapport-soiree-${report.date}.png`;

  document.body.appendChild(
    link
  );
  link.click();
  link.remove();

  URL.revokeObjectURL(
    url
  );
}

function drawPosterBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  accent: string
) {
  ctx.save();

  ctx.fillStyle =
    "rgba(9,22,38,0.92)";
  ctx.strokeStyle =
    "rgba(255,255,255,0.10)";
  ctx.lineWidth =
    2;

  ctx.beginPath();
  ctx.roundRect(
    x,
    y,
    width,
    height,
    28
  );
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle =
    accent;
  ctx.font =
    "900 18px Arial";
  ctx.fillText(
    title,
    x +
      38,
    y +
      48
  );

  ctx.restore();
}

async function loadFirstCanvasImage(
  sources: string[]
) {
  for (
    const source
    of sources
  ) {
    try {
      const image =
        await new Promise<HTMLImageElement>(
          (
            resolve,
            reject
          ) => {
            const item =
              new Image();

            item.onload =
              () =>
                resolve(
                  item
                );

            item.onerror =
              reject;

            item.src =
              source;
          }
        );

      return image;
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const words =
    text.split(
      /\s+/
    );

  const lines:
    string[] =
    [];

  let line =
    "";

  for (
    const word
    of words
  ) {
    const test =
      line
        ? `${line} ${word}`
        : word;

    if (
      ctx.measureText(
        test
      ).width >
        maxWidth &&
      line
    ) {
      lines.push(
        line
      );
      line =
        word;
    } else {
      line =
        test;
    }
  }

  if (
    line
  ) {
    lines.push(
      line
    );
  }

  return lines;
}

function truncateCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  if (
    ctx.measureText(
      text
    ).width <=
    maxWidth
  ) {
    return text;
  }

  let value =
    text;

  while (
    value.length >
      2 &&
    ctx.measureText(
      `${value}…`
    ).width >
      maxWidth
  ) {
    value =
      value.slice(
        0,
        -1
      );
  }

  return `${value}…`;
}


function AnalysisDashboard({
  matches,
  players,
  competitions,
  currentFilterLabel,
  onOpenPlayer,
  onOpenMatch,
}: {
  matches: Match[];
  players: Player[];
  competitions: Competition[];
  currentFilterLabel: string;
  onOpenPlayer: (
    player: Player
  ) => void;
  onOpenMatch: (
    matchId: number
  ) => void;
}) {
  const analysis =
    useMemo(() => {
      const overall =
        calculateWindowStats(
          matches
        );

      const recentMatches =
        matches.slice(
          0,
          5
        );

      const previousMatches =
        matches.slice(
          5,
          10
        );

      const recent =
        calculateWindowStats(
          recentMatches
        );

      const previous =
        calculateWindowStats(
          previousMatches
        );

      const lastTen =
        calculateWindowStats(
          matches.slice(
            0,
            10
          )
        );

      const totalPassesMade =
        players.reduce(
          (
            total,
            player
          ) =>
            total +
            player.passesMade,
          0
        );

      const totalPassAttempts =
        players.reduce(
          (
            total,
            player
          ) =>
            total +
            player.passAttempts,
          0
        );

      const totalTacklesMade =
        players.reduce(
          (
            total,
            player
          ) =>
            total +
            player.tacklesMade,
          0
        );

      const totalTackleAttempts =
        players.reduce(
          (
            total,
            player
          ) =>
            total +
            player.tackleAttempts,
          0
        );

      const totalPlayerGames =
        players.reduce(
          (
            total,
            player
          ) =>
            total +
            player.games,
          0
        );

      const averageRating =
        totalPlayerGames >
        0
          ? players.reduce(
              (
                total,
                player
              ) =>
                total +
                player.averageRating *
                  player.games,
              0
            ) /
            totalPlayerGames
          : 0;

      const teamPassSuccess =
        totalPassAttempts >
        0
          ? (
              totalPassesMade /
              totalPassAttempts
            ) *
            100
          : 0;

      const teamTackleSuccess =
        totalTackleAttempts >
        0
          ? (
              totalTacklesMade /
              totalTackleAttempts
            ) *
            100
          : 0;

      const cleanSheets =
        matches.filter(
          (match) =>
            match.goalsAgainst ===
            0
        ).length;

      const failedToScore =
        matches.filter(
          (match) =>
            match.goalsFor ===
            0
        ).length;

      const scoringRate =
        matches.length >
        0
          ? (
              (
                matches.length -
                failedToScore
              ) /
              matches.length
            ) *
            100
          : 0;

      const cleanSheetRate =
        matches.length >
        0
          ? (
              cleanSheets /
              matches.length
            ) *
            100
          : 0;

      const multiGoalMatches =
        matches.filter(
          (match) =>
            match.goalsFor >=
            2
        ).length;

      const concededTwoPlus =
        matches.filter(
          (match) =>
            match.goalsAgainst >=
            2
        ).length;

      const closeMatches =
        matches.filter(
          (match) =>
            Math.abs(
              match.goalsFor -
                match.goalsAgainst
            ) <=
            1
        );

      const closeWins =
        closeMatches.filter(
          (match) =>
            match.result ===
            "V"
        ).length;

      const closeWinRate =
        closeMatches.length >
        0
          ? (
              closeWins /
              closeMatches.length
            ) *
            100
          : 0;

      const resultStreak =
        getCurrentResultStreak(
          matches
        );

      const unbeatenStreak =
        getUnbeatenStreak(
          matches
        );

      const scoringStreak =
        getScoringStreak(
          matches
        );

      const competitionMap =
        new Map<
          string,
          {
            id:
              number | null;
            name:
              string;
            matches:
              Match[];
          }
        >();

      for (
        const match
        of matches
      ) {
        const key =
          match.competitionId
            ? String(
                match.competitionId
              )
            : "unassigned";

        const name =
          match.competitionId
            ? resolveCompetitionName(
                competitions,
                match.competitionId
              )
            : "Non attribué";

        if (
          !competitionMap.has(
            key
          )
        ) {
          competitionMap.set(
            key,
            {
              id:
                match.competitionId ??
                null,
              name,
              matches: [],
            }
          );
        }

        competitionMap
          .get(
            key
          )
          ?.matches.push(
            match
          );
      }

      const competitionInsights =
        Array.from(
          competitionMap.values()
        )
          .map(
            (group) => ({
              id:
                group.id,
              name:
                group.name,
              stats:
                calculateWindowStats(
                  group.matches
                ),
            })
          )
          .sort(
            (a, b) => {
              if (
                b.stats.winRate !==
                a.stats.winRate
              ) {
                return (
                  b.stats.winRate -
                  a.stats.winRate
                );
              }

              if (
                b.stats.goalDifferencePerMatch !==
                a.stats.goalDifferencePerMatch
              ) {
                return (
                  b.stats.goalDifferencePerMatch -
                  a.stats.goalDifferencePerMatch
                );
              }

              return (
                b.stats.played -
                a.stats.played
              );
            }
          );

      const qualifiedCompetitions =
        competitionInsights.filter(
          (item) =>
            item.stats.played >=
            3
        );

      const strongestCompetition =
        qualifiedCompetitions[0] ??
        null;

      const weakestCompetition =
        qualifiedCompetitions.length >
        1
          ? [
              ...qualifiedCompetitions,
            ].sort(
              (a, b) => {
                if (
                  a.stats.winRate !==
                  b.stats.winRate
                ) {
                  return (
                    a.stats.winRate -
                    b.stats.winRate
                  );
                }

                return (
                  a.stats.goalDifferencePerMatch -
                  b.stats.goalDifferencePerMatch
                );
              }
            )[0] ??
            null
          : null;

      const playerForm =
        players
          .map(
            (player) => {
              const primaryStats =
                getPlayerPositionStats(
                  player,
                  player.position
                );

              const ratings =
                (
                  primaryStats?.recentRatings ??
                  []
                ).filter(
                  (rating) =>
                    rating >
                    0
                );

              if (
                ratings.length <
                4
              ) {
                return null;
              }

              const recentCount =
                Math.min(
                  2,
                  ratings.length
                );

              const recentAverage =
                averageNumber(
                  ratings.slice(
                    0,
                    recentCount
                  )
                );

              const olderAverage =
                averageNumber(
                  ratings.slice(
                    recentCount
                  )
                );

              if (
                olderAverage ===
                0
              ) {
                return null;
              }

              return {
                player,
                position:
                  primaryStats?.position ??
                  player.position,
                recentAverage,
                olderAverage,
                delta:
                  recentAverage -
                  olderAverage,
              };
            }
          )
          .filter(
            (
              item
            ): item is {
              player:
                Player;
              position:
                string;
              recentAverage:
                number;
              olderAverage:
                number;
              delta:
                number;
            } =>
              item !==
              null
          );

      const improvingPlayers =
        [
          ...playerForm,
        ]
          .filter(
            (item) =>
              item.delta >=
              0.2
          )
          .sort(
            (a, b) =>
              b.delta -
              a.delta
          )
          .slice(
            0,
            4
          );

      const decliningPlayers =
        [
          ...playerForm,
        ]
          .filter(
            (item) =>
              item.delta <=
              -0.2
          )
          .sort(
            (a, b) =>
              a.delta -
              b.delta
          )
          .slice(
            0,
            4
          );

      const regularPlayers =
        players
          .map(
            (player) => {
              const primaryStats =
                getPlayerPositionStats(
                  player,
                  player.position
                );

              if (
                !primaryStats ||
                primaryStats.games <
                  3
              ) {
                return null;
              }

              const ratings =
                primaryStats.recentRatings.filter(
                  (rating) =>
                    rating >
                    0
                );

              if (
                ratings.length <
                4
              ) {
                return null;
              }

              return {
                player,
                position:
                  primaryStats.position,
                average:
                  averageNumber(
                    ratings
                  ),
                deviation:
                  standardDeviation(
                    ratings
                  ),
                sample:
                  ratings.length,
              };
            }
          )
          .filter(
            (
              item
            ): item is {
              player:
                Player;
              position:
                string;
              average:
                number;
              deviation:
                number;
              sample:
                number;
            } =>
              item !==
              null
          )
          .sort(
            (a, b) => {
              if (
                a.deviation !==
                b.deviation
              ) {
                return (
                  a.deviation -
                  b.deviation
                );
              }

              return (
                b.average -
                a.average
              );
            }
          )
          .slice(
            0,
            5
          );

      const signals:
        AnalysisSignal[] =
        [];

      const recommendations:
        AnalysisRecommendation[] =
        [];

      if (
        recent.played >
          0 &&
        previous.played >
          0
      ) {
        const winDelta =
          recent.winRate -
          previous.winRate;

        const goalDelta =
          recent.goalDifferencePerMatch -
          previous.goalDifferencePerMatch;

        if (
          winDelta >=
            20 ||
          goalDelta >=
            0.75
        ) {
          signals.push({
            title:
              "Dynamique récente en progression",
            description: `Sur les 5 derniers matchs, GX NOVA affiche ${recent.winRate.toFixed(
              0
            )}% de victoires contre ${previous.winRate.toFixed(
              0
            )}% sur les 5 précédents.`,
            tone:
              "positive",
          });
        } else if (
          winDelta <=
            -20 ||
          goalDelta <=
            -0.75
        ) {
          signals.push({
            title:
              "Dynamique récente en retrait",
            description: `Le taux de victoire récent est de ${recent.winRate.toFixed(
              0
            )}% contre ${previous.winRate.toFixed(
              0
            )}% sur les 5 matchs précédents.`,
            tone:
              "warning",
          });
        } else {
          signals.push({
            title:
              "Dynamique globalement stable",
            description:
              "Les 5 derniers matchs restent proches de la fenêtre précédente en matière de résultats.",
            tone:
              "neutral",
          });
        }

        const attackDelta =
          recent.goalsForPerMatch -
          previous.goalsForPerMatch;

        if (
          attackDelta >=
          0.4
        ) {
          signals.push({
            title:
              "Production offensive en hausse",
            description: `${recent.goalsForPerMatch.toFixed(
              2
            )} buts marqués par match récemment, contre ${previous.goalsForPerMatch.toFixed(
              2
            )} précédemment.`,
            tone:
              "positive",
          });
        } else if (
          attackDelta <=
          -0.4
        ) {
          signals.push({
            title:
              "Production offensive en baisse",
            description: `${recent.goalsForPerMatch.toFixed(
              2
            )} buts marqués par match récemment, contre ${previous.goalsForPerMatch.toFixed(
              2
            )} précédemment.`,
            tone:
              "warning",
          });
        }

        const defensiveDelta =
          recent.goalsAgainstPerMatch -
          previous.goalsAgainstPerMatch;

        if (
          defensiveDelta <=
          -0.4
        ) {
          signals.push({
            title:
              "Buts encaissés en baisse",
            description: `${recent.goalsAgainstPerMatch.toFixed(
              2
            )} but encaissé par match récemment, contre ${previous.goalsAgainstPerMatch.toFixed(
              2
            )} auparavant.`,
            tone:
              "positive",
          });
        } else if (
          defensiveDelta >=
          0.4
        ) {
          signals.push({
            title:
              "Buts encaissés en hausse",
            description: `${recent.goalsAgainstPerMatch.toFixed(
              2
            )} buts encaissés par match récemment, contre ${previous.goalsAgainstPerMatch.toFixed(
              2
            )} auparavant.`,
            tone:
              "warning",
          });
        }
      } else if (
        matches.length >
        0
      ) {
        signals.push({
          title:
            "Échantillon encore limité",
          description:
            "Il faut 10 matchs dans le filtre actuel pour comparer proprement les 5 derniers aux 5 précédents.",
          tone:
            "neutral",
        });
      }

      if (
        scoringRate >=
          90 &&
        matches.length >=
          5
      ) {
        signals.push({
          title:
            "Attaque régulièrement présente",
          description: `GX NOVA marque dans ${scoringRate.toFixed(
            0
          )}% des matchs de la sélection.`,
          tone:
            "positive",
        });
      } else if (
        scoringRate <
          70 &&
        matches.length >=
          5
      ) {
        signals.push({
          title:
            "Irrégularité offensive",
          description: `GX NOVA reste sans marquer dans ${(100 -
            scoringRate).toFixed(
            0
          )}% des matchs de la sélection.`,
          tone:
            "warning",
        });
      }

      if (
        cleanSheetRate >=
          40 &&
        matches.length >=
          5
      ) {
        signals.push({
          title:
            "Solidité défensive mesurable",
          description: `${cleanSheetRate.toFixed(
            0
          )}% des matchs se terminent sans but encaissé.`,
          tone:
            "positive",
        });
      } else if (
        overall.goalsAgainstPerMatch >=
          2 &&
        matches.length >=
          5
      ) {
        signals.push({
          title:
            "Volume de buts encaissés élevé",
          description: `${overall.goalsAgainstPerMatch.toFixed(
            2
          )} buts encaissés par match sur le périmètre actuel.`,
          tone:
            "warning",
        });
      }

      if (
        teamPassSuccess >=
          80 &&
        totalPassAttempts >=
          50
      ) {
        signals.push({
          title:
            "Bonne sécurité de passe",
          description: `${teamPassSuccess.toFixed(
            1
          )}% des passes tentées sont réussies sur le périmètre actuel.`,
          tone:
            "positive",
        });
      } else if (
        teamPassSuccess >
          0 &&
        teamPassSuccess <
          70 &&
        totalPassAttempts >=
          40
      ) {
        signals.push({
          title:
            "Déchet dans la circulation",
          description: `La réussite de passe collective est de ${teamPassSuccess.toFixed(
            1
          )}%.`,
          tone:
            "warning",
        });
      }

      if (
        closeMatches.length >=
        4
      ) {
        if (
          closeWinRate >=
          60
        ) {
          signals.push({
            title:
              "Bonne gestion des matchs serrés",
            description: `${closeWinRate.toFixed(
              0
            )}% de victoires sur ${closeMatches.length} matchs décidés par un but maximum.`,
            tone:
              "positive",
          });
        } else if (
          closeWinRate <=
          30
        ) {
          signals.push({
            title:
              "Matchs serrés peu convertis",
            description: `${closeWinRate.toFixed(
              0
            )}% de victoires sur ${closeMatches.length} matchs décidés par un but maximum.`,
            tone:
              "warning",
          });
        }
      }

      if (
        strongestCompetition &&
        qualifiedCompetitions.length >
          1
      ) {
        signals.push({
          title:
            "Compétition actuellement la plus favorable",
          description: `${strongestCompetition.name} : ${strongestCompetition.stats.winRate.toFixed(
            0
          )}% de victoires sur ${strongestCompetition.stats.played} matchs.`,
          tone:
            "positive",
        });
      }

      if (
        scoringRate <
          70 &&
        matches.length >=
          3
      ) {
        recommendations.push({
          priority:
            1,
          title:
            "Retrouver de la régularité offensive",
          reason: `${(
            100 -
            scoringRate
          ).toFixed(
            0
          )}% des matchs du filtre actuel se terminent sans but marqué.`,
          action:
            "Utiliser les derniers matchs sans but pour repérer les séquences à revoir avec l'équipe. Les données disponibles ne permettent pas d'identifier seules la cause tactique.",
        });
      }

      if (
        overall.goalsAgainstPerMatch >=
          2 ||
        (
          recent.played >
            0 &&
          previous.played >
            0 &&
          recent.goalsAgainstPerMatch -
            previous.goalsAgainstPerMatch >=
            0.4
        )
      ) {
        recommendations.push({
          priority:
            1,
          title:
            "Prioriser la réduction des buts encaissés",
          reason: `GX NOVA concède ${overall.goalsAgainstPerMatch.toFixed(
            2
          )} buts par match sur le périmètre actuel.`,
          action:
            "Revoir en priorité les matchs à 2 buts encaissés ou plus et identifier manuellement les situations récurrentes.",
        });
      }

      if (
        closeMatches.length >=
          4 &&
        closeWinRate <=
          30
      ) {
        recommendations.push({
          priority:
            2,
          title:
            "Mieux convertir les matchs serrés",
          reason: `${closeWins} victoire(s) sur ${closeMatches.length} matchs décidés par un but maximum.`,
          action:
            "Comparer les fins de matchs serrés dans le Match Center afin de repérer ce qui distingue les victoires des nuls et défaites.",
        });
      }

      if (
        teamPassSuccess >
          0 &&
        teamPassSuccess <
          70 &&
        totalPassAttempts >=
          40
      ) {
        recommendations.push({
          priority:
            2,
          title:
            "Sécuriser la circulation",
          reason: `La réussite de passe collective est de ${teamPassSuccess.toFixed(
            1
          )}%.`,
          action:
            "Utiliser cet indicateur comme alerte et vérifier les matchs concernés avant de modifier les consignes collectives.",
        });
      }

      if (
        teamTackleSuccess >
          0 &&
        teamTackleSuccess <
          35 &&
        totalTackleAttempts >=
          20
      ) {
        recommendations.push({
          priority:
            2,
          title:
            "Surveiller l'efficacité défensive individuelle",
          reason: `Le taux de réussite au tacle est de ${teamTackleSuccess.toFixed(
            1
          )}%.`,
          action:
            "Ouvrir les fiches joueurs et comparer les défenseurs et milieux uniquement sur leur poste réel avant de tirer une conclusion.",
        });
      }

      if (
        recent.played >
          0 &&
        previous.played >
          0 &&
        recent.winRate <=
          previous.winRate -
            20
      ) {
        recommendations.push({
          priority:
            2,
          title:
            "Stabiliser la dynamique récente",
          reason: `Le taux de victoire est passé de ${previous.winRate.toFixed(
            0
          )}% à ${recent.winRate.toFixed(
            0
          )}%.`,
          action:
            "Conserver quelques principes collectifs prioritaires pendant plusieurs matchs puis vérifier si les indicateurs repartent à la hausse.",
        });
      }

      if (
        recommendations.length ===
          0 &&
        matches.length >
          0
      ) {
        recommendations.push({
          priority:
            3,
          title:
            "Conserver la base actuelle",
          reason:
            "Aucun signal chiffré majeur ne ressort comme critique sur le filtre sélectionné.",
          action:
            "Continuer à suivre la tendance et utiliser les fiches de match pour confirmer les impressions du staff.",
        });
      }

      const trendDelta =
        recent.played >
          0 &&
        previous.played >
          0
          ? recent.winRate -
            previous.winRate
          : 0;

      const trend =
        recent.played >
          0 &&
        previous.played >
          0
          ? trendDelta >
            10
            ? "positive"
            : trendDelta <
              -10
            ? "negative"
            : "stable"
          : "insufficient";

      const sampleLevel =
        matches.length >=
        15
          ? "high"
          : matches.length >=
            8
          ? "medium"
          : "low";

      const sampleLabel =
        sampleLevel ===
        "high"
          ? "Échantillon solide"
          : sampleLevel ===
            "medium"
          ? "Échantillon correct"
          : "Échantillon limité";

      const strongestPoint =
        cleanSheetRate >=
          40
          ? `Solidité : ${cleanSheetRate.toFixed(
              0
            )}% de clean sheets.`
          : scoringRate >=
            85
          ? `Régularité offensive : but marqué dans ${scoringRate.toFixed(
              0
            )}% des matchs.`
          : overall.goalDifferencePerMatch >
            0
          ? `Différence de buts positive : ${formatSigned(
              overall.goalDifferencePerMatch
            )} par match.`
          : "Aucun point fort chiffré dominant ne ressort encore.";

      const vigilance =
        overall.goalsAgainstPerMatch >=
          2
          ? `Vigilance défensive : ${overall.goalsAgainstPerMatch.toFixed(
              2
            )} buts encaissés par match.`
          : scoringRate <
            70
          ? `Vigilance offensive : ${(100 -
              scoringRate).toFixed(
              0
            )}% des matchs sans but marqué.`
          : closeMatches.length >=
              4 &&
            closeWinRate <=
              30
          ? `Vigilance sur les matchs serrés : ${closeWinRate.toFixed(
              0
            )}% de victoires.`
          : "Pas de signal d'alerte majeur sur les données sélectionnées.";

      return {
        overall,
        recent,
        previous,
        lastTen,
        averageRating,
        teamPassSuccess,
        teamTackleSuccess,
        cleanSheets,
        cleanSheetRate,
        failedToScore,
        scoringRate,
        multiGoalMatches,
        concededTwoPlus,
        closeMatches:
          closeMatches.length,
        closeWins,
        closeWinRate,
        resultStreak,
        unbeatenStreak,
        scoringStreak,
        improvingPlayers,
        decliningPlayers,
        regularPlayers,
        competitionInsights,
        strongestCompetition,
        weakestCompetition,
        signals:
          signals.slice(
            0,
            8
          ),
        recommendations:
          recommendations
            .sort(
              (a, b) =>
                a.priority -
                b.priority
            )
            .slice(
              0,
              5
            ),
        recentMatches,
        trend,
        sampleLevel,
        sampleLabel,
        strongestPoint,
        vigilance,
      };
    }, [
      matches,
      players,
      competitions,
    ]);

  return (
    <>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

        <div>

          <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
            GX NOVA • ANALYSES 2.0
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Centre d&apos;analyse staff
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-500">
            Lecture automatique des tendances réelles de l&apos;équipe à partir des scores et statistiques EA disponibles. Les notes joueurs sont analysées sur leur poste principal pour éviter de mélanger des rôles différents.
          </p>

          <p className="mt-2 text-xs font-bold text-cyan-300">
            {currentFilterLabel}
          </p>

        </div>

        <div className={`rounded-2xl border px-5 py-4 ${
          analysis.sampleLevel ===
          "high"
            ? "border-emerald-400/20 bg-emerald-400/[0.05]"
            : analysis.sampleLevel ===
              "medium"
            ? "border-yellow-400/20 bg-yellow-400/[0.05]"
            : "border-white/10 bg-white/[0.025]"
        }`}>

          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-gray-600">
            Fiabilité de lecture
          </p>

          <p className={`mt-1 text-sm font-black ${
            analysis.sampleLevel ===
            "high"
              ? "text-emerald-300"
              : analysis.sampleLevel ===
                "medium"
              ? "text-yellow-300"
              : "text-gray-300"
          }`}>
            {analysis.sampleLabel}
          </p>

          <p className="mt-1 text-[10px] font-bold text-gray-600">
            {matches.length} match{matches.length > 1 ? "s" : ""} dans le filtre
          </p>

        </div>

      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">

        <AnalysisSummaryCard
          label="Tendance"
          value={
            analysis.trend ===
            "positive"
              ? "En hausse"
              : analysis.trend ===
                "negative"
              ? "En baisse"
              : analysis.trend ===
                "stable"
              ? "Stable"
              : "À confirmer"
          }
          subtitle="5 derniers vs 5 précédents"
          tone={
            analysis.trend ===
            "positive"
              ? "positive"
              : analysis.trend ===
                "negative"
              ? "warning"
              : "neutral"
          }
        />

        <AnalysisSummaryCard
          label="Bilan"
          value={`${analysis.overall.winRate.toFixed(
            0
          )}%`}
          subtitle={`${analysis.overall.wins}V • ${analysis.overall.draws}N • ${analysis.overall.losses}D`}
          tone={
            analysis.overall.winRate >=
            60
              ? "positive"
              : analysis.overall.winRate <
                  35 &&
                matches.length >=
                  5
              ? "warning"
              : "neutral"
          }
        />

        <AnalysisSummaryCard
          label="Attaque"
          value={analysis.overall.goalsForPerMatch.toFixed(
            2
          )}
          subtitle={`${analysis.scoringRate.toFixed(
            0
          )}% des matchs avec but`}
          tone={
            analysis.scoringRate >=
            85
              ? "positive"
              : analysis.scoringRate <
                  70 &&
                matches.length >=
                  5
              ? "warning"
              : "neutral"
          }
        />

        <AnalysisSummaryCard
          label="Défense"
          value={analysis.overall.goalsAgainstPerMatch.toFixed(
            2
          )}
          subtitle={`${analysis.cleanSheetRate.toFixed(
            0
          )}% de clean sheets`}
          tone={
            analysis.cleanSheetRate >=
            40
              ? "positive"
              : analysis.overall.goalsAgainstPerMatch >=
                  2 &&
                matches.length >=
                  5
              ? "warning"
              : "neutral"
          }
        />

        <AnalysisSummaryCard
          label="Réussite passes"
          value={`${analysis.teamPassSuccess.toFixed(
            1
          )}%`}
          subtitle="Pondérée par les tentatives"
          tone={
            analysis.teamPassSuccess >=
            80
              ? "positive"
              : analysis.teamPassSuccess >
                    0 &&
                  analysis.teamPassSuccess <
                    70
              ? "warning"
              : "neutral"
          }
        />

        <AnalysisSummaryCard
          label="Note collective"
          value={analysis.averageRating.toFixed(
            2
          )}
          subtitle={`${players.length} joueurs`}
          tone="neutral"
        />

      </div>

      <section className="mb-5 overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.055] via-[#091626] to-cyan-400/[0.025]">

        <div className="border-b border-white/[0.07] px-5 py-4">

          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">
            Brief staff
          </p>

          <h3 className="mt-1 text-xl font-black">
            Ce que disent les chiffres
          </h3>

        </div>

        <div className="grid gap-3 p-5 lg:grid-cols-3">

          <AnalysisBriefCard
            label="Point fort"
            value={
              analysis.strongestPoint
            }
            tone="positive"
          />

          <AnalysisBriefCard
            label="Vigilance"
            value={
              analysis.vigilance
            }
            tone={
              analysis.vigilance.startsWith(
                "Pas de"
              )
                ? "neutral"
                : "warning"
            }
          />

          <AnalysisBriefCard
            label="Contexte compétition"
            value={
              analysis.strongestCompetition
                ? `${analysis.strongestCompetition.name} ressort actuellement à ${analysis.strongestCompetition.stats.winRate.toFixed(
                    0
                  )}% de victoires sur ${analysis.strongestCompetition.stats.played} matchs.`
                : analysis.competitionInsights.length >
                    0
                ? "Il faut au moins 3 matchs dans une compétition pour dégager une tendance fiable."
                : "Aucune compétition disponible dans ce filtre."
            }
            tone="neutral"
          />

        </div>

      </section>

      <div className="mb-5 grid gap-5 2xl:grid-cols-12">

        <section className="rounded-3xl border border-cyan-400/15 bg-[#091626] 2xl:col-span-7">

          <PanelHeader
            title="5 DERNIERS VS 5 PRÉCÉDENTS"
            right={
              analysis.previous.played >
              0
                ? "Comparaison active"
                : "Historique insuffisant"
            }
          />

          <div className="grid gap-4 p-5 md:grid-cols-2">

            <AnalysisWindowCard
              title="5 derniers"
              stats={
                analysis.recent
              }
              highlight
            />

            <AnalysisWindowCard
              title="5 précédents"
              stats={
                analysis.previous
              }
            />

          </div>

          {analysis.recent.played >
            0 &&
            analysis.previous.played >
              0 && (

            <div className="grid gap-3 border-t border-white/5 p-5 md:grid-cols-3">

              <DeltaBox
                label="Taux de victoire"
                value={
                  analysis.recent.winRate -
                  analysis.previous.winRate
                }
                suffix=" pts"
                higherIsBetter
              />

              <DeltaBox
                label="Buts marqués / match"
                value={
                  analysis.recent.goalsForPerMatch -
                  analysis.previous.goalsForPerMatch
                }
                higherIsBetter
              />

              <DeltaBox
                label="Buts encaissés / match"
                value={
                  analysis.recent.goalsAgainstPerMatch -
                  analysis.previous.goalsAgainstPerMatch
                }
                higherIsBetter={
                  false
                }
              />

            </div>

          )}

        </section>

        <section className="rounded-3xl border border-yellow-400/20 bg-[#091626] 2xl:col-span-5">

          <PanelHeader
            title="SÉRIES & MATCHS SERRÉS"
            right="Situation actuelle"
          />

          <div className="grid grid-cols-2 gap-3 p-5">

            <StreakCard
              label="Résultat"
              value={
                analysis.resultStreak.count >
                0
                  ? `${analysis.resultStreak.count} ${resultLabel(
                      analysis.resultStreak.result
                    )}`
                  : "-"
              }
              subtitle="Série actuelle"
            />

            <StreakCard
              label="Sans défaite"
              value={
                analysis.unbeatenStreak
              }
              subtitle="Match(s) consécutif(s)"
            />

            <StreakCard
              label="Avec un but"
              value={
                analysis.scoringStreak
              }
              subtitle="Match(s) consécutif(s)"
            />

            <StreakCard
              label="Matchs serrés"
              value={`${analysis.closeWinRate.toFixed(
                0
              )}%`}
              subtitle={`${analysis.closeWins}V sur ${analysis.closeMatches}`}
            />

          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-white/[0.07] p-5">

            <AnalysisMiniMetric
              label="2+ buts marqués"
              value={
                analysis.multiGoalMatches
              }
              helper="match(s)"
            />

            <AnalysisMiniMetric
              label="2+ buts encaissés"
              value={
                analysis.concededTwoPlus
              }
              helper="match(s)"
            />

          </div>

        </section>

      </div>

      <div className="mb-5 grid gap-5 2xl:grid-cols-12">

        <section className="overflow-hidden rounded-3xl border border-blue-400/15 bg-[#091626] 2xl:col-span-7">

          <PanelHeader
            title="LECTURE PAR COMPÉTITION"
            right="Minimum conseillé : 3 matchs"
          />

          {analysis.competitionInsights.length >
          0 ? (

            <div className="grid gap-3 p-5 md:grid-cols-2">

              {analysis.competitionInsights.map(
                (
                  item,
                  index
                ) => (

                  <CompetitionAnalysisCard
                    key={
                      item.id ??
                      item.name
                    }
                    name={
                      item.name
                    }
                    stats={
                      item.stats
                    }
                    rank={
                      index +
                      1
                    }
                    qualified={
                      item.stats.played >=
                      3
                    }
                    strongest={
                      analysis.strongestCompetition?.id ===
                        item.id &&
                      analysis.strongestCompetition?.name ===
                        item.name
                    }
                    weakest={
                      analysis.weakestCompetition?.id ===
                        item.id &&
                      analysis.weakestCompetition?.name ===
                        item.name
                    }
                  />

                )
              )}

            </div>

          ) : (

            <p className="p-8 text-center text-sm font-bold text-gray-600">
              Aucune compétition disponible.
            </p>

          )}

        </section>

        <section className="rounded-3xl border border-yellow-400/20 bg-[#091626] 2xl:col-span-5">

          <PanelHeader
            title="AXES DE TRAVAIL"
            right="Priorités calculées"
          />

          <div className="space-y-3 p-5">

            {analysis.recommendations.map(
              (
                recommendation,
                index
              ) => (

                <RecommendationCard
                  key={`${recommendation.title}-${index}`}
                  recommendation={
                    recommendation
                  }
                />

              )
            )}

          </div>

        </section>

      </div>

      <section className="mb-5 rounded-3xl border border-cyan-400/15 bg-[#091626]">

        <PanelHeader
          title="SIGNAUX DÉTECTÉS"
          right={`${analysis.signals.length} constat(s)`}
        />

        <div className="grid gap-3 p-5 lg:grid-cols-2">

          {analysis.signals.length >
          0 ? (

            analysis.signals.map(
              (
                signal,
                index
              ) => (

                <AnalysisSignalCard
                  key={`${signal.title}-${index}`}
                  signal={
                    signal
                  }
                />

              )
            )

          ) : (

            <p className="py-8 text-center text-sm text-gray-600 lg:col-span-2">
              Pas assez de données pour générer des signaux.
            </p>

          )}

        </div>

      </section>

      <div className="mb-5 grid gap-5 2xl:grid-cols-3">

        <section className="rounded-3xl border border-emerald-400/15 bg-[#091626]">

          <PanelHeader
            title="JOUEURS EN PROGRESSION"
            right="Poste principal"
          />

          <div className="p-5">

            {analysis.improvingPlayers.length >
            0 ? (

              <div className="space-y-3">

                {analysis.improvingPlayers.map(
                  (item) => (

                    <PlayerFormCard
                      key={
                        item.player.id
                      }
                      player={
                        item.player
                      }
                      position={
                        item.position
                      }
                      delta={
                        item.delta
                      }
                      recentAverage={
                        item.recentAverage
                      }
                      olderAverage={
                        item.olderAverage
                      }
                      onOpenPlayer={
                        onOpenPlayer
                      }
                    />

                  )
                )}

              </div>

            ) : (

              <p className="py-8 text-center text-sm text-gray-600">
                Aucune hausse nette d&apos;au moins 0,20 point sur le poste principal.
              </p>

            )}

          </div>

        </section>

        <section className="rounded-3xl border border-cyan-400/15 bg-[#091626]">

          <PanelHeader
            title="JOUEURS LES PLUS RÉGULIERS"
            right="4 notes mini"
          />

          <div className="p-5">

            {analysis.regularPlayers.length >
            0 ? (

              <div className="space-y-3">

                {analysis.regularPlayers.map(
                  (item) => (

                    <PlayerConsistencyCard
                      key={
                        item.player.id
                      }
                      player={
                        item.player
                      }
                      position={
                        item.position
                      }
                      average={
                        item.average
                      }
                      deviation={
                        item.deviation
                      }
                      sample={
                        item.sample
                      }
                      onOpenPlayer={
                        onOpenPlayer
                      }
                    />

                  )
                )}

              </div>

            ) : (

              <p className="py-8 text-center text-sm text-gray-600">
                Pas encore assez de notes par poste pour mesurer la régularité.
              </p>

            )}

          </div>

        </section>

        <section className="rounded-3xl border border-rose-400/15 bg-[#091626]">

          <PanelHeader
            title="JOUEURS À SURVEILLER"
            right="Poste principal"
          />

          <div className="p-5">

            {analysis.decliningPlayers.length >
            0 ? (

              <div className="space-y-3">

                {analysis.decliningPlayers.map(
                  (item) => (

                    <PlayerFormCard
                      key={
                        item.player.id
                      }
                      player={
                        item.player
                      }
                      position={
                        item.position
                      }
                      delta={
                        item.delta
                      }
                      recentAverage={
                        item.recentAverage
                      }
                      olderAverage={
                        item.olderAverage
                      }
                      onOpenPlayer={
                        onOpenPlayer
                      }
                    />

                  )
                )}

              </div>

            ) : (

              <p className="py-8 text-center text-sm text-gray-600">
                Aucune baisse nette d&apos;au moins 0,20 point sur le poste principal.
              </p>

            )}

          </div>

        </section>

      </div>

      <section className="mb-5 rounded-3xl border border-white/10 bg-[#091626]">

        <PanelHeader
          title="LECTURE DES DERNIERS MATCHS"
          right="5 derniers"
        />

        <div className="grid gap-3 p-5 md:grid-cols-5">

          {analysis.recentMatches.map(
            (
              match,
              index
            ) => (

              <button
                key={
                  match.id ??
                  match.matchId
                }
                onClick={() => {
                  if (
                    match.id
                  ) {
                    onOpenMatch(
                      match.id
                    );
                  }
                }}
                className={`rounded-2xl border p-4 text-left transition ${getMatchCardStyle(
                  match.result
                )}`}
              >

                <div className="flex items-center justify-between">

                  <span className="text-xs font-black text-gray-600">
                    M{index + 1}
                  </span>

                  <ResultBadge
                    result={
                      match.result
                    }
                  />

                </div>

                <p className="mt-4 truncate font-black">
                  {match.opponent}
                </p>

                <p className="mt-2 text-2xl font-black">
                  {match.goalsFor} - {match.goalsAgainst}
                </p>

                <p className="mt-2 text-[10px] text-gray-600">
                  {formatDate(
                    match.date
                  )}
                </p>

              </button>

            )
          )}

        </div>

      </section>

      <section className="rounded-3xl border border-white/10 bg-[#07111f]">

        <div className="p-5">

          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
            Limites de l&apos;analyse
          </p>

          <p className="mt-3 max-w-6xl text-sm leading-6 text-gray-600">
            Analyses 2.0 utilise les scores, résultats, notes et statistiques individuelles réellement enregistrés. Le module ne connaît pas la possession, les xG, les zones de perte, les hauteurs de bloc, les courses sans ballon ni les consignes réellement appliquées. Les axes proposés sont donc des indicateurs pour le staff à vérifier dans les matchs, et non des diagnostics tactiques certains.
          </p>

        </div>

      </section>

    </>
  );
}

function AnalysisBriefCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "positive"
    | "warning"
    | "neutral";
}) {
  const style =
    tone ===
    "positive"
      ? "border-emerald-400/15 bg-emerald-400/[0.04]"
      : tone ===
        "warning"
      ? "border-rose-400/15 bg-rose-400/[0.04]"
      : "border-white/[0.07] bg-black/10";

  return (
    <div className={`rounded-2xl border p-4 ${style}`}>

      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-600">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold leading-6 text-gray-300">
        {value}
      </p>

    </div>
  );
}

function AnalysisMiniMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/10 p-3">

      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-700">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-[9px] font-bold text-gray-600">
        {helper}
      </p>

    </div>
  );
}

function CompetitionAnalysisCard({
  name,
  stats,
  rank,
  qualified,
  strongest,
  weakest,
}: {
  name: string;
  stats: WindowStats;
  rank: number;
  qualified: boolean;
  strongest: boolean;
  weakest: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${
      strongest
        ? "border-emerald-400/20 bg-emerald-400/[0.04]"
        : weakest
        ? "border-rose-400/15 bg-rose-400/[0.035]"
        : "border-white/[0.07] bg-black/10"
    }`}>

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <div className="flex flex-wrap items-center gap-2">

            <p className="truncate font-black text-white">
              {name}
            </p>

            {strongest && (

              <span className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.07] px-2 py-1 text-[8px] font-black uppercase text-emerald-300">
                Meilleure tendance
              </span>

            )}

            {weakest && !strongest && (

              <span className="rounded-md border border-rose-400/15 bg-rose-400/[0.07] px-2 py-1 text-[8px] font-black uppercase text-rose-300">
                À surveiller
              </span>

            )}

          </div>

          <p className="mt-1 text-[10px] font-bold text-gray-600">
            {stats.played} match{stats.played > 1 ? "s" : ""} • {stats.wins}V {stats.draws}N {stats.losses}D
          </p>

        </div>

        <span className="text-[10px] font-black text-gray-700">
          #{rank}
        </span>

      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">

        <AnalysisMiniMetric
          label="Victoires"
          value={`${stats.winRate.toFixed(
            0
          )}%`}
          helper="taux"
        />

        <AnalysisMiniMetric
          label="BP / M"
          value={stats.goalsForPerMatch.toFixed(
            2
          )}
          helper="attaque"
        />

        <AnalysisMiniMetric
          label="BC / M"
          value={stats.goalsAgainstPerMatch.toFixed(
            2
          )}
          helper="défense"
        />

      </div>

      {!qualified && (

        <p className="mt-3 text-[9px] font-bold text-yellow-200/60">
          Tendance indicative : moins de 3 matchs.
        </p>

      )}

    </div>
  );
}

function PlayerConsistencyCard({
  player,
  position,
  average,
  deviation,
  sample,
  onOpenPlayer,
}: {
  player: Player;
  position: string;
  average: number;
  deviation: number;
  sample: number;
  onOpenPlayer: (
    player: Player
  ) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onOpenPlayer(
          player
        )
      }
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#06111f] p-4 text-left transition hover:border-cyan-400/25"
    >

      <div className="flex min-w-0 items-center gap-3">

        <PlayerAvatar
          player={
            player
          }
        />

        <div className="min-w-0">

          <p className="truncate font-black">
            {formatPlayerName(
              player.name
            )}
          </p>

          <p className="mt-1 text-[10px] font-bold text-gray-600">
            {formatPosition(
              position
            )} • {sample} notes • moy. {average.toFixed(
              2
            )}
          </p>

        </div>

      </div>

      <div className="text-right">

        <p className="text-lg font-black text-cyan-300">
          ±{deviation.toFixed(
            2
          )}
        </p>

        <p className="text-[8px] font-black uppercase text-gray-700">
          variation
        </p>

      </div>

    </button>
  );
}

function AnalysisSummaryCard({
  label,
  value,
  subtitle,
  tone,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  tone: "positive" | "warning" | "neutral";
}) {
  const style =
    tone === "positive"
      ? "border-green-400/20 bg-green-400/[0.05] text-green-400"
      : tone === "warning"
      ? "border-red-400/20 bg-red-400/[0.05] text-red-400"
      : "border-blue-400/15 bg-[#091626] text-yellow-400";

  return (
    <div className={`rounded-2xl border p-5 ${style}`}>

      <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>

      <p className="mt-2 text-xs text-gray-600">
        {subtitle}
      </p>

    </div>
  );
}

function AnalysisWindowCard({
  title,
  stats,
  highlight = false,
}: {
  title: string;
  stats: WindowStats;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight
          ? "border-yellow-400/25 bg-yellow-400/[0.04]"
          : "border-white/10 bg-[#06111f]"
      }`}
    >

      <div className="flex items-center justify-between">

        <p className="font-black">
          {title}
        </p>

        <span className="text-xs text-gray-600">
          {stats.played} match(s)
        </span>

      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">

        <Kpi
          value={
            stats.wins
          }
          label="V"
        />

        <Kpi
          value={
            stats.draws
          }
          label="N"
        />

        <Kpi
          value={
            stats.losses
          }
          label="D"
        />

      </div>

      <div className="mt-4 space-y-3">

        <ReportLine
          label="Taux de victoire"
          value={`${stats.winRate.toFixed(
            1
          )}%`}
        />

        <ReportLine
          label="Buts / match"
          value={stats.goalsForPerMatch.toFixed(
            2
          )}
        />

        <ReportLine
          label="Encaissés / match"
          value={stats.goalsAgainstPerMatch.toFixed(
            2
          )}
        />

        <ReportLine
          label="Diff. buts / match"
          value={formatSigned(
            stats.goalDifferencePerMatch
          )}
        />

      </div>

    </div>
  );
}

function DeltaBox({
  label,
  value,
  suffix = "",
  higherIsBetter,
}: {
  label: string;
  value: number;
  suffix?: string;
  higherIsBetter: boolean;
}) {
  const good =
    Math.abs(
      value
    ) <
    0.01
      ? null
      : higherIsBetter
      ? value >
        0
      : value <
        0;

  const style =
    good === true
      ? "text-green-400"
      : good ===
        false
      ? "text-red-400"
      : "text-gray-400";

  return (
    <div className="rounded-xl border border-white/10 bg-[#06111f] p-4">

      <p className="text-[10px] font-black uppercase text-gray-600">
        {label}
      </p>

      <p className={`mt-2 text-xl font-black ${style}`}>
        {value > 0
          ? "+"
          : ""}
        {value.toFixed(
          2
        )}
        {suffix}
      </p>

    </div>
  );
}

function StreakCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#06111f] p-4">

      <p className="text-[10px] font-black uppercase tracking-wider text-gray-600">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-yellow-400">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-600">
        {subtitle}
      </p>

    </div>
  );
}

function AnalysisSignalCard({
  signal,
}: {
  signal: AnalysisSignal;
}) {
  const style =
    signal.tone ===
    "positive"
      ? "border-green-400/20 bg-green-400/[0.04]"
      : signal.tone ===
        "warning"
      ? "border-red-400/20 bg-red-400/[0.04]"
      : "border-white/10 bg-[#06111f]";

  const dot =
    signal.tone ===
    "positive"
      ? "bg-green-400"
      : signal.tone ===
        "warning"
      ? "bg-red-400"
      : "bg-yellow-400";

  return (
    <div className={`rounded-xl border p-4 ${style}`}>

      <div className="flex gap-3">

        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`}
        />

        <div>

          <p className="font-black">
            {signal.title}
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {signal.description}
          </p>

        </div>

      </div>

    </div>
  );
}

function RecommendationCard({
  recommendation,
}: {
  recommendation:
    AnalysisRecommendation;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#06111f] p-4">

      <div className="flex items-start gap-4">

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-black ${
            recommendation.priority ===
            1
              ? "bg-red-400/10 text-red-400"
              : recommendation.priority ===
                2
              ? "bg-yellow-400/10 text-yellow-400"
              : "bg-blue-400/10 text-blue-400"
          }`}
        >
          P{recommendation.priority}
        </div>

        <div>

          <p className="font-black">
            {recommendation.title}
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-500">

            <span className="font-bold text-gray-400">
              Pourquoi :
            </span>{" "}

            {recommendation.reason}

          </p>

          <p className="mt-2 text-sm leading-6 text-gray-500">

            <span className="font-bold text-gray-400">
              Action :
            </span>{" "}

            {recommendation.action}

          </p>

        </div>

      </div>

    </div>
  );
}

function PlayerFormCard({
  player,
  position,
  delta,
  recentAverage,
  olderAverage,
  onOpenPlayer,
}: {
  player: Player;
  position: string;
  delta: number;
  recentAverage: number;
  olderAverage: number;
  onOpenPlayer: (
    player: Player
  ) => void;
}) {
  const positive =
    delta >=
    0;

  return (
    <button
      onClick={() =>
        onOpenPlayer(
          player
        )
      }
      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#06111f] p-4 text-left transition hover:border-yellow-400/30"
    >

      <div className="flex min-w-0 items-center gap-3">

        <PlayerAvatar
          player={
            player
          }
        />

        <div className="min-w-0">

          <p className="truncate font-black">
            {formatPlayerName(
              player.name
            )}
          </p>

          <p className="mt-1 text-[10px] text-gray-600">
            {formatPosition(
              position
            )} • {olderAverage.toFixed(
              2
            )} → {recentAverage.toFixed(
              2
            )}
          </p>

        </div>

      </div>

      <p
        className={`shrink-0 font-black ${
          positive
            ? "text-green-400"
            : "text-red-400"
        }`}
      >
        {delta >
        0
          ? "+"
          : ""}
        {delta.toFixed(
          2
        )}
      </p>

    </button>
  );
}

function standardDeviation(
  values: number[]
) {
  if (
    values.length <
    2
  ) {
    return 0;
  }

  const mean =
    averageNumber(
      values
    );

  const variance =
    values.reduce(
      (
        total,
        value
      ) =>
        total +
        (
          value -
          mean
        ) **
          2,
      0
    ) /
    values.length;

  return Math.sqrt(
    variance
  );
}


/* =========================================================
   COMPOSANTS
========================================================= */

function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={
        onClick
      }
      className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm font-semibold ${
        active
          ? "bg-yellow-400/10 text-yellow-400"
          : "text-gray-400 hover:bg-white/5"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TopTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={
        onClick
      }
      className={`border-b-2 py-4 text-sm font-bold ${
        active
          ? "border-yellow-400 text-yellow-400"
          : "border-transparent text-gray-500"
      }`}
    >
      {label}
    </button>
  );
}

function PanelHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex justify-between border-b border-white/5 px-5 py-4">

      <h3 className="text-sm font-black">
        {title}
      </h3>

      <span className="text-xs text-gray-500">
        {right}
      </span>

    </div>
  );
}

function SmallStatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-400/15 bg-[#091626] p-4">

      <p className="text-xs text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-black text-yellow-400">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-600">
        {subtitle}
      </p>

    </div>
  );
}

function MatchStatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#091626] p-4">

      <p className="text-[10px] uppercase text-gray-600">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-yellow-400">
        {value}
      </p>

    </div>
  );
}

function ClubLogo({
  size = 56,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const [logoIndex, setLogoIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const src =
    CLUB_LOGO_CANDIDATES[
      logoIndex
    ];

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-yellow-400/25 bg-[#07111f] ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {!failed ? (
        <img
          src={src}
          alt="Logo GX NOVA"
          width={size}
          height={size}
          className="h-full w-full object-contain p-1.5"
          onError={() => {
            const nextIndex =
              logoIndex + 1;

            if (
              nextIndex <
              CLUB_LOGO_CANDIDATES.length
            ) {
              setLogoIndex(
                nextIndex
              );
            } else {
              setFailed(true);
            }
          }}
        />
      ) : (
        <Shield
          size={Math.max(22, size * 0.55)}
          className="text-yellow-400"
        />
      )}
    </div>
  );
}

function TeamLogo({
  label,
  name,
  yellow = false,
  clubLogo = false,
}: {
  label: string;
  name: string;
  yellow?: boolean;
  clubLogo?: boolean;
}) {
  return (
    <div className="w-[115px] text-center">

      {clubLogo ? (
        <ClubLogo
          size={80}
          className="mx-auto shadow-[0_0_25px_rgba(250,204,21,0.16)]"
        />
      ) : (
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border font-black ${
            yellow
              ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
              : "border-white/10"
          }`}
        >
          {label}
        </div>
      )}

      <p className="mt-2 truncate">
        {name}
      </p>

    </div>
  );
}

function ResultBadge({
  result,
}: {
  result: "V" | "N" | "D";
}) {
  return (
    <span
      className={`rounded-lg border px-3 py-2 text-xs font-black ${
        result === "V"
          ? "border-green-400/30 bg-green-400/10 text-green-400"
          : result ===
            "D"
          ? "border-red-400/30 bg-red-400/10 text-red-400"
          : "border-slate-400/25 bg-slate-400/10 text-slate-300"
      }`}
    >
      {result}
    </span>
  );
}

function AlertItem({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex gap-4 border-b border-white/5 p-5">

      <div className="text-yellow-400">
        {icon}
      </div>

      <div>

        <p className="font-bold">
          {title}
        </p>

        <p className="text-xs text-gray-500">
          {subtitle}
        </p>

      </div>

    </div>
  );
}

function PlayerRankingRow({
  player,
  rank,
}: {
  player: Player;
  rank: number;
}) {
  return (
    <div className="grid grid-cols-[35px_1fr_60px] border-b border-white/5 py-3">

      <span>
        {rank}
      </span>

      <span className="truncate font-bold">
        {
          formatPlayerName(
            player.name
          )
        }
      </span>

      <span className="text-right font-black text-yellow-400">
        {
          player.averageRating.toFixed(
            2
          )
        }
      </span>

    </div>
  );
}

function PlayerAvatar({
  player,
}: {
  player: Player;
}) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10">

      <span className="text-xs font-black text-yellow-400">

        {
          getPlayerInitials(
            player.name
          )
        }

      </span>

    </div>
  );
}

function StatCell({
  value,
  strong = false,
}: {
  value: string | number;
  strong?: boolean;
}) {
  return (
    <span
      className={`text-center text-sm ${
        strong
          ? "font-black text-white"
          : "text-gray-400"
      }`}
    >
      {value}
    </span>
  );
}

function PercentageCell({
  value,
}: {
  value: number;
}) {
  return (
    <span
      className={`text-center text-sm font-bold ${
        value >= 80
          ? "text-green-400"
          : value >= 65
          ? "text-yellow-400"
          : "text-red-400"
      }`}
    >

      {
        value.toFixed(
          1
        )
      }%

    </span>
  );
}

function PlayerKpi({
  label,
  value,
  yellow = false,
}: {
  label: string;
  value: string | number;
  yellow?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#091626] p-5">

      <p className="text-xs font-bold uppercase text-gray-600">
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-black ${
          yellow
            ? "text-yellow-400"
            : "text-white"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

function PlayerStatLine({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-3">

      <span className="text-sm text-gray-400">
        {label}
      </span>

      <span className="font-black">
        {value}
      </span>

    </div>
  );
}

function ProgressStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const width =
    Math.max(
      0,
      Math.min(
        100,
        value
      )
    );

  return (
    <div className="mt-5">

      <div className="mb-2 flex justify-between">

        <span className="text-xs text-gray-500">
          {label}
        </span>

        <span className="text-xs font-black text-yellow-400">

          {
            value.toFixed(
              1
            )
          }%

        </span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/5">

        <div
          className="h-full rounded-full bg-yellow-400"
          style={{
            width:
              `${width}%`,
          }}
        />

      </div>

    </div>
  );
}

function FormationPlayer({
  x,
  y,
  slot,
  name,
  rating,
}: {
  x: number;
  y: number;
  slot: string;
  name: string;
  rating: number;
}) {
  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center"
      style={{
        left:
          `${x}%`,
        top:
          `${y}%`,
      }}
    >
      <div className="group w-[112px]">
        <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-yellow-400/55 bg-gradient-to-b from-[#0b1e2f] to-[#05101a] shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition group-hover:-translate-y-0.5 group-hover:border-yellow-300">
          <span className="text-sm font-black text-white">
            {getPlayerInitials(
              name
            )}
          </span>

          <span className="absolute -left-2 -top-2 rounded-md border border-black/20 bg-yellow-400 px-1.5 py-0.5 text-[8px] font-black text-black shadow">
            {slot}
          </span>

          {rating > 0 && (
            <span className={`absolute -bottom-2 -right-3 rounded-md border px-1.5 py-0.5 text-[9px] font-black shadow ${getRatingStyle(
              rating
            )}`}>
              {rating.toFixed(
                2
              )}
            </span>
          )}
        </div>

        <div className="mt-2 rounded-lg border border-white/10 bg-[#02070d]/90 px-2 py-1.5 shadow-lg backdrop-blur-sm">
          <p className="truncate text-[10px] font-black text-white">
            {name
              ? formatPlayerName(
                  name
                )
              : "À définir"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 p-3 text-center">

      <p className="text-xl font-black">
        {value}
      </p>

      <p className="text-[9px] text-gray-500">
        {label}
      </p>

    </div>
  );
}

function ReportLine({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex justify-between border-b border-white/5 py-3">

      <span className="text-gray-400">
        {label}
      </span>

      <span className="font-black">
        {value}
      </span>

    </div>
  );
}

/* =========================================================
   UTILITAIRES ANALYSE
========================================================= */

function calculateWindowStats(
  windowMatches: Match[]
): WindowStats {
  const played = windowMatches.length;

  if (played === 0) {
    return {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      winRate: 0,
      goalsForPerMatch: 0,
      goalsAgainstPerMatch: 0,
      goalDifferencePerMatch: 0,
    };
  }

  const wins = windowMatches.filter(
    (match) => match.result === "V"
  ).length;

  const draws = windowMatches.filter(
    (match) => match.result === "N"
  ).length;

  const losses = windowMatches.filter(
    (match) => match.result === "D"
  ).length;

  const goalsFor = windowMatches.reduce(
    (total, match) => total + match.goalsFor,
    0
  );

  const goalsAgainst = windowMatches.reduce(
    (total, match) => total + match.goalsAgainst,
    0
  );

  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    winRate: (wins / played) * 100,
    goalsForPerMatch: goalsFor / played,
    goalsAgainstPerMatch: goalsAgainst / played,
    goalDifferencePerMatch:
      (goalsFor - goalsAgainst) / played,
  };
}

function getCurrentResultStreak(
  matches: Match[]
) {
  if (matches.length === 0) {
    return {
      result: "N" as "V" | "N" | "D",
      count: 0,
    };
  }

  const result = matches[0].result;
  let count = 0;

  for (const match of matches) {
    if (match.result !== result) {
      break;
    }

    count++;
  }

  return {
    result,
    count,
  };
}

function getUnbeatenStreak(
  matches: Match[]
) {
  let count = 0;

  for (const match of matches) {
    if (match.result === "D") {
      break;
    }

    count++;
  }

  return count;
}

function getScoringStreak(
  matches: Match[]
) {
  let count = 0;

  for (const match of matches) {
    if (match.goalsFor <= 0) {
      break;
    }

    count++;
  }

  return count;
}

function resultLabel(
  result: "V" | "N" | "D"
) {
  switch (result) {
    case "V":
      return "victoire(s)";
    case "D":
      return "défaite(s)";
    default:
      return "nul(s)";
  }
}

function averageNumber(
  values: number[]
) {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (total, value) => total + value,
      0
    ) / values.length
  );
}

function formatSigned(
  value: number
) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

/* =========================================================
   UTILITAIRES COMPOSITION
========================================================= */

function remapLineup(
  current:
    LineupSpot[],

  formation:
    FormationDefinition
) {
  const used =
    new Set<string>();

  const playerPool =
    current
      .map(
        (spot) =>
          spot.name
      )
      .filter(
        Boolean
      );

  return formation.slots.map(
    (target) => {
      const exact =
        current.find(
          (spot) =>
            spot.slot ===
              target.slot &&
            spot.name &&
            !used.has(
              normalizePlayerName(
                spot.name
              )
            )
        );

      let name =
        exact?.name ??
        "";

      if (!name) {
        const fallback =
          playerPool.find(
            (candidate) =>
              !used.has(
                normalizePlayerName(
                  candidate
                )
              )
          );

        name =
          fallback ??
          "";
      }

      if (name) {
        used.add(
          normalizePlayerName(
            name
          )
        );
      }

      return {
        slot:
          target.slot,

        name,

        x:
          target.x,

        y:
          target.y,
      };
    }
  );
}

/* =========================================================
   UTILITAIRES MATCH
========================================================= */

function buildPitchPlayers(
  players:
    MatchDetailPlayer[]
) {
  const rows = [
    {
      position:
        "forward",
      y: 17,
    },
    {
      position:
        "midfielder",
      y: 44,
    },
    {
      position:
        "defender",
      y: 70,
    },
    {
      position:
        "goalkeeper",
      y: 89,
    },
  ];

  const result: {
    player:
      MatchDetailPlayer;
    x: number;
    y: number;
  }[] = [];

  for (
    const row of
    rows
  ) {
    const rowPlayers =
      players.filter(
        (player) =>
          player.position
            .toLowerCase() ===
          row.position
      );

    const xValues =
      distributeX(
        rowPlayers.length
      );

    rowPlayers.forEach(
      (
        player,
        index
      ) => {
        result.push({
          player,

          x:
            xValues[
              index
            ] ??
            50,

          y:
            row.y,
        });
      }
    );
  }

  return result;
}

function distributeX(
  count: number
) {
  if (count === 1) {
    return [50];
  }

  if (count <= 0) {
    return [];
  }

  return Array.from(
    {
      length:
        count,
    },
    (
      _,
      index
    ) =>
      10 +
      (80 *
        index) /
        (count -
          1)
  );
}

/* =========================================================
   STYLE DES MATCHS
========================================================= */

function getMatchCardStyle(
  result: "V" | "N" | "D"
) {
  if (result === "V") {
    return "border-green-400/35 bg-gradient-to-r from-green-400/[0.10] via-[#091626] to-[#091626] shadow-[0_0_0_1px_rgba(74,222,128,0.03)] hover:border-green-300/60";
  }

  if (result === "D") {
    return "border-red-400/35 bg-gradient-to-r from-red-400/[0.10] via-[#091626] to-[#091626] shadow-[0_0_0_1px_rgba(248,113,113,0.03)] hover:border-red-300/60";
  }

  return "border-slate-400/20 bg-gradient-to-r from-slate-400/[0.05] via-[#091626] to-[#091626] hover:border-slate-300/35";
}

function getMatchAccentStyle(
  result: "V" | "N" | "D"
) {
  if (result === "V") {
    return "bg-green-400";
  }

  if (result === "D") {
    return "bg-red-400";
  }

  return "bg-slate-400";
}

/* =========================================================
   UTILITAIRES
========================================================= */

function formatDate(
  date: string
) {
  return date
    ? new Date(
        date
      ).toLocaleDateString(
        "fr-FR"
      )
    : "-";
}

function formatDateTime(
  date:
    string | null
) {
  return date
    ? new Date(
        date
      ).toLocaleString(
        "fr-FR"
      )
    : "-";
}

function initials(
  name: string
) {
  if (!name) {
    return "?";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word[0]
    )
    .join("")
    .substring(
      0,
      3
    )
    .toUpperCase();
}

function getPlayerPositionStats(
  player: Player,
  position: string
) {
  return (
    player.positionStats ??
    []
  ).find(
    (stats) =>
      stats.position.toLowerCase() ===
      position.toLowerCase()
  );
}

function getPlayerStatsForScope(
  player: Player,
  scope: string
): Player | PlayerPositionStats {
  if (
    !scope ||
    scope === "all" ||
    scope === "global"
  ) {
    return player;
  }

  return (
    getPlayerPositionStats(
      player,
      scope
    ) ?? player
  );
}

function formatPlayerRoleSummary(
  player: Player
) {
  const positions =
    (player.positionStats ?? [])
      .filter(
        (stats) =>
          stats.games > 0
      )
      .sort(
        (a, b) =>
          b.games -
          a.games
      )
      .map(
        (stats) =>
          `${formatPosition(
            stats.position
          )} ${stats.games}`
      );

  return positions.length
    ? positions.join(" • ")
    : formatPosition(
        player.position
      );
}

function formatPlayerName(
  name: string
) {
  return name.replace(
    /^GX[_\-\s]?/i,
    ""
  );
}

function getPlayerInitials(
  name: string
) {
  return formatPlayerName(
    name
  )
    .replace(
      /[^a-zA-Z0-9]/g,
      ""
    )
    .substring(
      0,
      2
    )
    .toUpperCase();
}

function normalizePlayerName(
  name: string
) {
  return name
    .toLowerCase()
    .replace(
      /^gx[_\-\s]?/i,
      ""
    )
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

function findPlayer(
  players:
    Player[],

  searchedName:
    string
) {
  if (!searchedName) {
    return undefined;
  }

  const wanted =
    normalizePlayerName(
      searchedName
    );

  return players.find(
    (player) => {
      const current =
        normalizePlayerName(
          player.name
        );

      return (
        current ===
          wanted ||
        current.includes(
          wanted
        ) ||
        wanted.includes(
          current
        )
      );
    }
  );
}

function formatPosition(
  position: string
) {
  switch (
    position.toLowerCase()
  ) {
    case "goalkeeper":
      return "G";

    case "defender":
      return "DEF";

    case "midfielder":
      return "MIL";

    case "forward":
      return "ATT";

    default:
      return (
        position ||
        "-"
      );
  }
}

function formatPositionLong(
  position: string
) {
  switch (
    position.toLowerCase()
  ) {
    case "goalkeeper":
      return "Gardien";

    case "defender":
      return "Défenseur";

    case "midfielder":
      return "Milieu";

    case "forward":
      return "Attaquant";

    default:
      return (
        position ||
        "Poste inconnu"
      );
  }
}

function getRatingStyle(
  rating: number
) {
  if (rating >= 8) {
    return "border-yellow-400/40 bg-yellow-400/10 text-yellow-400";
  }

  if (rating >= 7.5) {
    return "border-green-400/30 bg-green-400/10 text-green-400";
  }

  if (rating >= 7) {
    return "border-blue-400/30 bg-blue-400/10 text-blue-400";
  }

  return "border-red-400/30 bg-red-400/10 text-red-400";
}

function getRatingTextStyle(
  rating: number
) {
  if (rating >= 8) {
    return "text-yellow-400";
  }

  if (rating >= 7.5) {
    return "text-green-400";
  }

  if (rating >= 7) {
    return "text-blue-400";
  }

  return "text-red-400";
}