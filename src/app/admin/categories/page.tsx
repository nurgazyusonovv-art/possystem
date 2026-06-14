"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Tag } from "lucide-react";
import {
  getCategories,
  getProducts,
  addCategory,
  deleteCategory,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/SearchInput";

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const [newCat, setNewCat] = useState("");
  const [q, setQ] = useState("");

  async function handleAdd() {
    if (!newCat.trim()) return;
    try {
      await addCategory(newCat.trim(), categories.length);
      setNewCat("");
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Категория кошулду");
    } catch {
      toast.error("Ката кетти");
    }
  }

  async function handleDelete(id: string) {
    await deleteCategory(id);
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  const countFor = (id: string) =>
    products.filter((p) => p.category_id === id).length;

  const shown = categories.filter((c) =>
    c.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="p-5 sm:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Категориялар</h1>
        <p className="text-muted-foreground">Меню категорияларын башкаруу</p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Plus className="size-5 text-primary" /> Жаңы категория
        </h2>
        <div className="flex gap-2 max-w-md">
          <Input
            placeholder="Мис. Ысык тамактар"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd}>
            <Plus className="size-4" /> Кошуу
          </Button>
        </div>
      </Card>

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Категория издөө…"
        className="max-w-md"
      />

      <div className="grid sm:grid-cols-2 gap-3">
        {shown.map((c) => (
          <Card key={c.id} className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Tag className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{c.name}</p>
              <Badge className="bg-surface text-muted-foreground border-border mt-0.5">
                {countFor(c.id)} товар
              </Badge>
            </div>
            <button
              onClick={() => handleDelete(c.id)}
              className="text-muted-foreground hover:text-danger p-1"
              title="Өчүрүү"
            >
              <Trash2 className="size-4" />
            </button>
          </Card>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <Tag className="size-10 mx-auto mb-3 opacity-40" />
          <p>{q ? "Эч нерсе табылган жок" : "Категория жок"}</p>
        </div>
      )}
    </div>
  );
}
