"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Download,
  ExternalLink,
  Goal,
  Medal,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Users,
} from "lucide-react";

const CLUB_LOGO = "/logo-gx-nova.png";

type MatchSummary = {
  id: number;
  eaMatchId: string;
  playedAt: string | null;
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  result: "V" | "N" | "D";
  competitionId: number | null;
  competitionName: string | null;
  seasonId: number | null;
  seasonName: string | null;
  opponentCrestUrls: string[];
};

type TeamStats = {
  clubId: string;
  name: string;
  players: number;
  shots: number;
  passesMade: number;
  passAttempts: number;
  passSuccess: number;
  tacklesMade: number;
  tackleAttempts: number;
  tackleSuccess: number;
  saves: number;
  redCards: number;
  averageRating: number;
  crestUrls: string[];
};

type MatchPlayer = {
  id: string;
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
  cleanSheetAny: boolean;
  cleanSheetDef: boolean;
  cleanSheetGk: boolean;
  crossSaves: number;
  punchSaves: number;
  reflexSaves: number;
  directionSaves: number;
};

type AdvancedPlayer = {
  id: string;
  name: string;
  position: string;
  games: number;
  averageRating: number;
  goals: number;
  assists: number;
  contributions: number;
  contributionsPerGame: number;
  shots: number;
  shootingEfficiency: number;
  passesMade: number;
  passAttempts: number;
  passSuccess: number;
  tacklesMade: number;
  tackleAttempts: number;
  tackleSuccess: number;
  saves: number;
  redCards: number;
  manOfTheMatch: number;
  cleanSheetsAny: number;
  cleanSheetsDef: number;
  cleanSheetsGk: number;
  crossSaves: number;
  punchSaves: number;
  reflexSaves: number;
  directionSaves: number;
};

type Goalkeeper = AdvancedPlayer & {
  goalsAgainst: number;
  savePct: number;
};

type H2H = {
  opponent: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  recent: Array<{
    id: number;
    playedAt: string | null;
    score: string;
    result: "V" | "N" | "D";
  }>;
};

type SeasonOption = {
  id: number;
  name: string;
  is_active: boolean;
};

type CompetitionOption = {
  id: number;
  name: string;
  short_name: string | null;
  competition_type: string;
};

type StaffUser = {
  userId: string;
  displayName: string;
  role: "admin" | "staff" | "viewer";
};

type MatchCenterResponse = {
  matches: MatchSummary[];
  selected: null | {
    match: MatchSummary;
    gxTeam: TeamStats;
    opponentTeam: TeamStats;
    players: MatchPlayer[];
    opponentPlayers: Array<{
      id: string;
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
    }>;
    h2h: H2H;
    sameDayMatches: MatchSummary[];
    sessionPlayers: AdvancedPlayer[];
    programmeLink: null | {
      weekStart: string;
      eventDate: string;
      eventId: string;
      time: string;
      opponentName: string;
      title: string;
      formation: string | null;
      lineupCount: number;
      benchCount: number;
      hasPlan: boolean;
    };
  };
  advancedPlayers: AdvancedPlayer[];
  goalkeepers: Goalkeeper[];
  seasons: SeasonOption[];
  competitions: CompetitionOption[];
  currentUser: StaffUser | null;
};

function formatDate(value: string | null) {
  if (!value) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function shortDate(value: string | null) {
  if (!value) return "--/--";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function resultClass(result: "V" | "N" | "D") {
  if (result === "V") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (result === "D") return "border-red-400/30 bg-red-400/10 text-red-300";
  return "border-slate-400/20 bg-slate-400/10 text-slate-300";
}

function positionLabel(position: string) {
  if (position === "goalkeeper") return "Gardien";
  if (position === "defender") return "Défenseur";
  if (position === "midfielder") return "Milieu";
  if (position === "forward") return "Attaquant";
  return position || "-";
}

function StatBar({
  label,
  left,
  right,
  suffix = "",
}: {
  label: string;
  left: number;
  right: number;
  suffix?: string;
}) {
  const max = Math.max(left, right, 1);
  const leftPct = Math.max(3, (left / max) * 100);
  const rightPct = Math.max(3, (right / max) * 100);
  const winner = left === right ? "draw" : left > right ? "left" : "right";

  return (
    <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className={`text-xl font-black ${winner === "left" ? "text-yellow-300" : "text-white"}`}>
          {left}{suffix}
        </span>
        <span className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          {label}
        </span>
        <span className={`text-right text-xl font-black ${winner === "right" ? "text-cyan-300" : "text-white"}`}>
          {right}{suffix}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_2px_1fr] items-center gap-2">
        <div className="flex h-2.5 justify-end overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-l from-yellow-300 to-yellow-500 shadow-[0_0_12px_rgba(250,204,21,0.35)]"
            style={{ width: `${leftPct}%` }}
          />
        </div>
        <div className="h-5 bg-white/15" />
        <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.35)]"
            style={{ width: `${rightPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadFirstImage(sources: string[]) {
  for (const source of sources) {
    try {
      return await loadImage(source);
    } catch {
      // On essaie le candidat suivant.
    }
  }
  return null;
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  color: string
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawHexagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawFieldPlayerArt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const cx = x + width / 2;
  const top = y + 18;

  ctx.save();
  ctx.shadowColor = 'rgba(34,211,238,0.35)';
  ctx.shadowBlur = 24;

  const body = ctx.createLinearGradient(x, y, x + width, y + height);
  body.addColorStop(0, '#1ec8ff');
  body.addColorStop(0.55, '#ffffff');
  body.addColorStop(1, '#facc15');
  ctx.fillStyle = body;

  ctx.beginPath();
  ctx.arc(cx, top + 58, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 58, top + 130);
  ctx.lineTo(cx, top + 104);
  ctx.lineTo(cx + 58, top + 130);
  ctx.lineTo(cx + 76, top + 214);
  ctx.lineTo(cx + 18, top + 300);
  ctx.lineTo(cx - 18, top + 300);
  ctx.lineTo(cx - 76, top + 214);
  ctx.closePath();
  ctx.fill();

  drawLine(ctx, cx - 86, top + 148, cx - 10, top + 206, 22, '#ffffff');
  drawLine(ctx, cx + 86, top + 148, cx + 8, top + 202, 22, '#facc15');
  drawLine(ctx, cx - 24, top + 300, cx - 62, top + 404, 22, '#ffffff');
  drawLine(ctx, cx + 20, top + 300, cx + 58, top + 414, 22, '#1ec8ff');

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx + 78, top + 378, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#06111f';
  drawHexagon(ctx, cx + 78, top + 378, 16);
  ctx.fill();

  ctx.restore();
}

function drawGoalkeeperArt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const cx = x + width / 2;
  const top = y + 12;

  ctx.save();
  ctx.shadowColor = 'rgba(250,204,21,0.32)';
  ctx.shadowBlur = 26;

  const body = ctx.createLinearGradient(x, y, x + width, y + height);
  body.addColorStop(0, '#22d3ee');
  body.addColorStop(0.5, '#d7faff');
  body.addColorStop(1, '#facc15');
  ctx.fillStyle = body;

  ctx.beginPath();
  ctx.arc(cx, top + 52, 32, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 48, top + 126);
  ctx.lineTo(cx + 48, top + 126);
  ctx.lineTo(cx + 66, top + 232);
  ctx.lineTo(cx - 66, top + 232);
  ctx.closePath();
  ctx.fill();

  drawLine(ctx, cx - 138, top + 108, cx - 38, top + 162, 20, '#1ec8ff');
  drawLine(ctx, cx + 138, top + 108, cx + 38, top + 162, 20, '#facc15');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 154, top + 92, 28, 28);
  ctx.fillRect(cx + 126, top + 92, 28, 28);

  drawLine(ctx, cx - 24, top + 232, cx - 54, top + 398, 22, '#d7faff');
  drawLine(ctx, cx + 24, top + 232, cx + 54, top + 398, 22, '#facc15');

  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, top + 180, 26, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  ctx.restore();
}

function TeamCrest({
  sources,
  name,
  size = 54,
  className = "",
}: {
  sources: string[];
  name: string;
  size?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const sourcesKey = sources.join("|");

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [sourcesKey]);

  const source = sources[index] ?? "";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/20 ${className}`}
      style={{ width: size, height: size }}
      title={name}
    >
      {!failed && source ? (
        <img
          src={source}
          alt={`Logo ${name}`}
          className="h-full w-full object-contain p-1.5"
          onError={() => {
            const nextIndex = index + 1;
            if (nextIndex < sources.length) {
              setIndex(nextIndex);
            } else {
              setFailed(true);
            }
          }}
        />
      ) : (
        <Shield size={Math.max(18, size * 0.42)} className="text-slate-600" />
      )}
    </div>
  );
}

