import { supabase } from "@/lib/supabase";
import { TEXTS } from "@/constants/texts";
import { getWorkerDeviceHeaders } from "@/lib/device-session";

type ClockEventType = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";
type ClockLocation = {
  latitude?: number | null;
  longitude?: number | null;
  gps_accuracy_m?: number | null;
};
type WorkerTermsAcceptance = {
  id: string;
  version: string;
  accepted_at: string;
  app_version?: string | null;
};

function getClockErrorMessage(body: { error?: string; details?: string }, status: number) {
  if (body.details) return body.details;

  const messages: Record<string, string> = {
    METHOD_NOT_ALLOWED: "Accion no permitida.",
    SERVER_MISCONFIGURED: "El servicio de fichaje no esta disponible.",
    UNAUTHORIZED: "La sesion ha caducado. Vuelve a iniciar sesion.",
    DB_ERROR: "No se pudo consultar el estado del fichaje.",
    PROFILE_NOT_FOUND: "No se encontro el perfil del trabajador.",
    WORKER_INACTIVE: "Tu usuario esta inactivo. Contacta con administracion.",
    PASSWORD_CHANGE_REQUIRED: "Debes cambiar tu contrasena antes de fichar.",
    INVALID_EVENT_TYPE: "La accion de fichaje no es valida.",
    GPS_REQUIRED: "Debes permitir la ubicacion para registrar el fichaje.",
    INVALID_SEQUENCE: "La accion no coincide con el estado actual del fichaje.",
    INSERT_FAILED: "No se pudo guardar el fichaje.",
    SESSION_REPLACED: "Esta sesion ha sido sustituida por un inicio de sesion en otro dispositivo.",
  };

  return messages[body.error ?? ""] ?? `No se pudo registrar el fichaje (${status}).`;
}

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
  return workerDataRequest<{
    id: string;
    full_name: string;
    role: string;
    is_active: boolean;
    relationship_type: "EMPLOYEE" | "EXTERNAL";
    email: string;
    password_reset_required: boolean;
    password_reset_deadline?: string | null;
    password_changed_at?: string | null;
  }>("/profile");
}

export async function getMyTimeEvents(limit = 200) {
  return workerDataRequest<Array<Record<string, unknown>>>(`/events?limit=${encodeURIComponent(String(limit))}`);
}

async function workerDataRequest<T>(path: string) {
  const token = await getSessionToken();
  const response = await fetch(`${getFunctionsBaseUrl()}/worker-data${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...getWorkerDeviceHeaders(),
    },
  });
  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : {};
  if (!response.ok || body?.ok === false) {
    const code = body?.error || `HTTP_${response.status}`;
    const message = code === "SESSION_REPLACED"
      ? "Esta sesion ha sido sustituida por un inicio de sesion en otro dispositivo."
      : body?.details || code;
    throw new Error(message);
  }
  return body.data as T;
}

export async function sendClockEvent(event_type: ClockEventType, note?: string, location?: ClockLocation) {
  const token = await getSessionToken();
  const res = await fetch(`${getFunctionsBaseUrl()}/clock`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      ...getWorkerDeviceHeaders(),
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
    throw new Error(getClockErrorMessage(body, res.status));
  }

  return body.data;
}

export async function getWorkerTermsStatus(version: string) {
  const token = await getSessionToken();
  const url = `${getFunctionsBaseUrl()}/worker-terms?version=${encodeURIComponent(version)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...getWorkerDeviceHeaders(),
    },
  });

  const raw = await res.text();
  const body = raw ? JSON.parse(raw) : {};
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.details || body?.error || `HTTP_${res.status}`);
  }

  return body.data as { accepted: boolean; acceptance: WorkerTermsAcceptance | null };
}

export async function acceptWorkerTerms(version: string, appVersion?: string | null) {
  const token = await getSessionToken();
  const res = await fetch(`${getFunctionsBaseUrl()}/worker-terms`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      ...getWorkerDeviceHeaders(),
    },
    body: JSON.stringify({
      version,
      app_version: appVersion ?? null,
    }),
  });

  const raw = await res.text();
  const body = raw ? JSON.parse(raw) : {};
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.details || body?.error || `HTTP_${res.status}`);
  }

  return body.data as {
    accepted: boolean;
    acceptance: WorkerTermsAcceptance | null;
    already_accepted: boolean;
  };
}
