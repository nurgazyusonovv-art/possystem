"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { Plus, Trash2, QrCode, Download, ExternalLink } from "lucide-react";
import { getTables, addTable, deleteTable } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/SearchInput";
import Link from "next/link";

function siteUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "";
}

export default function AdminTablesPage() {
  const qc = useQueryClient();
  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: getTables,
  });

  const [label, setLabel] = useState("");
  const [q, setQ] = useState("");
  const shown = tables.filter((t) =>
    t.label.toLowerCase().includes(q.trim().toLowerCase()),
  );
  async function handleAdd() {
    const name = label.trim() || `Стол ${tables.length + 1}`;
    try {
      await addTable(name);
      setLabel("");
      qc.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Стол кошулду");
    } catch {
      toast.error("Ката кетти");
    }
  }

  function downloadQr(token: string, label: string) {
    const canvas = document.getElementById(
      `qr-${token}`,
    ) as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `${label}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  return (
    <div className="p-5 sm:p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Столдор жана QR коддор</h1>
        <p className="text-muted-foreground">
          Ар бир стол үчүн QR код жаратылат. Кардар аны сканерлеп меню көрөт.
        </p>
      </div>

      <Card className="p-5">
        <div className="flex gap-2 max-w-md">
          <Input
            placeholder="Стол аты (мис. Стол 5 же ВИП)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
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
        placeholder="Стол издөө…"
        className="max-w-md"
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((t) => {
          const url = `${siteUrl()}/menu/${t.token}`;
          return (
            <Card key={t.id} className="p-5 flex flex-col items-center text-center">
              <div className="flex w-full items-center justify-between mb-3">
                <span className="font-semibold">{t.label}</span>
                <button
                  onClick={async () => {
                    await deleteTable(t.id);
                    qc.invalidateQueries({ queryKey: ["tables"] });
                  }}
                  className="text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="rounded-xl bg-white p-3">
                <QRCodeCanvas
                  id={`qr-${t.token}`}
                  value={url}
                  size={160}
                  level="M"
                  includeMargin
                />
              </div>
              <div className="mt-4 flex gap-2 w-full">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => downloadQr(t.token, t.label)}
                >
                  <Download className="size-4" /> Жүктөө
                </Button>
                <Link href={`/menu/${t.token}`} target="_blank" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="size-4" /> Ачуу
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {shown.length === 0 && (
        <div className="text-center text-muted-foreground py-16">
          <QrCode className="size-12 mx-auto mb-3 opacity-40" />
          <p>{q ? "Эч нерсе табылган жок" : "Азырынча стол жок. Жогорудан кошуңуз."}</p>
        </div>
      )}
    </div>
  );
}
