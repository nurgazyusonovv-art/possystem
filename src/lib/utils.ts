import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Сом форматы: 1 250 сом */
export function som(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} сом`;
}

/** Убакыт: 14:32 */
export function clock(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

/** Буйрутма эскирдиби (мин. мурун) — кухняда белгилөө үчүн */
export function isOlderThan(iso: string | Date, minutes: number): boolean {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return (Date.now() - d.getTime()) / 60000 > minutes;
}

/** "5 мүн мурун" сыяктуу салыштырмалуу убакыт */
export function ago(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "азыр";
  if (diff < 3600) return `${Math.floor(diff / 60)} мүн`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} саат`;
  return `${Math.floor(diff / 86400)} күн`;
}
