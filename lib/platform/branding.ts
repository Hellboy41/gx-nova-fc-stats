import { INSTANCE_CONFIG } from "@/lib/platform/instance-config";

export type BrandingScope = "structure" | "roster";
export type BrandingSettings = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  logoPath: string | null;
  logoUrl: string | null;
  updatedAt: string | null;
};

export type BrandingResponse = {
  structure: BrandingSettings;
  roster: BrandingSettings & { eaClubId: string; gameEdition: string };
  canEdit: boolean;
  environment: "preview" | "production";
};

export const BRANDING_BUCKET = "esport-branding-private";

/** Identité structure indépendante, personnalisable par installation. */
function structureColor(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}
export const BRANDING_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const BRANDING_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"] as const;

export function brandingDefaults(): Omit<BrandingResponse, "canEdit" | "environment"> {
  return {
    structure: {
      name: INSTANCE_CONFIG.structureName,
      primaryColor: structureColor(process.env.NEXT_PUBLIC_ESPORT_STRUCTURE_PRIMARY_COLOR, "#FBD046"),
      secondaryColor: structureColor(process.env.NEXT_PUBLIC_ESPORT_STRUCTURE_SECONDARY_COLOR, "#FFFFFF"),
      logoPath: null,
      logoUrl: null,
      updatedAt: null,
    },
    roster: {
      name: INSTANCE_CONFIG.clubName,
      gameEdition: INSTANCE_CONFIG.gameEdition,
      eaClubId: INSTANCE_CONFIG.eaClubId,
      primaryColor: INSTANCE_CONFIG.primaryColor,
      secondaryColor: INSTANCE_CONFIG.secondaryColor,
      logoPath: null,
      logoUrl: INSTANCE_CONFIG.logoUrl,
      updatedAt: null,
    },
  };
}
