import { supabase } from "@/lib/supabase";

type ClockEventType = "CLOCK_IN" | "CLOCK_OUT";

function getFunctionsBaseUrl() {
  const custom = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  if (custom) return custom.replace(/\/$/, "");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) throw new Error("Falta VITE_SUPABASE_URL o VITE_SUPABASE_FUNCTIONS_URL");
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;
}

async function getSessionToken() {
  if (!supabase) throw new Error("Cliente Supabase no configurado");
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Sesion no disponible");
  return data.session.access_token;
}

export async function getWorkerProfile() {
  if (!supabase) throw new Error("Cliente Supabase no configurado");
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user?.id) throw new Error("Usuario no autenticado");

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,role,is_active,password_reset_required,password_reset_deadline,password_changed_at")
    .eq("id", userData.user.id)
    .single();

  if (error) throw error;
  return {
    ...data,
    email: userData.user.email ?? "",
  };
}

export async function getMyTimeEvents(limit = 20) {
  if (!supabase) throw new Error("Cliente Supabase no configurado");
  const { data, error } = await supabase
    .from("time_events")
    .select("id,event_type,happened_at,note")
    .order("happened_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function sendClockEvent(event_type: ClockEventType, note?: string) {
  const token = await getSessionToken();
  const res = await fetch(`${getFunctionsBaseUrl()}/clock`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ event_type, note: note || null }),
  });

  const raw = await res.text();
  const body = raw ? JSON.parse(raw) : {};
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.details || body?.error || `HTTP_${res.status}`);
  }

  return body.data;
}
