"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";
import { LayoutProvider } from "./layout-context";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPos = pathname === "/pos";

  return (
    <LayoutProvider>
      <div className="flex h-[100dvh] overflow-hidden bg-slate-50">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main
            className={cn(
              "flex-1 min-h-0",
              isPos ? "overflow-hidden" : "overflow-auto"
            )}
          >
            {children}
          </main>
          <BottomNav />
        </div>
      </div>
    </LayoutProvider>
  );
}
