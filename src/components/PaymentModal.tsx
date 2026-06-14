"use client";

import { useState } from "react";
import { X, Banknote, CreditCard, QrCode, Check, Printer, CheckCircle2 } from "lucide-react";
import { som } from "@/lib/utils";
import { payOrder } from "@/lib/api";
import { printReceipt } from "@/lib/receipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Order } from "@/lib/types";
import { useAuth } from "@/components/auth";

const METHODS = [
  { id: "cash" as const, label: "Накта", icon: Banknote },
  { id: "card" as const, label: "Карта", icon: CreditCard },
  { id: "qr" as const, label: "Перевод", icon: QrCode },
];

const QUICK = [500, 1000, 2000, 5000];

export function PaymentModal({
  order,
  onClose,
  onPaid,
}: {
  order: Order;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { session } = useAuth();
  const [method, setMethod] = useState<"cash" | "card" | "qr">("cash");
  const [received, setReceived] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);

  const recv = Number(received) || 0;
  const change = method === "cash" ? Math.max(recv - order.total, 0) : 0;
  const notEnough = method === "cash" && recv > 0 && recv < order.total;
  const finalReceived = method === "cash" ? recv || order.total : undefined;

  async function confirm() {
    setBusy(true);
    try {
      await payOrder({
        orderId: order.id,
        method,
        amount: order.total,
        received: finalReceived,
        createdBy: session?.id ?? null,
      });
      toast.success(`Буйрутма №${order.number} төлөндү`);
      setPaid(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Төлөм катталган жок";
      toast.error(msg);
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  function doPrint() {
    printReceipt(order, {
      method,
      received: finalReceived,
      change: method === "cash" ? change : null,
    });
  }

  // ---- Төлөнгөндөн кийинки ийгилик экраны ----
  if (paid) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-background shadow-xl p-7 text-center">
          <CheckCircle2 className="size-16 text-success mx-auto" />
          <h2 className="text-xl font-bold mt-4">Төлөм кабыл алынды</h2>
          <p className="text-muted-foreground mt-1">
            Буйрутма №{order.number} · {som(order.total)}
          </p>
          {method === "cash" && finalReceived != null && (
            <div className="mt-4 rounded-xl bg-surface py-3">
              <p className="text-sm text-muted-foreground">Кайтарым</p>
              <p className="text-2xl font-bold text-success">{som(change)}</p>
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={doPrint}>
              <Printer className="size-4" /> Чек басуу
            </Button>
            <Button onClick={onPaid}>Бүттү</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Төлөм · №{order.number}</h2>
            <p className="text-sm text-muted-foreground">
              {order.table?.label ?? "Алып кетүү"}
            </p>
          </div>
          <button onClick={onClose}>
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="text-center rounded-xl bg-surface py-5">
            <p className="text-sm text-muted-foreground">Төлөнүүчү сумма</p>
            <p className="text-3xl font-bold text-primary">{som(order.total)}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="size-5" />
                  <span className="text-xs font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>

          {method === "cash" && (
            <div className="space-y-3">
              <Input
                inputMode="numeric"
                placeholder="Кардар берген сумма"
                value={received}
                onChange={(e) =>
                  setReceived(e.target.value.replace(/[^0-9]/g, ""))
                }
              />
              <div className="grid grid-cols-4 gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => setReceived(String(q))}
                    className="rounded-lg border border-border bg-surface py-2 text-sm font-medium hover:bg-muted"
                  >
                    {q}
                  </button>
                ))}
              </div>
              {recv > 0 && (
                <div className="flex justify-between rounded-lg bg-success/10 px-3 py-2 text-success font-medium">
                  <span>Кайтарым</span>
                  <span>{som(change)}</span>
                </div>
              )}
            </div>
          )}

          <Button
            size="lg"
            variant="success"
            className="w-full"
            disabled={busy || notEnough}
            onClick={confirm}
          >
            <Check className="size-5" />
            {notEnough ? "Сумма жетишсиз" : "Төлөмдү ырастоо"}
          </Button>
        </div>
      </div>
    </div>
  );
}
