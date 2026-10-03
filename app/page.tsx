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
  Database,
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
                "analysis") && (

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
                players={
                  players
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
  players,
  currentFilterLabel,
  onOpenPlayer,
  onOpenMatch,
}: {
  matches: Match[];

  players: Player[];

  currentFilterLabel:
    string;

  onOpenPlayer: (
    player: Player
  ) => void;

  onOpenMatch: (
    matchId: number
  ) => void;
}) {
  const statistics =
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

        const winRate =
          played > 0
            ? (wins /
                played) *
              100
            : 0;

        const cleanSheetRate =
          played > 0
            ? (cleanSheets /
                played) *
              100
            : 0;

        const scoringRate =
          played > 0
            ? (matchesScored /
                played) *
              100
            : 0;

        const averageGoalsFor =
          played > 0
            ? goalsFor /
              played
            : 0;

        const averageGoalsAgainst =
          played > 0
            ? goalsAgainst /
              played
            : 0;

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

        const weightedRating =
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

        const minimumGames =
          Math.max(
            2,
            Math.ceil(
              played *
                0.25
            )
          );

        const qualifiedForRating =
          players.filter(
            (player) =>
              player.games >=
              minimumGames
          );

        const bestRating =
          [...qualifiedForRating]
            .sort(
              (
                a,
                b
              ) =>
                b.averageRating -
                a.averageRating
            )[0] ??
          null;

        const topScorer =
          [...players]
            .sort(
              (
                a,
                b
              ) =>
                b.goals -
                  a.goals ||
                b.assists -
                  a.assists
            )[0] ??
          null;

        const topAssister =
          [...players]
            .sort(
              (
                a,
                b
              ) =>
                b.assists -
                  a.assists ||
                b.goals -
                  a.goals
            )[0] ??
          null;

        const bestPasser =
          players
            .filter(
              (player) =>
                player.passAttempts >=
                20
            )
            .sort(
              (
                a,
                b
              ) =>
                b.passSuccess -
                a.passSuccess
            )[0] ??
          null;

        const bestTackler =
          players
            .filter(
              (player) =>
                player.tackleAttempts >=
                5
            )
            .sort(
              (
                a,
                b
              ) =>
                b.tacklesMade -
                  a.tacklesMade ||
                b.tackleSuccess -
                  a.tackleSuccess
            )[0] ??
          null;

        const bestGoalkeeper =
          [...players]
            .sort(
              (
                a,
                b
              ) =>
                b.saves -
                a.saves
            )[0] ??
          null;

        const lastFive =
          matches.slice(
            0,
            5
          );

        return {
          played,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          cleanSheets,
          winRate,
          cleanSheetRate,
          scoringRate,
          averageGoalsFor,
          averageGoalsAgainst,
          weightedRating,
          minimumGames,
          bestRating,
          topScorer,
          topAssister,
          bestPasser,
          bestTackler,
          bestGoalkeeper,
          lastFive,
        };
      },
      [
        matches,
        players,
      ]
    );

  const ranking =
    useMemo(
      () =>
        [...players].sort(
          (
            a,
            b
          ) =>
            b.averageRating -
              a.averageRating ||
            b.games -
              a.games
        ),
      [players]
    );

  return (
    <>

      {/* HEADER */}

      <div className="mb-6">

        <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
          Performance Center
        </p>

        <h2 className="mt-2 text-3xl font-black">
          Statistiques
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {
            currentFilterLabel
          }
        </p>

      </div>

      {/* KPI */}

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">

        <StatsKpiCard
          label="Matchs"
          value={
            statistics.played
          }
          subtitle={`${statistics.wins}V • ${statistics.draws}N • ${statistics.losses}D`}
        />

        <StatsKpiCard
          label="Taux de victoire"
          value={`${statistics.winRate.toFixed(
            1
          )}%`}
          subtitle="Victoires"
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
          label="Clean sheets"
          value={
            statistics.cleanSheets
          }
          subtitle={`${statistics.cleanSheetRate.toFixed(
            1
          )}% des matchs`}
        />

        <StatsKpiCard
          label="Note collective"
          value={
            statistics.weightedRating.toFixed(
              2
            )
          }
          subtitle="Moyenne pondérée"
        />

      </div>

      <div className="grid gap-5 2xl:grid-cols-12">

        {/* RÉPARTITION RÉSULTATS */}

        <section className="rounded-2xl border border-blue-400/20 bg-[#091626] 2xl:col-span-4">

          <PanelHeader
            title="RÉPARTITION DES RÉSULTATS"
            right={`${statistics.played} matchs`}
          />

          <div className="space-y-6 p-6">

            <ResultProgress
              label="Victoires"
              value={
                statistics.wins
              }
              total={
                statistics.played
              }
              type="win"
            />

            <ResultProgress
              label="Matchs nuls"
              value={
                statistics.draws
              }
              total={
                statistics.played
              }
              type="draw"
            />

            <ResultProgress
              label="Défaites"
              value={
                statistics.losses
              }
              total={
                statistics.played
              }
              type="loss"
            />

            <div className="grid grid-cols-2 gap-3 pt-2">

              <Kpi
                value={`${statistics.scoringRate.toFixed(
                  1
                )}%`}
                label="Matchs avec but"
              />

              <Kpi
                value={
                  statistics.goalsFor -
                  statistics.goalsAgainst
                }
                label="Diff. buts"
              />

            </div>

          </div>

        </section>

        {/* FORME */}

        <section className="rounded-2xl border border-blue-400/20 bg-[#091626] 2xl:col-span-4">

          <PanelHeader
            title="FORME RÉCENTE"
            right="5 derniers matchs"
          />

          <div className="p-6">

            {statistics.lastFive.length >
            0 ? (

              <div className="space-y-3">

                {statistics.lastFive.map(
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
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${getMatchCardStyle(
                        match.result
                      )}`}
                    >

                      <div className="flex items-center gap-3">

                        <span className="w-5 text-xs font-black text-gray-600">
                          {
                            index +
                            1
                          }
                        </span>

                        <ResultBadge
                          result={
                            match.result
                          }
                        />

                        <div>

                          <p className="text-sm font-black">
                            {
                              match.opponent
                            }
                          </p>

                          <p className="mt-1 text-[10px] text-gray-600">
                            {
                              formatDate(
                                match.date
                              )
                            }
                          </p>

                        </div>

                      </div>

                      <p className="text-lg font-black">
                        {
                          match.goalsFor
                        }
                        {" - "}
                        {
                          match.goalsAgainst
                        }
                      </p>

                    </button>

                  )
                )}

              </div>

            ) : (

              <p className="py-10 text-center text-gray-600">
                Aucun match.
              </p>

            )}

          </div>

        </section>

        {/* LEADERS */}

        <section className="rounded-2xl border border-yellow-400/25 bg-[#091626] 2xl:col-span-4">

          <PanelHeader
            title="LEADERS"
            right={
              currentFilterLabel
            }
          />

          <div className="divide-y divide-white/5">

            <StatLeader
              title="Meilleur buteur"
              player={
                statistics.topScorer
              }
              value={
                statistics.topScorer
                  ? `${statistics.topScorer.goals} buts`
                  : "-"
              }
              onOpenPlayer={
                onOpenPlayer
              }
            />

            <StatLeader
              title="Meilleur passeur"
              player={
                statistics.topAssister
              }
              value={
                statistics.topAssister
                  ? `${statistics.topAssister.assists} PD`
                  : "-"
              }
              onOpenPlayer={
                onOpenPlayer
              }
            />

            <StatLeader
              title="Meilleure note"
              player={
                statistics.bestRating
              }
              value={
                statistics.bestRating
                  ? statistics.bestRating.averageRating.toFixed(
                      2
                    )
                  : "-"
              }
              subtitle={`Minimum ${statistics.minimumGames} matchs`}
              onOpenPlayer={
                onOpenPlayer
              }
            />

          </div>

        </section>

        {/* SPÉCIALISTES */}

        <section className="rounded-2xl border border-blue-400/20 bg-[#091626] 2xl:col-span-5">

          <PanelHeader
            title="SPÉCIALISTES"
            right="Statistiques avancées"
          />

          <div className="grid gap-4 p-5 md:grid-cols-3">

            <SpecialistCard
              label="Précision passes"
              player={
                statistics.bestPasser
              }
              value={
                statistics.bestPasser
                  ? `${statistics.bestPasser.passSuccess.toFixed(
                      1
                    )}%`
                  : "-"
              }
              subtitle="Min. 20 tentées"
              onOpenPlayer={
                onOpenPlayer
              }
            />

            <SpecialistCard
              label="Tacles réussis"
              player={
                statistics.bestTackler
              }
              value={
                statistics.bestTackler
                  ? statistics.bestTackler.tacklesMade
                  : "-"
              }
              subtitle={
                statistics.bestTackler
                  ? `${statistics.bestTackler.tackleSuccess.toFixed(
                      1
                    )}% réussite`
                  : "Min. 5 tentés"
              }
              onOpenPlayer={
                onOpenPlayer
              }
            />

            <SpecialistCard
              label="Arrêts"
              player={
                statistics.bestGoalkeeper
              }
              value={
                statistics.bestGoalkeeper &&
                statistics.bestGoalkeeper.saves >
                  0
                  ? statistics.bestGoalkeeper.saves
                  : "-"
              }
              subtitle="Total"
              onOpenPlayer={
                onOpenPlayer
              }
            />

          </div>

        </section>

        {/* EFFICACITÉ COLLECTIVE */}

        <section className="rounded-2xl border border-blue-400/20 bg-[#091626] 2xl:col-span-7">

          <PanelHeader
            title="EFFICACITÉ COLLECTIVE"
            right={
              currentFilterLabel
            }
          />

          <div className="grid gap-4 p-5 md:grid-cols-2">

            <MetricBox
              label="Buts marqués / match"
              value={
                statistics.averageGoalsFor
              }
              max={
                Math.max(
                  3,
                  statistics.averageGoalsFor,
                  statistics.averageGoalsAgainst
                )
              }
            />

            <MetricBox
              label="Buts encaissés / match"
              value={
                statistics.averageGoalsAgainst
              }
              max={
                Math.max(
                  3,
                  statistics.averageGoalsFor,
                  statistics.averageGoalsAgainst
                )
              }
            />

            <MetricBox
              label="Taux de victoire"
              value={
                statistics.winRate
              }
              max={100}
              suffix="%"
            />

            <MetricBox
              label="Clean sheets"
              value={
                statistics.cleanSheetRate
              }
              max={100}
              suffix="%"
            />

          </div>

        </section>

        {/* TABLE CLASSEMENT */}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#091626] 2xl:col-span-12">

          <PanelHeader
            title="CLASSEMENT COMPLET DES JOUEURS"
            right={`${ranking.length} joueurs`}
          />

          <div className="overflow-x-auto">

            <div className="min-w-[1150px]">

              <div className="grid grid-cols-[55px_220px_70px_80px_70px_70px_80px_110px_95px_110px_95px] border-b border-white/10 bg-[#071321] px-5 py-4 text-[9px] font-black uppercase tracking-wider text-gray-600">

                <span>#</span>

                <span>
                  Joueur
                </span>

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
                  %
                </span>

                <span className="text-center">
                  Tacles
                </span>

                <span className="text-center">
                  %
                </span>

              </div>

              {ranking.map(
                (
                  player,
                  index
                ) => (

                  <button
                    key={
                      player.id
                    }
                    onClick={() =>
                      onOpenPlayer(
                        player
                      )
                    }
                    className="grid w-full grid-cols-[55px_220px_70px_80px_70px_70px_80px_110px_95px_110px_95px] items-center border-b border-white/5 px-5 py-4 text-left hover:bg-white/[0.03]"
                  >

                    <span className="font-black text-gray-600">
                      {
                        index +
                        1
                      }
                    </span>

                    <div className="flex items-center gap-3">

                      <PlayerAvatar
                        player={
                          player
                        }
                      />

                      <div>

                        <p className="font-black">
                          {
                            formatPlayerName(
                              player.name
                            )
                          }
                        </p>

                        <p className="mt-1 text-[9px] uppercase text-gray-600">
                          {
                            formatPosition(
                              player.position
                            )
                          }
                        </p>

                      </div>

                    </div>

                    <StatCell
                      value={
                        player.games
                      }
                    />

                    <div className="text-center">

                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${getRatingStyle(
                          player.averageRating
                        )}`}
                      >
                        {
                          player.averageRating.toFixed(
                            2
                          )
                        }
                      </span>

                    </div>

                    <StatCell
                      value={
                        player.goals
                      }
                      strong
                    />

                    <StatCell
                      value={
                        player.assists
                      }
                      strong
                    />

                    <StatCell
                      value={
                        player.shots
                      }
                    />

                    <StatCell
                      value={`${player.passesMade}/${player.passAttempts}`}
                    />

                    <PercentageCell
                      value={
                        player.passSuccess
                      }
                    />

                    <StatCell
                      value={`${player.tacklesMade}/${player.tackleAttempts}`}
                    />

                    <PercentageCell
                      value={
                        player.tackleSuccess
                      }
                    />

                  </button>

                )
              )}

            </div>

          </div>

        </section>

      </div>

    </>
  );
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

