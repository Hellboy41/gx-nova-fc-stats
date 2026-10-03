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
  Download,
  ImagePlus,
  Plus,
  Save,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
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
};

type ProgrammeSchedule = Record<string, ProgrammeItem[]>;

type ProgrammeResponse = {
  weekStart: string;
  schedule: ProgrammeSchedule;
  updatedAt: string | null;
  competitions: Competition[];
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

      const response = await fetch(
        `/api/programme?weekStart=${encodeURIComponent(weekStart)}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as ProgrammeResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger le programme.");
      }

      setSchedule(data.schedule ?? {});
      setCompetitions(data.competitions ?? []);
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
    void loadProgramme();
  }, [loadProgramme]);

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
    updateDay(
      dateKey,
      (schedule[dateKey] ?? []).map((item) =>
        item.id === id ? { ...item, ...patch } : item
      )
    );
  }

  function removeItem(dateKey: string, id: string) {
    if (!canEdit) return;
    updateDay(
      dateKey,
      (schedule[dateKey] ?? []).filter((item) => item.id !== id)
    );
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

        if (item.type === "competition") {
          const competitionName = competitionLabel(item, competitions);
          const opponentName = item.opponentName.trim();
          mainLine = opponentName || competitionName;
          metaLine = competitionName;
          bottomLine = item.notes.trim();
        } else {
          mainLine = item.title.trim() || "Tournoi";
          const opponentName = item.opponentName.trim();
          const notes = item.notes.trim();

          if (opponentName) {
            metaLine = `VS ${opponentName}`;
            bottomLine = notes || "FC27";
          } else {
            metaLine = notes || "FC27";
            bottomLine = notes ? "FC27" : "";
          }
        }

        const mainSize = fitText(ctx, mainLine, textW, height >= 120 ? 28 : 26, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 ${mainSize}px Arial, sans-serif`;
        ctx.fillText(mainLine, textX, y + (height >= 120 ? 64 : 58));

        const metaSize = fitText(ctx, metaLine, textW, height >= 120 ? 18 : 17, 12);
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
                        onPatch={(patch) =>
                          patchItem(day.key, item.id, patch)
                        }
                        onRemove={() => removeItem(day.key, item.id)}
                        onUpload={(file) =>
                          void uploadOpponentLogo(day.key, item.id, file)
                        }
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
      </div>
    </main>
  );
}

function ProgrammeEditorCard({
  item,
  competitions,
  canEdit,
  uploading,
  onPatch,
  onRemove,
  onUpload,
}: {
  item: ProgrammeItem;
  competitions: Competition[];
  canEdit: boolean;
  uploading: boolean;
  onPatch: (patch: Partial<ProgrammeItem>) => void;
  onRemove: () => void;
  onUpload: (file: File) => void;
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
    </div>
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
