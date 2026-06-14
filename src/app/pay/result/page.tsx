"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function ResultInner() {
  const params = useSearchParams();
  const ok = params.get("status") === "success";
  const num = params.get("n");

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      {ok ? (
        <>
          <CheckCircle2 className="size-20 text-success" />
          <h1 className="mt-5 text-2xl font-bold">Төлөм ийгиликтүү!</h1>
          <p className="mt-1 text-muted-foreground">
            {num ? `Буйрутма №${num} ` : ""}онлайн төлөндү. Рахмат! 🙏
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Заказыңыз ашканага жөнөтүлдү.
          </p>
        </>
      ) : (
        <>
          <XCircle className="size-20 text-danger" />
          <h1 className="mt-5 text-2xl font-bold">Төлөм өтпөдү</h1>
          <p className="mt-1 text-muted-foreground">
            {num ? `Буйрутма №${num} ` : ""}төлөнгөн жок. Кайра аракет кылыңыз
            же кассага кайрылыңыз.
          </p>
        </>
      )}
      <Link href="/" className="mt-7">
        <Button variant={ok ? "primary" : "secondary"}>Башкы бет</Button>
      </Link>
    </main>
  );
}

export default function PayResultPage() {
  return (
    <Suspense fallback={null}>
      <ResultInner />
    </Suspense>
  );
}
