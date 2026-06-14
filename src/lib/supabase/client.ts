"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Браузер кардары. Auth сессиясы sessionStorage'та — ар таб өз ролу менен
// иштейт (кассир бир табда, ашкана башка табда бир убакта).
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage:
          typeof window !== "undefined" ? window.sessionStorage : undefined,
        storageKey: "qrmenu-auth",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    },
  );
}

let _client: ReturnType<typeof createClient> | null = null;
export function supabase() {
  if (!_client) _client = createClient();
  return _client;
}
