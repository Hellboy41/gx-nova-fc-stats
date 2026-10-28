import { createAdminClient } from "@/lib/supabase/admin";
import type { StaffProfile } from "@/lib/auth/require-staff";

export type AtyomRoster = {
  id: string; organisation_id: string; name: string; ea_club_id: string;
  game_edition: string; workspace_mode: "legacy"|"monitoring";
  status: "active"|"archived"; primary_color: string; secondary_color: string;
  logo_path: string | null;
};
export const ROSTER_SELECT = "id,organisation_id,name,ea_club_id,game_edition,workspace_mode,status,primary_color,secondary_color,logo_path";
export const rosterOutput = (r:AtyomRoster) => ({
  id:r.id,name:r.name,eaClubId:r.ea_club_id,gameEdition:r.game_edition,
  workspaceMode:r.workspace_mode,status:r.status,primaryColor:r.primary_color,secondaryColor:r.secondary_color,
  logoUrl:null as string | null,
});
export async function activeRosters(){
  const {data,error}=await createAdminClient().from("atyom_rosters").select(ROSTER_SELECT)
    .eq("organisation_id","atyom-pilot").eq("status","active").order("created_at");
  if(error)throw error;
  return (data??[]) as AtyomRoster[];
}
export async function permittedRosters(profile:StaffProfile){
  const all=await activeRosters();
  return profile.accessScope==="structure"?all:all.filter(r=>profile.allowedRosterIds.includes(r.id));
}
export async function activeRosterById(id:string){
  const {data,error}=await createAdminClient().from("atyom_rosters").select(ROSTER_SELECT)
    .eq("id",id).eq("organisation_id","atyom-pilot").eq("status","active").maybeSingle();
  if(error)throw error;
  return data as AtyomRoster|null;
}

// URLs signées uniquement côté serveur ; le bucket de logos est privé.
const BUCKET = "esport-branding-private";
export async function rosterWithLogo(roster:AtyomRoster){
  const output=rosterOutput(roster);
  if (!roster.logo_path || !roster.logo_path.startsWith(`atyom-rosters/${roster.id}/assets/`) ||
      !/^atyom-rosters\/roster-[a-f0-9]{32}\/assets\/[a-f0-9-]+\.(png|jpg|webp)$/.test(roster.logo_path)) return output;
  try {
    const {data,error}=await createAdminClient().storage.from(BUCKET).createSignedUrl(roster.logo_path,3600);
    return {...output,logoUrl:error?null:data.signedUrl};
  } catch { return output; }
}
export async function rostersWithLogos(rosters:AtyomRoster[]){
  return Promise.all(rosters.map(rosterWithLogo));
}
