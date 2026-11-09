import { ImageResponse } from "next/og";
import type { AtyomRoster } from "@/lib/platform/rosters";
import type { DiscordLine, DiscordWeekData } from "@/lib/discord/data";
import {addProgrammeDays} from "@/lib/programme-period";
export type PosterKind="programme"|"results";
const niceDate=(d:string)=>new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",timeZone:"UTC"})
 .format(new Date(d+"T12:00:00Z"));
function cleanColor(color:string){return /^#[a-f\d]{6}$/i.test(color)?color:"#FBD046";}
const iconStatus:{[key:string]:string}={
 win:"VICTOIRE",draw:"NUL",loss:"DÉFAITE",forfeit:"FORFAIT",upcoming:"À JOUER",
};
function statusColor(status:string){
 if(status==="win")return "#69E0B0";
 if(status==="draw")return "#C5D1DE";
 if(status==="loss")return "#FF899F";
 if(status==="forfeit")return "#FFD477";
 return "#85DDF6";
}
export async function renderDiscordImage(roster:AtyomRoster,kind:PosterKind,monday:string,data:DiscordWeekData):Promise<Uint8Array>{
 const accent=cleanColor(roster.primary_color);
 const secondary=cleanColor(roster.secondary_color);
 const items=(kind==="programme"?data.programme:data.results).slice(0,13);
 const others=(kind==="programme"?data.programme:data.results).length-items.length;
 const title=kind==="programme"?"PROGRAMME DE LA SEMAINE":"RÉSULTATS DE LA SEMAINE";
 const footer=kind==="programme"?`${data.programme.length} RENCONTRE(S) PROGRAMMÉE(S)`:
  `${data.wins} V  ·  ${data.draws} N  ·  ${data.losses} D  ·  ${data.results.length} MATCH(S)`;
 const result=new ImageResponse(
  <div style={{display:"flex",width:"100%",height:"100%",flexDirection:"column",backgroundColor:"#08121D",color:"#F8FCFF",padding:36,fontFamily:"sans-serif"}}>
   <div style={{display:"flex",flexDirection:"column",backgroundColor:"#111F30",borderRadius:26,border:"1px solid #32445A",padding:"26px 32px",minHeight:190}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
     <span style={{color:secondary,fontSize:22,fontWeight:800,letterSpacing:3}}>ATYOM ESPORT</span>
     <span style={{fontSize:18,color:"#A5B9C9"}}>{roster.game_edition}</span>
    </div>
    <div style={{fontSize:39,fontWeight:900,marginTop:12,letterSpacing:1}}>{title}</div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:13}}>
     <span style={{fontSize:24,color:accent,fontWeight:800}}>{roster.name.slice(0,42)}</span>
     <span style={{fontSize:20,color:"#B6CAD9"}}>{niceDate(monday)} — {niceDate(addProgrammeDays(monday,6))}</span>
    </div>
   </div>
   <div style={{display:"flex",flexDirection:"column",flexGrow:1,marginTop:22,gap:9}}>
    {items.length===0?
     <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:700,border:"1px solid #27384B",borderRadius:20,color:"#91A9BE",fontSize:32}}>
      {kind==="programme"?"Aucune rencontre programmée":"Aucun résultat enregistré"}
     </div>:
     items.map((item:DiscordLine,i)=><div key={item.id+"-"+i} style={{display:"flex",alignItems:"center",width:"100%",minHeight:70,padding:"12px 18px",borderRadius:13,backgroundColor:i%2===0?"#152638":"#112134",border:"1px solid #283C50"}}>
      <div style={{display:"flex",flexDirection:"column",width:125,flexShrink:0}}>
       <span style={{fontWeight:800,fontSize:18,color:accent}}>{niceDate(item.date)}</span>
       <span style={{fontWeight:700,fontSize:17,color:"#ACBED0",marginTop:5}}>{item.time}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",flexGrow:1,minWidth:0,paddingLeft:8}}>
       <span style={{fontSize:22,fontWeight:850,color:"#F9FBFE"}}>{item.opponent.slice(0,45)}</span>
       <span style={{fontSize:15,marginTop:5,color:"#9EB2C4"}}>{item.competition.slice(0,65)}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",minWidth:140}}>
       {item.score?<span style={{fontWeight:900,fontSize:30,color:statusColor(item.status)}}>{item.score}</span>:
        <span style={{fontWeight:850,fontSize:20,color:statusColor(item.status)}}>{item.time}</span>}
       <span style={{fontWeight:800,fontSize:13,marginTop:5,color:statusColor(item.status)}}>{iconStatus[item.status]}</span>
      </div>
     </div>)}
    {others>0?<div style={{display:"flex",justifyContent:"center",color:"#ADBFCE",fontSize:22,marginTop:16}}>
      + {others} AUTRE(S) RENCONTRE(S) · DÉTAILS SUR ATYOM
     </div>:null}
   </div>
   <div style={{display:"flex",minHeight:80,alignItems:"center",justifyContent:"space-between",borderTop:"2px solid "+accent,marginTop:24,padding:"20px 8px 0"}}>
    <span style={{fontWeight:850,fontSize:21,color:accent}}>{footer}</span>
    <span style={{fontSize:16,color:"#93A8BA"}}>MIS À JOUR VIA ATYOM</span>
   </div>
  </div>,
  {width:1100,height:1380}
 );
 return new Uint8Array(await result.arrayBuffer());
}
