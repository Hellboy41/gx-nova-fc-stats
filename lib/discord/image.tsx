import { ImageResponse } from "next/og";
import type { AtyomRoster } from "@/lib/platform/rosters";
import type { DiscordLine,DiscordWeekData } from "@/lib/discord/data";
import type { PosterPeriod,PosterKind } from "@/lib/discord/period";
import { addProgrammeDays } from "@/lib/programme-period";
import { rosterPosterLogo,safeOpponentLogo } from "@/lib/discord/media";

const DAY_LABELS=["DIMANCHE","LUNDI","MARDI","MERCREDI","JEUDI","VENDREDI","SAMEDI"];
const formatDay=(date:string)=>new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"2-digit",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
const longDay=(date:string)=>new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
const weekday=(date:string)=>DAY_LABELS[new Date(date+"T12:00:00Z").getUTCDay()];
const hex=(value:string,fallback:string)=>/^#[a-f\d]{6}$/i.test(value)?value:fallback;
const tone=(status:DiscordLine["status"])=>status==="win"?"#46E9BD":status==="loss"?"#FF7188":status==="forfeit"?"#FFD058":status==="draw"?"#E9EFFB":"#53E5FC";
const statusLabel=(line:DiscordLine)=>line.status==="win"?"VICTOIRE":line.status==="loss"?"DÉFAITE":line.status==="draw"?"NUL":line.status==="forfeit"?"FORFAIT":"À JOUER";
function competitionTone(label:string){
 const v=label.toUpperCase();
 return v.includes("SWISS")||v.includes("SUISSE")?"#FF4D58":
  v.includes("ZEWONKA")?"#9B59EC":v.includes("FRANCE")?"#2267F2":"#2785B9";
}
function emblem(value:string){
 const words=value.replace(/[^A-Za-zÀ-ÿ0-9 ]/g," ").split(/\s+/).filter(Boolean);
 return (words.length>=2?words[0][0]+words[words.length-1][0]:(words[0]??"FC").slice(0,2)).toUpperCase();
}
function OpponentBadge({line,logos,size=58}:{line:DiscordLine;logos:Map<string,string>;size?:number}){
 const src=line.opponentLogoUrl?logos.get(line.opponentLogoUrl):null;
 return <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:size,height:size,borderRadius:14,
  border:"2px solid "+(src?"#61DCFD":"#FBCB4299"),backgroundColor:"#050C18",flexShrink:0}}>
  {src?<img src={src} alt="" width={size-8} height={size-8} style={{objectFit:"contain"}}/>:
   <span style={{fontSize:Math.round(size*.29),fontWeight:900,color:"#FBD253"}}>{emblem(line.opponent)}</span>}
 </div>;
}
function Backdrop({accent,gold}:{accent:string;gold:string}){
 return <>
  <div style={{display:"flex",position:"absolute",inset:0,background:"linear-gradient(128deg,#010712 0%,#061930 43%,#010815 100%)"}}/>
  <div style={{display:"flex",position:"absolute",top:-170,left:380,width:720,height:440,
    background:"radial-gradient(ellipse at center,#075A97A6 0%,transparent 70%)"}}/>
  <div style={{display:"flex",position:"absolute",bottom:-200,right:-70,width:620,height:550,
    background:"radial-gradient(ellipse at center,#0043AC66 0%,transparent 72%)"}}/>
  {Array.from({length:9},(_,i)=><div key={"left"+i} style={{display:"flex",position:"absolute",
    left:32+i*24,top:-80+i*26,width:7,height:410,backgroundColor:i%4===0?gold:accent,
    opacity:i%4===0?.66:.24,transform:"rotate(-31deg)"}}/>)}
  {Array.from({length:13},(_,i)=><div key={"top"+i} style={{display:"flex",position:"absolute",
    right:-220+i*40,top:-200,width:8,height:520,backgroundColor:i%5===0?gold:accent,
    opacity:i%5===0?.7:.22,transform:"rotate(44deg)"}}/>)}
  <div style={{display:"flex",position:"absolute",top:46,left:260,width:1120,height:450,borderTop:"3px solid #357BC544",borderRadius:"50%"}}/>
  <div style={{display:"flex",position:"absolute",top:68,left:380,width:900,height:400,borderTop:"2px solid #C1D7F22D",borderRadius:"50%"}}/>
  <div style={{display:"flex",position:"absolute",top:95,left:520,width:630,height:340,borderTop:"2px solid #C1D7F222",borderRadius:"50%"}}/>
  {Array.from({length:14},(_,i)=><div key={"light"+i} style={{display:"flex",position:"absolute",
    top:30+(i%3)*16,left:450+i*57,width:7,height:7,borderRadius:4,backgroundColor:"#FFFFFF",
    opacity:.22+(i%3)*.2}}/>)}
  <div style={{display:"flex",position:"absolute",inset:0,
    background:"linear-gradient(180deg,#02071200 0%,#02081520 33%,#010816BB 100%)"}}/>
 </>;
}
function Row({line,logos,rosterName,kind,compact=false}:{line:DiscordLine;logos:Map<string,string>;rosterName:string;kind:PosterKind;compact?:boolean}){
 const height=compact?65:92;
 const color=competitionTone(line.competition);
 return <div style={{display:"flex",height,borderRadius:11,background:"linear-gradient(110deg,#073349,#041A2D 75%,#071329)",
  border:"1.5px solid #039DBEE0",alignItems:"center",padding:compact?"5px 7px":"8px 10px",overflow:"hidden"}}>
  <div style={{display:"flex",width:compact?55:70,alignItems:"center",justifyContent:"center",
    fontSize:compact?17:21,fontWeight:900,color:"#FFD839",flexShrink:0}}>{line.time||"--:--"}</div>
  <div style={{display:"flex",flex:1,flexDirection:"column",paddingLeft:7,minWidth:0}}>
   <div style={{display:"flex",alignItems:"center",alignSelf:"flex-start",backgroundColor:color,
    padding:compact?"2px 6px":"3px 7px",borderRadius:4,
    fontSize:compact?10:13,fontWeight:900,color:"#FFFFFF"}}>{line.competition.slice(0,compact?18:24).toUpperCase()}</div>
   <span style={{fontSize:compact?12:15,color:"#F5FAFE",fontWeight:900,marginTop:5}}>
    {kind==="programme"?rosterName.slice(0,18).toUpperCase():line.opponent.slice(0,25)}
   </span>
   <span style={{fontSize:compact?12:14,color:"#D5E6F2",fontWeight:700,marginTop:2}}>
    {kind==="programme"?"vs "+line.opponent.slice(0,compact?18:24):
     (line.status==="forfeit"?"FORFAIT":"RÉSULTAT OFFICIEL")}
   </span>
  </div>
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:4}}>
   {kind==="results"||line.score?<span style={{fontSize:compact?17:22,fontWeight:900,
    color:tone(line.status),marginBottom:4}}>{line.score??"—"}</span>:null}
   <OpponentBadge line={line} logos={logos} size={compact?39:55}/>
  </div>
 </div>;
}
type DayGroup={date:string;lines:DiscordLine[]};
function WeekPoster({roster,kind,day,items,logo,logos,accent,gold,data}:{
 roster:AtyomRoster;kind:PosterKind;day:string;items:DiscordLine[];logo:string|null;
 logos:Map<string,string>;accent:string;gold:string;data:DiscordWeekData;
}){
 const grouped=new Map<string,DiscordLine[]>();
 for(const item of items)grouped.set(item.date,[...(grouped.get(item.date)??[]),item]);
 const days:DayGroup[]=[...grouped].sort(([a],[b])=>a.localeCompare(b)).map(([date,lines])=>({date,lines}));
 const cols:DayGroup[][]=Array.from({length:4},()=>[]);
 days.forEach((group,i)=>cols[i%4].push(group));
 const more=days.length>4;
 const limit=more?3:5;
 const hidden=days.reduce((n,d)=>n+Math.max(0,d.lines.length-limit),0);
 const caption=kind==="programme"?"PROGRAMME DE LA SEMAINE":"RÉSULTATS DE LA SEMAINE";
 const from=formatDay(day),through=formatDay(addProgrammeDays(day,6));
 return <div style={{display:"flex",width:1600,height:900,position:"relative",overflow:"hidden",color:"#FFFFFF",fontFamily:"sans-serif"}}>
  <Backdrop accent={accent} gold={gold}/>
  <div style={{display:"flex",position:"relative",flexDirection:"column",width:"100%",padding:"27px 25px 19px"}}>
   <div style={{display:"flex",height:185,alignItems:"center"}}>
    <div style={{display:"flex",width:150,height:143,backgroundColor:"#03101D",border:"2px solid "+accent,
      borderRadius:20,alignItems:"center",justifyContent:"center"}}>
     {logo?<img src={logo} alt="" width={135} height={125} style={{objectFit:"contain"}}/>:
      <span style={{color:gold,fontWeight:900,fontSize:45}}>{emblem(roster.name)}</span>}
    </div>
    <div style={{display:"flex",flexDirection:"column",flex:1,paddingLeft:25,minWidth:0}}>
     <span style={{fontSize:23,fontWeight:900,color:gold,letterSpacing:1}}>{roster.name.toUpperCase()}  •  {roster.game_edition}</span>
     <span style={{fontSize:57,fontWeight:900,letterSpacing:1,marginTop:7,textShadow:"0 3px 9px #000"}}>{caption}</span>
     <div style={{display:"flex",alignItems:"center",marginTop:7}}>
      <div style={{display:"flex",height:4,width:410,background:"linear-gradient(90deg,"+accent+",#AF5BFA,"+gold+")"}}/>
      <span style={{fontSize:24,fontWeight:900,color:"#F7FBFF",marginLeft:16}}>DU {from} AU {through}</span>
     </div>
    </div>
    <div style={{display:"flex",width:215,flexDirection:"column",alignItems:"flex-end",paddingRight:5}}>
     <span style={{fontSize:19,fontWeight:900,color:"#FFFFFF",fontStyle:"italic",transform:"rotate(-7deg)"}}>UNITÉ.</span>
     <span style={{fontSize:21,fontWeight:900,color:gold,fontStyle:"italic",transform:"rotate(-7deg)"}}>PASSION.</span>
     <span style={{fontSize:24,fontWeight:900,color:accent,fontStyle:"italic",transform:"rotate(-7deg)"}}>PERFORMANCE.</span>
     <span style={{fontSize:24,fontWeight:900,color:"#FFFFFF",fontStyle:"italic",transform:"rotate(-7deg)"}}>ÉLITE.</span>
    </div>
   </div>
   <div style={{display:"flex",flex:1,gap:11,minHeight:0,marginTop:11}}>
    {cols.map((groups,i)=><div key={i} style={{display:"flex",flexDirection:"column",flex:1,minWidth:0,border:"2px solid "+accent,
      borderRadius:17,padding:"9px 8px",background:"linear-gradient(180deg,#041A2EEA 0%,#020D1ECC 100%)",gap:8}}>
      {groups.length===0?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
       flex:1,color:"#6B93AE",fontSize:15,letterSpacing:2}}>ATYOM ESPORT</div>:groups.map((group,j)=>
       <div key={group.date} style={{display:"flex",flexDirection:"column",gap:6}}>
        <div style={{display:"flex",height:more?44:69,alignItems:"center",justifyContent:"space-between",borderRadius:10,
          background:"linear-gradient(90deg,#082C3A,#061625)",padding:"4px 10px"}}>
         <div style={{display:"flex",flexDirection:"column"}}>
          <span style={{fontSize:more?16:25,fontWeight:900,color:gold}}>{weekday(group.date)}</span>
          <span style={{fontSize:more?13:20,fontWeight:850,color:"#F8FAFC"}}>{formatDay(group.date)}</span>
         </div>
         <span style={{fontSize:32,color:"#3C6178",fontWeight:900}}>{String(j*4+i+1).padStart(2,"0")}</span>
        </div>
        {group.lines.slice(0,limit).map(line=><Row key={line.id} line={line} kind={kind}
         rosterName={roster.name} logos={logos} compact={more}/>)}
        {group.lines.length>limit?<span style={{fontSize:15,fontWeight:700,color:gold,paddingLeft:8}}>
          + {group.lines.length-limit} autres rencontres
        </span>:null}
       </div>)}
    </div>)}
   </div>
   <div style={{display:"flex",height:47,alignItems:"center",justifyContent:"space-between",
    borderTop:"2px solid "+gold,marginTop:12,padding:"8px 18px 0"}}>
    <span style={{fontSize:16,fontWeight:800,color:"#DAEAF6"}}>{roster.name.toUpperCase()} • {kind==="programme"?"PROGRAMME OFFICIEL":"RÉSULTATS OFFICIELS"} • ATYOM</span>
    <span style={{fontSize:17,fontWeight:900,color:gold}}>
     {kind==="results"?`${data.wins} V  •  ${data.draws} N  •  ${data.losses} D`:
      `${items.length} MATCHS`}{hidden?"  •  "+hidden+" hors affichage":""}
    </span>
   </div>
  </div>
 </div>;
}
function DayPoster({roster,kind,date,items,logo,logos,accent,gold,data}:{
 roster:AtyomRoster;kind:PosterKind;date:string;items:DiscordLine[];
 logo:string|null;logos:Map<string,string>;accent:string;gold:string;data:DiscordWeekData;
}){
 const cap=kind==="programme"?"PROGRAMME DU JOUR":"RÉSULTATS DU JOUR";
 const visible=items.slice(0,10),hidden=Math.max(0,items.length-visible.length);
 return <div style={{display:"flex",width:1080,height:1350,position:"relative",overflow:"hidden",fontFamily:"sans-serif",color:"#FFFFFF"}}>
  <Backdrop accent={accent} gold={gold}/>
  <div style={{display:"flex",position:"relative",width:"100%",padding:"36px 42px 30px",flexDirection:"column"}}>
   <div style={{display:"flex",height:190,alignItems:"center",borderBottom:"3px solid "+gold}}>
    <div style={{display:"flex",height:138,width:146,backgroundColor:"#061624",border:"2px solid "+accent,
     borderRadius:18,alignItems:"center",justifyContent:"center"}}>
     {logo?<img src={logo} alt="" width={132} height={124} style={{objectFit:"contain"}}/>:
      <span style={{fontSize:45,fontWeight:900,color:gold}}>{emblem(roster.name)}</span>}
    </div>
    <div style={{display:"flex",flexDirection:"column",paddingLeft:26,flex:1}}>
     <span style={{fontSize:24,fontWeight:900,color:gold,letterSpacing:2}}>{roster.name.toUpperCase()} • {roster.game_edition}</span>
     <span style={{fontSize:47,fontWeight:900,marginTop:12}}>{cap}</span>
     <span style={{fontSize:26,fontWeight:800,marginTop:7,color:"#D9E9F3"}}>{weekday(date)} {longDay(date)}</span>
    </div>
   </div>
   <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0,marginTop:28,border:"2px solid "+accent,
    borderRadius:22,backgroundColor:"#041527DD",padding:"20px 19px",gap:13}}>
    <div style={{display:"flex",height:65,alignItems:"center",justifyContent:"space-between",padding:"0 10px",
     background:"linear-gradient(90deg,#062B40,#071322)",borderRadius:12}}>
     <div style={{display:"flex",flexDirection:"column"}}>
      <span style={{fontSize:30,fontWeight:900,color:gold}}>{weekday(date)}</span>
      <span style={{fontSize:20,fontWeight:750,color:"#FFFFFF"}}>{formatDay(date)}</span>
     </div>
     <span style={{fontSize:38,fontWeight:950,color:"#4D7591"}}>{items.length} MATCH{items.length>1?"S":""}</span>
    </div>
    {visible.length?visible.map(line=><div key={line.id} style={{display:"flex",minHeight:87,borderRadius:13,
     border:"2px solid #048DC4",background:"linear-gradient(90deg,#08364A,#04182A)",padding:"9px 13px",alignItems:"center"}}>
      <span style={{fontWeight:900,fontSize:29,color:gold,width:105}}>{line.time}</span>
      <div style={{display:"flex",flexDirection:"column",flex:1,paddingLeft:12}}>
       <span style={{alignSelf:"flex-start",fontSize:15,fontWeight:900,color:"#FFFFFF",
        backgroundColor:competitionTone(line.competition),padding:"3px 10px",borderRadius:5}}>
        {line.competition.toUpperCase().slice(0,25)}</span>
       <span style={{fontSize:23,fontWeight:900,marginTop:7}}>{line.opponent.slice(0,37)}</span>
       <span style={{fontSize:15,color:"#D5E7F2",marginTop:3}}>
        {kind==="programme"?"VS "+roster.name:statusLabel(line)}
       </span>
      </div>
      {line.score?<span style={{fontSize:33,fontWeight:900,color:tone(line.status),marginRight:14}}>{line.score}</span>:null}
      <OpponentBadge line={line} logos={logos} size={63}/>
     </div>):<div style={{display:"flex",flex:1,alignItems:"center",justifyContent:"center",
      fontSize:28,fontWeight:800,color:"#91ABC6"}}>AUCUNE RENCONTRE {kind==="programme"?"PRÉVUE":"ENREGISTRÉE"}</div>}
    {hidden>0?<span style={{fontSize:17,fontWeight:750,color:gold}}>+ {hidden} autre(s) rencontre(s) · détails sur ATYOM</span>:null}
   </div>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",height:76,marginTop:19,
    borderTop:"2px solid "+gold,padding:"8px 4px 0"}}>
    <span style={{fontSize:17,fontWeight:900,color:"#F7F9FB"}}>ATYOM ESPORT • VISUEL OFFICIEL</span>
    <span style={{fontSize:19,fontWeight:900,color:gold}}>
     {kind==="results"?`${data.wins} V / ${data.draws} N / ${data.losses} D`:"UNITÉ. PASSION. PERFORMANCE."}
    </span>
   </div>
  </div>
 </div>;
}
export async function renderDiscordImage(roster:AtyomRoster,kind:PosterKind,period:PosterPeriod,key:string,data:DiscordWeekData):Promise<Uint8Array>{
 const accent=hex(roster.primary_color,"#05CFF7");
 const gold=hex(roster.secondary_color,"#FFD239");
 const items=kind==="programme"?data.programme:data.results;
 const unique=[...new Set(items.map(m=>m.opponentLogoUrl).filter((url):url is string=>Boolean(url)))].slice(0,18);
 const [logo,loaded]=await Promise.all([
  rosterPosterLogo(roster),
  Promise.all(unique.map(async url=>[url,await safeOpponentLogo(url)] as const))
 ]);
 const logos=new Map(loaded.filter((entry):entry is readonly [string,string]=>Boolean(entry[1])));
 const draw=async(activeLogo:string|null,activeLogos:Map<string,string>)=>{
  const graphic=new ImageResponse(
   period==="week"?
    <WeekPoster roster={roster} kind={kind} day={key} items={items} logo={activeLogo}
     logos={activeLogos} accent={accent} gold={gold} data={data}/>:
    <DayPoster roster={roster} kind={kind} date={key} items={items} logo={activeLogo}
     logos={activeLogos} accent={accent} gold={gold} data={data}/>,
   {width:period==="week"?1600:1080,height:period==="week"?900:1350}
  );
  return new Uint8Array(await graphic.arrayBuffer());
 };
 try{
  return await draw(logo,logos);
 }catch(error){
  // Un logo peut être illisible pour le moteur malgré une extension et un MIME valides.
  if(!logo&&logos.size===0)throw error;
  console.warn("ATYOM : logo incompatible ; génération de secours sans images.");
  return await draw(null,new Map<string,string>());
 }
}
