"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Aviso no intrusivo cuando el dispositivo pierde conexión. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-center text-xs font-medium text-slate-950 shadow-lg sm:bottom-4 sm:left-auto sm:right-4 sm:translate-x-0 sm:text-sm"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      Sin conexión. Podés navegar el menú; las operaciones requieren internet.
    </div>
  );
}
