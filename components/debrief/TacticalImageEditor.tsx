"use client";

import { useId, useRef, useState } from "react";
import { ArrowUpRight, Circle, Eraser, MousePointer2, RotateCcw, Square, Tag, Trash2, X } from "lucide-react";
import {
  type DebriefMedia, type TacticAnnotation, type TacticColor, TACTIC_COLORS,
} from "@/lib/debrief-studio";

type DrawTool = TacticAnnotation["kind"];
const TOOLS: Array<{ kind: DrawTool; label: string; icon: typeof ArrowUpRight }> = [
  { kind: "arrow", label: "Flèche", icon: ArrowUpRight },
  { kind: "circle", label: "Entourer", icon: Circle },
  { kind: "zone", label: "Zone", icon: Square },
  { kind: "label", label: "Texte", icon: Tag },
];

function clamp(value: number) {
  return Math.max(0, Math.min(1000, Math.round(value * 10) / 10));
}

function OverlayShapes({ shapes }: { shapes: TacticAnnotation[] }) {
  const base = useId().replace(/:/g, "");
  const markerName = (color: TacticColor) => base + "arrow" + TACTIC_COLORS.indexOf(color);
  return (
    <>
      <defs>
        {TACTIC_COLORS.map((color) =>
          <marker key={color} id={markerName(color)} viewBox="0 0 20 20" refX="17" refY="10"
            markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
            <path d="M 2 2 L 18 10 L 2 18 Z" fill={color} stroke="#05121d" strokeWidth="1.5"/>
          </marker>
        )}
      </defs>
      {shapes.map((a) => {
        if (a.kind === "arrow") {
          return <line key={a.id} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
            stroke="#06111f" strokeWidth="12" strokeLinecap="round"
            markerEnd={`url(#${markerName(a.color)})`}/>;
        }
        return null;
      })}
      {shapes.map((a) => a.kind === "arrow" ?
        <line key={a.id} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
          stroke={a.color} strokeWidth="7" strokeLinecap="round"
          markerEnd={`url(#${markerName(a.color)})`}/> :
        a.kind === "circle" ?
          <ellipse key={a.id} cx={(a.x1 + a.x2) / 2} cy={(a.y1 + a.y2) / 2}
            rx={Math.abs(a.x2 - a.x1) / 2} ry={Math.abs(a.y2 - a.y1) / 2}
            fill="none" stroke="#06111f" strokeWidth="12"/> :
        a.kind === "zone" ?
          <rect key={a.id} x={Math.min(a.x1, a.x2)} y={Math.min(a.y1, a.y2)}
            width={Math.abs(a.x2 - a.x1)} height={Math.abs(a.y2 - a.y1)}
            fill={a.color} fillOpacity="0.12" stroke={a.color} strokeWidth="7" strokeDasharray="20 10"/> :
          <text key={a.id} x={a.x1} y={a.y1} fill={a.color}
            fontSize="43" fontWeight="900" stroke="#06111f" strokeWidth="11"
            paintOrder="stroke" textAnchor="middle">{a.text ?? ""}</text>
      )}
      {shapes.filter((a) => a.kind === "circle").map((a) =>
        <ellipse key={a.id} cx={(a.x1 + a.x2) / 2} cy={(a.y1 + a.y2) / 2}
          rx={Math.abs(a.x2 - a.x1) / 2} ry={Math.abs(a.y2 - a.y1) / 2}
          fill="none" stroke={a.color} strokeWidth="7"/>
      )}
    </>
  );
}

