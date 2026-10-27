"use client";

import type { DebriefMedia, TacticAnnotation } from "@/lib/debrief-studio";

function drawAnnotation(ctx: CanvasRenderingContext2D, a: TacticAnnotation) {
  ctx.save();
  ctx.strokeStyle = a.color;
  ctx.fillStyle = a.color;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (a.kind === "arrow") {
    const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
    const tipLength = 23;
    const start = { x: a.x1, y: a.y1 };
    const end = { x: a.x2, y: a.y2 };
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x - Math.cos(angle) * 15, end.y - Math.sin(angle) * 15);
    ctx.strokeStyle = "#05121d";
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - Math.cos(angle - Math.PI / 6) * tipLength, end.y - Math.sin(angle - Math.PI / 6) * tipLength);
    ctx.lineTo(end.x - Math.cos(angle + Math.PI / 6) * tipLength, end.y - Math.sin(angle + Math.PI / 6) * tipLength);
    ctx.closePath();
    ctx.strokeStyle = "#05121d";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fill();
  } else if (a.kind === "circle") {
    const rx = Math.abs(a.x2 - a.x1) / 2;
    const ry = Math.abs(a.y2 - a.y1) / 2;
    ctx.beginPath();
    ctx.ellipse((a.x1 + a.x2) / 2, (a.y1 + a.y2) / 2, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, 2 * Math.PI);
    ctx.strokeStyle = "#05121d";
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 7;
    ctx.stroke();
  } else if (a.kind === "zone") {
    ctx.fillStyle = a.color;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(Math.min(a.x1, a.x2), Math.min(a.y1, a.y2), Math.abs(a.x2 - a.x1), Math.abs(a.y2 - a.y1));
    ctx.globalAlpha = 1;
    ctx.setLineDash([20, 10]);
    ctx.strokeRect(Math.min(a.x1, a.x2), Math.min(a.y1, a.y2), Math.abs(a.x2 - a.x1), Math.abs(a.y2 - a.y1));
  } else if (a.kind === "label") {
    ctx.font = "900 43px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = "#05121d";
    ctx.lineWidth = 11;
    ctx.strokeText(a.text ?? "", a.x1, a.y1, 940);
    ctx.fillText(a.text ?? "", a.x1, a.y1, 940);
  }
  ctx.restore();
}

/** Rendu PNG local, sans transmettre les images ou annotations à un service externe. */
export async function downloadTacticalPng(media: DebriefMedia, date: string): Promise<void> {
  if (media.kind !== "image" || !media.url) throw new Error("Aucune capture valide à exporter.");
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Impossible de charger la capture. Vérifie son lien HTTPS."));
  });
  image.src = media.url;
  await loaded;
  if (!image.naturalWidth || !image.naturalHeight) throw new Error("Dimensions de la capture invalides.");

  const width = Math.min(1920, image.naturalWidth);
  const height = Math.round(image.naturalHeight * (width / image.naturalWidth));
  const header = Math.max(66, Math.round(width * 0.054));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height + header;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Export PNG impossible avec ce navigateur.");

  ctx.fillStyle = "#061321";
  ctx.fillRect(0, 0, width, header);
  const padding = Math.round(width * 0.035);
  const font = Math.max(15, Math.round(width * 0.017));
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#facc15";
  ctx.font = `900 ${font}px Arial, sans-serif`;
  ctx.fillText("GX NØVA  •  ANALYSE TACTIQUE", padding, header * 0.35, width * 0.68);
  ctx.fillStyle = "#c5d4e1";
  ctx.font = `500 ${Math.round(font * 0.7)}px Arial, sans-serif`;
  const shortCaption = media.caption.trim().slice(0, 120) || "Capture analysée";
  ctx.fillText(shortCaption, padding, header * 0.77, width - 2 * padding);
  ctx.textAlign = "right";
  ctx.fillStyle = "#6aa7bf";
  ctx.fillText(date, width - padding, header * 0.35);
  ctx.drawImage(image, 0, header, width, height);

  ctx.save();
  ctx.translate(0, header);
  ctx.scale(width / 1000, height / 1000);
  for (const annotation of media.annotations ?? []) drawAnnotation(ctx, annotation);
  ctx.restore();

  let blob: Blob | null;
  try {
    blob = await new Promise<Blob | null>((resolve, reject) => {
      try { canvas.toBlob(resolve, "image/png"); }
      catch (error) { reject(error); }
    });
  } catch {
    throw new Error("Le serveur de cette image interdit son export PNG (CORS). Importe-la depuis ton ordinateur dans le Studio, puis réessaie.");
  }
  if (!blob) throw new Error("Impossible de créer le fichier PNG.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gx-nova-analyse-${date}-${media.id.slice(0,8)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
}
