"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth, canAccess } from "./auth";
import type { Role } from "@/lib/constants";
import { Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: React.ReactNode;
}) {
  const { session, loaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = canAccess(session?.role, roles);

  useEffect(() => {
    if (loaded && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loaded, session, router, pathname]);

  if (!loaded || !session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="rounded-2xl bg-danger/10 p-4">
          <Lock className="size-8 text-danger" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Уруксат жок</h1>
          <p className="text-muted-foreground mt-1">
            Бул бөлүмгө сиздин ролуңуз ({session.name}) кире албайт.
          </p>
        </div>
        <Link href="/">
          <Button variant="secondary">Башкы бетке</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
