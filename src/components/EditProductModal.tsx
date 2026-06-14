"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { updateProduct } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import type { Product, Category } from "@/lib/types";

export function EditProductModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [categoryId, setCategoryId] = useState(product.category_id ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [imageUrl, setImageUrl] = useState(product.image_url ?? "");
  const [available, setAvailable] = useState(product.is_available);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim() || !price) {
      toast.error("Ат жана баа керек");
      return;
    }
    setBusy(true);
    try {
      await updateProduct(product.id, {
        name: name.trim(),
        price: Number(price),
        category_id: categoryId || null,
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        is_available: available,
      });
      toast.success("Сакталды");
      onSaved();
    } catch {
      toast.error("Ката кетти");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background">
          <h2 className="text-lg font-semibold">Тамакты түзөтүү</h2>
          <button onClick={onClose}>
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Сүрөт */}
          <div>
            <label className="text-sm font-medium">Сүрөт</label>
            <div className="mt-1">
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Аталышы</label>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Баасы (сом)</label>
              <Input
                className="mt-1"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Категория</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Категориясыз</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Сүрөттөмө</label>
            <Textarea
              className="mt-1 min-h-16"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            <span className="text-sm">Менюда бар (сатууда)</span>
          </label>
        </div>

        <div className="p-5 border-t border-border flex gap-2 sticky bottom-0 bg-background">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Жокко чыгаруу
          </Button>
          <Button className="flex-1" disabled={busy} onClick={save}>
            {busy ? "Сакталууда…" : "Сактоо"}
          </Button>
        </div>
      </div>
    </div>
  );
}
