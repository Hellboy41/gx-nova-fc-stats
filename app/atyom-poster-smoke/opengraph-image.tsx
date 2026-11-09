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
 const programme=[
  {id:"t1",date:"2026-11-09",time:"21:20",opponent:"BLAZE X FC",competition:"VPG FRANCE",score:null,status:"upcoming" as const},
  {id:"t2",date:"2026-11-11",time:"21:40",opponent:"X CAVIAR",competition:"ZEWONKA",score:null,status:"upcoming" as const},
  {id:"t3",date:"2026-11-12",time:"22:20",opponent:"ASTRA SOCCER",competition:"VPG SUISSE",score:null,status:"upcoming" as const},
 ];
 const data:DiscordWeekData={programme,results:[],wins:0,draws:0,losses:0};
 const png=await renderDiscordImage(roster,"programme","week","2026-11-09",data);
 return new Response(Uint8Array.from(png).buffer,{headers:{"Content-Type":"image/png"}});
}
