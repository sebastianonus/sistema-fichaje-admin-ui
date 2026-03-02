import { supabase } from "@/lib/supabase";
import { TEXTS } from "@/constants/texts";

type ClockEventType = "CLOCK_IN" | "CLOCK_OUT";
type ClockLocation = {
  latitude?: number | null;
  longitude?: number | null;
  gps_accuracy_m?: number | null;
};

function getFunctionsBaseUrl() {
  const custom = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  if (custom) return custom.replace(/\/$/, "");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) throw new Error(TEXTS.api.missingSupabaseUrl);
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;
}

async function getSessionToken() {
  if (!supabase) throw new Error(TEXTS.api.missingSupabaseClient);
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error(TEXTS.api.missingSession);
  return data.session.access_token;
}

export async function getWorkerProfile() {
  if (!supabase) throw new Error(TEXTS.api.missingSupabaseClient);
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user?.id) throw new Error(TEXTS.api.unauthenticatedUser);

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
  if (!supabase) throw new Error(TEXTS.api.missingSupabaseClient);
  const { data, error } = await supabase
    .from("time_events")
    .select("id,event_type,happened_at,note,related_event_id,corrected_event_type,corrected_happened_at")
    .order("happened_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function sendClockEvent(event_type: ClockEventType, note?: string, location?: ClockLocation) {
  const token = await getSessionToken();
  const res = await fetch(`${getFunctionsBaseUrl()}/clock`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      event_type,
      note: note || null,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      gps_accuracy_m: location?.gps_accuracy_m ?? null,
    }),
  });

  const raw = await res.text();
  const body = raw ? JSON.parse(raw) : {};
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.details || body?.error || `HTTP_${res.status}`);
  }

  return body.data;
}
