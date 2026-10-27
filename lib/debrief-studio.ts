export const TACTIC_COLORS = ["#facc15", "#22d3ee", "#fb7185"] as const;
export type TacticColor = (typeof TACTIC_COLORS)[number];
export type TacticAnnotation = {
  id: string;
  kind: "arrow" | "circle" | "zone" | "label";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: TacticColor;
  text?: string;
};

export type TacticalObjective = {
  id: string;
  title: string;
  status: "todo" | "working" | "done";
};

export type DebriefMedia = {
  id: string;
  kind: "video" | "image";
  url: string;
  caption: string;
  annotations?: TacticAnnotation[];
};

export type DebriefChapter = {
  id: string;
  title: string;
  analysis: string;
  media: DebriefMedia[];
  objectives?: TacticalObjective[];
};

export const DEFAULT_DEBRIEF_TITLES = [
  "Bilan général",
  "Match par match",
  "Performances individuelles",
  "Analyse tactique",
  "Séquences vidéo",
  "Axes de progression",
  "Conclusion et objectifs",
];

export function makeDefaultChapters(): DebriefChapter[] {
  return DEFAULT_DEBRIEF_TITLES.map((title) => ({
    id: crypto.randomUUID(),
    title,
    analysis: "",
    media: [],
    objectives: [],
  }));
}

export function isEveningDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function safeHttpsUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function videoEmbedUrl(raw: string, parentHost: string): string | null {
  const url = safeHttpsUrl(raw);
  if (!url) return null;
  const hostname = url.hostname.toLowerCase();
  let videoId = "";
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(hostname)) {
    const parts = url.pathname.split("/").filter(Boolean);
    videoId = parts[0] === "watch"
      ? url.searchParams.get("v") ?? ""
      : ["shorts", "embed", "live"].includes(parts[0]) ? parts[1] ?? "" : "";
  } else if (hostname === "youtu.be" || hostname === "www.youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
  }
  if (videoId) {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
    const seconds = Number(url.searchParams.get("t")?.replace(/s$/, "") ?? url.searchParams.get("start") ?? "0");
    const start = Number.isInteger(seconds) && seconds > 0 && seconds <= 86400 ? `?start=${seconds}` : "";
    return `https://www.youtube-nocookie.com/embed/${videoId}${start}`;
  }
  if (!["twitch.tv", "www.twitch.tv", "clips.twitch.tv"].includes(hostname)) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  let clip = "";
  let vod = "";
  if (hostname === "clips.twitch.tv") clip = parts[0] ?? "";
  else if (parts[0] === "videos") vod = parts[1] ?? "";
  else if (parts[1] === "clip") clip = parts[2] ?? "";
  const parent = encodeURIComponent(parentHost || "localhost");
  if (/^[a-zA-Z0-9_-]+$/.test(clip) && clip.length < 100) {
    return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip)}&parent=${parent}&autoplay=false`;
  }
  if (/^\d+$/.test(vod)) {
    return `https://player.twitch.tv/?video=v${vod}&parent=${parent}&autoplay=false`;
  }
  return null;
}

function cleanText(value: unknown, length: number): string {
  return typeof value === "string" ? value.trim().slice(0, length) : "";
}

function annotationCoordinate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) &&
    value >= 0 && value <= 1000 ? Math.round(value * 10) / 10 : null;
}

function sanitizeAnnotations(value: unknown): TacticAnnotation[] {
  if (!Array.isArray(value)) return [];
  const types = ["arrow", "circle", "zone", "label"];
  const seen = new Set<string>();
  return value.slice(0, 30).flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const a = raw as Record<string, unknown>;
    const id = cleanText(a.id, 80);
    if (!id || seen.has(id) || !types.includes(String(a.kind)) ||
        !TACTIC_COLORS.includes(a.color as TacticColor)) return [];
    const coords = [a.x1, a.y1, a.x2, a.y2].map(annotationCoordinate);
    if (coords.some((n) => n === null)) return [];
    seen.add(id);
    return [{
      id, kind: a.kind as TacticAnnotation["kind"],
      x1: coords[0]!, y1: coords[1]!, x2: coords[2]!, y2: coords[3]!,
      color: a.color as TacticColor,
      ...(a.kind === "label" ? { text: cleanText(a.text, 90) } : {}),
    }];
  });
}

function sanitizeObjectives(value: unknown): TacticalObjective[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, 8).flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const o = raw as Record<string, unknown>;
    const id = cleanText(o.id, 80);
    const title = cleanText(o.title, 180);
    const status = o.status;
    if (!id || !title || seen.has(id) || !["todo", "working", "done"].includes(String(status))) return [];
    seen.add(id);
    return [{ id, title, status: status as TacticalObjective["status"] }];
  });
}

export function sanitizeDebriefChapters(value: unknown): DebriefChapter[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  return value.slice(0, 12).flatMap((raw: unknown) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const chapter = raw as Record<string, unknown>;
    const id = cleanText(chapter.id, 80);
    if (!id || unique.has(id)) return [];
    unique.add(id);
    const media: DebriefMedia[] = [];
    const source = Array.isArray(chapter.media) ? chapter.media.slice(0, 8) : [];
    for (const candidate of source) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
      const item = candidate as Record<string, unknown>;
      const url = cleanText(item.url, 1000);
      const kind = item.kind === "image" ? "image" : "video";
      if (!safeHttpsUrl(url)) continue;
      if (kind === "video" && !videoEmbedUrl(url, "localhost")) continue;
      media.push({
        id: cleanText(item.id, 80) || crypto.randomUUID(),
        kind, url, caption: cleanText(item.caption, 300),
        ...(kind === "image" ? { annotations: sanitizeAnnotations(item.annotations) } : {}),
      });
    }
    return [{
      id,
      title: cleanText(chapter.title, 100) || "Chapitre sans titre",
      analysis: cleanText(chapter.analysis, 6000),
      media,
      objectives: sanitizeObjectives(chapter.objectives),
    }];
  });
}
