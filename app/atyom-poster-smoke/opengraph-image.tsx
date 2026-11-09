import { renderDiscordImage } from "@/lib/discord/image";
import type { AtyomRoster } from "@/lib/platform/rosters";
import type { DiscordWeekData } from "@/lib/discord/data";
export const dynamic="force-static";
export const alt="Test interne du rendu graphique ATYOM";
export const size={width:1600,height:900};
export const contentType="image/png";
export default async function Image(){
 const roster:AtyomRoster={id:"roster-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",organisation_id:"atyom-pilot",
  name:"ATYOM DEMONSTRATION",ea_club_id:"demo",game_edition:"FC27",workspace_mode:"monitoring",
  status:"active",primary_color:"#22D3EE",secondary_color:"#FACC15",logo_path:null};
 const dates=["2026-11-09","2026-11-11","2026-11-12","2026-11-15"];
 const programme=dates.flatMap((date,i)=>Array.from({length:4},(_,j)=>({
  id:"t"+i+"-"+j,date,time:["21:20","21:40","22:00","22:20"][j],
  opponent:["BLAZE X FC","X CAVIAR","ASTRA SOCCER","FCVB ESPORT"][j],
  competition:["VPG FRANCE","ZEWONKA","VPG SUISSE","VPG FRANCE"][j],
  score:null,status:"upcoming" as const
 })));
 const results=programme.map((e,i)=>({...e,score:i%2?"2 - 0":"0 - 1",status:i%2?"win" as const:"loss" as const}));
 const data:DiscordWeekData={programme,results,wins:8,draws:0,losses:8};
 await renderDiscordImage(roster,"programme","day","2026-11-09",{...data,programme:programme.filter(e=>e.date==="2026-11-09")});
 await renderDiscordImage(roster,"results","day","2026-11-11",{...data,results:results.filter(e=>e.date==="2026-11-11")});
 await renderDiscordImage(roster,"results","week","2026-11-09",data);
 const png=await renderDiscordImage(roster,"programme","week","2026-11-09",data);
 return new Response(Uint8Array.from(png).buffer,{headers:{"Content-Type":"image/png"}});
}
