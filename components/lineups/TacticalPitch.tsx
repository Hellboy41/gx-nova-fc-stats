"use client";
import { Shirt } from "lucide-react";

export type PitchPlayer = {slot:string;x:number;y:number;name?:string;number?:number|null;rating?:number|null};
export type PitchTheme={primary:string;secondary:string};
type Props={rosterName:string;formation:string;spots:PitchPlayer[];theme:PitchTheme;logoUrl?:string|null;selectedSlot?:string|null;onSelect?:(slot:string)=>void;compact?:boolean};
const safe=(value:string)=>/^#[\da-f]{6}$/i.test(value)?value:"#facc15";
const initials=(value:string)=>value.split(/[ _-]+/).filter(Boolean).map(v=>v[0]).join("").slice(0,2).toUpperCase()||"11";

export function TacticalPitch({rosterName,formation,spots,theme,logoUrl,selectedSlot,onSelect,compact=false}:Props){
 const primary=safe(theme.primary),secondary=safe(theme.secondary);
 const starters=spots.filter(s=>s.name).length;
 return <div className="overflow-hidden rounded-[25px] border border-white/10 bg-[#0A1619] shadow-[0_20px_70px_rgba(0,0,0,.35)]">
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0B1018] px-4 py-4 sm:px-6">
   <div className="flex min-w-0 items-center gap-3">
    {logoUrl?<img src={logoUrl} alt="" className="h-11 w-11 rounded-xl object-contain"/>:
     <div className="flex h-11 w-11 items-center justify-center rounded-xl border" style={{borderColor:primary+"55",background:primary+"15"}}><Shirt size={24} style={{color:primary}}/></div>}
    <div className="min-w-0"><p className="truncate text-[10px] font-black uppercase tracking-[.19em]" style={{color:primary}}>Starting XI · {formation}</p>
     <h3 className="truncate text-lg font-black uppercase tracking-tight text-white">{rosterName}</h3></div>
   </div>
   <span className="rounded-full border px-3 py-1.5 text-xs font-black tabular-nums" style={{color:primary,borderColor:primary+"55",backgroundColor:primary+"13"}}>{starters} / 11</span>
  </div>
  <div className={`relative isolate w-full overflow-hidden ${compact?"min-h-[570px] sm:min-h-[690px]":"min-h-[625px] sm:min-h-[760px]"}`}
   style={{background:"repeating-linear-gradient(180deg,#153D35 0%,#153D35 12.5%,#19473C 12.5%,#19473C 25%)"}}>
   <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#040C12]/30 via-transparent to-[#020C10]/45"/>
   <div aria-hidden="true" className="pointer-events-none absolute inset-[5%] rounded-sm border-2 border-white/20"/>
   <div aria-hidden="true" className="pointer-events-none absolute left-[5%] right-[5%] top-1/2 border-t-2 border-white/20"/>
   <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[29%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20"/>
   <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20"/>
   <div aria-hidden="true" className="pointer-events-none absolute left-[29%] right-[29%] top-[5%] h-[13%] border-x-2 border-b-2 border-white/20"/>
   <div aria-hidden="true" className="pointer-events-none absolute left-[39%] right-[39%] top-[5%] h-[6%] border-x-2 border-b-2 border-white/15"/>
   <div aria-hidden="true" className="pointer-events-none absolute bottom-[5%] left-[29%] right-[29%] h-[13%] border-x-2 border-t-2 border-white/20"/>
   <div aria-hidden="true" className="pointer-events-none absolute bottom-[5%] left-[39%] right-[39%] h-[6%] border-x-2 border-t-2 border-white/15"/>
   <div aria-hidden="true" className="pointer-events-none absolute left-[5%] top-[5%] h-[90%] w-[90%]" style={{boxShadow:`inset 0 0 120px ${primary}0D`}}/>
   {spots.map((spot,i)=>{
    const active=selectedSlot===spot.slot;
    const btn=onSelect?"button":"div";
    const css="absolute z-10 flex w-[clamp(66px,17%,110px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center transition-transform";
    const content=<>
      <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border sm:h-12 sm:w-12"
       style={{borderColor:active?primary:primary+"6A",background:`linear-gradient(135deg,${primary}38,#06101F 72%)`,
       boxShadow:active?`0 0 0 4px ${primary}42,0 0 28px ${primary}50`:`0 4px 18px #0008`}}>
       {spot.number?<span className="text-lg font-black tabular-nums sm:text-xl" style={{color:secondary}}>{spot.number}</span>:
        <span className="text-xs font-black sm:text-sm" style={{color:primary}}>{spot.name?initials(spot.name):"+"}</span>}
       <span className="absolute -right-2 -top-2 rounded-md border border-black/60 px-1.5 py-0.5 text-[9px] font-black tracking-tighter text-black" style={{backgroundColor:primary}}>{spot.slot}</span>
      </div>
      <span className="max-w-full truncate rounded-lg border border-white/15 bg-[#02080E]/90 px-2 py-1.5 text-[10px] font-black text-white shadow-lg sm:text-xs" title={spot.name||"Poste libre"}>
       {spot.name||"Libre"}
      </span>
      {spot.rating!=null&&spot.rating>0&&<span className="rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold" style={{color:primary}}>{spot.rating.toFixed(2)}</span>}
    </>;
    const position={left:`${spot.x}%`,top:`${spot.y}%`};
    return btn==="button"
    ?<button key={spot.slot+"-"+i} type="button" onClick={()=>onSelect?.(spot.slot)} aria-label={`${spot.slot}: ${spot.name||"Libre"}`} title="Choisir ce poste" className={css+" cursor-pointer hover:scale-[1.05] focus-visible:outline-2"} style={position}>{content}</button>
    :<div key={spot.slot+"-"+i} className={css} style={position}>{content}</div>;
   })}
   <div aria-hidden="true" className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[.3em] text-white/30">ATYOM ESPORT · Tactical Board</div>
  </div>
 </div>;
}
