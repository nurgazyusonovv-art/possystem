"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ConciergeBell,
  Plus,
  Minus,
  ShoppingBag,
  X,
  UtensilsCrossed,
  ClipboardList,
  Check,
  Clock,
  Send,
  Receipt,
} from "lucide-react";
import {
  getCategories,
  getProducts,
  getTables,
  getPayments,
  createOrder,
  updateOrderStatus,
} from "@/lib/api";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/components/auth";
import type { CartLine, Product, Order } from "@/lib/types";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_COLOR,
} from "@/lib/constants";
import { som, ago } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/SearchInput";
import { RequireRole } from "@/components/RequireRole";
import { UserChip } from "@/components/UserChip";
import { PaymentModal } from "@/components/PaymentModal";

export default function WaiterPage() {
  return (
    <RequireRole roles={["waiter"]}>
      <WaiterInner />
    </RequireRole>
  );
}

function WaiterInner() {
  const { session } = useAuth();
  const [tab, setTab] = useState<"take" | "mine">("take");

  // Бул официанттын активдүү заказдары
  const { data: allActive = [] } = useOrders({
    statuses: ["pending", "cooking", "ready"],
  });
  const myActive = allActive.filter((o) => o.created_by === session?.id);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      {/* Башкы */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2">
            <ConciergeBell className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold leading-tight">Официант</h1>
            <p className="text-xs text-muted-foreground truncate">
              {session?.name}
            </p>
          </div>
          <UserChip />
        </div>
      </header>

      {/* Мазмун */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "take" ? (
          <TakeOrder onPlaced={() => setTab("mine")} />
        ) : (
          <MyOrders orders={myActive} />
        )}
      </div>

      {/* Ылдыйкы навигация */}
      <nav className="shrink-0 border-t border-border bg-card grid grid-cols-2">
        <TabButton
          active={tab === "take"}
          onClick={() => setTab("take")}
          icon={<Plus className="size-5" />}
          label="Заказ алуу"
        />
        <TabButton
          active={tab === "mine"}
          onClick={() => setTab("mine")}
          icon={<ClipboardList className="size-5" />}
          label="Заказдарым"
          badge={myActive.length}
        />
      </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {icon}
      {label}
      {badge != null && badge > 0 && (
        <span className="absolute top-1.5 right-[28%] grid min-w-4 h-4 px-1 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

// ==================== ЗАКАЗ АЛУУ ====================
function TakeOrder({ onPlaced }: { onPlaced: () => void }) {
  const { session } = useAuth();
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

  const [tableId, setTableId] = useState<string | null>(null);
  const [takeaway, setTakeaway] = useState(false);
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const available = products.filter((p) => p.is_available);
  const shown = available
    .filter((p) => (activeCat === "all" ? true : p.category_id === activeCat))
    .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  const lines = Object.values(cart);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
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
    if (!takeaway && !tableId) {
      toast.error("Столду тандаңыз");
      return;
    }
    setSending(true);
    try {
      const order = await createOrder({
        tableId: takeaway ? null : tableId,
        type: takeaway ? "takeaway" : "dine_in",
        source: "pos",
        createdBy: session?.id ?? null,
        lines,
      });
      toast.success(`Заказ №${order.number} ашканага жөнөтүлдү`);
      setCart({});
      setCartOpen(false);
      setTableId(null);
      onPlaced();
    } catch (e) {
      toast.error("Заказ жөнөтүлбөдү");
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
    <div className="pb-24">
      {/* Стол тандоо */}
      <div className="p-3 border-b border-border">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setTakeaway(true)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium ${
              takeaway
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-muted-foreground"
            }`}
          >
            Алып кетүү
          </button>
          {tables.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTakeaway(false);
                setTableId(t.id);
              }}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium ${
                !takeaway && tableId === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Издөө + категориялар */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur p-3 space-y-3 border-b border-border">
        <SearchInput value={q} onChange={setQ} placeholder="Тамак издөө…" />
        <div className="flex gap-2 overflow-x-auto">
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
                activeCat === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Продукттар */}
      <div className="p-3 space-y-2.5">
        {shown.map((p) => {
          const qty = cart[p.id]?.qty ?? 0;
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"
            >
              <div className="size-14 shrink-0 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <UtensilsCrossed className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-tight truncate">{p.name}</p>
                <p className="text-sm text-primary font-semibold">
                  {som(p.price)}
                </p>
              </div>
              {qty === 0 ? (
                <Button size="sm" onClick={() => add(p)}>
                  <Plus className="size-4" />
                </Button>
              ) : (
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => sub(p)}
                    className="grid size-9 place-items-center rounded-lg bg-surface border border-border"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-5 text-center font-semibold">{qty}</span>
                  <button
                    onClick={() => add(p)}
                    className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {shown.length === 0 && (
          <p className="text-center text-muted-foreground py-10">
            Тамак табылган жок
          </p>
        )}
      </div>

      {/* Себет баскычы (ылдыйкы навигациянын үстүндө) */}
      {totalQty > 0 && !cartOpen && (
        <div className="fixed bottom-16 inset-x-0 z-20 p-3">
          <button
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-xl bg-primary px-5 py-3.5 text-primary-foreground shadow-lg"
          >
            <span className="flex items-center gap-2 font-medium">
              <ShoppingBag className="size-5" />
              Себет · {totalQty}
            </span>
            <span className="font-semibold">{som(total)}</span>
          </button>
        </div>
      )}

      {/* Себет панели */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="bg-background rounded-t-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-lg">
                Заказ · {takeaway ? "Алып кетүү" : (tables.find((t) => t.id === tableId)?.label ?? "Стол")}
              </h2>
              <button onClick={() => setCartOpen(false)}>
                <X className="size-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {lines.map((l) => (
                <div key={l.product.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{l.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {som(l.product.price)} × {l.qty}
                    </p>
                  </div>
                  <button
                    onClick={() => sub(l.product)}
                    className="grid size-9 place-items-center rounded-lg bg-surface border border-border"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-5 text-center font-semibold">{l.qty}</span>
                  <button
                    onClick={() => add(l.product)}
                    className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Жалпы</span>
                <span className="text-primary">{som(total)}</span>
              </div>
              <Button
                size="lg"
                className="w-full"
                disabled={sending}
                onClick={send}
              >
                <Send className="size-5" />
                {sending ? "Жөнөтүлүүдө…" : "Ашканага жөнөтүү"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== МЕНИН ЗАКАЗДАРЫМ ====================
function MyOrders({ orders }: { orders: Order[] }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [payTarget, setPayTarget] = useState<Order | null>(null);

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => getPayments(),
  });
  const isPaid = (orderId: string) =>
    payments.some((p) => p.order_id === orderId);

  const shown = orders.filter((o) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      String(o.number).includes(s) ||
      (o.table?.label ?? "").toLowerCase().includes(s)
    );
  });

  // Төлөнгөн заказды берилди кылып жабуу (тарыхка өтөт)
  async function deliver(o: Order) {
    try {
      await updateOrderStatus(o.id, "served");
      toast.success(`Заказ №${o.number} берилди`);
    } catch {
      toast.error("Ката кетти");
    }
  }

  return (
    <div className="p-3 space-y-3">
      <SearchInput value={q} onChange={setQ} placeholder="№ же стол боюнча…" />

      {shown.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <ClipboardList className="size-12 mx-auto mb-3 opacity-40" />
          <p>Сиздин активдүү заказыңыз жок</p>
        </div>
      ) : (
        shown.map((o) => (
          <div
            key={o.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">№{o.number}</span>
              <div className="flex items-center gap-2">
                {isPaid(o.id) && (
                  <Badge className="bg-success/20 text-success border-success/40">
                    Төлөндү
                  </Badge>
                )}
                <Badge className={ORDER_STATUS_COLOR[o.status]}>
                  {ORDER_STATUS_LABEL[o.status]}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {o.table?.label ?? "Алып кетүү"} ·{" "}
              <Clock className="size-3.5" /> {ago(o.created_at)}
            </p>
            <ul className="mt-2.5 space-y-1 text-sm">
              {o.items?.map((it) => (
                <li key={it.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {it.qty}× {it.name}
                  </span>
                  <span>{som(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
            {isPaid(o.id) ? (
              <Button
                variant="success"
                className="w-full mt-3"
                onClick={() => deliver(o)}
              >
                <Check className="size-4" /> Заказ берилди
              </Button>
            ) : (
              <Button
                className="w-full mt-3"
                onClick={() => setPayTarget(o)}
              >
                <Receipt className="size-4" /> Төлөм алып жабуу
              </Button>
            )}
          </div>
        ))
      )}

      {payTarget && (
        <PaymentModal
          order={payTarget}
          onClose={() => setPayTarget(null)}
          onPaid={async () => {
            // Төлөм алынды → заказды берилди кылып жабабыз
            const o = payTarget;
            setPayTarget(null);
            qc.invalidateQueries({ queryKey: ["payments"] });
            await updateOrderStatus(o.id, "served");
            qc.invalidateQueries({ queryKey: ["orders"] });
            toast.success(`Заказ №${o.number} төлөнүп, берилди`);
          }}
        />
      )}
    </div>
  );
}
