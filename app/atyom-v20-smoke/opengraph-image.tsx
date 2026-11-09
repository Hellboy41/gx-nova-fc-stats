import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeRosterById } from "@/lib/platform/rosters";
import { readDiscordWeek,filterDiscordData } from "@/lib/discord/data";
import { renderDiscordImage } from "@/lib/discord/image";
import { posterLogoDataUri,safeOpponentLogo } from "@/lib/discord/media";
export const dynamic="force-static";
export const alt="Diagnostic interne du rendu esport";
export const size={width:1200,height:630};
export const contentType="image/png";
export default async function Image(){
 const admin=createAdminClient();
 const {data:storedLogo,error:logoError}=await admin.storage.from("esport-branding-private")
  .download("1663/production/roster/assets/baeae523-17a6-4346-a36c-3e44e63890cb.png");
 if(logoError||!storedLogo)throw new Error("Logo GX NØVA enregistré indisponible dans le test.");
 const normalized=await posterLogoDataUri(new Uint8Array(await storedLogo.arrayBuffer()),storedLogo.type);
 if(!normalized?.startsWith("data:image/png;base64,"))throw new Error("La conversion du logo GX NØVA a échoué.");
 console.log("ATYOM V20 TEST: logo GX NØVA compressé PASS");
 const roster=await activeRosterById("gx-nova-legacy");
 if(!roster)throw new Error("Roster GX NØVA absent.");
 const week=await readDiscordWeek(roster,"2026-11-09");
 const swiss=week.programme.find(e=>e.competition.toUpperCase().includes("SWISS")&&e.opponentLogoUrl?.toLowerCase().includes(".webp"));
 if(!swiss)throw new Error("Aucun logo VPG Suisse WebP enregistré.");
 const swissPng=await safeOpponentLogo(swiss.opponentLogoUrl);
 if(!swissPng?.startsWith("data:image/png;base64,"))throw new Error("La conversion du logo adverse VPG Suisse a échoué.");
 console.log("ATYOM V20 TEST: logo VPG Suisse converti depuis WebP PASS");
 const pending=week.programme.filter(x=>x.status==="upcoming");
 if(!pending.length||pending.some(x=>x.score!==null))throw new Error("Un match non joué affiche toujours un score.");
 console.log("ATYOM V20 TEST: "+pending.length+" matchs non joués sans score PASS");
 for(const target of [
  {kind:"programme" as const,period:"week" as const,date:"2026-11-09"},
  {kind:"programme" as const,period:"day" as const,date:"2026-11-09"},
  {kind:"results" as const,period:"week" as const,date:"2026-11-09"},
  {kind:"results" as const,period:"day" as const,date:"2026-11-09"},
 ]){
  const data=filterDiscordData(week,target.period,target.date);
  const png=await renderDiscordImage(roster,target.kind,target.period,target.date,data);
  if(png.length<1000||png[0]!==137||png[1]!==80||png[2]!==78||png[3]!==71)
   throw new Error("PNG invalide pour "+target.kind+" "+target.period);
  console.log("ATYOM V20 TEST: PNG "+target.kind+" "+target.period+" PASS");
 }
 // Ne jamais exposer les affiches clients dans une route de diagnostic publique.
 return new ImageResponse(<div style={{display:"flex",width:"100%",height:"100%",
  alignItems:"center",justifyContent:"center",backgroundColor:"#08121D",color:"#FBD046",
  fontWeight:900,fontSize:54}}>ATYOM V20 TEST OK</div>,{width:1200,height:630});
}
