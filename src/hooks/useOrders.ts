"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrders, subscribeOrders } from "@/lib/api";
import type { OrderStatus } from "@/lib/constants";

// Буйрутмаларды алат жана realtime (Supabase же локалдык) аркылуу жаңылайт
export function useOrders(opts?: { statuses?: OrderStatus[]; all?: boolean }) {
  const qc = useQueryClient();
  const key = ["orders", opts?.all ? "all" : (opts?.statuses ?? "active")];

  const query = useQuery({
    queryKey: key,
    queryFn: () => getOrders(opts),
  });

  useEffect(() => {
    const unsub = subscribeOrders(() => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    });
    return unsub;
  }, [qc]);

  return query;
}
