const DEVICE_ID_KEY = "onus-worker-device-id-v1";

function getFunctionsBaseUrl() {
  const custom = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  if (custom) return custom.replace(/\/$/, "");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) throw new Error("No se ha configurado el servicio de sesiones.");
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;
}

function createDeviceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function getWorkerDeviceId() {
  if (typeof window === "undefined") return "server-device-unavailable";
  const existing = window.localStorage.getItem(DEVICE_ID_KEY)?.trim();
  if (existing) return existing;
  const created = createDeviceId();
  window.localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export function describeCurrentDevice() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Microsoft Edge"
    : /CriOS|Chrome\//.test(ua) ? "Google Chrome"
    : /FxiOS|Firefox\//.test(ua) ? "Mozilla Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "Navegador desconocido";
  const platform = /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows"
    : /Macintosh|Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : "Plataforma desconocida";
  return { browser, platform, label: `${browser} en ${platform}` };
}

export function getWorkerDeviceHeaders() {
  const device = describeCurrentDevice();
  return {
    "x-device-id": getWorkerDeviceId(),
    "x-device-label": device.label,
    "x-device-browser": device.browser,
    "x-device-platform": device.platform,
  };
}

export class WorkerSessionError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "WorkerSessionError";
    this.code = code;
  }
}

function sessionErrorMessage(code: string) {
  if (code === "SESSION_REPLACED") {
    return "Esta sesion ha sido sustituida por un inicio de sesion en otro dispositivo. Vuelve a identificarte si este es tu dispositivo autorizado.";
  }
  if (code === "WORKER_INACTIVE") return "Tu usuario esta inactivo. Contacta con administracion.";
  return "No se pudo validar este dispositivo. Intentalo de nuevo.";
}

async function requestWorkerSession(accessToken: string, method: "GET" | "POST") {
  const response = await fetch(`${getFunctionsBaseUrl()}/worker-session`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...getWorkerDeviceHeaders(),
    },
  });
  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : {};
  if (!response.ok || body?.ok === false) {
    const code = body?.error || `HTTP_${response.status}`;
    throw new WorkerSessionError(code, sessionErrorMessage(code));
  }
  return body.data as {
    valid: true;
    device_changed: boolean;
    first_registration: boolean;
    device_label: string;
  };
}

export function registerWorkerDeviceSession(accessToken: string) {
  return requestWorkerSession(accessToken, "POST");
}

export function validateWorkerDeviceSession(accessToken: string) {
  return requestWorkerSession(accessToken, "GET");
}

export function isSessionReplacedError(error: unknown) {
  return error instanceof WorkerSessionError && error.code === "SESSION_REPLACED";
}
