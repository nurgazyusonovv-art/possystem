"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrders, getPayments } from "@/lib/api";
import { printReceipt } from "@/lib/receipt";
import { som, clock } from "@/lib/utils";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_COLOR,
  PAYMENT_METHOD_LABEL,
} from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Printer,
  Search,
  History,
  ChevronDown,
  ChevronUp,
  Receipt,
  TrendingUp,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import type { Order, Payment } from "@/lib/types";

type Filter = "today" | "week" | "month" | "all";
const FILTER_LABEL: Record<Filter, string> = {
  today: "Бүгүн",
  week: "7 күн",
  month: "30 күн",
  all: "Баары",
};

function filterStart(f: Filter): Date | null {
  if (f === "all") return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (f === "today") return start;
  const days = f === "week" ? 6 : 29;
  return new Date(start.getTime() - days * 86400000);
}

function withinFilter(iso: string, f: Filter): boolean {
  const start = filterStart(f);
  if (!start) return true;
  return new Date(iso) >= start;
}

export default function HistoryPage() {
  const [filter, setFilter] = useState<Filter>("today");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const startDate = filterStart(filter);
  const since = startDate ? startDate.toISOString() : undefined;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", "history", filter],
    queryFn: () => getOrders({ all: true, since, limit: 1000 }),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments", "history", filter],
    queryFn: () => getPayments({ since }),
  });

  const payByOrder = (id: string): Payment | undefined =>
    payments.find((p) => p.order_id === id);

  const list = orders
    .filter((o) => withinFilter(o.created_at, filter))
    .filter((o) => (q ? String(o.number).includes(q.trim()) : true));

  // ---- Статистика (тандалган мезгил боюнча) ----
  const periodOrders = orders.filter((o) => withinFilter(o.created_at, filter));
  const paidOrders = periodOrders.filter((o) => payByOrder(o.id));
  const revenue = paidOrders.reduce(
    (s, o) => s + Number(payByOrder(o.id)?.amount ?? 0),
    0,
  );
  const avgCheck = paidOrders.length ? revenue / paidOrders.length : 0;
  const cancelledCount = periodOrders.filter(
    (o) => o.status === "cancelled",
  ).length;

  const stats = [
    {
      label: "Заказдар",
      value: String(periodOrders.length),
      icon: Receipt,
      tone: "text-primary",
    },
    {
      label: "Түшүм",
      value: som(revenue),
      icon: TrendingUp,
      tone: "text-success",
    },
    {
      label: "Орточо чек",
      value: som(avgCheck),
      icon: ShoppingBag,
      tone: "text-indigo-500",
    },
    {
      label: "Жокко чыгарылган",
      value: String(cancelledCount),
      icon: XCircle,
      tone: "text-danger",
    },
  ];

  function reprint(o: Order) {
    const p = payByOrder(o.id);
    printReceipt(o, {
      method: p?.method ?? "cash",
      received: p?.received ?? null,
      change: p?.change ?? null,
    });
  }

  return (
    <div className="p-5 sm:p-8 max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold mb-1">Заказ тарыхы</h1>
        <p className="text-muted-foreground">Бардык буйрутмалар жана чектер</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-surface p-1">
          {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                filter === f ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-40">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Номер боюнча издөө"
            value={q}
            onChange={(e) => setQ(e.target.value.replace(/[^0-9]/g, ""))}
            className="pl-9"
          />
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <Icon className={`size-5 ${s.tone}`} />
              <p className="text-xl font-bold mt-2">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Жүктөлүүдө…</p>
      ) : list.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <History className="size-12 mx-auto mb-3 opacity-40" />
          <p>Буйрутма табылган жок</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((o) => {
            const isOpen = open === o.id;
            const pay = payByOrder(o.id);
            return (
              <Card key={o.id} className="overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : o.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40"
                >
                  <span className="font-bold w-12">№{o.number}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {o.table?.label ?? "Алып кетүү"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("ru-RU")} ·{" "}
                      {clock(o.created_at)}
                    </p>
                  </div>
                  <Badge className={ORDER_STATUS_COLOR[o.status]}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </Badge>
                  <span className="font-semibold w-24 text-right">
                    {som(o.total)}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    <ul className="space-y-1 text-sm">
                      {o.items?.map((it) => (
                        <li key={it.id} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {it.qty}× {it.name}
                          </span>
                          <span>{som(it.price * it.qty)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <span className="text-sm text-muted-foreground">
                        {pay
                          ? `Төлөм: ${PAYMENT_METHOD_LABEL[pay.method]}`
                          : "Төлөнгөн эмес"}
                      </span>
                      {pay && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => reprint(o)}
                        >
                          <Printer className="size-4" /> Чек басуу
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
