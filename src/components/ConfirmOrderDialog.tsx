"use client";

import { useState } from "react";
import {
  X,
  Printer,
  Send,
  UtensilsCrossed,
  Banknote,
  CreditCard,
  QrCode,
  Check,
} from "lucide-react";
import { som } from "@/lib/utils";
import { printReceipt } from "@/lib/receipt";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CartLine, CafeTable, Order, OrderItem } from "@/lib/types";

const METHODS = [
  { id: "cash" as const, label: "Накта", icon: Banknote },
  { id: "card" as const, label: "Карта", icon: CreditCard },
  { id: "qr" as const, label: "Перевод", icon: QrCode },
];

export function ConfirmOrderDialog({
  lines,
  table,
  type,
  sending,
  onClose,
  onSend,
  onPay,
}: {
  lines: CartLine[];
  table: CafeTable | null;
  type: "dine_in" | "takeaway";
  sending: boolean;
  onClose: () => void;
  onSend: () => void;
  onPay: (method: "cash" | "card" | "qr") => void;
}) {
  const total = lines.reduce((s, l) => s + l.qty * l.product.price, 0);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const [method, setMethod] = useState<"cash" | "card" | "qr">("cash");

  // Чек басуу үчүн убактылуу заказ объектиси
  function printPreCheck() {
    const items: OrderItem[] = lines.map((l, i) => ({
      id: String(i),
      order_id: "",
      product_id: l.product.id,
      name: l.product.name,
      price: l.product.price,
      qty: l.qty,
      status: "pending",
      note: l.note ?? null,
      created_at: "",
    }));
    const pseudo = {
      number: 0,
      table,
      type,
      source: "pos",
      status: "pending",
      customer_note: null,
      subtotal: total,
      discount: 0,
      total,
      items,
    } as unknown as Order;
    printReceipt(pseudo, { preliminary: true });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-background shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Заказды тастыктоо</h2>
            <p className="text-sm text-muted-foreground">
              {type === "takeaway" ? "Алып кетүү" : (table?.label ?? "Стол тандалган жок")}
            </p>
          </div>
          <button onClick={onClose}>
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        {/* Заказдын курамы */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {lines.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <UtensilsCrossed className="size-10 mx-auto mb-2 opacity-40" />
              <p>Себет бош</p>
            </div>
          ) : (
            lines.map((l) => (
              <div key={l.product.id} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                  {l.qty}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-tight">{l.product.name}</p>
                  {l.note && (
                    <p className="text-xs text-muted-foreground italic">
                      {l.note}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {som(l.product.price)} × {l.qty}
                  </p>
                </div>
                <span className="font-semibold whitespace-nowrap">
                  {som(l.product.price * l.qty)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Жыйынтык + баскычтар */}
        <div className="p-5 border-t border-border space-y-4">
          <div className="flex items-center justify-between">
            <Badge className="bg-surface text-muted-foreground border-border">
              {totalQty} даана
            </Badge>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <span>Жалпы:</span>
              <span className="text-primary">{som(total)}</span>
            </div>
          </div>

          {/* Төлөм түрү */}
          <div>
            <p className="text-sm font-medium mb-2">Төлөм түрү</p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 transition-colors ${
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
          </div>

          {/* Негизги аракет: ошол замат төлөп белгилөө */}
          <Button
            variant="success"
            size="lg"
            className="w-full"
            disabled={lines.length === 0 || sending}
            onClick={() => onPay(method)}
          >
            <Check className="size-5" />
            {sending ? "Иштелүүдө…" : `Төлөндү · ${som(total)}`}
          </Button>

          {/* Кошумча: басып чыгаруу же төлөмсүз ашканага жиберүү */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              disabled={lines.length === 0}
              onClick={printPreCheck}
            >
              <Printer className="size-4" /> Чек чыгаруу
            </Button>
            <Button
              variant="outline"
              disabled={lines.length === 0 || sending}
              onClick={onSend}
            >
              <Send className="size-4" /> Төлөмсүз жиберүү
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
