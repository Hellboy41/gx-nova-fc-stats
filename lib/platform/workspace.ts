import { INSTANCE_CONFIG } from "@/lib/platform/instance-config";
/** Contrat cible d'un espace multi-structure.
 * V9 conserve le périmètre historique GX NØVA ; aucun changement d'accès entre clubs
 * n'est autorisé tant que l'isolation serveur et la migration ne sont pas déployées.
 */
export type Organisation = {
  id: string;
  name: string;
  slug: string;
  branding: {
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
};

export type EsportRoster = {
  id: string;
  organisationId: string;
  name: string;
  game: "ea-fc";
  gameEdition: string;
  eaClubId: string;
  status: "active" | "archived";
};

export type WorkspaceContext = {
  mode: "single-club-pilot";
  organisation: Organisation;
  rosters: EsportRoster[];
  activeRosterId: string;
  multiTenantReady: false;
};

export const LEGACY_WORKSPACE: WorkspaceContext = {
  mode: "single-club-pilot",
  organisation: {
    id: "atyom-pilot",
    name: INSTANCE_CONFIG.structureName,
    slug: "atyom",
    branding: {
      logoUrl: INSTANCE_CONFIG.logoUrl,
      primaryColor: INSTANCE_CONFIG.primaryColor,
      secondaryColor: INSTANCE_CONFIG.secondaryColor,
    },
  },
  rosters: [{
    id: "gx-nova-legacy",
    organisationId: "atyom-pilot",
    name: INSTANCE_CONFIG.clubName,
    game: "ea-fc",
    gameEdition: INSTANCE_CONFIG.gameEdition,
    eaClubId: INSTANCE_CONFIG.eaClubId,
    status: "active",
  }],
  activeRosterId: "gx-nova-legacy",
  multiTenantReady: false,
};

/** Ne pas accepter d'ID d'organisation/roster fourni par le client comme preuve d'accès. */
export function legacyRosterLabel(context: WorkspaceContext = LEGACY_WORKSPACE) {
  const roster = context.rosters.find((item) => item.id === context.activeRosterId);
  return roster ? `${roster.name} · ${roster.gameEdition}` : "Aucun roster";
}