export default function MatchCenterPage() {
  const [data, setData] = useState<MatchCenterResponse | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [competitionFilter, setCompetitionFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [assignmentSeasonId, setAssignmentSeasonId] = useState("");
  const [assignmentCompetitionId, setAssignmentCompetitionId] = useState("");
  const [exportPlayerId, setExportPlayerId] = useState("");
  const [exportPlayerImage, setExportPlayerImage] = useState("");
  const [exportPlayerImageName, setExportPlayerImageName] = useState("");
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");

  const load = useCallback(async (matchId?: number | null) => {
    try {
      setLoading(true);
      setError("");
      const query = matchId ? `?matchId=${matchId}` : "";
      const response = await fetch(`/api/match-center${query}`, {
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.details ?? json.error ?? "Erreur Match Center");
      }
      setData(json);
      setSelectedId(json.selected?.match?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMatchId = Number(params.get("matchId") ?? 0);
    void load(Number.isInteger(requestedMatchId) && requestedMatchId > 0 ? requestedMatchId : null);
  }, [load]);

  const selected = data?.selected ?? null;
  const canEditAssignments =
    data?.currentUser?.role === "admin" || data?.currentUser?.role === "staff";

  const canExport =
    canEditAssignments;

  useEffect(() => {
    setAssignmentSeasonId(
      selected?.match.seasonId !== null && selected?.match.seasonId !== undefined
        ? String(selected.match.seasonId)
        : ""
    );
    setAssignmentCompetitionId(
      selected?.match.competitionId !== null && selected?.match.competitionId !== undefined
        ? String(selected.match.competitionId)
        : ""
    );
    setAssignmentMessage("");
  }, [selected?.match.id, selected?.match.seasonId, selected?.match.competitionId]);

  async function saveAssignment() {
    if (!selected || !canEditAssignments) return;

    try {
      setAssignmentSaving(true);
      setAssignmentMessage("");
      setError("");

      const response = await fetch("/api/match-competition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId: selected.match.id,
          seasonId: assignmentSeasonId || null,
          competitionId: assignmentCompetitionId || null,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.details ?? json.error ?? "Impossible de classer le match.");
      }

      setAssignmentMessage("Saison et compétition enregistrées.");
      await load(selected.match.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de classement du match.");
    } finally {
      setAssignmentSaving(false);
    }
  }

  const mvpGx = useMemo(() => {
    if (!selected?.players.length) return null;
    return [...selected.players].sort((a, b) => b.rating - a.rating)[0];
  }, [selected]);

  const sessionMvp = useMemo(() => {
    if (!selected?.sessionPlayers.length) return null;
    return [...selected.sessionPlayers].sort((a, b) => {
      const scoreA =
        a.averageRating * 10 +
        a.contributions * 4 +
        a.manOfTheMatch * 6 +
        a.cleanSheetsGk * 3 +
        a.saves * 0.35 +
        a.games * 0.5;
      const scoreB =
        b.averageRating * 10 +
        b.contributions * 4 +
        b.manOfTheMatch * 6 +
        b.cleanSheetsGk * 3 +
        b.saves * 0.35 +
        b.games * 0.5;
      return scoreB - scoreA;
    })[0];
  }, [selected]);

  const exportSessionPlayer = useMemo(() => {
    if (!selected?.sessionPlayers.length) return null;
    return (
      selected.sessionPlayers.find((player) => player.id === exportPlayerId) ??
      sessionMvp
    );
  }, [selected, exportPlayerId, sessionMvp]);

  useEffect(() => {
    if (!selected?.sessionPlayers.length) {
      setExportPlayerId("");
      return;
    }

    const exists = selected.sessionPlayers.some((player) => player.id === exportPlayerId);
    if (!exists) {
      setExportPlayerId(sessionMvp?.id ?? selected.sessionPlayers[0]?.id ?? "");
    }
  }, [selected, sessionMvp, exportPlayerId]);

  const officialMotm = useMemo(() => {
    if (!selected) return null;
    const gxMotm = selected.players.find((player) => player.manOfTheMatch);
    if (gxMotm) {
      return { ...gxMotm, team: "GX NOVA" };
    }
    const opponentMotm = selected.opponentPlayers.find(
      (player) => player.manOfTheMatch
    );
    if (opponentMotm) {
      return { ...opponentMotm, team: selected.match.opponent };
    }
    return null;
  }, [selected]);

  const seasonOptions = useMemo(() => {
    if (!data) return [];
    return data.seasons.map((season) => [String(season.id), season.name] as const);
  }, [data]);

  const competitionOptions = useMemo(() => {
    if (!data) return [];
    return data.competitions.map((competition) => [
      String(competition.id),
      competition.short_name ?? competition.name,
    ] as const);
  }, [data]);

  const filteredMatches = useMemo(() => {
    if (!data) return [];
    return data.matches.filter((match) => {
      if (seasonFilter !== "all" && String(match.seasonId) !== seasonFilter) {
        return false;
      }
      if (
        competitionFilter !== "all" &&
        String(match.competitionId) !== competitionFilter
      ) {
        return false;
      }
      if (resultFilter !== "all" && match.result !== resultFilter) {
        return false;
      }
      return true;
    });
  }, [data, seasonFilter, competitionFilter, resultFilter]);

  const matchReading = useMemo(() => {
    if (!selected) return [];
    const items: string[] = [];
    const gx = selected.gxTeam;
    const opp = selected.opponentTeam;

    const passDiff = Math.round((gx.passSuccess - opp.passSuccess) * 10) / 10;
    if (Math.abs(passDiff) >= 2) {
      items.push(
        passDiff > 0
          ? `GX NOVA a été plus précis dans la circulation : ${gx.passSuccess}% de passes réussies contre ${opp.passSuccess}%.`
          : `${selected.match.opponent} a été plus précis dans la circulation : ${opp.passSuccess}% contre ${gx.passSuccess}% pour GX NOVA.`
      );
    }

    const shotDiff = gx.shots - opp.shots;
    if (shotDiff !== 0) {
      items.push(
        shotDiff > 0
          ? `GX NOVA a produit davantage de tirs (${gx.shots} contre ${opp.shots}).`
          : `${selected.match.opponent} a davantage tiré (${opp.shots} contre ${gx.shots}).`
      );
    }

    const tackleDiff = gx.tacklesMade - opp.tacklesMade;
    if (tackleDiff !== 0) {
      items.push(
        tackleDiff > 0
          ? `GX NOVA a remporté plus de tacles (${gx.tacklesMade} contre ${opp.tacklesMade}).`
          : `L'adversaire a remporté davantage de tacles (${opp.tacklesMade} contre ${gx.tacklesMade}).`
      );
    }

    if (gx.saves !== opp.saves) {
      items.push(
        gx.saves > opp.saves
          ? `Le gardien GX NOVA a été davantage sollicité avec ${gx.saves} arrêt(s), contre ${opp.saves} côté adverse.`
          : `Le gardien adverse a réalisé davantage d'arrêts (${opp.saves} contre ${gx.saves}).`
      );
    }

    if (!items.length) {
      items.push("Les principaux indicateurs EA sont très proches entre les deux équipes sur ce match.");
    }

    return items.slice(0, 3);
  }, [selected]);

  async function chooseMatch(id: number) {
    setSelectedId(id);
    await load(id);
  }

  function handlePlayerImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!canExport) return;

    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setExportPlayerImage(reader.result);
        setExportPlayerImageName(file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  async function makePoster(kind: "result" | "sessionMvp" | "evening") {
    if (!selected || !canExport) return;
    try {
      setExporting(kind);
      const width = 1600;
      const height = 900;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Impossible de créer le visuel.");

      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#020814");
      bg.addColorStop(0.58, "#07182a");
      bg.addColorStop(1, "#02060d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(250,204,21,0.05)";
      for (let x = -80; x < width + 200; x += 165) {
        ctx.save();
        ctx.translate(x, 0);
        ctx.rotate(-0.16);
        ctx.fillRect(0, -80, 44, height + 180);
        ctx.restore();
      }

      ctx.fillStyle = "#facc15";
      ctx.fillRect(0, 0, width, 9);
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(0, 196, 920, 4);

      let logo: HTMLImageElement | null = null;
      try {
        logo = await loadImage(CLUB_LOGO);
      } catch {
        logo = null;
      }
      if (logo) ctx.drawImage(logo, 54, 42, 130, 130);

      const opponentLogo = await loadFirstImage(
        selected.opponentTeam.crestUrls
      );
      const chosenSessionMvp = exportSessionPlayer ?? sessionMvp;
      let chosenSessionMvpPortrait: HTMLImageElement | null = null;
      if (exportPlayerImage) {
        try {
          chosenSessionMvpPortrait = await loadImage(exportPlayerImage);
        } catch {
          chosenSessionMvpPortrait = null;
        }
      }

      ctx.fillStyle = "#facc15";
      ctx.font = "900 28px Arial";
      ctx.fillText("GX NOVA • FC27", 220, 82);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 58px Arial";
      ctx.fillText(
        kind === "sessionMvp"
          ? "MVP DE LA SESSION"
          : kind === "evening"
          ? "BILAN DE LA SOIRÉE"
          : "MATCH RESULT",
        220,
        146
      );
      ctx.fillStyle = "#9fb2c8";
      ctx.font = "800 22px Arial";
      ctx.fillText(formatDate(selected.match.playedAt).toUpperCase(), 220, 184);

      if (kind === "result") {
        if (logo) {
          drawRoundedRect(ctx, 390, 238, 160, 160, 30);
          ctx.fillStyle = "rgba(250,204,21,0.05)";
          ctx.fill();
          ctx.strokeStyle = "rgba(250,204,21,0.25)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.drawImage(logo, 408, 256, 124, 124);
        }

        drawRoundedRect(ctx, 1050, 238, 160, 160, 30);
        ctx.fillStyle = "rgba(34,211,238,0.05)";
        ctx.fill();
        ctx.strokeStyle = "rgba(34,211,238,0.25)";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (opponentLogo) {
          ctx.drawImage(opponentLogo, 1068, 256, 124, 124);
        } else {
          ctx.fillStyle = "#64748b";
          ctx.font = "900 42px Arial";
          ctx.textAlign = "center";
          ctx.fillText("FC", 1130, 334);
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "900 42px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GX NOVA", 470, 440);
        ctx.fillText(selected.match.opponent.toUpperCase(), 1130, 440);

        ctx.font = "900 104px Arial";
        ctx.fillStyle = "#facc15";
        ctx.fillText(String(selected.match.goalsFor), 660, 550);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("-", 800, 550);
        ctx.fillStyle = "#22d3ee";
        ctx.fillText(String(selected.match.goalsAgainst), 940, 550);
        ctx.textAlign = "left";

        const stats = [
          ["TIRS", selected.gxTeam.shots, selected.opponentTeam.shots],
          ["PASSES", selected.gxTeam.passesMade, selected.opponentTeam.passesMade],
          ["% PASSES", selected.gxTeam.passSuccess, selected.opponentTeam.passSuccess],
          ["TACLES", selected.gxTeam.tacklesMade, selected.opponentTeam.tacklesMade],
        ] as const;
        let sx = 210;
        for (const [label, left, right] of stats) {
          drawRoundedRect(ctx, sx, 620, 280, 120, 22);
          ctx.fillStyle = "rgba(255,255,255,0.045)";
          ctx.fill();
          ctx.fillStyle = "#8da4bb";
          ctx.font = "900 16px Arial";
          ctx.fillText(label, sx + 22, 652);
          ctx.fillStyle = "#ffffff";
          ctx.font = "900 34px Arial";
          ctx.fillText(`${left} / ${right}`, sx + 22, 704);
          sx += 310;
        }
      }

      if (kind === "sessionMvp") {
        if (!chosenSessionMvp) throw new Error("Aucun joueur disponible pour la session.");

        const sessionPlayer = chosenSessionMvp;
        const isGoalkeeper = sessionPlayer.position === "goalkeeper";
        const accent = isGoalkeeper ? "#22d3ee" : "#facc15";
        const roleTitle = isGoalkeeper ? "MUR DE LA SESSION" : "MVP DE LA SESSION";

        const panelX = 72;
        const panelY = 228;
        const panelW = 1456;
        const panelH = 612;

        drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 34);
        const panelBg = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
        panelBg.addColorStop(0, "rgba(6,16,29,0.97)");
        panelBg.addColorStop(0.55, "rgba(8,24,42,0.98)");
        panelBg.addColorStop(1, "rgba(6,12,22,0.97)");
        ctx.fillStyle = panelBg;
        ctx.fill();
        ctx.strokeStyle = isGoalkeeper ? "rgba(34,211,238,0.28)" : "rgba(250,204,21,0.28)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = accent;
        ctx.font = "900 20px Arial";
        ctx.fillText(`SESSION OFFICIELLE • ${selected.sameDayMatches.length || 1} MATCH${(selected.sameDayMatches.length || 1) > 1 ? "S" : ""}`, panelX + 34, panelY + 36);

        const cardX = panelX + 34;
        const cardY = panelY + 80;
        const cardW = 372;
        const cardH = 470;

        drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 32);
        const cardBg = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
        cardBg.addColorStop(0, isGoalkeeper ? "#0c4759" : "#523008");
        cardBg.addColorStop(0.45, "#0a1324");
        cardBg.addColorStop(1, isGoalkeeper ? "#081b2b" : "#151020");
        ctx.fillStyle = cardBg;
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "900 84px Arial";
        ctx.fillText(sessionPlayer.averageRating.toFixed(2), cardX + 24, cardY + 84);
        ctx.fillStyle = "#22d3ee";
        ctx.font = "900 18px Arial";
        ctx.fillText(positionLabel(sessionPlayer.position).toUpperCase(), cardX + 30, cardY + 114);

        drawRoundedRect(ctx, cardX + cardW - 140, cardY + 22, 114, 32, 16);
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.textAlign = "center";
        ctx.font = "900 14px Arial";
        ctx.fillText(isGoalkeeper ? "SESSION WALL" : "SESSION MVP", cardX + cardW - 83, cardY + 43);
        ctx.textAlign = "left";

        if (logo) {
          drawRoundedRect(ctx, cardX + cardW - 92, cardY + 74, 58, 58, 16);
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fill();
          ctx.drawImage(logo, cardX + cardW - 84, cardY + 82, 42, 42);
        }

        const artX = cardX + 18;
        const artY = cardY + 136;
        const artW = cardW - 36;
        const artH = 208;
        ctx.save();
        ctx.beginPath();
        drawRoundedRect(ctx, artX, artY, artW, artH, 24);
        ctx.clip();
        const aura = ctx.createRadialGradient(cardX + cardW / 2, artY + artH / 2, 28, cardX + cardW / 2, artY + artH / 2, 180);
        aura.addColorStop(0, isGoalkeeper ? "rgba(34,211,238,0.34)" : "rgba(250,204,21,0.30)");
        aura.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = aura;
        ctx.fillRect(artX, artY, artW, artH);

        if (chosenSessionMvpPortrait) {
          const img = chosenSessionMvpPortrait;
          const imgRatio = img.width / img.height;
          const boxRatio = artW / artH;
          let drawW = artW;
          let drawH = artH;
          let dx = artX;
          let dy = artY;
          if (imgRatio > boxRatio) {
            drawH = artH;
            drawW = artH * imgRatio;
            dx = artX - (drawW - artW) / 2;
          } else {
            drawW = artW;
            drawH = artW / imgRatio;
            dy = artY - (drawH - artH) / 2;
          }
          ctx.drawImage(img, dx, dy, drawW, drawH);
          ctx.fillStyle = "rgba(2,8,20,0.16)";
          ctx.fillRect(artX, artY, artW, artH);
        } else {
          if (isGoalkeeper) {
            drawGoalkeeperArt(ctx, cardX + 54, cardY + 150, 270, 176);
          } else {
            drawFieldPlayerArt(ctx, cardX + 50, cardY + 145, 276, 182);
          }
        }
        ctx.restore();

        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 32px Arial";
        ctx.fillText(sessionPlayer.name.toUpperCase(), cardX + cardW / 2, cardY + 390);
        ctx.fillStyle = "#9fb2c8";
        ctx.font = "900 18px Arial";
        ctx.fillText(roleTitle, cardX + cardW / 2, cardY + 420);
        ctx.textAlign = "left";

        const rightX = cardX + cardW + 48;
        const rightY = cardY + 10;

        ctx.fillStyle = accent;
        ctx.font = "900 20px Arial";
        ctx.fillText("JOUEUR MIS À L'HONNEUR", rightX, rightY + 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 60px Arial";
        ctx.fillText(sessionPlayer.name, rightX, rightY + 76);
        ctx.fillStyle = "#9fb2c8";
        ctx.font = "800 24px Arial";
        ctx.fillText(`${positionLabel(sessionPlayer.position)} • ${sessionPlayer.games} match(s) joués`, rightX, rightY + 114);

        const summary = isGoalkeeper
          ? `Gardien décisif : ${sessionPlayer.saves} arrêt(s), ${sessionPlayer.cleanSheetsGk} clean sheet(s) et ${sessionPlayer.reflexSaves} réflexe(s).`
          : `Session solide : ${sessionPlayer.goals} but(s), ${sessionPlayer.assists} passe(s) décisive(s) et ${sessionPlayer.passSuccess}% de passes réussies.`;
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "800 20px Arial";
        ctx.fillText(summary, rightX, rightY + 156);

        const stats = isGoalkeeper
          ? [
              ["NOTE", sessionPlayer.averageRating.toFixed(2)],
              ["MATCHS", String(sessionPlayer.games)],
              ["ARRÊTS", String(sessionPlayer.saves)],
              ["CLEAN SHEETS", String(sessionPlayer.cleanSheetsGk)],
              ["RÉFLEXES", String(sessionPlayer.reflexSaves)],
              ["PUNCH", String(sessionPlayer.punchSaves)],
            ]
          : [
              ["NOTE", sessionPlayer.averageRating.toFixed(2)],
              ["MATCHS", String(sessionPlayer.games)],
              ["BUTS", String(sessionPlayer.goals)],
              ["PASSES DÉ.", String(sessionPlayer.assists)],
              ["PASS %", `${sessionPlayer.passSuccess}%`],
              ["TACLES %", `${sessionPlayer.tackleSuccess}%`],
            ];

        let sx = rightX;
        let sy = rightY + 208;
        stats.forEach((stat, idx) => {
          if (idx === 3) {
            sx = rightX;
            sy += 128;
          }
          drawRoundedRect(ctx, sx, sy, 302, 104, 20);
          ctx.fillStyle = idx % 2 === 0 ? "rgba(250,204,21,0.05)" : "rgba(34,211,238,0.05)";
          ctx.fill();
          ctx.strokeStyle = idx % 2 === 0 ? "rgba(250,204,21,0.18)" : "rgba(34,211,238,0.18)";
          ctx.lineWidth = 1.25;
          ctx.stroke();
          ctx.fillStyle = "#8fa5bc";
          ctx.font = "800 15px Arial";
          ctx.fillText(stat[0], sx + 18, sy + 30);
          ctx.fillStyle = "#ffffff";
          ctx.font = "900 38px Arial";
          ctx.fillText(stat[1], sx + 18, sy + 73);
          sx += 320;
        });

        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "800 15px Arial";
        ctx.fillText(
          exportPlayerImageName
            ? `PHOTO JOUEUR : ${exportPlayerImageName.toUpperCase()}`
            : "ASTUCE : IMPORTE UNE PHOTO JOUEUR DANS LE PANNEAU D'EXPORT POUR UN RENDU ENCORE PLUS PREMIUM.",
          rightX,
          panelY + panelH - 28
        );
      }

      if (kind === "evening") {
        const matches = selected.sameDayMatches.length
          ? selected.sameDayMatches
          : [selected.match];
        let y = 265;

        for (const match of matches.slice(0, 6)) {
          const matchLogo = await loadFirstImage(match.opponentCrestUrls);

          drawRoundedRect(ctx, 190, y, 1220, 92, 22);
          ctx.fillStyle = "rgba(5,23,39,0.94)";
          ctx.fill();

          ctx.fillStyle =
            match.result === "V"
              ? "#34d399"
              : match.result === "D"
              ? "#fb7185"
              : "#cbd5e1";
          ctx.font = "900 26px Arial";
          ctx.fillText(match.result, 228, y + 56);

          drawRoundedRect(ctx, 275, y + 14, 64, 64, 15);
          ctx.fillStyle = "rgba(255,255,255,0.055)";
          ctx.fill();

          if (matchLogo) {
            ctx.drawImage(matchLogo, 281, y + 20, 52, 52);
          }

          ctx.fillStyle = "#ffffff";
          ctx.font = "900 28px Arial";
          ctx.fillText(match.opponent, 365, y + 42);
          ctx.fillStyle = "#8fa5bc";
          ctx.font = "700 17px Arial";
          ctx.fillText(match.competitionName ?? "Amical", 365, y + 68);

          ctx.fillStyle = "#facc15";
          ctx.font = "900 36px Arial";
          ctx.textAlign = "right";
          ctx.fillText(
            `${match.goalsFor} - ${match.goalsAgainst}`,
            1362,
            y + 58
          );
          ctx.textAlign = "left";
          y += 108;
        }
      }

      ctx.fillStyle = "rgba(255,255,255,0.30)";
      ctx.font = "800 16px Arial";
      ctx.fillText("GX NOVA • MATCH CENTER OFFICIEL", 54, 862);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1)
      );
      if (!blob) throw new Error("Impossible de générer le PNG.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GX-NOVA-${kind}-${selected.match.id}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur export");
    } finally {
      setExporting("");
    }
  }

  if (loading && !data) {
    return (
      <main className="min-h-screen bg-[#020914] p-10 text-center text-slate-400">
        Chargement du Match Center...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020914] text-white">
      <style jsx global>{`
        .match-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(34, 211, 238, 0.55) rgba(255, 255, 255, 0.04);
        }
        .match-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .match-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.035);
          border-radius: 999px;
        }
        .match-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(34, 211, 238, 0.75), rgba(250, 204, 21, 0.55));
          border-radius: 999px;
        }
      `}</style>
      <header className="border-b border-cyan-400/10 bg-[#06111f]">
        <div className="mx-auto flex max-w-[1750px] flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:border-yellow-400/30 hover:text-yellow-300"
            >
              <ArrowLeft size={19} />
            </a>
            <img src={CLUB_LOGO} alt="GX NOVA" className="h-14 w-14 object-contain" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">
                GX NOVA • FC27
              </p>
              <h1 className="mt-1 text-2xl font-black lg:text-3xl">Match Center</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void load(selectedId)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-slate-300 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1750px] px-5 py-6 lg:px-8">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-bold text-red-300">
            {error}
          </div>
        )}

        {!data?.matches.length || !selected ? (
          <div className="rounded-3xl border border-white/10 bg-[#071321] p-16 text-center text-slate-500">
            Aucun match disponible.
          </div>
        ) : (
          <>
            <section className="mb-5 grid gap-5 2xl:grid-cols-[430px_1fr]">
              <div className="rounded-3xl border border-white/10 bg-[#071321] p-4">
                <div className="mb-3 flex items-center gap-2 text-cyan-300">
                  <Swords size={17} />
                  <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                    Matchs récents
                  </h2>
                </div>

                <div className="mb-3 grid gap-2 sm:grid-cols-3 2xl:grid-cols-1">
                  <select
                    value={seasonFilter}
                    onChange={(event) => setSeasonFilter(event.target.value)}
                    className="rounded-xl border border-white/10 bg-[#04101d] px-3 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-cyan-400/30"
                  >
                    <option value="all">Toutes les saisons</option>
                    {seasonOptions.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={competitionFilter}
                    onChange={(event) => setCompetitionFilter(event.target.value)}
                    className="rounded-xl border border-white/10 bg-[#04101d] px-3 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-cyan-400/30"
                  >
                    <option value="all">Toutes les compétitions</option>
                    {competitionOptions.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={resultFilter}
                    onChange={(event) => setResultFilter(event.target.value)}
                    className="rounded-xl border border-white/10 bg-[#04101d] px-3 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-cyan-400/30"
                  >
                    <option value="all">Tous les résultats</option>
                    <option value="V">Victoires</option>
                    <option value="N">Nuls</option>
                    <option value="D">Défaites</option>
                  </select>
                </div>

                <div className="match-scrollbar max-h-[560px] space-y-2 overflow-y-auto pr-2">
                  {filteredMatches.map((match) => (
                    <button
                      key={match.id}
                      type="button"
                      onClick={() => void chooseMatch(match.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        match.id === selected.match.id
                          ? "border-cyan-400/40 bg-cyan-400/10"
                          : "border-white/8 bg-white/[0.025] hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <TeamCrest
                            sources={match.opponentCrestUrls}
                            name={match.opponent}
                            size={42}
                            className="rounded-xl"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">vs {match.opponent}</p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {shortDate(match.playedAt)} • {match.competitionName ?? "Amical"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-lg border px-2 py-1 text-xs font-black ${resultClass(match.result)}`}>
                            {match.result}
                          </span>
                          <span className="text-lg font-black text-white">
                            {match.goalsFor}-{match.goalsAgainst}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                  {!filteredMatches.length && (
                    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs font-bold text-slate-600">
                      Aucun match avec ces filtres.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <section className="overflow-hidden rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-[#071d31] via-[#061321] to-[#020914] p-6">
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
                        {selected.match.competitionName ?? "Match amical"}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {formatDate(selected.match.playedAt)}
                        {selected.match.seasonName ? ` • ${selected.match.seasonName}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-xl border px-4 py-2 text-sm font-black ${resultClass(selected.match.result)}`}>
                      {selected.match.result === "V" ? "VICTOIRE" : selected.match.result === "D" ? "DÉFAITE" : "NUL"}
                    </span>
                  </div>

                  <div className="mt-8 grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
                    <div className="flex items-center justify-center gap-4 md:justify-end">
                      <div className="text-center md:text-right">
                        <p className="text-3xl font-black">GX NOVA</p>
                        <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-yellow-400">
                          {selected.gxTeam.averageRating.toFixed(2)} note équipe
                        </p>
                      </div>
                      <TeamCrest
                        sources={[CLUB_LOGO]}
                        name="GX NOVA"
                        size={76}
                        className="border-yellow-400/20 bg-yellow-400/[0.04]"
                      />
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-black/25 px-8 py-5 text-center">
                      <p className="text-5xl font-black">
                        <span className="text-yellow-400">{selected.match.goalsFor}</span>
                        <span className="mx-4 text-slate-500">-</span>
                        <span className="text-cyan-400">{selected.match.goalsAgainst}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-4 md:justify-start">
                      <TeamCrest
                        sources={selected.opponentTeam.crestUrls}
                        name={selected.match.opponent}
                        size={76}
                        className="border-cyan-400/20 bg-cyan-400/[0.04]"
                      />
                      <div className="text-center md:text-left">
                        <p className="text-3xl font-black">{selected.match.opponent}</p>
                        <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-400">
                          {selected.opponentTeam.averageRating.toFixed(2)} note équipe
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_1.35fr]">
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.045] p-4">
                      <div className="flex items-center gap-3">
                        <TeamCrest
                          sources={selected.opponentTeam.crestUrls}
                          name={selected.h2h.opponent}
                          size={38}
                          className="rounded-xl"
                        />
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
                          Historique vs {selected.h2h.opponent}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="text-lg font-black">{selected.h2h.matches} match(s)</span>
                        <span className="text-sm font-black text-emerald-300">{selected.h2h.wins} V</span>
                        <span className="text-sm font-black text-slate-300">{selected.h2h.draws} N</span>
                        <span className="text-sm font-black text-red-300">{selected.h2h.losses} D</span>
                        <span className="text-sm font-bold text-slate-500">
                          {selected.h2h.goalsFor} BP • {selected.h2h.goalsAgainst} BC
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.035] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-yellow-300">
                        Lecture du match
                      </p>
                      <div className="mt-3 space-y-2">
                        {matchReading.map((item, index) => (
                          <p key={index} className="text-sm font-semibold leading-relaxed text-slate-300">
                            <span className="mr-2 text-yellow-400">◆</span>{item}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-yellow-400/15 bg-gradient-to-r from-yellow-400/[0.055] via-[#071321] to-cyan-400/[0.035] p-5">
                  <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400">
                        Classement du match
                      </p>
                      <h2 className="mt-1 text-lg font-black">Saison & compétition</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Cette fonction remplace l&apos;ancien onglet Matchs pour affecter le match sélectionné.
                      </p>
                    </div>

                    <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:min-w-[620px] xl:grid-cols-[1fr_1fr_auto]">
                      <select
                        value={assignmentSeasonId}
                        disabled={!canEditAssignments || assignmentSaving}
                        onChange={(event) => setAssignmentSeasonId(event.target.value)}
                        className="rounded-xl border border-white/10 bg-[#04101d] px-3 py-3 text-sm font-bold text-slate-200 outline-none transition focus:border-yellow-400/35 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <option value="">Aucune saison</option>
                        {(data?.seasons ?? []).map((season) => (
                          <option key={season.id} value={season.id}>
                            {season.name}{season.is_active ? " • active" : ""}
                          </option>
                        ))}
                      </select>

                      <select
                        value={assignmentCompetitionId}
                        disabled={!canEditAssignments || assignmentSaving}
                        onChange={(event) => setAssignmentCompetitionId(event.target.value)}
                        className="rounded-xl border border-white/10 bg-[#04101d] px-3 py-3 text-sm font-bold text-slate-200 outline-none transition focus:border-cyan-400/35 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <option value="">Aucune compétition</option>
                        {(data?.competitions ?? []).map((competition) => (
                          <option key={competition.id} value={competition.id}>
                            {competition.short_name ?? competition.name}
                          </option>
                        ))}
                      </select>

                      {canEditAssignments ? (
                        <button
                          type="button"
                          onClick={() => void saveAssignment()}
                          disabled={assignmentSaving}
                          className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:opacity-50 sm:col-span-2 xl:col-span-1"
                        >
                          <Save size={16} />
                          {assignmentSaving ? "Enregistrement..." : "Enregistrer"}
                        </button>
                      ) : (
                        <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs font-black text-slate-500 sm:col-span-2 xl:col-span-1">
                          Lecture seule
                        </div>
                      )}
                    </div>
                  </div>

                  {assignmentMessage && (
                    <p className="mt-3 text-xs font-black text-emerald-300">
                      {assignmentMessage}
                    </p>
                  )}
                </section>

                {selected.programmeLink && (
                  <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-400/[0.055] via-[#071321] to-yellow-400/[0.035] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                          Composition programmée
                        </p>
                        <h2 className="mt-1 text-lg font-black">
                          {selected.programmeLink.hasPlan
                            ? `${selected.programmeLink.formation ?? "Formation"} • ${selected.programmeLink.lineupCount}/11 titulaire(s)`
                            : "Aucune composition enregistrée"}
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {selected.programmeLink.eventDate}
                          {selected.programmeLink.time ? ` • ${selected.programmeLink.time}` : ""}
                          {selected.programmeLink.benchCount > 0
                            ? ` • ${selected.programmeLink.benchCount} sur le banc`
                            : ""}
                        </p>
                      </div>

                      <a
                        href={`/programme?weekStart=${encodeURIComponent(
                          selected.programmeLink.weekStart
                        )}&eventId=${encodeURIComponent(
                          selected.programmeLink.eventId
                        )}&openPlan=1`}
                        className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-300 transition hover:bg-cyan-400/15"
                      >
                        <ExternalLink size={16} />
                        {selected.programmeLink.hasPlan
                          ? "Voir la composition"
                          : "Préparer la composition"}
                      </a>
                    </div>
                  </section>
                )}

                <section className="rounded-3xl border border-white/10 bg-[#071321] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart3 size={18} className="text-yellow-400" />
                    <h2 className="font-black">Comparaison collective EA</h2>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <StatBar label="Tirs" left={selected.gxTeam.shots} right={selected.opponentTeam.shots} />
                    <StatBar label="Passes réussies" left={selected.gxTeam.passesMade} right={selected.opponentTeam.passesMade} />
                    <StatBar label="Réussite passes" left={selected.gxTeam.passSuccess} right={selected.opponentTeam.passSuccess} suffix="%" />
                    <StatBar label="Tacles réussis" left={selected.gxTeam.tacklesMade} right={selected.opponentTeam.tacklesMade} />
                    <StatBar label="Réussite tacles" left={selected.gxTeam.tackleSuccess} right={selected.opponentTeam.tackleSuccess} suffix="%" />
                    <StatBar label="Arrêts" left={selected.gxTeam.saves} right={selected.opponentTeam.saves} />
                  </div>
                </section>
              </div>
            </section>

            <section className="mb-5 grid gap-5 xl:grid-cols-3">
              <div className="rounded-3xl border border-yellow-400/15 bg-yellow-400/[0.04] p-5">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Trophy size={18} />
                  <h2 className="font-black">MVP GX NOVA</h2>
                </div>
                {mvpGx ? (
                  <div className="mt-5">
                    <p className="text-2xl font-black">{mvpGx.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{positionLabel(mvpGx.position)}</p>
                    <div className="mt-4 flex items-end gap-4">
                      <span className="text-5xl font-black text-yellow-400">{mvpGx.rating.toFixed(1)}</span>
                      <span className="pb-1 text-sm font-black text-slate-500">
                        {mvpGx.goals} B • {mvpGx.assists} PD • {mvpGx.passSuccess}% passes
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-600">
                      Meilleure note GX NOVA sur le match.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/[0.04] p-5">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Award size={18} />
                  <h2 className="font-black">MOTM EA</h2>
                </div>
                {officialMotm ? (
                  <div className="mt-5">
                    <p className="text-2xl font-black">{officialMotm.name}</p>
                    <p className="mt-1 text-sm font-bold text-cyan-300">{officialMotm.team}</p>
                    <div className="mt-4 flex items-end gap-4">
                      <span className="text-5xl font-black text-cyan-300">{officialMotm.rating.toFixed(1)}</span>
                      <span className="pb-1 text-sm font-black text-slate-500">
                        {officialMotm.goals} B • {officialMotm.assists} PD
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-600">
                      Récompense officielle renvoyée par EA pour cette rencontre.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-sm font-bold text-slate-600">
                    EA n'a pas renvoyé de MOTM exploitable pour ce match.
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#071321] p-5">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Download size={18} />
                  <h2 className="font-black">Exports Discord</h2>
                </div>

                {canExport ? (
                  <>

                <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">Joueur choisi pour l'export MVP session</p>
                  <select
                    value={exportPlayerId}
                    onChange={(event) => setExportPlayerId(event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-[#06111f] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-400/40"
                  >
                    {selected.sessionPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} • {positionLabel(player.position)} • note {player.averageRating.toFixed(2)}
                      </option>
                    ))}
                  </select>

                  <div className="mt-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300">Image du joueur pour l'affiche</p>
                    <label className="mt-3 flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-white/15 bg-[#06111f] px-4 py-3 text-sm font-bold text-white transition hover:border-cyan-400/40">
                      <span className="truncate pr-3">{exportPlayerImageName || "Importer une image joueur"}</span>
                      <span className="rounded-xl bg-cyan-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Choisir</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePlayerImageChange} />
                    </label>
                    {exportPlayerImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setExportPlayerImage("");
                          setExportPlayerImageName("");
                        }}
                        className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-rose-300 transition hover:text-rose-200"
                      >
                        Retirer l'image importée
                      </button>
                    )}
                  </div>

                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    Par défaut, on prend le meilleur joueur de la session, mais tu peux le remplacer ici et même ajouter sa photo avant d'exporter.
                  </p>
                </div>

                <div className="mt-5 grid gap-2">
                  <ExportButton label="Résultat du match" busy={exporting === "result"} onClick={() => void makePoster("result")} />
                  <ExportButton label="MVP de la session" busy={exporting === "sessionMvp"} onClick={() => void makePoster("sessionMvp")} />
                  <ExportButton label="Bilan de la soirée" busy={exporting === "evening"} onClick={() => void makePoster("evening")} />
                </div>

                  </>
                ) : (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-center">
                    <Shield
                      size={24}
                      className="mx-auto text-slate-600"
                    />
                    <p className="mt-3 text-sm font-black text-slate-400">
                      Lecture seule
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                      Les exports Discord sont réservés aux rôles Admin et Staff.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="mb-5 rounded-3xl border border-white/10 bg-[#071321] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Users size={18} className="text-cyan-300" />
                <h2 className="font-black">Performances GX NOVA du match</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-sm">
                  <thead className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                    <tr className="border-b border-white/8">
                      <th className="px-3 py-3">Joueur</th>
                      <th className="px-3 py-3">Poste</th>
                      <th className="px-3 py-3">Note</th>
                      <th className="px-3 py-3">B</th>
                      <th className="px-3 py-3">PD</th>
                      <th className="px-3 py-3">Tirs</th>
                      <th className="px-3 py-3">Passes</th>
                      <th className="px-3 py-3">Tacles</th>
                      <th className="px-3 py-3">Arrêts</th>
                      <th className="px-3 py-3">Bonus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.players.map((player) => (
                      <tr key={player.id} className="border-b border-white/5">
                        <td className="px-3 py-3 font-black">{player.name}</td>
                        <td className="px-3 py-3 text-slate-500">{positionLabel(player.position)}</td>
                        <td className="px-3 py-3 font-black text-yellow-400">{player.rating.toFixed(1)}</td>
                        <td className="px-3 py-3">{player.goals}</td>
                        <td className="px-3 py-3">{player.assists}</td>
                        <td className="px-3 py-3">{player.shots}</td>
                        <td className="px-3 py-3">{player.passesMade}/{player.passAttempts} <span className="text-slate-600">({player.passSuccess}%)</span></td>
                        <td className="px-3 py-3">{player.tacklesMade}/{player.tackleAttempts} <span className="text-slate-600">({player.tackleSuccess}%)</span></td>
                        <td className="px-3 py-3">{player.saves}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {player.manOfTheMatch && <Badge text="MOTM" />}
                            {(player.cleanSheetAny || player.cleanSheetDef || player.cleanSheetGk) && <Badge text="CS" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-5 rounded-3xl border border-white/10 bg-[#071321] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Medal size={18} className="text-yellow-400" />
                <h2 className="font-black">Classements avancés joueurs</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <LeaderCard title="Maestro" icon={<Target size={18} />} player={[...data.advancedPlayers].filter((p) => p.passAttempts >= 30).sort((a,b) => b.passSuccess - a.passSuccess)[0]} value={(p) => `${p.passSuccess}% passes`} />
                <LeaderCard title="Impact offensif" icon={<Goal size={18} />} player={[...data.advancedPlayers].filter((p) => p.games >= 3).sort((a,b) => b.contributionsPerGame - a.contributionsPerGame)[0]} value={(p) => `${p.contributionsPerGame} contrib./match`} />
                <LeaderCard title="Mur défensif" icon={<ShieldCheck size={18} />} player={[...data.advancedPlayers].filter((p) => p.tackleAttempts >= 10).sort((a,b) => b.tackleSuccess - a.tackleSuccess)[0]} value={(p) => `${p.tackleSuccess}% tacles`} />
                <LeaderCard title="MOTM" icon={<Award size={18} />} player={[...data.advancedPlayers].sort((a,b) => b.manOfTheMatch - a.manOfTheMatch)[0]} value={(p) => `${p.manOfTheMatch} récompense(s)`} />
              </div>
            </section>

            {!!data.goalkeepers.length && (
              <section className="rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.06] to-[#071321] p-5">
                <div className="mb-4 flex items-center gap-2 text-cyan-300">
                  <Shield size={18} />
                  <h2 className="font-black">Zone Gardiens</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {data.goalkeepers.map((keeper) => (
                    <div key={keeper.id} className="rounded-2xl border border-white/8 bg-black/15 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-black">{keeper.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{keeper.games} match(s) • note {keeper.averageRating.toFixed(2)}</p>
                        </div>
                        <span className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-lg font-black text-cyan-300">
                          {keeper.savePct}%
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <Kpi label="Arrêts" value={keeper.saves} />
                        <Kpi label="CS" value={keeper.cleanSheetsGk} />
                        <Kpi label="BC" value={keeper.goalsAgainst} />
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        <MiniKpi label="Réflexe" value={keeper.reflexSaves} />
                        <MiniKpi label="Direction" value={keeper.directionSaves} />
                        <MiniKpi label="Centres" value={keeper.crossSaves} />
                        <MiniKpi label="Punch" value={keeper.punchSaves} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-2 py-2">
      <p className="text-[8px] font-black uppercase text-slate-600">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="rounded-md border border-yellow-400/20 bg-yellow-400/10 px-2 py-1 text-[9px] font-black text-yellow-300">
      {text}
    </span>
  );
}

function ExportButton({
  label,
  busy,
  onClick,
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-black text-slate-300 hover:border-cyan-400/25 hover:text-cyan-300 disabled:opacity-50"
    >
      {busy ? "Création..." : label}
      <Download size={15} />
    </button>
  );
}

function LeaderCard({
  title,
  icon,
  player,
  value,
}: {
  title: string;
  icon: ReactNode;
  player?: AdvancedPlayer;
  value: (player: AdvancedPlayer) => string;
}) {
  if (!player) return null;
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
      <div className="flex items-center gap-2 text-cyan-300">
        {icon}
        <p className="text-xs font-black uppercase tracking-wider">{title}</p>
      </div>
      <p className="mt-4 text-lg font-black">{player.name}</p>
      <p className="mt-1 text-sm font-bold text-yellow-400">{value(player)}</p>
      <p className="mt-2 text-xs text-slate-600">{player.games} match(s) • note {player.averageRating.toFixed(2)}</p>
    </div>
  );
}
