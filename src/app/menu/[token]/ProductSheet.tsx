"use client";

import { useState } from "react";
import { X, Minus, Plus, UtensilsCrossed, ShoppingBag } from "lucide-react";
import { som } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { Product } from "@/lib/types";

export function ProductSheet({
  product,
  initialQty,
  initialNote,
  onClose,
  onConfirm,
}: {
  product: Product;
  initialQty: number;
  initialNote: string;
  onClose: () => void;
  onConfirm: (qty: number, note: string) => void;
}) {
  // Эгер себетте бар болсо ошол сан, болбосо 1
  const [qty, setQty] = useState(initialQty > 0 ? initialQty : 1);
  const [note, setNote] = useState(initialNote);
  const inCart = initialQty > 0;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-t-2xl max-h-[92vh] flex flex-col animate-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Сүрөт */}
        <div className="relative">
          <div className="aspect-[16/10] w-full bg-muted overflow-hidden rounded-t-2xl flex items-center justify-center">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.name}
                className="size-full object-cover"
              />
            ) : (
              <UtensilsCrossed className="size-14 text-muted-foreground" />
            )}
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-background/80 backdrop-blur text-foreground shadow"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Маалымат */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold leading-tight">{product.name}</h2>
            <span className="text-xl font-bold text-primary whitespace-nowrap">
              {som(product.price)}
            </span>
          </div>
          {product.description && (
            <p className="mt-2 text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          )}

          <div className="mt-5">
            <label className="text-sm font-medium">Эскертүү (милдеттүү эмес)</label>
            <Textarea
              className="mt-1.5 min-h-16"
              placeholder="Мисалы: ачуу болбосун, пияз кошпоңуз…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {/* Төмөнкү панель */}
        <div className="p-4 border-t border-border flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-border p-1.5">
            <button
              onClick={() => setQty((q) => Math.max(q - 1, 0))}
              className="grid size-9 place-items-center rounded-lg bg-surface"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center font-semibold text-lg">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <Button
            size="lg"
            className="flex-1"
            onClick={() => onConfirm(qty, note.trim())}
          >
            <ShoppingBag className="size-5" />
            {qty === 0 && inCart
              ? "Себеттен алып салуу"
              : `Кошуу · ${som(product.price * qty)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
