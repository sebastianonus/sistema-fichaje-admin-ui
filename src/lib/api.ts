import { getSessionAccessToken } from "@/lib/supabase";
import type { DashboardMetrics, ExportRecord, WorkerDetail, WorkerSummary } from "@/lib/types";

type ApiEnvelope<T> = { ok: boolean; data: T; error?: string; details?: string };

function toUtcDateStart(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function toUtcDateEnd(date: string) {
  return new Date(`${date}T23:59:59.999Z`).toISOString();
}

function getFunctionsBaseUrl() {
  const custom = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  if (custom) return custom.replace(/\/$/, "");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) throw new Error("Falta VITE_SUPABASE_URL o VITE_SUPABASE_FUNCTIONS_URL");
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;
}

async function getBearerToken() {
  const sessionToken = await getSessionAccessToken();
  if (sessionToken) return sessionToken;

  const envToken = (import.meta.env.VITE_ADMIN_BEARER_TOKEN as string | undefined)?.trim();
  if (!envToken) return null;

  // Avoid using expired static tokens from .env (common in local dev).
  const parts = envToken.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1]));
      if (typeof payload.exp === "number" && Date.now() >= payload.exp * 1000) {
        return null;
      }
    } catch {
      return null;
    }
  }

  return envToken;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getBearerToken();
  if (!token) {
    throw new Error("No hay token de admin. Define VITE_ADMIN_BEARER_TOKEN o inicia sesión en Supabase.");
  }

  const res = await fetch(`${getFunctionsBaseUrl()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const raw = await res.text();
  const body = raw ? JSON.parse(raw) : {};
  if (!res.ok || body?.ok === false) {
    throw new Error(body?.details || body?.error || `HTTP_${res.status}`);
  }

  return body as T;
}

export async function getDashboardMetrics() {
  const res = await request<ApiEnvelope<DashboardMetrics>>("/admin-dashboard");
  return res.data;
}

export async function getWorkers(filters: {
  is_active?: boolean;
  search?: string;
  created_from?: string;
  created_to?: string;
  clocked_in?: boolean;
}) {
  const qp = new URLSearchParams();
  if (filters.search) qp.set("search", filters.search);
  if (filters.created_from) qp.set("created_from", toUtcDateStart(filters.created_from));
  if (filters.created_to) qp.set("created_to", toUtcDateEnd(filters.created_to));
  if (typeof filters.is_active === "boolean") qp.set("is_active", String(filters.is_active));
  if (typeof filters.clocked_in === "boolean") qp.set("clocked_in", String(filters.clocked_in));

  const qs = qp.toString();
  const res = await request<ApiEnvelope<WorkerSummary[]>>(`/admin-workers${qs ? `?${qs}` : ""}`);
  return res.data;
}

export async function getWorker(workerId: string) {
  const res = await request<ApiEnvelope<WorkerDetail>>(`/admin-workers/${workerId}`);
  return res.data;
}

export async function createWorker(worker: {
  full_name: string;
  email: string;
  password: string;
}) {
  const res = await request<ApiEnvelope<{ worker_id: string; temp_password: string | null }>>("/admin-users", {
    method: "POST",
    body: JSON.stringify(worker),
  });
  return res.data;
}

export async function updateWorker(workerId: string, updates: {
  full_name?: string;
  email?: string;
}) {
  const res = await request<ApiEnvelope<{ worker_id: string }>>(`/admin-workers/${workerId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return res.data;
}

export async function deactivateWorker(workerId: string) {
  const res = await request<ApiEnvelope<{ worker_id: string; is_active: false }>>(`/admin-workers/${workerId}/deactivate`, {
    method: "PATCH",
  });
  return res.data;
}

export async function changeWorkerPassword(workerId: string, password: string) {
  const res = await request<ApiEnvelope<{ worker_id: string }>>(`/admin-workers/${workerId}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  return res.data;
}

export async function getExports() {
  const res = await request<ApiEnvelope<ExportRecord[]>>("/exports?limit=200");
  return res.data;
}

export async function createExport(payload: {
  from: string;
  to: string;
  worker_id?: string;
}) {
  const normalizedPayload = {
    ...payload,
    from: toUtcDateStart(payload.from),
    to: toUtcDateEnd(payload.to),
  };

  const res = await request<ApiEnvelope<{
    export_id: string;
    status: "READY";
    row_count: number;
    sha256_hex: string;
    storage_path: string;
    signed_url: string;
    expires_at: string;
  }>>("/exports", {
    method: "POST",
    body: JSON.stringify(normalizedPayload),
  });
  return res.data;
}

export async function getExportSignedUrl(exportId: string) {
  const res = await request<ApiEnvelope<{
    export_id: string;
    signed_url: string;
    expires_at: string;
  }>>(`/exports/${exportId}/signed-url`, {
    method: "POST",
  });
  return res.data;
}

export async function revokeExport(exportId: string) {
  const res = await request<ApiEnvelope<{ export_id: string; status: "DELETED" }>>(`/exports/${exportId}`, {
    method: "DELETE",
  });
  return res.data;
}
