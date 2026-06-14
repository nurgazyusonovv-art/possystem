"use client";

import { useRef, useState } from "react";
import { Upload, X, UtensilsCrossed, Loader2 } from "lucide-react";
import { uploadImage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Сүрөт файлын тандаңыз");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch {
      toast.error("Сүрөт жүктөлбөдү");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-3">
      <div className="relative size-24 shrink-0 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
        {busy ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        ) : value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="preview" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"
            >
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <UtensilsCrossed className="size-7 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 space-y-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 h-11 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Upload className="size-4" />
          Сүрөт жүктөө
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Input
          placeholder="же сүрөт URL"
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-xs"
        />
      </div>
    </div>
  );
}
