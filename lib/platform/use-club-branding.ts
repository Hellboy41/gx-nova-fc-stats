"use client";

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { brandingDefaults, type BrandingResponse } from "@/lib/platform/branding";

const FALLBACK: BrandingResponse = {
  ...brandingDefaults(), canEdit: false, environment: "preview",
};
const BrandingContext = createContext<BrandingResponse>(FALLBACK);

/** Un seul chargement par session de navigation ; l'UI reste fonctionnelle
 * tant que l'utilisateur n'est pas authentifié ou si Storage est indisponible.
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingResponse>(FALLBACK);
  useEffect(() => {
    let active = true;
    let current: AbortController | null = null;
    const refresh = () => {
      current?.abort();
      const controller = new AbortController();
      current = controller;
      void (async () => {
        try {
          const response = await fetch("/api/branding", { cache: "no-store", signal: controller.signal });
          if (!response.ok) return;
          const result = await response.json() as BrandingResponse;
          if (active && !controller.signal.aborted) setBranding(result);
        } catch {
          // Les valeurs par défaut du roster restent disponibles.
        }
      })();
    };
    refresh();
    window.addEventListener("esport-branding-updated", refresh);
    return () => { active = false; current?.abort(); window.removeEventListener("esport-branding-updated", refresh); };
  }, []);
  return createElement(BrandingContext.Provider, { value: branding }, children);
}
export function useClubBranding() { return useContext(BrandingContext); }
