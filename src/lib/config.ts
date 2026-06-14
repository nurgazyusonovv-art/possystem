// Supabase конфигурацияланганбы? Болбосо локалдык демо режим иштейт.
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith("http"));
}

export const USE_SUPABASE = isSupabaseConfigured();
