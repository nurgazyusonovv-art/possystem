"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-2xl bg-danger/10 p-4">
        <AlertTriangle className="size-8 text-danger" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">Бир нерсе туура эмес болду</h1>
        <p className="text-muted-foreground mt-1">
          Каталык кетти. Кайра аракет кылыңыз.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Кайра жүктөө</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/")}>
          Башкы бет
        </Button>
      </div>
    </div>
  );
}
