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
      const headerHeight = 250;
      const footerHeight = 78;
      const pagePadding = 54;
      const columnGap = 22;
      const cardHeaderHeight = 104;
      const cardPadding = 16;
      const eventGap = 12;
      const eventHeight = 126;
      const emptyHeight = 150;

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

      const palette = {
        backgroundTop: "#020713",
        backgroundMiddle: "#06182a",
        backgroundBottom: "#01040b",
        yellow: "#facc15",
        cyan: "#30d9ff",
        blue: "#0c7cff",
        white: "#ffffff",
        muted: "#91a4ba",
        card: "rgba(5, 18, 32, 0.97)",
      };

      function drawNeonLine(
        ctx: CanvasRenderingContext2D,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color: string,
        width: number,
        blur = 18
      ) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }

      function drawGlowBox(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
        color: string,
        alpha = 0.18,
        blur = 26
      ) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        roundedRect(ctx, x, y, width, height, radius);
        ctx.fill();
        ctx.restore();
      }

      function drawSizedText(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        startSize: number,
        minSize: number,
        weight: number,
        color: string
      ) {
        const clean = text.trim();
        const size = fitText(ctx, clean, maxWidth, startSize, minSize);
        ctx.fillStyle = color;
        ctx.font = `${weight} ${size}px Arial, sans-serif`;

        let rendered = clean;
        if (ctx.measureText(rendered).width > maxWidth) {
          const ellipsis = "…";
          while (
            rendered.length > 1 &&
            ctx.measureText(`${rendered}${ellipsis}`).width > maxWidth
          ) {
            rendered = rendered.slice(0, -1);
          }
          rendered = `${rendered.trimEnd()}${ellipsis}`;
        }

        ctx.fillText(rendered, x, y);
      }

      function drawBackground(
        ctx: CanvasRenderingContext2D,
        height: number,
        pageIndex: number
      ) {
        const background = ctx.createLinearGradient(0, 0, posterWidth, height);
        background.addColorStop(0, palette.backgroundTop);
        background.addColorStop(0.48, palette.backgroundMiddle);
        background.addColorStop(1, palette.backgroundBottom);
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, posterWidth, height);

        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = palette.cyan;
        for (let x = -360; x < posterWidth + 420; x += 260) {
          ctx.save();
          ctx.translate(x, -150);
          ctx.rotate(-0.21);
          ctx.fillRect(0, 0, 22, height + 420);
          ctx.restore();
        }
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = palette.yellow;
        for (let x = -220; x < posterWidth + 500; x += 390) {
          ctx.save();
          ctx.translate(x, -100);
          ctx.rotate(-0.21);
          ctx.fillRect(0, 0, 92, height + 360);
          ctx.restore();
        }
        ctx.restore();

        for (let index = 0; index < 7; index += 1) {
          const centerX = 1260 + index * 84;
          const centerY = 42 + index * 45;
          ctx.save();
          ctx.globalAlpha = 0.05;
          ctx.strokeStyle = index % 2 === 0 ? palette.cyan : palette.yellow;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 150 + index * 30, 0.2, 2.65);
          ctx.stroke();
          ctx.restore();
        }

        drawNeonLine(ctx, 0, 7, posterWidth, 7, palette.yellow, 8, 24);
        drawNeonLine(
          ctx,
          pageIndex === 0 ? 0 : 1120,
          198,
          pageIndex === 0 ? 830 : posterWidth,
          198,
          palette.cyan,
          3,
          20
        );
      }

      function drawHeader(
        ctx: CanvasRenderingContext2D,
        height: number,
        pageTitle: string,
        pageIndex: number
      ) {
        if (clubLogo) {
          ctx.save();
          ctx.globalAlpha = 0.055;
          ctx.drawImage(clubLogo, posterWidth - 430, -50, 420, 420);
          ctx.restore();

          drawGlowBox(ctx, 55, 42, 142, 142, 28, palette.cyan, 0.14, 34);
          roundedRect(ctx, 55, 42, 142, 142, 28);
          ctx.fillStyle = "rgba(4,17,31,0.94)";
          ctx.fill();
          ctx.strokeStyle = "rgba(48,217,255,0.38)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.drawImage(clubLogo, 70, 57, 112, 112);
        }

        ctx.fillStyle = palette.yellow;
        ctx.font = "900 27px Arial, sans-serif";
        ctx.fillText("GX NOVA • FC27", 230, 82);

        drawSizedText(
          ctx,
          "PROGRAMME DE LA SEMAINE",
          230,
          145,
          1050,
          70,
          46,
          900,
          palette.white
        );

        ctx.fillStyle = palette.muted;
        ctx.font = "800 28px Arial, sans-serif";
        ctx.fillText(weekLabel.toUpperCase(), 230, 187);

        roundedRect(ctx, 1330, 48, 520, 126, 28);
        const infoGradient = ctx.createLinearGradient(1330, 48, 1850, 174);
        infoGradient.addColorStop(0, "rgba(10,110,145,0.22)");
        infoGradient.addColorStop(1, "rgba(250,204,21,0.08)");
        ctx.fillStyle = infoGradient;
        ctx.fill();
        ctx.strokeStyle = "rgba(48,217,255,0.20)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = palette.cyan;
        ctx.font = "900 14px Arial, sans-serif";
        ctx.fillText("WEEKLY MATCH PLAN / 週間プログラム", 1360, 80);

        ctx.fillStyle = palette.white;
        ctx.font = "900 32px Arial, sans-serif";
        ctx.fillText(pageTitle, 1360, 120);

        ctx.fillStyle = palette.muted;
        ctx.font = "700 17px Arial, sans-serif";
        ctx.fillText(
          pageIndex === 0
            ? "Partie 1 • Dimanche → Mercredi"
            : "Partie 2 • Jeudi → Samedi",
          1360,
          151
        );

        ctx.save();
        ctx.translate(posterWidth - 24, 252);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.font = "900 16px Arial, sans-serif";
        ctx.fillText("GX NOVA // BLUELOCK MODE // OFFICIAL STAFF", 0, 0);
        ctx.restore();
      }

      function getDayCardHeight(day: (typeof days)[number]) {
        const items = schedule[day.key] ?? [];
        if (!items.length) {
          return cardHeaderHeight + cardPadding * 2 + emptyHeight;
        }

        return (
          cardHeaderHeight +
          cardPadding * 2 +
          items.length * eventHeight +
          Math.max(0, items.length - 1) * eventGap
        );
      }

      async function drawOpponentLogo(
        ctx: CanvasRenderingContext2D,
        item: ProgrammeItem,
        x: number,
        y: number,
        size: number
      ) {
        drawGlowBox(ctx, x, y, size, size, 18, palette.cyan, 0.10, 20);
        roundedRect(ctx, x, y, size, size, 18);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.11)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const opponentLogo = item.opponentLogoUrl
          ? await getCachedImage(item.opponentLogoUrl)
          : null;

        if (opponentLogo) {
          const inner = 8;
          ctx.save();
          roundedRect(
            ctx,
            x + inner,
            y + inner,
            size - inner * 2,
            size - inner * 2,
            14
          );
          ctx.clip();
          ctx.drawImage(
            opponentLogo,
            x + inner,
            y + inner,
            size - inner * 2,
            size - inner * 2
          );
          ctx.restore();
        } else if (item.opponentName.trim()) {
          ctx.fillStyle = palette.white;
          ctx.font = "900 24px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            fallbackInitials(item.opponentName),
            x + size / 2,
            y + size / 2 + 8
          );
          ctx.textAlign = "left";
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.26)";
          ctx.font = "900 23px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("GX", x + size / 2, y + size / 2 + 8);
          ctx.textAlign = "left";
        }
      }

      async function drawEvent(
        ctx: CanvasRenderingContext2D,
        item: ProgrammeItem,
        x: number,
        y: number,
        width: number
      ) {
        const isCompetition = item.type === "competition";
        const accent = isCompetition ? palette.cyan : palette.yellow;
        const secondary = isCompetition ? palette.blue : "#ff8a17";

        const rowGradient = ctx.createLinearGradient(x, y, x + width, y);
        if (isCompetition) {
          rowGradient.addColorStop(0, "rgba(7,77,104,0.96)");
          rowGradient.addColorStop(0.45, "rgba(7,43,63,0.97)");
          rowGradient.addColorStop(1, "rgba(4,23,37,0.98)");
        } else {
          rowGradient.addColorStop(0, "rgba(112,67,9,0.96)");
          rowGradient.addColorStop(0.48, "rgba(67,38,7,0.97)");
          rowGradient.addColorStop(1, "rgba(28,19,8,0.98)");
        }

        drawGlowBox(ctx, x, y, width, eventHeight, 20, accent, 0.075, 26);
        roundedRect(ctx, x, y, width, eventHeight, 20);
        ctx.fillStyle = rowGradient;
        ctx.fill();
        ctx.strokeStyle = isCompetition
          ? "rgba(48,217,255,0.30)"
          : "rgba(250,204,21,0.30)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = accent;
        ctx.fillRect(x, y, 7, eventHeight);

        const timeX = x + 20;
        const timeWidth = 114;
        roundedRect(ctx, timeX, y + 19, timeWidth, eventHeight - 38, 16);
        ctx.fillStyle = "rgba(0,0,0,0.32)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = palette.yellow;
        ctx.font = "900 28px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(item.time || "--:--", timeX + timeWidth / 2, y + 72);
        ctx.textAlign = "left";

        const logoSize = 82;
        const logoX = x + width - logoSize - 20;
        const logoY = y + (eventHeight - logoSize) / 2;
        await drawOpponentLogo(ctx, item, logoX, logoY, logoSize);

        const textX = timeX + timeWidth + 26;
        const maxTextWidth = logoX - textX - 22;

        const typeLabel = isCompetition ? "COMPÉTITION" : "TOURNOI";
        const chipWidth = isCompetition ? 122 : 84;
        roundedRect(ctx, textX, y + 15, chipWidth, 24, 10);
        ctx.fillStyle = isCompetition
          ? "rgba(48,217,255,0.16)"
          : "rgba(250,204,21,0.16)";
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.font = "900 12px Arial, sans-serif";
        ctx.fillText(typeLabel, textX + 10, y + 32);

        const title = isCompetition
          ? competitionLabel(item, competitions)
          : item.title.trim() || "Tournoi";

        drawSizedText(
          ctx,
          title,
          textX,
          y + 68,
          maxTextWidth,
          29,
          18,
          900,
          palette.white
        );

        const opponent = item.opponentName.trim()
          ? `VS ${item.opponentName.trim()}`
          : "";

        if (opponent) {
          drawSizedText(
            ctx,
            opponent,
            textX,
            y + 96,
            maxTextWidth,
            20,
            14,
            800,
            "#d8e5f2"
          );
        }

        if (item.notes.trim()) {
          const notesY = opponent ? y + 117 : y + 102;
          drawSizedText(
            ctx,
            item.notes.trim(),
            textX,
            notesY,
            maxTextWidth,
            15,
            11,
            700,
            "#8fa8bf"
          );
        }

        drawNeonLine(
          ctx,
          textX + Math.min(chipWidth + 14, maxTextWidth - 30),
          y + 27,
          Math.min(textX + maxTextWidth - 10, x + width - 130),
          y + 27,
          secondary,
          1.5,
          8
        );
      }

      async function drawDayCard(
        ctx: CanvasRenderingContext2D,
        day: (typeof days)[number],
        x: number,
        y: number,
        width: number,
        height: number,
        dayIndex: number
      ) {
        const items = schedule[day.key] ?? [];

        drawGlowBox(ctx, x, y, width, height, 30, palette.cyan, 0.045, 30);
        roundedRect(ctx, x, y, width, height, 30);
        ctx.fillStyle = palette.card;
        ctx.fill();
        ctx.strokeStyle = "rgba(48,217,255,0.14)";
        ctx.lineWidth = 2;
        ctx.stroke();

        const headGradient = ctx.createLinearGradient(x, y, x + width, y);
        headGradient.addColorStop(0, "rgba(48,217,255,0.16)");
        headGradient.addColorStop(0.52, "rgba(10,44,66,0.10)");
        headGradient.addColorStop(1, "rgba(250,204,21,0.08)");

        roundedRect(
          ctx,
          x + 12,
          y + 12,
          width - 24,
          cardHeaderHeight - 18,
          22
        );
        ctx.fillStyle = headGradient;
        ctx.fill();

        const numberBadge = String(dayIndex + 1).padStart(2, "0");
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.font = "900 60px Arial, sans-serif";
        ctx.fillText(numberBadge, x + width - 94, y + 73);

        ctx.fillStyle = palette.yellow;
        ctx.font = "900 25px Arial, sans-serif";
        ctx.fillText(day.name.toUpperCase(), x + 28, y + 48);

        ctx.fillStyle = palette.white;
        ctx.font = "900 34px Arial, sans-serif";
        ctx.fillText(formatDayDate(day.date), x + 28, y + 84);

        const contentX = x + cardPadding;
        const contentY = y + cardHeaderHeight + cardPadding;
        const contentWidth = width - cardPadding * 2;

        if (!items.length) {
          roundedRect(ctx, contentX, contentY, contentWidth, emptyHeight, 20);
          ctx.fillStyle = "rgba(255,255,255,0.025)";
          ctx.fill();
          ctx.setLineDash([10, 9]);
          ctx.strokeStyle = "rgba(255,255,255,0.09)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = "#687c91";
          ctx.font = "900 24px Arial, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            "AUCUNE PROGRAMMATION",
            contentX + contentWidth / 2,
            contentY + 68
          );
          ctx.fillStyle = "#53677c";
          ctx.font = "700 16px Arial, sans-serif";
          ctx.fillText(
            "Repos / entraînement libre",
            contentX + contentWidth / 2,
            contentY + 100
          );
          ctx.textAlign = "left";
          return;
        }

        for (let index = 0; index < items.length; index += 1) {
          await drawEvent(
            ctx,
            items[index],
            contentX,
            contentY + index * (eventHeight + eventGap),
            contentWidth
          );
        }
      }

      async function buildPoster(
        pageDays: Array<(typeof days)[number]>,
        pageIndex: number
      ) {
        const rowGap = 24;
        let posterHeight = 0;
        let columnWidth = 0;
        let rowHeights: number[] = [];

        if (pageIndex === 0) {
          columnWidth =
            (posterWidth - pagePadding * 2 - columnGap) / 2;

          rowHeights = [
            Math.max(
              getDayCardHeight(pageDays[0]),
              getDayCardHeight(pageDays[1])
            ),
            Math.max(
              getDayCardHeight(pageDays[2]),
              getDayCardHeight(pageDays[3])
            ),
          ];

          const bodyHeight = rowHeights[0] + rowGap + rowHeights[1];
          posterHeight = headerHeight + bodyHeight + footerHeight;
        } else {
          columnWidth =
            (posterWidth - pagePadding * 2 - columnGap * 2) / 3;
          const tallestCard = Math.max(...pageDays.map(getDayCardHeight));
          rowHeights = [tallestCard];
          posterHeight = headerHeight + tallestCard + footerHeight;
        }

        const canvas = document.createElement("canvas");
        canvas.width = posterWidth;
        canvas.height = posterHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Impossible de créer l'affiche.");
        }

        drawBackground(ctx, posterHeight, pageIndex);
        drawHeader(
          ctx,
          posterHeight,
          pageIndex === 0 ? "MATCH DAYS 01" : "MATCH DAYS 02",
          pageIndex
        );

        if (pageIndex === 0) {
          for (let index = 0; index < pageDays.length; index += 1) {
            const row = Math.floor(index / 2);
            const column = index % 2;
            const x = pagePadding + column * (columnWidth + columnGap);
            const y =
              headerHeight +
              (row === 0 ? 0 : rowHeights[0] + rowGap);

            await drawDayCard(
              ctx,
              pageDays[index],
              x,
              y,
              columnWidth,
              rowHeights[row],
              days.findIndex((entry) => entry.key === pageDays[index].key)
            );
          }
        } else {
          for (let index = 0; index < pageDays.length; index += 1) {
            const x = pagePadding + index * (columnWidth + columnGap);
            await drawDayCard(
              ctx,
              pageDays[index],
              x,
              headerHeight,
              columnWidth,
              rowHeights[0],
              days.findIndex((entry) => entry.key === pageDays[index].key)
            );
          }
        }

        const footerY = posterHeight - footerHeight;
        drawNeonLine(
          ctx,
          pagePadding,
          footerY + 7,
          posterWidth - pagePadding,
          footerY + 7,
          palette.cyan,
          1.5,
          10
        );

        ctx.fillStyle = "rgba(255,255,255,0.30)";
        ctx.font = "800 17px Arial, sans-serif";
        ctx.fillText(
          "GX NOVA • PROGRAMME OFFICIEL STAFF & JOUEURS",
          pagePadding,
          posterHeight - 28
        );

        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(250,204,21,0.56)";
        ctx.font = "900 16px Arial, sans-serif";
        ctx.fillText(
          pageIndex === 0 ? "01 / 02" : "02 / 02",
          posterWidth - pagePadding,
          posterHeight - 28
        );
        ctx.textAlign = "left";

        return canvas;
      }

      async function canvasToBlob(canvas: HTMLCanvasElement) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png", 1)
        );

        if (!blob) {
          throw new Error("Impossible de générer le fichier PNG.");
        }

        return blob;
      }

      function downloadBlob(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1200);
      }

      const firstPoster = await buildPoster(days.slice(0, 4), 0);
      const secondPoster = await buildPoster(days.slice(4, 7), 1);

      const firstBlob = await canvasToBlob(firstPoster);
      const secondBlob = await canvasToBlob(secondPoster);

      downloadBlob(
        firstBlob,
        `GX-NOVA-programme-${weekStart}-01-dimanche-mercredi.png`
      );

      await new Promise((resolve) => window.setTimeout(resolve, 450));

      downloadBlob(
        secondBlob,
        `GX-NOVA-programme-${weekStart}-02-jeudi-samedi.png`
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
