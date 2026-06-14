import type { Order, Payment, Staff } from "./types";

export type Period = "today" | "week" | "month";

export const PERIOD_LABEL: Record<Period, string> = {
  today: "Бүгүн",
  week: "7 күн",
  month: "30 күн",
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function periodStart(period: Period): Date {
  const today = startOfDay(new Date());
  if (period === "today") return today;
  const days = period === "week" ? 6 : 29;
  return new Date(today.getTime() - days * 86400000);
}

export interface ReportData {
  revenue: number;
  checks: number;
  avgCheck: number;
  active: number;
  daily: { label: string; value: number }[];
  methods: { method: string; amount: number; count: number }[];
  cashiers: { name: string; amount: number; count: number }[];
  topItems: { name: string; qty: number; sum: number }[];
}

export function buildReport(
  orders: Order[],
  payments: Payment[],
  staff: Staff[],
  period: Period,
): ReportData {
  const start = periodStart(period);
  const inPeriod = (iso: string) => new Date(iso) >= start;

  // Түшүм төлөмдөр (payments) боюнча эсептелет — статуска көз каранды эмес
  const periodPays = payments.filter((p) => inPeriod(p.created_at));
  const revenue = periodPays.reduce((s, p) => s + Number(p.amount), 0);
  const checks = periodPays.length;
  const avgCheck = checks ? revenue / checks : 0;
  const active = orders.filter((o) =>
    ["pending", "cooking", "ready"].includes(o.status),
  ).length;

  // Сатылган (төлөнгөн) буйрутмалар — топ тамактар үчүн
  const paidOrderIds = new Set(periodPays.map((p) => p.order_id));
  const paid = orders.filter((o) => paidOrderIds.has(o.id));

  // Күндөр боюнча түшүм (төлөмдөр боюнча)
  const days = period === "today" ? 1 : period === "week" ? 7 : 30;
  const today = startOfDay(new Date());
  const daily: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86400000);
    const next = new Date(day.getTime() + 86400000);
    const value = periodPays
      .filter((p) => {
        const t = new Date(p.created_at);
        return t >= day && t < next;
      })
      .reduce((s, p) => s + Number(p.amount), 0);
    daily.push({
      label: day.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      value,
    });
  }

  // Төлөм ыкмалары
  const methodMap: Record<string, { amount: number; count: number }> = {};
  for (const p of periodPays) {
    methodMap[p.method] = {
      amount: (methodMap[p.method]?.amount ?? 0) + Number(p.amount),
      count: (methodMap[p.method]?.count ?? 0) + 1,
    };
  }
  const methods = Object.entries(methodMap).map(([method, v]) => ({
    method,
    ...v,
  }));

  // Кассирлер боюнча
  const staffName = (id: string | null) =>
    staff.find((s) => s.id === id)?.name ?? "Белгисиз";
  const cashierMap: Record<string, { amount: number; count: number }> = {};
  for (const p of periodPays) {
    const key = p.created_by ?? "—";
    cashierMap[key] = {
      amount: (cashierMap[key]?.amount ?? 0) + Number(p.amount),
      count: (cashierMap[key]?.count ?? 0) + 1,
    };
  }
  const cashiers = Object.entries(cashierMap)
    .map(([id, v]) => ({ name: id === "—" ? "Белгисиз" : staffName(id), ...v }))
    .sort((a, b) => b.amount - a.amount);

  // Топ тамактар
  const itemMap: Record<string, { qty: number; sum: number }> = {};
  for (const o of paid) {
    for (const it of o.items ?? []) {
      itemMap[it.name] = {
        qty: (itemMap[it.name]?.qty ?? 0) + it.qty,
        sum: (itemMap[it.name]?.sum ?? 0) + it.qty * Number(it.price),
      };
    }
  }
  const topItems = Object.entries(itemMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  return { revenue, checks, avgCheck, active, daily, methods, cashiers, topItems };
}

/** Берилген буйрутмаларды CSV форматка айлантат */
export function ordersToCsv(orders: Order[]): string {
  const rows = [["Номер", "Күн", "Стол", "Тамактар", "Сумма"]];
  for (const o of orders) {
    rows.push([
      String(o.number),
      new Date(o.created_at).toLocaleString("ru-RU"),
      o.table?.label ?? "Алып кетүү",
      (o.items ?? []).map((i) => `${i.qty}x ${i.name}`).join("; "),
      String(o.total),
    ]);
  }
  return rows
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
