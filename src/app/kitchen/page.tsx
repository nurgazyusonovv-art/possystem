"use client";

import { useOrders } from "@/hooks/useOrders";
import { updateOrderStatus } from "@/lib/api";
import { ago, isOlderThan } from "@/lib/utils";
import type { Order } from "@/lib/types";
import type { OrderStatus } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChefHat, Clock, ArrowRight, Bell } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { RequireRole } from "@/components/RequireRole";
import { UserChip } from "@/components/UserChip";
import { SearchInput } from "@/components/SearchInput";
import { useState } from "react";

const COLUMNS: { status: OrderStatus; title: string; next?: OrderStatus; nextLabel?: string }[] =
  [
    { status: "pending", title: "Жаңы", next: "cooking", nextLabel: "Даярдоого алуу" },
    { status: "cooking", title: "Даярдоодо", next: "ready", nextLabel: "Даяр" },
    { status: "ready", title: "Даяр" },
  ];

export default function KitchenPage() {
  return (
    <RequireRole roles={["kitchen"]}>
      <KitchenInner />
    </RequireRole>
  );
}

function KitchenInner() {
  const { data: allOrders = [], isLoading } = useOrders({
    statuses: ["pending", "cooking", "ready"],
  });
  const [q, setQ] = useState("");
  const orders = allOrders.filter((o) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      String(o.number).includes(s) ||
      (o.table?.label ?? "").toLowerCase().includes(s)
    );
  });

  // Жаңы буйрутма келгенде үн / билдирүү
  const prevCount = useRef(0);
  useEffect(() => {
    const pending = allOrders.filter((o) => o.status === "pending").length;
    if (pending > prevCount.current && prevCount.current !== 0) {
      toast(<span className="font-medium">🔔 Жаңы буйрутма келди!</span>);
    }
    prevCount.current = pending;
  }, [allOrders]);

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2">
            <ChefHat className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-lg leading-tight">Ашкана экраны</h1>
            <p className="text-xs text-muted-foreground">
              Буйрутмалар реалтайм жаңыланат
            </p>
          </div>
          <Badge className="bg-success/15 text-success border-success/30">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            Онлайн
          </Badge>
          <div className="pl-3 border-l border-border">
            <UserChip />
          </div>
        </div>
        <div className="px-5 pb-3">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="№ же стол боюнча издөө…"
            className="max-w-sm"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <h2 className="font-semibold text-lg">{col.title}</h2>
                <Badge className="bg-surface text-muted-foreground border-border">
                  {list.length}
                </Badge>
              </div>
              {isLoading ? (
                <p className="text-sm text-muted-foreground px-1">Жүктөлүүдө…</p>
              ) : list.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Буйрутма жок
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {list.map((o) => (
                    <KitchenCard
                      key={o.id}
                      order={o}
                      next={col.next}
                      nextLabel={col.nextLabel}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function KitchenCard({
  order,
  next,
  nextLabel,
}: {
  order: Order;
  next?: OrderStatus;
  nextLabel?: string;
}) {
  async function advance() {
    if (!next) return;
    try {
      await updateOrderStatus(order.id, next);
    } catch {
      toast.error("Статус жаңыланган жок");
    }
  }

  const isQr = order.source === "qr";
  const old = isOlderThan(order.created_at, 15);

  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-sm ${
        old ? "border-danger/40" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-lg">№{order.number}</span>
        <div className="flex items-center gap-2">
          {isQr && (
            <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30">
              <Bell className="size-3" /> QR
            </Badge>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> {ago(order.created_at)}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-0.5">
        {order.table?.label ?? (order.type === "takeaway" ? "Алып кетүү" : "Стол")}
      </p>

      <ul className="mt-3 space-y-1.5">
        {order.items?.map((it) => (
          <li key={it.id} className="flex justify-between gap-2 text-sm">
            <span>
              <span className="font-semibold text-primary">{it.qty}×</span>{" "}
              {it.name}
              {it.note && (
                <span className="text-muted-foreground italic">
                  {" "}
                  — {it.note}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {order.customer_note && (
        <p className="mt-2 text-xs rounded-lg bg-warning/10 text-warning px-2 py-1">
          Эскертүү: {order.customer_note}
        </p>
      )}

      {next && (
        <Button
          variant={next === "ready" ? "success" : "primary"}
          className="w-full mt-3"
          onClick={advance}
        >
          {nextLabel} <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  );
}