function AnalysisDashboard({
  matches,
  players,
  currentFilterLabel,
  onOpenPlayer,
  onOpenMatch,
}: {
  matches: Match[];
  players: Player[];
  currentFilterLabel: string;
  onOpenPlayer: (player: Player) => void;
  onOpenMatch: (matchId: number) => void;
}) {
  const analysis = useMemo(() => {
    const overall = calculateWindowStats(matches);
    const recentMatches = matches.slice(0, 5);
    const previousMatches = matches.slice(5, 10);

    const recent = calculateWindowStats(recentMatches);
    const previous = calculateWindowStats(previousMatches);

    const totalPassesMade = players.reduce(
      (total, player) => total + player.passesMade,
      0
    );

    const totalPassAttempts = players.reduce(
      (total, player) => total + player.passAttempts,
      0
    );

    const totalTacklesMade = players.reduce(
      (total, player) => total + player.tacklesMade,
      0
    );

    const totalTackleAttempts = players.reduce(
      (total, player) => total + player.tackleAttempts,
      0
    );

    const totalPlayerGames = players.reduce(
      (total, player) => total + player.games,
      0
    );

    const averageRating =
      totalPlayerGames > 0
        ? players.reduce(
            (total, player) =>
              total + player.averageRating * player.games,
            0
          ) / totalPlayerGames
        : 0;

    const teamPassSuccess =
      totalPassAttempts > 0
        ? (totalPassesMade / totalPassAttempts) * 100
        : 0;

    const teamTackleSuccess =
      totalTackleAttempts > 0
        ? (totalTacklesMade / totalTackleAttempts) * 100
        : 0;

    const cleanSheets = matches.filter(
      (match) => match.goalsAgainst === 0
    ).length;

    const failedToScore = matches.filter(
      (match) => match.goalsFor === 0
    ).length;

    const scoringRate =
      matches.length > 0
        ? ((matches.length - failedToScore) / matches.length) * 100
        : 0;

    const cleanSheetRate =
      matches.length > 0
        ? (cleanSheets / matches.length) * 100
        : 0;

    const resultStreak = getCurrentResultStreak(matches);
    const unbeatenStreak = getUnbeatenStreak(matches);
    const scoringStreak = getScoringStreak(matches);

    const playerForm = players
      .map((player) => {
        const ratings = player.recentRatings.filter(
          (rating) => rating > 0
        );

        if (ratings.length < 3) {
          return null;
        }

        const recentCount = Math.min(2, ratings.length);
        const recentAverage = averageNumber(
          ratings.slice(0, recentCount)
        );
        const olderAverage = averageNumber(
          ratings.slice(recentCount)
        );

        if (olderAverage === 0) {
          return null;
        }

        return {
          player,
          recentAverage,
          olderAverage,
          delta: recentAverage - olderAverage,
        };
      })
      .filter(
        (
          item
        ): item is {
          player: Player;
          recentAverage: number;
          olderAverage: number;
          delta: number;
        } => item !== null
      );

    const improvingPlayers = [...playerForm]
      .filter((item) => item.delta >= 0.2)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 4);

    const decliningPlayers = [...playerForm]
      .filter((item) => item.delta <= -0.2)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 4);

    const signals: AnalysisSignal[] = [];
    const recommendations: AnalysisRecommendation[] = [];

    if (recent.played > 0 && previous.played > 0) {
      const winDelta = recent.winRate - previous.winRate;
      const goalDelta =
        recent.goalDifferencePerMatch -
        previous.goalDifferencePerMatch;

      if (winDelta >= 20 || goalDelta >= 0.75) {
        signals.push({
          title: "Dynamique récente en progression",
          description: `Sur les 5 derniers matchs, GX NOVA affiche ${recent.winRate.toFixed(
            0
          )}% de victoires contre ${previous.winRate.toFixed(
            0
          )}% sur les 5 précédents.`,
          tone: "positive",
        });
      } else if (winDelta <= -20 || goalDelta <= -0.75) {
        signals.push({
          title: "Dynamique récente en retrait",
          description: `Le taux de victoire récent est de ${recent.winRate.toFixed(
            0
          )}% contre ${previous.winRate.toFixed(
            0
          )}% sur les 5 matchs précédents.`,
          tone: "warning",
        });
      } else {
        signals.push({
          title: "Dynamique globalement stable",
          description:
            "Les 5 derniers matchs restent proches de la fenêtre précédente en matière de résultats.",
          tone: "neutral",
        });
      }

      const attackDelta =
        recent.goalsForPerMatch -
        previous.goalsForPerMatch;

      if (attackDelta >= 0.4) {
        signals.push({
          title: "Production offensive en hausse",
          description: `${recent.goalsForPerMatch.toFixed(
            2
          )} buts marqués par match récemment, contre ${previous.goalsForPerMatch.toFixed(
            2
          )} précédemment.`,
          tone: "positive",
        });
      } else if (attackDelta <= -0.4) {
        signals.push({
          title: "Production offensive en baisse",
          description: `${recent.goalsForPerMatch.toFixed(
            2
          )} buts marqués par match récemment, contre ${previous.goalsForPerMatch.toFixed(
            2
          )} précédemment.`,
          tone: "warning",
        });
      }

      const defensiveDelta =
        recent.goalsAgainstPerMatch -
        previous.goalsAgainstPerMatch;

      if (defensiveDelta <= -0.4) {
        signals.push({
          title: "Buts encaissés en baisse",
          description: `${recent.goalsAgainstPerMatch.toFixed(
            2
          )} but encaissé par match récemment, contre ${previous.goalsAgainstPerMatch.toFixed(
            2
          )} auparavant.`,
          tone: "positive",
        });
      } else if (defensiveDelta >= 0.4) {
        signals.push({
          title: "Buts encaissés en hausse",
          description: `${recent.goalsAgainstPerMatch.toFixed(
            2
          )} buts encaissés par match récemment, contre ${previous.goalsAgainstPerMatch.toFixed(
            2
          )} auparavant.`,
          tone: "warning",
        });
      }
    } else if (matches.length > 0) {
      signals.push({
        title: "Échantillon encore limité",
        description:
          "Il faut 10 matchs dans le filtre actuel pour comparer proprement les 5 derniers aux 5 précédents.",
        tone: "neutral",
      });
    }

    if (teamPassSuccess >= 80 && totalPassAttempts >= 50) {
      signals.push({
        title: "Bonne sécurité de passe",
        description: `${teamPassSuccess.toFixed(
          1
        )}% des passes tentées sont réussies sur le périmètre actuel.`,
        tone: "positive",
      });
    } else if (
      teamPassSuccess > 0 &&
      teamPassSuccess < 70 &&
      totalPassAttempts >= 40
    ) {
      signals.push({
        title: "Déchet dans la circulation",
        description: `La réussite de passe collective est de ${teamPassSuccess.toFixed(
          1
        )}%.`,
        tone: "warning",
      });
    }

    if (scoringRate < 70 && matches.length >= 3) {
      recommendations.push({
        priority: 1,
        title: "Améliorer la régularité offensive",
        reason: `${(100 - scoringRate).toFixed(
          0
        )}% des matchs du filtre actuel se terminent sans but marqué.`,
        action:
          "Travailler des circuits simples de progression puis une finition rapide dans les 25 derniers mètres.",
      });
    }

    if (
      overall.goalsAgainstPerMatch >= 2 ||
      (recent.played > 0 &&
        previous.played > 0 &&
        recent.goalsAgainstPerMatch -
          previous.goalsAgainstPerMatch >=
          0.4)
    ) {
      recommendations.push({
        priority: 1,
        title: "Réduire les buts encaissés",
        reason: `GX NOVA concède ${overall.goalsAgainstPerMatch.toFixed(
          2
        )} buts par match sur le périmètre actuel.`,
        action:
          "Revoir les distances entre lignes et les responsabilités à la perte de balle. Les statistiques ne permettent pas d'identifier seules la cause tactique exacte.",
      });
    }

    if (
      teamPassSuccess > 0 &&
      teamPassSuccess < 70 &&
      totalPassAttempts >= 40
    ) {
      recommendations.push({
        priority: 2,
        title: "Sécuriser la première circulation",
        reason: `La réussite de passe collective est de ${teamPassSuccess.toFixed(
          1
        )}%.`,
        action:
          "Donner davantage de solutions courtes au porteur et limiter les passes forcées lorsque la sortie est fermée.",
      });
    }

    if (
      teamTackleSuccess > 0 &&
      teamTackleSuccess < 35 &&
      totalTackleAttempts >= 20
    ) {
      recommendations.push({
        priority: 2,
        title: "Mieux sélectionner les interventions",
        reason: `Le taux de réussite au tacle est de ${teamTackleSuccess.toFixed(
          1
        )}%.`,
        action:
          "Privilégier le cadrage et la fermeture des lignes avant de déclencher le tacle.",
      });
    }

    if (
      recent.played > 0 &&
      previous.played > 0 &&
      recent.winRate <= previous.winRate - 20
    ) {
      recommendations.push({
        priority: 2,
        title: "Stabiliser la dynamique récente",
        reason: `Le taux de victoire est passé de ${previous.winRate.toFixed(
          0
        )}% à ${recent.winRate.toFixed(0)}%.`,
        action:
          "Identifier deux ou trois principes collectifs prioritaires à conserver sur plusieurs soirées avant d'ajouter de nouvelles consignes.",
      });
    }

    if (recommendations.length === 0 && matches.length > 0) {
      recommendations.push({
        priority: 3,
        title: "Conserver la base actuelle",
        reason:
          "Aucun signal chiffré majeur ne ressort comme critique sur le filtre sélectionné.",
        action:
          "Continuer à suivre la tendance sur plusieurs matchs et utiliser les fiches de match pour cibler les écarts individuels.",
      });
    }

    return {
      overall,
      recent,
      previous,
      averageRating,
      teamPassSuccess,
      teamTackleSuccess,
      cleanSheets,
      cleanSheetRate,
      failedToScore,
      scoringRate,
      resultStreak,
      unbeatenStreak,
      scoringStreak,
      improvingPlayers,
      decliningPlayers,
      signals: signals.slice(0, 6),
      recommendations: recommendations
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 5),
      recentMatches,
    };
  }, [matches, players]);

  const trend =
    analysis.recent.played > 0 &&
    analysis.previous.played > 0
      ? analysis.recent.winRate >
        analysis.previous.winRate + 10
        ? "positive"
        : analysis.recent.winRate <
          analysis.previous.winRate - 10
        ? "negative"
        : "stable"
      : "insufficient";

  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
          Lecture automatique
        </p>

        <h2 className="mt-2 text-3xl font-black">
          Analyses GX NOVA
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          Analyse calculée uniquement à partir des matchs et statistiques
          enregistrés. Aucun comportement tactique non mesuré n&apos;est
          inventé.
        </p>

        <p className="mt-1 text-xs text-gray-600">
          {currentFilterLabel}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <AnalysisSummaryCard
          label="Tendance"
          value={
            trend === "positive"
              ? "En hausse"
              : trend === "negative"
              ? "En baisse"
              : trend === "stable"
              ? "Stable"
              : "À confirmer"
          }
          subtitle="5 derniers vs 5 précédents"
          tone={
            trend === "positive"
              ? "positive"
              : trend === "negative"
              ? "warning"
              : "neutral"
          }
        />

        <AnalysisSummaryCard
          label="Note collective"
          value={analysis.averageRating.toFixed(2)}
          subtitle={`${players.length} joueurs`}
          tone="neutral"
        />

        <AnalysisSummaryCard
          label="Réussite passes"
          value={`${analysis.teamPassSuccess.toFixed(1)}%`}
          subtitle="Pondérée par les tentatives"
          tone={
            analysis.teamPassSuccess >= 80
              ? "positive"
              : analysis.teamPassSuccess > 0 &&
                analysis.teamPassSuccess < 70
              ? "warning"
              : "neutral"
          }
        />

        <AnalysisSummaryCard
          label="Clean sheets"
          value={`${analysis.cleanSheetRate.toFixed(1)}%`}
          subtitle={`${analysis.cleanSheets} match(s)`}
          tone="neutral"
        />
      </div>

      <div className="grid gap-5 2xl:grid-cols-12">
        <section className="rounded-2xl border border-blue-400/20 bg-[#091626] 2xl:col-span-7">
          <PanelHeader
            title="5 DERNIERS VS 5 PRÉCÉDENTS"
            right={
              analysis.previous.played > 0
                ? "Comparaison active"
                : "Historique insuffisant"
            }
          />

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <AnalysisWindowCard
              title="5 derniers"
              stats={analysis.recent}
              highlight
            />

            <AnalysisWindowCard
              title="5 précédents"
              stats={analysis.previous}
            />
          </div>

          {analysis.recent.played > 0 &&
            analysis.previous.played > 0 && (
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
                  higherIsBetter={false}
                />
              </div>
            )}
        </section>

        <section className="rounded-2xl border border-yellow-400/20 bg-[#091626] 2xl:col-span-5">
          <PanelHeader
            title="SÉRIES ACTUELLES"
            right="Depuis le dernier match"
          />

          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3 2xl:grid-cols-1">
            <StreakCard
              label="Résultat"
              value={
                analysis.resultStreak.count > 0
                  ? `${analysis.resultStreak.count} ${resultLabel(
                      analysis.resultStreak.result
                    )}`
                  : "-"
              }
              subtitle={
                analysis.resultStreak.count > 0
                  ? `Série de ${analysis.resultStreak.result}`
                  : "Aucun match"
              }
            />

            <StreakCard
              label="Sans défaite"
              value={analysis.unbeatenStreak}
              subtitle="Match(s) consécutif(s)"
            />

            <StreakCard
              label="Avec au moins un but"
              value={analysis.scoringStreak}
              subtitle="Match(s) consécutif(s)"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-blue-400/20 bg-[#091626] 2xl:col-span-6">
          <PanelHeader
            title="SIGNAUX DÉTECTÉS"
            right={`${analysis.signals.length} constat(s)`}
          />

          <div className="space-y-3 p-5">
            {analysis.signals.length > 0 ? (
              analysis.signals.map((signal, index) => (
                <AnalysisSignalCard
                  key={`${signal.title}-${index}`}
                  signal={signal}
                />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-gray-600">
                Pas assez de données pour générer des signaux.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-yellow-400/25 bg-[#091626] 2xl:col-span-6">
          <PanelHeader
            title="AXES DE TRAVAIL"
            right="Calcul automatique"
          />

          <div className="space-y-3 p-5">
            {analysis.recommendations.map((recommendation, index) => (
              <RecommendationCard
                key={`${recommendation.title}-${index}`}
                recommendation={recommendation}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-blue-400/20 bg-[#091626] 2xl:col-span-6">
          <PanelHeader
            title="JOUEURS EN PROGRESSION"
            right="Notes récentes"
          />

          <div className="p-5">
            {analysis.improvingPlayers.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {analysis.improvingPlayers.map((item) => (
                  <PlayerFormCard
                    key={item.player.id}
                    player={item.player}
                    delta={item.delta}
                    recentAverage={item.recentAverage}
                    olderAverage={item.olderAverage}
                    onOpenPlayer={onOpenPlayer}
                  />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-600">
                Aucun joueur ne présente actuellement une hausse nette
                d&apos;au moins 0,20 point sur ses notes récentes.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-blue-400/20 bg-[#091626] 2xl:col-span-6">
          <PanelHeader
            title="JOUEURS À SURVEILLER"
            right="Notes récentes"
          />

          <div className="p-5">
            {analysis.decliningPlayers.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {analysis.decliningPlayers.map((item) => (
                  <PlayerFormCard
                    key={item.player.id}
                    player={item.player}
                    delta={item.delta}
                    recentAverage={item.recentAverage}
                    olderAverage={item.olderAverage}
                    onOpenPlayer={onOpenPlayer}
                  />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-600">
                Aucun joueur ne présente actuellement une baisse nette
                d&apos;au moins 0,20 point.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#091626] 2xl:col-span-12">
          <PanelHeader
            title="LECTURE DES DERNIERS MATCHS"
            right="5 derniers"
          />

          <div className="grid gap-3 p-5 md:grid-cols-5">
            {analysis.recentMatches.map((match, index) => (
              <button
                key={match.id ?? match.matchId}
                onClick={() => {
                  if (match.id) {
                    onOpenMatch(match.id);
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

                  <ResultBadge result={match.result} />
                </div>

                <p className="mt-4 truncate font-black">
                  {match.opponent}
                </p>

                <p className="mt-2 text-2xl font-black">
                  {match.goalsFor} - {match.goalsAgainst}
                </p>

                <p className="mt-2 text-[10px] text-gray-600">
                  {formatDate(match.date)}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#07111f] 2xl:col-span-12">
          <div className="p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
              Limites de l&apos;analyse
            </p>

            <p className="mt-3 max-w-5xl text-sm leading-6 text-gray-600">
              Cette analyse repose sur les scores, résultats et statistiques
              individuelles disponibles dans l&apos;API EA. Elle ne connaît
              pas la possession, les xG, les zones de perte, les hauteurs de
              bloc, les courses sans ballon ni les consignes réellement
              appliquées. Les axes proposés sont donc des pistes de travail,
              pas des diagnostics tactiques certains.
            </p>
          </div>
        </section>
      </div>
    </>
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
        <Kpi value={stats.wins} label="V" />
        <Kpi value={stats.draws} label="N" />
        <Kpi value={stats.losses} label="D" />
      </div>

      <div className="mt-4 space-y-3">
        <ReportLine
          label="Taux de victoire"
          value={`${stats.winRate.toFixed(1)}%`}
        />

        <ReportLine
          label="Buts / match"
          value={stats.goalsForPerMatch.toFixed(2)}
        />

        <ReportLine
          label="Encaissés / match"
          value={stats.goalsAgainstPerMatch.toFixed(2)}
        />

        <ReportLine
          label="Diff. buts / match"
          value={formatSigned(stats.goalDifferencePerMatch)}
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
    Math.abs(value) < 0.01
      ? null
      : higherIsBetter
      ? value > 0
      : value < 0;

  const style =
    good === true
      ? "text-green-400"
      : good === false
      ? "text-red-400"
      : "text-gray-400";

  return (
    <div className="rounded-xl border border-white/10 bg-[#06111f] p-4">
      <p className="text-[10px] font-black uppercase text-gray-600">
        {label}
      </p>

      <p className={`mt-2 text-xl font-black ${style}`}>
        {value > 0 ? "+" : ""}
        {value.toFixed(2)}
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
    signal.tone === "positive"
      ? "border-green-400/20 bg-green-400/[0.04]"
      : signal.tone === "warning"
      ? "border-red-400/20 bg-red-400/[0.04]"
      : "border-white/10 bg-[#06111f]";

  const dot =
    signal.tone === "positive"
      ? "bg-green-400"
      : signal.tone === "warning"
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
  recommendation: AnalysisRecommendation;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#06111f] p-4">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-black ${
            recommendation.priority === 1
              ? "bg-red-400/10 text-red-400"
              : recommendation.priority === 2
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
  delta,
  recentAverage,
  olderAverage,
  onOpenPlayer,
}: {
  player: Player;
  delta: number;
  recentAverage: number;
  olderAverage: number;
  onOpenPlayer: (player: Player) => void;
}) {
  const positive = delta >= 0;

  return (
    <button
      onClick={() => onOpenPlayer(player)}
      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#06111f] p-4 text-left transition hover:border-yellow-400/30"
    >
      <div className="flex min-w-0 items-center gap-3">
        <PlayerAvatar player={player} />

        <div className="min-w-0">
          <p className="truncate font-black">
            {formatPlayerName(player.name)}
          </p>

          <p className="mt-1 text-[10px] text-gray-600">
            {olderAverage.toFixed(2)} → {recentAverage.toFixed(2)}
          </p>
        </div>
      </div>

      <p
        className={`shrink-0 font-black ${
          positive ? "text-green-400" : "text-red-400"
        }`}
      >
        {delta > 0 ? "+" : ""}
        {delta.toFixed(2)}
      </p>
    </button>
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