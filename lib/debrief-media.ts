import { isEveningDate } from "@/lib/debrief-studio";

export const DEBRIEF_MEDIA_BUCKET = "gx-nova-debrief-media";
export const DEBRIEF_MAX_UPLOAD_BYTES = 45 * 1024 * 1024;
export const DEBRIEF_ALLOWED_MIME_TYPES = [
  "image/png", "image/jpeg", "image/webp", "video/mp4",
] as const;
export const DEBRIEF_MEDIA_URL_TTL = 6 * 60 * 60;

const MIME_EXT: Record<string, readonly string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "video/mp4": ["mp4"],
};

export type UploadInfo = {
  fileName: string;
  mimeType: string;
  size: number;
  date: string;
};

export function isValidDebriefMediaPath(path: unknown, date: string, kind?: "image" | "video"): path is string {
  if (typeof path !== "string" || !isEveningDate(date)) return false;
  const matched = /^1663\/(\d{4}-\d{2}-\d{2})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(png|jpg|jpeg|webp|mp4)$/.exec(path);
  if (!matched || matched[1] !== date) return false;
  if (kind === "image") return matched[3] !== "mp4";
  if (kind === "video") return matched[3] === "mp4";
  return true;
}

export function validUpload(info: UploadInfo): { extension: string; kind: "image" | "video" } | null {
  if (!isEveningDate(info.date)) return null;
  if (!Number.isInteger(info.size) || info.size <= 0 || info.size > DEBRIEF_MAX_UPLOAD_BYTES) return null;
  const name = info.fileName.trim();
  if (!name || name.length > 240) return null;
  const extension = name.split(".").at(-1)?.toLowerCase() ?? "";
  if (!MIME_EXT[info.mimeType]?.includes(extension)) return null;
  return { extension, kind: info.mimeType === "video/mp4" ? "video" : "image" };
}
