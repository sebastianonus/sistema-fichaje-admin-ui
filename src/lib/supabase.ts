import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function hasStaticAdminToken() {
  const token = (import.meta.env.VITE_ADMIN_BEARER_TOKEN as string | undefined)?.trim();
  return !!token;
}

export async function getSessionAccessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signInAdmin(email: string, password: string) {
  if (!supabase) throw new Error("Cliente Supabase no configurado");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
