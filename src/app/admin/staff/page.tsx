"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Users, ShieldCheck } from "lucide-react";
import { getStaff, addStaff, deleteStaff } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/constants";
import type { Role } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/SearchInput";

const ROLES: Role[] = ["admin", "cashier", "waiter", "kitchen"];

const ROLE_COLOR: Record<Role, string> = {
  admin: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  cashier: "bg-primary/15 text-primary border-primary/30",
  waiter: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  kitchen: "bg-amber-500/15 text-amber-600 border-amber-500/30",
};

export default function AdminStaffPage() {
  const qc = useQueryClient();
  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: getStaff,
  });

  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("cashier");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const shown = staff.filter((s) =>
    s.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  async function handleAdd() {
    if (!name.trim()) return toast.error("Ат керек");
    if (pin.length < 4) return toast.error("PIN 4 сандан болсун");
    if (staff.some((s) => s.pin === pin))
      return toast.error("Бул PIN мурунтан колдонулган");
    setBusy(true);
    try {
      await addStaff({ name: name.trim(), role, pin });
      setName("");
      setPin("");
      qc.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Кызматкер кошулду");
    } catch {
      toast.error("Ката кетти");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-5 sm:p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Кызматкерлер</h1>
        <p className="text-muted-foreground">
          PIN код менен кирүү. Роль боюнча экрандар чектелет.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Plus className="size-5 text-primary" /> Жаңы кызматкер
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Input
            placeholder="Аты-жөнү"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <Input
            placeholder="PIN (4 сан)"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>
        <Button className="mt-3" disabled={busy} onClick={handleAdd}>
          Кошуу
        </Button>
      </Card>

      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Кызматкер издөө…"
        className="max-w-md"
      />

      <div className="grid sm:grid-cols-2 gap-3">
        {shown.map((s) => (
          <Card key={s.id} className="p-4 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-full bg-primary/15 text-primary font-semibold">
              {s.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate flex items-center gap-1.5">
                {s.name}
                {s.role === "admin" && (
                  <ShieldCheck className="size-4 text-indigo-500" />
                )}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={ROLE_COLOR[s.role]}>{ROLE_LABEL[s.role]}</Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {s.pin ? `PIN: ${s.pin}` : "PIN жашырылган"}
                </span>
              </div>
            </div>
            <button
              onClick={async () => {
                await deleteStaff(s.id);
                qc.invalidateQueries({ queryKey: ["staff"] });
              }}
              className="text-muted-foreground hover:text-danger p-1"
            >
              <Trash2 className="size-4" />
            </button>
          </Card>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="text-center text-muted-foreground py-16">
          <Users className="size-12 mx-auto mb-3 opacity-40" />
          <p>{q ? "Эч нерсе табылган жок" : "Кызматкер жок"}</p>
        </div>
      )}
    </div>
  );
}
