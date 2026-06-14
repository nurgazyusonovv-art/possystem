"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrders, getPayments, getStaff } from "@/lib/api";
import { som } from "@/lib/utils";
import {
  buildReport,
  ordersToCsv,
  PERIOD_LABEL,
  type Period,
} from "@/lib/reports";
import {
  PAYMENT_METHOD_LABEL,
} from "@/lib/constants";
import {
  TrendingUp,
  Receipt,
  ShoppingBag,
  Flame,
  Download,
  Banknote,
  CreditCard,
  QrCode,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const METHOD_ICON: Record<string, typeof Banknote> = {
  cash: Banknote,
  card: CreditCard,
  qr: QrCode,
};

function reportSince(): string {
  return new Date(Date.now() - 32 * 86400000).toISOString();
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("today");

  // Отчёт периоддору эң көп 30 күн — акыркы ~32 күндү гана жүктөйбүз
  const [since] = useState(reportSince);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", "report"],
    queryFn: () => getOrders({ all: true, since }),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments", "report"],
    queryFn: () => getPayments({ since }),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: getStaff,
  });

  const r = buildReport(orders, payments, staff, period);
  const maxDaily = Math.max(...r.daily.map((d) => d.value), 1);

  function exportCsv() {
    const paidIds = new Set(payments.map((p) => p.order_id));
    const csv = ordersToCsv(orders.filter((o) => paidIds.has(o.id)));
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `otchet-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stats = [
    { label: "Түшүм", value: som(r.revenue), icon: TrendingUp, tone: "text-success" },
    { label: "Чектер", value: String(r.checks), icon: Receipt, tone: "text-primary" },
    { label: "Орточо чек", value: som(r.avgCheck), icon: ShoppingBag, tone: "text-indigo-500" },
    { label: "Активдүү заказ", value: String(r.active), icon: Flame, tone: "text-amber-500" },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Отчёт</h1>
          <p className="text-muted-foreground">Сатуу көрсөткүчтөрү</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-surface p-1">
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  period === p ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="size-4" /> CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Жүктөлүүдө…</p>
      ) : (
        <div className="space-y-6">
          {/* Статистика */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="p-5">
                  <Icon className={`size-6 ${s.tone}`} />
                  <p className="text-2xl font-bold mt-3">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </Card>
              );
            })}
          </div>

          {/* Күндөр боюнча график */}
          {period !== "today" && (
            <Card className="p-5">
              <h2 className="font-semibold mb-4">Күндөр боюнча түшүм</h2>
              <div className="flex items-end gap-1.5 h-40">
                {r.daily.map((d, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 group"
                  >
                    <div className="w-full flex items-end justify-center flex-1">
                      <div
                        className="w-full max-w-8 rounded-t-md bg-primary/80 hover:bg-primary transition-colors relative"
                        style={{
                          height: `${Math.max((d.value / maxDaily) * 100, 2)}%`,
                        }}
                        title={som(d.value)}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground rotate-0 whitespace-nowrap">
                      {period === "week" ? d.label : ""}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Төлөм ыкмалары */}
            <Card>
              <div className="p-5 border-b border-border">
                <h2 className="font-semibold">Төлөм ыкмалары</h2>
              </div>
              <div className="p-5 space-y-3">
                {r.methods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Маалымат жок</p>
                ) : (
                  r.methods.map((m) => {
                    const Icon = METHOD_ICON[m.method] ?? Banknote;
                    return (
                      <div key={m.method} className="flex items-center gap-3">
                        <div className="rounded-lg bg-surface p-2">
                          <Icon className="size-4 text-primary" />
                        </div>
                        <span className="flex-1 font-medium">
                          {PAYMENT_METHOD_LABEL[m.method] ?? m.method}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {m.count} чек
                        </span>
                        <span className="font-semibold">{som(m.amount)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Кассирлер */}
            <Card>
              <div className="p-5 border-b border-border">
                <h2 className="font-semibold flex items-center gap-2">
                  <Users className="size-5 text-primary" /> Кызматкерлер боюнча
                </h2>
              </div>
              <div className="p-5 space-y-3">
                {r.cashiers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Маалымат жок</p>
                ) : (
                  r.cashiers.map((c) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <div className="grid size-8 place-items-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="flex-1 font-medium">{c.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {c.count} чек
                      </span>
                      <span className="font-semibold">{som(c.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Топ тамактар */}
          <Card>
            <div className="p-5 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <Flame className="size-5 text-amber-500" /> Эң көп сатылган
              </h2>
            </div>
            <div className="p-5">
              {r.topItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">Маалымат жок</p>
              ) : (
                <ul className="space-y-3">
                  {r.topItems.map((t, i) => (
                    <li key={t.name} className="flex items-center gap-3">
                      <span className="grid size-7 place-items-center rounded-lg bg-surface text-sm font-semibold">
                        {i + 1}
                      </span>
                      <span className="flex-1 font-medium">{t.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {t.qty} даана
                      </span>
                      <span className="font-semibold">{som(t.sum)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
