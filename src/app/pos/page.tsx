"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ListOrdered,
  Receipt,
  UtensilsCrossed,
  ArrowLeft,
  ClipboardCheck,
  Volume2,
  Check,
} from "lucide-react";
import Link from "next/link";
import {
  getCategories,
  getProducts,
  getTables,
  getPayments,
  createOrder,
  updateOrderStatus,
  payOrder,
} from "@/lib/api";
import { useOrders } from "@/hooks/useOrders";
import type { CartLine, Product, Order } from "@/lib/types";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/constants";
import { som, ago } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentModal } from "@/components/PaymentModal";
import { ConfirmOrderDialog } from "@/components/ConfirmOrderDialog";
import { playOrderReady } from "@/lib/sound";
import { RequireRole } from "@/components/RequireRole";
import { UserChip } from "@/components/UserChip";
import { SearchInput } from "@/components/SearchInput";
import { useAuth } from "@/components/auth";

export default function PosPage() {
  return (
    <RequireRole roles={["cashier", "waiter"]}>
      <PosInner />
    </RequireRole>
  );
}

function PosInner() {
  const [tab, setTab] = useState<"new" | "active">("new");

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="px-5 py-3 flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="rounded-xl bg-primary/10 p-2">
            <ShoppingCart className="size-5 text-primary" />
          </div>
          <h1 className="font-semibold text-lg flex-1">Касса</h1>
          <div className="flex rounded-lg bg-surface p-1">
            <button
              onClick={() => setTab("new")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                tab === "new" ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Plus className="size-4" /> Жаңы заказ
            </button>
            <button
              onClick={() => setTab("active")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                tab === "active" ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              <ListOrdered className="size-4" /> Активдүү
            </button>
          </div>
          <div className="ml-1 pl-3 border-l border-border">
            <UserChip />
          </div>
        </div>
      </header>

      {tab === "new" ? <NewOrder /> : <ActiveOrders />}
    </div>
  );
}

// ============================ ЖАҢЫ ЗАКАЗ ============================
function NewOrder() {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });
  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: getTables,
  });

  const { session } = useAuth();
  const qc = useQueryClient();
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [tableId, setTableId] = useState<string | null>(null);
  const [takeaway, setTakeaway] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const selectedTable = tables.find((t) => t.id === tableId) ?? null;

  const available = products.filter((p) => p.is_available);
  const shown = available
    .filter((p) => (activeCat === "all" ? true : p.category_id === activeCat))
    .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const lines = Object.values(cart);
  const total = lines.reduce((s, l) => s + l.qty * l.product.price, 0);

  function add(p: Product) {
    setCart((c) => ({
      ...c,
      [p.id]: { product: p, qty: (c[p.id]?.qty ?? 0) + 1 },
    }));
  }
  function sub(p: Product) {
    setCart((c) => {
      const ex = c[p.id];
      if (!ex) return c;
      if (ex.qty <= 1) {
        const rest = { ...c };
        delete rest[p.id];
        return rest;
      }
      return { ...c, [p.id]: { ...ex, qty: ex.qty - 1 } };
    });
  }

  async function send() {
    if (lines.length === 0) return;
    setSending(true);
    try {
      const order = await createOrder({
        tableId: takeaway ? null : tableId,
        type: takeaway ? "takeaway" : "dine_in",
        source: "pos",
        createdBy: session?.id ?? null,
        lines,
      });
      toast.success(`Буйрутма №${order.number} ашканага жөнөтүлдү`);
      setCart({});
      setTableId(null);
      setConfirmOpen(false);
    } catch (e) {
      toast.error("Буйрутма түзүлгөн жок");
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  // Заказды түзүп, ошол замат төлөндү деп белгилөө
  async function sendAndPay(method: "cash" | "card" | "qr") {
    if (lines.length === 0) return;
    setSending(true);
    try {
      const order = await createOrder({
        tableId: takeaway ? null : tableId,
        type: takeaway ? "takeaway" : "dine_in",
        source: "pos",
        createdBy: session?.id ?? null,
        lines,
      });
      await payOrder({
        orderId: order.id,
        method,
        amount: total,
        received: total,
        createdBy: session?.id ?? null,
      });
      toast.success(`Буйрутма №${order.number} төлөндү`);
      setCart({});
      setTableId(null);
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    } catch (e) {
      toast.error("Төлөм катталган жок");
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  const cats = useMemo(
    () => [{ id: "all" as const, name: "Баары" }, ...categories],
    [categories],
  );

  return (
    <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_380px] overflow-hidden">
      {/* Меню */}
      <div className="flex flex-col min-h-0 overflow-hidden">
        <div className="shrink-0 p-4 pb-2 border-b border-border space-y-3">
          <SearchInput value={q} onChange={setQ} placeholder="Товар издөө…" />
          <div className="flex gap-2 overflow-x-auto">
            {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
                activeCat === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:bg-muted"
              }`}
            >
              {c.name}
            </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {shown.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                className="text-left rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-sm active:scale-[0.98]"
              >
                <div className="aspect-square rounded-lg bg-muted mb-2 overflow-hidden flex items-center justify-center">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <UtensilsCrossed className="size-7 text-muted-foreground" />
                  )}
                </div>
                <p className="font-medium text-sm leading-tight line-clamp-2">
                  {p.name}
                </p>
                <p className="text-primary font-semibold text-sm mt-1">
                  {som(p.price)}
                </p>
              </button>
            ))}
          </div>
          {available.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              Меню бош. Админ панелден тамак кошуңуз.
            </p>
          )}
        </div>
      </div>

      {/* Заказ панели */}
      <aside className="border-l border-border bg-card flex flex-col min-h-0">
        <div className="shrink-0 p-4 border-b border-border space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTakeaway(false)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                !takeaway
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground"
              }`}
            >
              Залда
            </button>
            <button
              onClick={() => setTakeaway(true)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                takeaway
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground"
              }`}
            >
              Алып кетүү
            </button>
          </div>
          {!takeaway && (
            <select
              value={tableId ?? ""}
              onChange={(e) => setTableId(e.target.value || null)}
              className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Стол тандаңыз…</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
          {lines.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <ShoppingCart className="size-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Тамактарды басып кошуңуз</p>
            </div>
          )}
          {lines.map((l) => (
            <div
              key={l.product.id}
              className="flex items-center gap-2 rounded-lg bg-surface p-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{l.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {som(l.product.price * l.qty)}
                </p>
              </div>
              <button
                onClick={() => sub(l.product)}
                className="grid size-7 place-items-center rounded-md bg-card border border-border"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-5 text-center text-sm font-semibold">
                {l.qty}
              </span>
              <button
                onClick={() => add(l.product)}
                className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="shrink-0 p-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Жалпы</span>
            <span className="text-primary">{som(total)}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              disabled={lines.length === 0}
              onClick={() => setCart({})}
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              className="flex-1"
              disabled={lines.length === 0}
              onClick={() => setConfirmOpen(true)}
            >
              <ClipboardCheck className="size-4" /> Тастыктоо
            </Button>
          </div>
        </div>
      </aside>

      {confirmOpen && (
        <ConfirmOrderDialog
          lines={lines}
          table={selectedTable}
          type={takeaway ? "takeaway" : "dine_in"}
          sending={sending}
          onClose={() => setConfirmOpen(false)}
          onSend={send}
          onPay={sendAndPay}
        />
      )}
    </div>
  );
}

// ============================ АКТИВДҮҮ ============================
function ActiveOrders() {
  const qc = useQueryClient();
  // Активдүү = жеткирилбеген (берилгенден кийин тарыхка өтөт)
  const { data: allOrders = [], isLoading } = useOrders({
    statuses: ["pending", "cooking", "ready"],
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => getPayments(),
  });
  const [payTarget, setPayTarget] = useState<Order | null>(null);
  const [q, setQ] = useState("");

  const isPaid = (orderId: string) =>
    payments.some((p) => p.order_id === orderId);

  const orders = allOrders.filter((o) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      String(o.number).includes(s) ||
      (o.table?.label ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="max-w-6xl mx-auto mb-4">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="№ же стол боюнча издөө…"
          className="max-w-md"
        />
      </div>
      {isLoading && (
        <p className="text-center text-muted-foreground py-12">Жүктөлүүдө…</p>
      )}
      {!isLoading && orders.length === 0 && (
        <div className="text-center text-muted-foreground py-16">
          <Receipt className="size-12 mx-auto mb-3 opacity-40" />
          <p>Активдүү буйрутма жок</p>
        </div>
      )}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 max-w-6xl mx-auto">
        {orders.map((o) => (
          <div
            key={o.id}
            className="rounded-xl border border-border bg-card p-4 flex flex-col"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">№{o.number}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playOrderReady(o.number);
                    toast.info(`Заказ №${o.number} чакырылды`);
                  }}
                  title="Үн менен чакыруу"
                  className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Volume2 className="size-4" />
                </button>
                {isPaid(o.id) ? (
                  <Badge className="bg-success/20 text-success border-success/40">
                    Төлөндү
                  </Badge>
                ) : (
                  <Badge className={ORDER_STATUS_COLOR[o.status]}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {o.table?.label ?? "Алып кетүү"} · {ago(o.created_at)}
            </p>
            <ul className="mt-2.5 space-y-1 flex-1 text-sm">
              {o.items?.map((it) => (
                <li key={it.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {it.qty}× {it.name}
                  </span>
                  <span>{som(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="font-semibold text-lg text-primary">
                {som(o.total)}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {isPaid(o.id) ? (
                <Button
                  variant="success"
                  className="w-full"
                  onClick={async () => {
                    await updateOrderStatus(o.id, "served");
                    toast.success(`Заказ №${o.number} берилди`);
                  }}
                >
                  <Check className="size-4" /> Заказ берилди
                </Button>
              ) : (
                <>
                  <Button className="w-full" onClick={() => setPayTarget(o)}>
                    <Receipt className="size-4" /> Төлөм
                  </Button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Заказ №${o.number} жокко чыгарылсынбы?`)) return;
                      await updateOrderStatus(o.id, "cancelled");
                      toast.success(`Заказ №${o.number} жокко чыгарылды`);
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-danger py-1"
                  >
                    Жокко чыгаруу
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {payTarget && (
        <PaymentModal
          order={payTarget}
          onClose={() => setPayTarget(null)}
          onPaid={() => {
            qc.invalidateQueries({ queryKey: ["payments"] });
            qc.invalidateQueries({ queryKey: ["orders"] });
            setPayTarget(null);
          }}
        />
      )}
    </div>
  );
}
