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
 const targets=[
  {kind:"programme" as const,period:"week" as const,date:"2026-11-09"},
  {kind:"programme" as const,period:"day" as const,date:"2026-11-09"},
  {kind:"results" as const,period:"week" as const,date:"2026-11-09"},
  {kind:"results" as const,period:"day" as const,date:"2026-11-09"}
 ];
 for(const target of targets){
  const data=filterDiscordData(week,target.period,target.date);
  try{await renderDiscordImage(roster,target.kind,target.period,target.date,data);}
  catch(error){console.error("ATYOM poster build diagnostic:",target.kind,target.period,error);throw error;}
 }
 return new ImageResponse(
  <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:"#08121D",color:"#FBD046",fontSize:56,fontWeight:700}}>
   ATYOM SMOKE OK
  </div>,
  {width:1200,height:630});
}
