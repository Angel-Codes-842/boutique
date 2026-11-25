"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  role: string;
}

export function RoleGuard({ allowedRoles, children }: { allowedRoles: string[], children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login");
          return;
        }
        if (!allowedRoles.includes(data.user.role)) {
          router.push("/");
          return;
        }
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router, allowedRoles]);

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!user) return null;
  return <>{children}</>;
}
