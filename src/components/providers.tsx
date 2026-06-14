"use client";

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
} from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { useState } from "react";
import { AuthProvider } from "./auth";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        // Маалымат жүктөөдө ката болсо унчукпай калбай, билдирүү көрсөтөбүз
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
      <AuthProvider>{children}</AuthProvider>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
