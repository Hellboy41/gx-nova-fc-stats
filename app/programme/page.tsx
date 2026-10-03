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
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
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

function getMonday(date = new Date()) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  const day = result.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + offset);
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
    toDateKey(getMonday())
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
  const monday = useMemo(() => parseDateKey(weekStart), [weekStart]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(monday, index);
        return {
          date,
          key: toDateKey(date),
          name: DAY_NAMES[index],
        };
      }),
    [monday]
  );

  const weekLabel = useMemo(() => {
    const sunday = addDays(monday, 6);
    return `Du ${formatShortDate(monday)} au ${formatShortDate(sunday)}`;
  }, [monday]);

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
    setWeekStart(toDateKey(addDays(monday, offset * 7)));
  }

  function goCurrentWeek() {
    setWeekStart(toDateKey(getMonday()));
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

      const width = 1080;
      const height = 1350;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Impossible de créer l'affiche.");
      }

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#020914");
      gradient.addColorStop(0.55, "#071525");
      gradient.addColorStop(1, "#020711");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(250, 204, 21, 0.055)";
      for (let x = -300; x < width + 300; x += 160) {
        ctx.save();
        ctx.translate(x, 0);
        ctx.rotate(-0.18);
        ctx.fillRect(0, -100, 52, height + 300);
        ctx.restore();
      }

      ctx.fillStyle = "#facc15";
      ctx.fillRect(0, 0, width, 10);

      let logo: HTMLImageElement | null = null;
      try {
        logo = await loadImage(CLUB_LOGO);
      } catch {
        logo = null;
      }

      if (logo) {
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.drawImage(logo, width - 390, -55, 470, 470);
        ctx.restore();
        ctx.drawImage(logo, 72, 52, 118, 118);
      }

      ctx.fillStyle = "#facc15";
      ctx.font = "900 24px Arial, sans-serif";
      ctx.fillText("GX NOVA • FC27", 222, 84);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 58px Arial, sans-serif";
      ctx.fillText("PROGRAMME DE LA SEMAINE", 222, 145);

      ctx.fillStyle = "#93a4b7";
      ctx.font = "700 24px Arial, sans-serif";
      ctx.fillText(weekLabel.toUpperCase(), 222, 184);

      const allEntries = days.flatMap((day) =>
        (schedule[day.key] ?? []).map((item) => ({ day, item }))
      );

      const activeDays = days.filter((day) => (schedule[day.key] ?? []).length);
      const rows = activeDays.length || 1;
      const startY = 230;
      const bottomPadding = 90;
      const availableHeight = height - startY - bottomPadding;
      const gap = 16;
      const cardHeight = Math.min(
        154,
        Math.max(112, (availableHeight - gap * (rows - 1)) / rows)
      );

      if (!allEntries.length) {
        roundedRect(ctx, 70, 350, 940, 360, 28);
        ctx.fillStyle = "rgba(255,255,255,0.045)";
        ctx.fill();
        ctx.strokeStyle = "rgba(250,204,21,0.24)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#facc15";
        ctx.font = "900 34px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SEMAINE À PLANIFIER", width / 2, 495);
        ctx.fillStyle = "#8fa0b4";
        ctx.font = "600 25px Arial, sans-serif";
        ctx.fillText(
          "Ajoute les compétitions et tournois depuis le dashboard GX NOVA.",
          width / 2,
          550
        );
        ctx.textAlign = "left";
      } else {
        let y = startY;

        for (const day of activeDays) {
          const items = schedule[day.key] ?? [];
          roundedRect(ctx, 54, y, 972, cardHeight, 26);
          ctx.fillStyle = "rgba(7, 22, 38, 0.94)";
          ctx.fill();
          ctx.strokeStyle = "rgba(250,204,21,0.20)";
          ctx.lineWidth = 2;
          ctx.stroke();

          roundedRect(ctx, 72, y + 18, 160, cardHeight - 36, 20);
          ctx.fillStyle = "rgba(250,204,21,0.10)";
          ctx.fill();

          ctx.fillStyle = "#facc15";
          ctx.font = "900 24px Arial, sans-serif";
          ctx.fillText(day.name.toUpperCase(), 92, y + 54);
          ctx.fillStyle = "#ffffff";
          ctx.font = "900 30px Arial, sans-serif";
          ctx.fillText(formatDayDate(day.date), 92, y + 92);

          const itemAreaX = 258;
          const itemAreaWidth = 742;
          const itemGap = 10;
          const itemHeight =
            (cardHeight - 36 - itemGap * (items.length - 1)) /
            Math.max(1, items.length);

          for (let index = 0; index < items.length; index += 1) {
            const item = items[index];
            const itemY = y + 18 + index * (itemHeight + itemGap);

            roundedRect(ctx, itemAreaX, itemY, itemAreaWidth, itemHeight, 18);
            ctx.fillStyle =
              item.type === "competition"
                ? "rgba(19, 78, 74, 0.42)"
                : "rgba(71, 42, 12, 0.48)";
            ctx.fill();

            const badgeText = item.time || "--:--";
            roundedRect(ctx, itemAreaX + 14, itemY + 14, 100, itemHeight - 28, 14);
            ctx.fillStyle = "rgba(0,0,0,0.30)";
            ctx.fill();
            ctx.fillStyle = "#facc15";
            ctx.font = "900 24px Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(
              badgeText,
              itemAreaX + 64,
              itemY + itemHeight / 2 + 8
            );
            ctx.textAlign = "left";

            const label = competitionLabel(item, competitions);
            ctx.fillStyle = "#ffffff";
            const labelSize = fitText(ctx, label, 330, 26, 18);
            ctx.font = `900 ${labelSize}px Arial, sans-serif`;
            ctx.fillText(label, itemAreaX + 132, itemY + 34);

            if (item.opponentName) {
              ctx.fillStyle = "#a7b6c8";
              const opponentSize = fitText(
                ctx,
                `vs ${item.opponentName}`,
                330,
                23,
                16
              );
              ctx.font = `700 ${opponentSize}px Arial, sans-serif`;
              ctx.fillText(
                `vs ${item.opponentName}`,
                itemAreaX + 132,
                itemY + Math.min(itemHeight - 16, 66)
              );
            } else if (item.notes) {
              ctx.fillStyle = "#8fa0b4";
              ctx.font = "600 17px Arial, sans-serif";
              ctx.fillText(
                item.notes.slice(0, 50),
                itemAreaX + 132,
                itemY + Math.min(itemHeight - 16, 66)
              );
            }

            const logoX = itemAreaX + itemAreaWidth - 72;
            const logoY = itemY + itemHeight / 2;
            let opponentLogo: HTMLImageElement | null = null;

            if (item.opponentLogoUrl) {
              try {
                opponentLogo = await loadImage(item.opponentLogoUrl);
              } catch {
                opponentLogo = null;
              }
            }

            if (opponentLogo) {
              const size = Math.min(54, itemHeight - 20);
              ctx.drawImage(
                opponentLogo,
                logoX - size / 2,
                logoY - size / 2,
                size,
                size
              );
            } else if (item.opponentName) {
              ctx.fillStyle = "rgba(255,255,255,0.08)";
              ctx.beginPath();
              ctx.arc(logoX, logoY, 26, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "#d3dbe5";
              ctx.font = "900 17px Arial, sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(
                fallbackInitials(item.opponentName),
                logoX,
                logoY + 6
              );
              ctx.textAlign = "left";
            }
          }

          y += cardHeight + gap;
        }
      }

      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.font = "600 18px Arial, sans-serif";
      ctx.fillText("GX NOVA • PROGRAMME OFFICIEL STAFF", 70, height - 42);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1)
      );

      if (!blob) {
        throw new Error("Impossible de générer le fichier PNG.");
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `GX-NOVA-programme-${weekStart}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
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
                Planifie les compétitions et tournois, puis exporte une affiche PNG prête pour Discord.
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
                {exporting ? "Création PNG..." : "Exporter pour Discord"}
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
