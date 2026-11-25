"use client";

import { useEffect } from "react";

/**
 * Registra el service worker solo en producción (Docker/Render).
 * En `next dev` se omite para no interferir con Hot Module Replacement.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // La app sigue funcionando sin service worker.
      });
  }, []);

  return null;
}
