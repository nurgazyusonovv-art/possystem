"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  ShoppingBag,
  CheckCircle2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { getCategories, getProducts, getTableByToken, createOrder } from "@/lib/api";
import type { CartLine, Product } from "@/lib/types";
import { som } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/SearchInput";
import { ProductSheet } from "./ProductSheet";

export function MenuClient({ token }: { token: string }) {
  const isDemo = token === "demo";

  const { data: table } = useQuery({
    queryKey: ["table", token],
    queryFn: () => getTableByToken(token),
    enabled: !isDemo,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState<{
    number: number;
    lines: CartLine[];
    total: number;
  } | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);

  const available = products.filter((p) => p.is_available);
  const shown = available
    .filter((p) => (activeCat === "all" ? true : p.category_id === activeCat))
    .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  const lines = Object.values(cart);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.product.price, 0);

  function add(p: Product) {
    setCart((c) => {
      const ex = c[p.id];
      return { ...c, [p.id]: { product: p, qty: (ex?.qty ?? 0) + 1 } };
    });
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

  // Деталь панелинен так сан + эскертүү менен коюу
  function setLine(p: Product, qty: number, note: string) {
    setCart((c) => {
      if (qty <= 0) {
        const rest = { ...c };
        delete rest[p.id];
        return rest;
      }
      return { ...c, [p.id]: { product: p, qty, note: note || undefined } };
    });
  }

  async function placeOrder() {
    if (lines.length === 0) return;
    setPlacing(true);
    // Заказдын тизмесин/суммасын тазалоодон мурда сактайбыз
    const placedLines = lines;
    const placedTotal = total;
    try {
      const order = await createOrder({
        tableId: table?.id ?? null,
        source: "qr",
        type: "dine_in",
        lines,
      });
      setDone({ number: order.number, lines: placedLines, total: placedTotal });
      setCart({});
      setCartOpen(false);
    } catch (e) {
      toast.error("Заказ жөнөтүлбөй калды. Кайра аракет кылыңыз.");
      console.error(e);
    } finally {
      setPlacing(false);
    }
  }

  const cats = useMemo(
    () => [{ id: "all" as const, name: "Баары" }, ...categories],
    [categories],
  );

  if (done !== null) {
    return (
      <div className="flex-1 flex flex-col items-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center text-center">
          <CheckCircle2 className="size-20 text-success" />
          <h1 className="mt-5 text-2xl font-bold">Заказ кабыл алынды!</h1>
          <p className="mt-1 text-muted-foreground">
            Буйрутма №{done.number} ашканага жөнөтүлдү
          </p>

          {/* Заказдын тизмеси */}
          <div className="mt-6 w-full rounded-2xl border border-border bg-card p-4 text-left">
            <ul className="space-y-2">
              {done.lines.map((l) => (
                <li
                  key={l.product.id}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span>
                    <span className="font-semibold text-primary">
                      {l.qty}×
                    </span>{" "}
                    {l.product.name}
                  </span>
                  <span className="whitespace-nowrap text-muted-foreground">
                    {som(l.product.price * l.qty)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
              <span className="font-medium">Жалпы</span>
              <span className="text-xl font-bold text-primary">
                {som(done.total)}
              </span>
            </div>
          </div>

          {/* Кассага баруу билдирүүсү */}
          <div className="mt-4 w-full rounded-2xl bg-primary/10 px-4 py-4">
            <p className="font-semibold text-primary">
              Буйрутмаңыз үчүн рахмат! 🙏
            </p>
            <p className="text-sm text-foreground/80 mt-0.5">
              Кассага барып төлөм жүргүзүңүз.
            </p>
          </div>

          <Button className="mt-6 w-full" onClick={() => setDone(null)}>
            Дагы заказ берүү
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-28">
      {/* Башкы */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3.5 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2">
            <UtensilsCrossed className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold leading-tight">Меню</h1>
            <p className="text-xs text-muted-foreground">
              {isDemo ? "Демо стол" : table ? table.label : "Стол"}
            </p>
          </div>
        </div>
        {/* Издөө */}
        <div className="mx-auto max-w-2xl px-4 pb-3">
          <SearchInput value={q} onChange={setQ} placeholder="Тамак издөө…" />
        </div>
        {/* Категориялар */}
        <div className="mx-auto max-w-2xl px-4 pb-3 flex gap-2 overflow-x-auto">
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCat === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:bg-muted"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </header>

      {/* Продукттар */}
      <div className="mx-auto max-w-2xl px-4 py-4">
        {isLoading && (
          <p className="text-center text-muted-foreground py-10">Жүктөлүүдө…</p>
        )}
        {!isLoading && shown.length === 0 && (
          <p className="text-center text-muted-foreground py-10">
            Бул категорияда тамак жок.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {shown.map((p) => {
            const qty = cart[p.id]?.qty ?? 0;
            return (
              <div
                key={p.id}
                className="flex flex-col rounded-xl border border-border bg-card overflow-hidden"
              >
                <button
                  onClick={() => setDetail(p)}
                  aria-label={`${p.name} — толук көрүү`}
                  className="block"
                >
                  <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <UtensilsCrossed className="size-9" />
                    )}
                  </div>
                </button>
                <div className="flex flex-1 flex-col p-2.5">
                  <button
                    onClick={() => setDetail(p)}
                    className="text-left"
                  >
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">
                      {p.name}
                    </h3>
                  </button>
                  <span className="mt-1 font-semibold text-primary">
                    {som(p.price)}
                  </span>
                  <div className="mt-auto pt-2">
                    {qty === 0 ? (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => add(p)}
                      >
                        <Plus className="size-4" /> Кошуу
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => sub(p)}
                          className="grid size-9 place-items-center rounded-lg bg-surface border border-border"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="font-semibold">{qty}</span>
                        <button
                          onClick={() => add(p)}
                          className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Себет баскычы */}
      {totalQty > 0 && !cartOpen && (
        <div className="fixed bottom-0 inset-x-0 z-30 p-4">
          <button
            onClick={() => setCartOpen(true)}
            className="mx-auto flex max-w-2xl w-full items-center justify-between rounded-xl bg-primary px-5 py-4 text-primary-foreground shadow-lg"
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
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40">
          <div className="bg-background rounded-t-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-lg">Сиздин буйрутма</h2>
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
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => sub(l.product)}
                      className="grid size-8 place-items-center rounded-lg bg-surface border border-border"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-5 text-center font-semibold">
                      {l.qty}
                    </span>
                    <button
                      onClick={() => add(l.product)}
                      className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
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
                disabled={placing}
                onClick={placeOrder}
              >
                {placing ? "Жөнөтүлүүдө…" : "Заказ берүү"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Тамактын толук көрүнүшү */}
      {detail && (
        <ProductSheet
          product={detail}
          initialQty={cart[detail.id]?.qty ?? 0}
          initialNote={cart[detail.id]?.note ?? ""}
          onClose={() => setDetail(null)}
          onConfirm={(qty, note) => {
            setLine(detail, qty, note);
            setDetail(null);
            if (qty > 0) toast.success(`${detail.name} себетке кошулду`);
          }}
        />
      )}
    </div>
  );
}
