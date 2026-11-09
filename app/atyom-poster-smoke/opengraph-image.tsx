import { renderDiscordImage } from "@/lib/discord/image";
import { activeRosterById } from "@/lib/platform/rosters";
import { readDiscordWeek,filterDiscordData } from "@/lib/discord/data";
import { ImageResponse } from "next/og";
export const dynamic="force-static";
export const alt="Test statique interne ATYOM : aucun contenu client publié";
export const size={width:1200,height:630};
export const contentType="image/png";
export default async function Image(){
 // Exercice du même trajet de rendu que l'aperçu réel. Les PNG contenant
 // des matchs réels sont jetés : la seule sortie servie est un visuel neutre.
 const roster=await activeRosterById("gx-nova-legacy");
 if(!roster)throw new Error("Roster absent pendant le test.");
 const week=await readDiscordWeek(roster,"2026-11-09");
 const noLogos={...week,
  programme:week.programme.map(item=>({...item,opponentLogoUrl:null})),
  results:week.results.map(item=>({...item,opponentLogoUrl:null}))};
 const noRosterLogo={...roster,workspace_mode:"monitoring" as const,logo_path:null};
 const scenarios=[
  {name:"actual roster / no opponent logos",r:roster,data:noLogos,kind:"programme" as const,period:"week" as const,date:"2026-11-09"},
  {name:"no roster logo / no opponent logos",r:noRosterLogo,data:noLogos,kind:"programme" as const,period:"week" as const,date:"2026-11-09"},
  {name:"no roster logo / opponent logos",r:noRosterLogo,data:week,kind:"programme" as const,period:"week" as const,date:"2026-11-09"},
  {name:"actual roster / opponent logos",r:roster,data:week,kind:"programme" as const,period:"week" as const,date:"2026-11-09"},
  {name:"results no opponent logos",r:noRosterLogo,data:noLogos,kind:"results" as const,period:"week" as const,date:"2026-11-09"},
  {name:"day no opponent logos",r:noRosterLogo,data:noLogos,kind:"programme" as const,period:"day" as const,date:"2026-11-09"}
 ];
 for(const t of scenarios){
  try{
   const filtered=filterDiscordData(t.data,t.period,t.date);
   await renderDiscordImage(t.r,t.kind,t.period,t.date,filtered);
   console.log("ATYOM diagnostic PASS:",t.name);
  }catch(error){console.error("ATYOM diagnostic FAIL:",t.name,error instanceof Error?error.message:String(error));}
 }
 return new ImageResponse(
  <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:"#08121D",color:"#FBD046",fontSize:56,fontWeight:700}}>
   ATYOM SMOKE OK
  </div>,
  {width:1200,height:630});
}