export function TacticalImage({ media, editing = false, onDraw }: {
  media: DebriefMedia;
  editing?: boolean;
  onDraw?: (annotation: TacticAnnotation) => void;
}) {
  const [tool, setTool] = useState<DrawTool>("arrow");
  const [color, setColor] = useState<TacticColor>(TACTIC_COLORS[0]);
  const [label, setLabel] = useState("Presser ici");
  const [draft, setDraft] = useState<TacticAnnotation | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  function coordinates(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: clamp((event.clientX - rect.left) / rect.width * 1000), y: clamp((event.clientY - rect.top) / rect.height * 1000) };
  }
  function down(event: React.PointerEvent<SVGSVGElement>) {
    if (!editing || !onDraw || event.button !== 0) return;
    const { x, y } = coordinates(event);
    if (tool === "label") {
      if (!label.trim()) return;
      onDraw({ id: crypto.randomUUID(), kind: "label", x1: x, y1: y, x2: x, y2: y, color, text: label.trim().slice(0, 90) });
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x, y };
    setDraft({ id: "temporary", kind: tool, color, x1: x, y1: y, x2: x, y2: y });
  }
  function move(event: React.PointerEvent<SVGSVGElement>) {
    if (!start.current || !editing) return;
    const { x, y } = coordinates(event);
    setDraft((current) => current ? { ...current, x2: x, y2: y } : null);
  }
  function up(event: React.PointerEvent<SVGSVGElement>) {
    if (!start.current || !editing || !onDraw) return;
    const { x, y } = coordinates(event);
    const origin = start.current;
    if (Math.hypot(x - origin.x, y - origin.y) >= 18) {
      onDraw({ id: crypto.randomUUID(), kind: tool, color, x1: origin.x, y1: origin.y, x2: x, y2: y });
    }
    start.current = null;
    setDraft(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function cancel() {
    start.current = null;
    setDraft(null);
  }
  return (
    <div>
      {editing && (
        <div className="mb-3 space-y-3 rounded-xl border border-cyan-400/20 bg-[#0c1e2b] p-3">
          <div className="flex flex-wrap items-center gap-2">
            {TOOLS.map(({ kind, label: title, icon: Icon }) =>
              <button key={kind} type="button" onClick={() => { setTool(kind); cancel(); }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-black ${tool === kind ? "border-yellow-400 bg-yellow-400 text-[#06111f]" : "border-white/15 text-slate-300 hover:bg-white/10"}`}>
                <Icon size={15}/>{title}
              </button>)}
            <span className="ml-auto text-[11px] text-slate-400">Couleur :</span>
            {TACTIC_COLORS.map((choice) =>
              <button key={choice} type="button" onClick={() => setColor(choice)} title={"Couleur " + choice}
                aria-label={"Choisir " + (choice === "#facc15" ? "jaune" : choice === "#22d3ee" ? "cyan" : "rose")}
                aria-pressed={color === choice}
                className={`h-8 w-8 rounded-full border-4 ${color === choice ? "border-white" : "border-transparent"}`}
                style={{ background: choice }}/>)}
          </div>
          {tool === "label" && <label className="block text-xs font-bold text-slate-300">Texte à placer sur la capture
            <input value={label} maxLength={90} onChange={(event) => setLabel(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/10 bg-[#030914] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"/>
          </label>}
          <p className="flex items-center gap-2 text-xs text-slate-400"><MousePointer2 size={14}/>
            {tool === "label" ? "Clique sur l'image pour placer ton texte." : "Clique et fais glisser sur l'image pour dessiner. Sur mobile, utilise le doigt."}
          </p>
        </div>
      )}
      <div className="relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-xl bg-black/40">
        <div className="relative inline-block max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.url} alt={media.caption || "Capture de match avec annotations tactiques"}
            className="block h-auto max-h-[68vh] max-w-full select-none" draggable={false}/>
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none"
            className={`absolute inset-0 h-full w-full ${editing ? "cursor-crosshair" : "pointer-events-none"}`}
            style={editing ? { touchAction: "none" } : undefined}
            role={editing ? "application" : "img"}
            aria-label={editing ? "Zone de dessin tactique" : "Annotations de la capture"}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
            <OverlayShapes shapes={[...(media.annotations ?? []), ...(draft ? [draft] : [])]}/>
          </svg>
        </div>
      </div>
    </div>
  );
}

export function TacticalImageEditor({ media, onChange, onClose }: {
  media: DebriefMedia;
  onChange: (next: DebriefMedia) => void;
  onClose: () => void;
}) {
  const annotations = media.annotations ?? [];
  const replace = (next: TacticAnnotation[]) => onChange({ ...media, annotations: next });
  return (
    <section className="rounded-2xl border border-yellow-400/30 bg-[#071321] p-4" aria-label="Atelier d'annotation tactique">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-black text-yellow-300">Atelier tactique</h3>
          <p className="mt-1 text-xs text-slate-400">Flèches, cercles, zones et consignes directement sur la capture.</p>
        </div>
        <button type="button" onClick={onClose} className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-slate-200"><X size={16}/> Fermer</button>
      </div>
      <TacticalImage media={media} editing onDraw={(a) => { if (annotations.length < 30) replace([...annotations, a]); }}/>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-400">{annotations.length}/30 annotations · Enregistrer le débrief pour conserver les modifications.</span>
        <div className="flex gap-2">
          <button type="button" disabled={!annotations.length} onClick={() => replace(annotations.slice(0,-1))}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 disabled:opacity-40"><RotateCcw size={14}/> Annuler</button>
          <button type="button" disabled={!annotations.length} onClick={() => { if (window.confirm("Effacer toutes les annotations de cette capture ?")) replace([]); }}
            className="flex items-center gap-2 rounded-lg border border-rose-400/20 px-3 py-2 text-xs font-bold text-rose-300 disabled:opacity-40"><Eraser size={14}/> Effacer</button>
        </div>
      </div>
      {annotations.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
        {annotations.map((a, i) => <button key={a.id} type="button"
          onClick={() => replace(annotations.filter((item) => item.id !== a.id))}
          title="Supprimer cette annotation"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-rose-400/40 hover:text-rose-300">
          <span style={{ color: a.color }}>●</span> {i + 1}. {a.kind === "arrow" ? "Flèche" : a.kind === "zone" ? "Zone" : a.kind === "circle" ? "Cercle" : a.text?.slice(0, 18) || "Texte"} <Trash2 size={12}/>
        </button>)}
      </div>}
    </section>
  );
}
