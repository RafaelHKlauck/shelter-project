import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * O Realtime aplica RLS com o token do socket. No navegador a sessão vem dos cookies
 * e carrega de forma assíncrona; se o canal for aberto antes, ele assina como anônimo
 * e nenhum evento das tabelas protegidas chega. Chame antes de .subscribe().
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ensureRealtimeAuth(supabase: SupabaseClient<any, any, any>): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;
  await supabase.realtime.setAuth(token);
  return true;
}
