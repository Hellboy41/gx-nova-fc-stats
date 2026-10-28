"use client";

import { useEffect, useState } from "react";
import { brandingDefaults, type BrandingResponse } from "@/lib/platform/branding";

const DEFAULT = brandingDefaults();

export function useClubBranding(): BrandingResponse {
  const [branding, setBranding] = useState<BrandingResponse>({
    ...DEFAULT, canEdit: false, environment: "preview",
  });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/branding", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const result = await response.json() as BrandingResponse;
        if (active) setBranding(result);
      } catch {
        // Le thème fourni par l'installation reste utilisable hors connexion.
      }
    };
    void load();
    window.addEventListener("esport-branding-updated", load);
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener("esport-branding-updated", load);
    };
  }, []);
  return branding;
}
