"use client";

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  useQuery,
} from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { useState, useEffect } from "react";
import { AuthProvider } from "./auth";
import { getSettings } from "@/lib/api";
import { setCachedSettings } from "@/lib/settings";

// Чек жөндөөлөрүн базадан алып, кэшке салат (чек басууда колдонулат)
function SettingsLoader() {
  const { data } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  useEffect(() => {
    if (data) setCachedSettings(data);
  }, [data]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            const msg =
              error instanceof Error ? error.message : "Маалымат жүктөлбөдү";
            toast.error(msg);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <SettingsLoader />
      <AuthProvider>{children}</AuthProvider>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
