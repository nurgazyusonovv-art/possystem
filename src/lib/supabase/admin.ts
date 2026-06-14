import { createClient } from "@supabase/supabase-js";

// Сервер тараптагы admin кардар (service role — RLS'ти айланат).
// ЭЧ КАЧАН браузерге жүктөлбөшү керек — бул серверде гана колдонулат.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
