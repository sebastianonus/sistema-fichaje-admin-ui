import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function getAuthStorageKey() {
  if (typeof window === "undefined") return "onus-auth-admin";
  return window.location.pathname.startsWith("/worker")
    ? "onus-auth-worker"
    : "onus-auth-admin";
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: getAuthStorageKey(),
      },
    })
    : null;

export type UserRole = "admin" | "worker";

function isTokenExpired(jwt: string) {
  const parts = jwt.split(".");
  if (parts.length !== 3) return true;
  try {
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.exp !== "number" || Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export function isStaticAdminTokenModeEnabled() {
  return (import.meta.env.VITE_ENABLE_STATIC_ADMIN_TOKEN as string | undefined) === "true";
}

export function getStaticAdminToken() {
  if (!isStaticAdminTokenModeEnabled()) return null;
  const token = (import.meta.env.VITE_ADMIN_BEARER_TOKEN as string | undefined)?.trim();
  if (!token) return null;
  return isTokenExpired(token) ? null : token;
}

export function hasStaticAdminToken() {
  return !!getStaticAdminToken();
}

export async function getSessionAccessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signInAdmin(email: string, password: string) {
  return signInWithRole(email, password, "admin");
}

export async function signInWithEmailPassword(email: string, password: string) {
  if (!supabase) throw new Error("Cliente Supabase no configurado");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentProfile() {
  if (!supabase) throw new Error("Cliente Supabase no configurado");

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user?.id) throw new Error("Usuario no autenticado");

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id,role,is_active,full_name")
    .eq("id", userData.user.id)
    .single();

  if (profErr) throw profErr;
  return {
    ...profile,
    email: userData.user.email ?? "",
  };
}

export async function ensureRole(role: UserRole) {
  const profile = await getCurrentProfile();
  if (profile.role !== role) {
    await signOutAdmin();
    throw new Error(`Rol no permitido para este portal (${role})`);
  }
  return profile;
}

export async function signInWithRole(email: string, password: string, role: UserRole) {
  const session = await signInWithEmailPassword(email, password);
  await ensureRole(role);
  return session;
}
