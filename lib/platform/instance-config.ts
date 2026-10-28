/** Paramètres du thème par installation Vercel.
 * Les variables NEXT_PUBLIC sont des paramètres de présentation publics.
 * L'ID EA de la synchronisation reste validé côté serveur et ne doit jamais
 * être lu depuis un formulaire non authentifié comme preuve d'accès.
 */
export const INSTANCE_CONFIG = {
  structureName: process.env.NEXT_PUBLIC_ESPORT_STRUCTURE_NAME?.trim() || "ATYOM",
  clubName: process.env.NEXT_PUBLIC_ESPORT_CLUB_NAME?.trim() || "GX NØVA",
  gameEdition: process.env.NEXT_PUBLIC_ESPORT_GAME_EDITION?.trim() || "FC27",
  eaClubId: process.env.NEXT_PUBLIC_ESPORT_EA_CLUB_ID?.trim() || "1663",
  logoUrl: process.env.NEXT_PUBLIC_ESPORT_CLUB_LOGO?.trim() || "/logo-gx-nova.png",
  primaryColor: safeHex(process.env.NEXT_PUBLIC_ESPORT_PRIMARY_COLOR, "#22d3ee"),
  secondaryColor: safeHex(process.env.NEXT_PUBLIC_ESPORT_SECONDARY_COLOR, "#facc15"),
} as const;

function safeHex(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export type InstanceConfiguration = {
  structureName: string;
  clubName: string;
  gameEdition: string;
  eaClubId: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
};

export function validateClubId(value: string) {
  return /^[1-9][0-9]{0,19}$/.test(value.trim());
}

/** Une identité visuelle par instance ; jamais un changement de tenant sur la même base. */
export function toPublicEnvironment(config: InstanceConfiguration) {
  return [
    ["NEXT_PUBLIC_ESPORT_STRUCTURE_NAME", config.structureName],
    ["NEXT_PUBLIC_ESPORT_CLUB_NAME", config.clubName],
    ["NEXT_PUBLIC_ESPORT_GAME_EDITION", config.gameEdition],
    ["NEXT_PUBLIC_ESPORT_EA_CLUB_ID", config.eaClubId],
    ["NEXT_PUBLIC_ESPORT_CLUB_LOGO", config.logoUrl],
    ["NEXT_PUBLIC_ESPORT_PRIMARY_COLOR", config.primaryColor],
    ["NEXT_PUBLIC_ESPORT_SECONDARY_COLOR", config.secondaryColor],
  ] as const;
}
