"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Delete, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/components/auth";
import { IS_DEMO } from "@/lib/api";
import { ROLE_DEFAULT_ROUTE } from "@/lib/constants";

function LoginInner() {
  const { login, session, loaded } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  // Кирген болсо — багыттайбыз
  useEffect(() => {
    if (loaded && session) {
      router.replace(next || ROLE_DEFAULT_ROUTE[session.role]);
    }
  }, [loaded, session, next, router]);

  async function submit(code: string) {
    setBusy(true);
    try {
      const s = await login(code);
      if (!s) {
        toast.error("PIN туура эмес");
        setPin("");
      } else {
        toast.success(`Кош келиңиз, ${s.name}!`);
        router.replace(next || ROLE_DEFAULT_ROUTE[s.role]);
      }
    } finally {
      setBusy(false);
    }
  }

  function press(d: string) {
    if (busy) return;
    const np = (pin + d).slice(0, 4);
    setPin(np);
    if (np.length === 4) submit(np);
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="inline-flex rounded-2xl bg-primary/10 p-3 mb-4">
            <UtensilsCrossed className="size-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">PIN коду киргизиңиз</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Кызматкер катары кирүү
          </p>
        </div>

        {/* PIN чекиттер */}
        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`size-4 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? "bg-primary border-primary"
                  : "border-border"
              }`}
            />
          ))}
        </div>

        {/* Клавиатура */}
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="h-16 rounded-xl bg-card border border-border text-xl font-semibold hover:bg-muted active:scale-95 transition-all"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            onClick={() => press("0")}
            className="h-16 rounded-xl bg-card border border-border text-xl font-semibold hover:bg-muted active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="h-16 rounded-xl text-muted-foreground hover:bg-muted active:scale-95 transition-all grid place-items-center"
          >
            <Delete className="size-6" />
          </button>
        </div>

        {IS_DEMO && (
          <div className="mt-8 rounded-xl bg-surface border border-border p-4 text-sm">
            <p className="font-medium mb-2 text-muted-foreground">
              Демо PIN коддор:
            </p>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <b className="text-foreground">1111</b> — Админ (баары)
              </li>
              <li>
                <b className="text-foreground">2222</b> — Кассир
              </li>
              <li>
                <b className="text-foreground">3333</b> — Ашкана
              </li>
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
