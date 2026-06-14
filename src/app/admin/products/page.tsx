"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, UtensilsCrossed, Pencil } from "lucide-react";
import {
  getCategories,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/api";
import { som } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EditProductModal } from "@/components/EditProductModal";
import { ImageUpload } from "@/components/ImageUpload";
import { SearchInput } from "@/components/SearchInput";
import type { Product } from "@/lib/types";

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const refreshProducts = () =>
    qc.invalidateQueries({ queryKey: ["products"] });

  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pCat, setPCat] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pImage, setPImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Фильтр / издөө
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState<string | "all">("all");

  async function handleAddProduct() {
    if (!pName.trim() || !pPrice) {
      toast.error("Аты жана баасы керек");
      return;
    }
    setSaving(true);
    try {
      await addProduct({
        name: pName.trim(),
        price: Number(pPrice),
        category_id: pCat || null,
        description: pDesc.trim() || undefined,
        image_url: pImage || undefined,
      });
      setPName("");
      setPPrice("");
      setPDesc("");
      setPImage("");
      setShowForm(false);
      refreshProducts();
      toast.success("Товар кошулду");
    } catch {
      toast.error("Ката кетти");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvail(id: string, val: boolean) {
    await updateProduct(id, { is_available: val });
    refreshProducts();
  }

  const shown = products
    .filter((p) => (filterCat === "all" ? true : p.category_id === filterCat))
    .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="p-5 sm:p-8 max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">Товарлар</h1>
          <p className="text-muted-foreground">{products.length} товар</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="size-4" /> Жаңы товар
        </Button>
      </div>

      {/* Жаңы товар формасы */}
      {showForm && (
        <Card className="p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              placeholder="Товардын аты"
              value={pName}
              onChange={(e) => setPName(e.target.value)}
            />
            <Input
              placeholder="Баасы (сом)"
              inputMode="numeric"
              value={pPrice}
              onChange={(e) => setPPrice(e.target.value.replace(/[^0-9]/g, ""))}
            />
            <select
              value={pCat}
              onChange={(e) => setPCat(e.target.value)}
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Категориясыз</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Textarea
              placeholder="Сүрөттөмө (милдеттүү эмес)"
              className="sm:col-span-2 min-h-16"
              value={pDesc}
              onChange={(e) => setPDesc(e.target.value)}
            />
            <div className="sm:col-span-2">
              <ImageUpload value={pImage} onChange={setPImage} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button disabled={saving} onClick={handleAddProduct}>
              {saving ? "Сакталууда…" : "Сактоо"}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Жабуу
            </Button>
          </div>
        </Card>
      )}

      {/* Издөө жана фильтр */}
      <div className="space-y-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Товар издөө…"
          className="max-w-md"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip
            active={filterCat === "all"}
            onClick={() => setFilterCat("all")}
          >
            Баары
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              active={filterCat === c.id}
              onClick={() => setFilterCat(c.id)}
            >
              {c.name}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Тизме */}
      <div className="grid sm:grid-cols-2 gap-3">
        {shown.map((p) => (
          <Card
            key={p.id}
            className={`p-4 flex items-center gap-3 ${
              p.is_available ? "" : "opacity-60"
            }`}
          >
            <div className="size-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="size-full object-cover"
                />
              ) : (
                <UtensilsCrossed className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{p.name}</p>
              <p className="text-sm text-primary font-semibold whitespace-nowrap">
                {som(p.price)}
              </p>
            </div>
            <label className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={p.is_available}
                onChange={(e) => toggleAvail(p.id, e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              Бар
            </label>
            <div className="flex shrink-0">
              <button
                onClick={() => setEditing(p)}
                className="text-muted-foreground hover:text-primary p-1.5"
                title="Түзөтүү"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={async () => {
                  await deleteProduct(p.id);
                  refreshProducts();
                }}
                className="text-muted-foreground hover:text-danger p-1.5"
                title="Өчүрүү"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <UtensilsCrossed className="size-10 mx-auto mb-3 opacity-40" />
          <p>{q || filterCat !== "all" ? "Эч нерсе табылган жок" : "Товар жок"}</p>
        </div>
      )}

      {editing && (
        <EditProductModal
          product={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refreshProducts();
          }}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-surface text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
