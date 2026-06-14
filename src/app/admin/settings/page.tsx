"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings, Printer, Save, Loader2 } from "lucide-react";
import { getSettings, updateSettings } from "@/lib/api";
import { setCachedSettings } from "@/lib/settings";
import { printReceipt } from "@/lib/receipt";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { Order, CafeSettings } from "@/lib/types";

export default function AdminSettingsPage() {
  const { data } = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  return (
    <div className="p-5 sm:p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Settings className="size-6 text-primary" /> Жөндөөлөр
        </h1>
        <p className="text-muted-foreground">Чекте көрсөтүлүүчү маалыматтар</p>
      </div>
      {data ? (
        <SettingsForm initial={data} />
      ) : (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function SettingsForm({ initial }: { initial: CafeSettings }) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [phone, setPhone] = useState(initial.phone);
  const [footer, setFooter] = useState(initial.footer);
  const [width, setWidth] = useState(initial.receipt_width);
  const [saving, setSaving] = useState(false);

  function current(): CafeSettings {
    return {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      footer: footer.trim(),
      receipt_width: width,
    };
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Кафенин аты керек");
      return;
    }
    setSaving(true);
    try {
      const patch = current();
      await updateSettings(patch);
      setCachedSettings(patch);
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Сакталды");
    } catch {
      toast.error("Ката кетти");
    } finally {
      setSaving(false);
    }
  }

  function testPrint() {
    setCachedSettings(current());
    const demo = {
      number: 0,
      table: { label: "Стол 1" },
      subtotal: 590,
      discount: 0,
      total: 590,
      items: [
        { id: "1", name: "Бешбармак", price: 350, qty: 1 },
        { id: "2", name: "Цезарь салаты", price: 240, qty: 1 },
      ],
    } as unknown as Order;
    printReceipt(demo, { method: "cash", received: 600, change: 10 });
  }

  return (
    <>
      <Card className="p-5 space-y-4">
        <div>
          <label className="text-sm font-medium">Кафенин аты *</label>
          <Input
            className="mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Менин Кафе"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Дареги</label>
          <Input
            className="mt-1"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Бишкек ш., Чүй пр. 100"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Телефон</label>
          <Input
            className="mt-1"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+996 700 00 00 00"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Чектин аягындагы текст</label>
          <Textarea
            className="mt-1 min-h-16"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            placeholder="Рахмат! Дагы келиңиз 🙏"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Чектин туурасы (принтер)</label>
          <div className="mt-1 flex gap-2">
            {[58, 80].map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  width === w
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {w} мм {w === 58 ? "(кичине)" : "(стандарт)"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button disabled={saving} onClick={save}>
            <Save className="size-4" /> {saving ? "Сакталууда…" : "Сактоо"}
          </Button>
          <Button variant="secondary" onClick={testPrint}>
            <Printer className="size-4" /> Тест чек басуу
          </Button>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Бул маалыматтар бардык басылган чектерде көрсөтүлөт. «Тест чек» менен
        принтериңизге туура келерин текшериңиз.
      </p>
    </>
  );
}
