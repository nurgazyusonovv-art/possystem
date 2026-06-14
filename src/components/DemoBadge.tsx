import { IS_DEMO } from "@/lib/api";
import { Database } from "lucide-react";

// Локалдык демо режимде экенин көрсөткөн кичинекей белги
export function DemoBadge() {
  if (!IS_DEMO) return null;
  return (
    <div className="fixed bottom-3 left-3 z-50 flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/15 px-3 py-1.5 text-xs font-medium text-warning shadow-sm backdrop-blur">
      <Database className="size-3.5" />
      Локалдык демо режим
    </div>
  );
}
