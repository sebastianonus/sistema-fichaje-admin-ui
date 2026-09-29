import { useEffect, useMemo, useState } from 'react';
import { Check, History, MonitorSmartphone, RefreshCcw, Search, ShieldAlert } from 'lucide-react';
import { acknowledgeSecurityAlert, getAdminSessions } from '@/lib/api';
import type { AdminSessionsData, WorkerSecurityAlert } from '@/lib/types';

type View = 'devices' | 'history';

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function deviceName(snapshot: Record<string, unknown> | null | undefined) {
  return String(snapshot?.device_label || 'Dispositivo sin identificar');
}

const auditLabels = {
  INITIAL_LOGIN: 'Dispositivo autorizado',
  LOGIN: 'Inicio de sesión',
  DEVICE_CHANGED: 'Dispositivo sustituido',
} as const;

export function Sesiones() {
  const [data, setData] = useState<AdminSessionsData>({ sessions: [], alerts: [], audit: [] });
  const [view, setView] = useState<View>('devices');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await getAdminSessions());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las sesiones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAlerts = useMemo(
    () => data.alerts.filter((alert) => alert.status === 'OPEN'),
    [data.alerts],
  );
  const term = search.trim().toLowerCase();
  const sessions = data.sessions.filter((session) => {
    if (!term) return true;
    return [session.worker?.full_name, session.worker?.email, session.device_label, session.ip]
      .some((value) => String(value ?? '').toLowerCase().includes(term));
  });
  const audit = data.audit.filter((entry) => {
    if (!term) return true;
    return [entry.worker?.full_name, entry.worker?.email, deviceName(entry.current_device), entry.ip]
      .some((value) => String(value ?? '').toLowerCase().includes(term));
  });

  const acknowledge = async (alert: WorkerSecurityAlert) => {
    try {
      setSavingId(alert.id);
      setError(null);
      await acknowledgeSecurityAlert(alert.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reconocer la alerta.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="px-4 py-5 md:px-6 md:py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Sesiones y dispositivos</h1>
          <p className="mt-1 text-[#666666]">Control de accesos de trabajadores y colaboradores externos.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[#dbe3eb] px-3 py-2 text-sm font-semibold text-[#000935] hover:bg-[#f5f7fa] disabled:opacity-50">
          <RefreshCcw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {openAlerts.length > 0 && (
        <section className="mb-5 border-l-4 border-[#dc2626] bg-[#fff7f7] px-4 py-3">
          <div className="mb-3 flex items-center gap-2 text-[#991b1b]">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="text-base font-bold">{openAlerts.length} {openAlerts.length === 1 ? 'cambio de dispositivo pendiente' : 'cambios de dispositivo pendientes'}</h2>
          </div>
          <div className="divide-y divide-[#fecaca]">
            {openAlerts.map((alert) => (
              <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 text-sm">
                  <div className="font-semibold text-[#000935]">{alert.worker?.full_name || 'Usuario desconocido'}</div>
                  <div className="text-[#666666]">
                    {deviceName(alert.previous_device)} a {deviceName(alert.current_device)} - {formatDate(alert.detected_at)}
                  </div>
                </div>
                <button type="button" onClick={() => acknowledge(alert)} disabled={savingId === alert.id} className="inline-flex items-center gap-2 rounded-lg bg-[#000935] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  <Check className="h-4 w-4" /> {savingId === alert.id ? 'Guardando...' : 'Marcar revisada'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-grid grid-cols-2 rounded-lg border border-[#dbe3eb] bg-white p-1" role="tablist" aria-label="Vista de sesiones">
          <button type="button" role="tab" aria-selected={view === 'devices'} onClick={() => setView('devices')} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${view === 'devices' ? 'bg-[#000935] text-white' : 'text-[#475569] hover:bg-[#f5f7fa]'}`}>
            <MonitorSmartphone className="h-4 w-4" /> Sesiones activas
          </button>
          <button type="button" role="tab" aria-selected={view === 'history'} onClick={() => setView('history')} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${view === 'history' ? 'bg-[#000935] text-white' : 'text-[#475569] hover:bg-[#f5f7fa]'}`}>
            <History className="h-4 w-4" /> Historial
          </button>
        </div>
        <label className="relative block w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuario o dispositivo" className="w-full rounded-lg border border-[#dbe3eb] py-2 pl-9 pr-3 text-sm" />
        </label>
      </div>

      {error && <p className="mb-4 text-sm text-[#dc2626]">{error}</p>}
      {loading ? <p className="text-sm text-[#666666]">Cargando...</p> : (
        <div className="overflow-x-auto rounded-lg border border-[#dbe3eb]">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-[#f8fafc] text-xs uppercase text-[#64748b]">
              {view === 'devices' ? (
                <tr><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Dispositivo autorizado</th><th className="px-4 py-3">Última IP</th><th className="px-4 py-3">Autorizado desde</th><th className="px-4 py-3">Última verificación</th></tr>
              ) : (
                <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Acción</th><th className="px-4 py-3">Dispositivo</th><th className="px-4 py-3">IP</th></tr>
              )}
            </thead>
            <tbody className="divide-y divide-[#e5e7eb] bg-white">
              {view === 'devices' ? sessions.map((session) => (
                <tr key={session.user_id}>
                  <td className="px-4 py-3"><div className="font-semibold text-[#000935]">{session.worker?.full_name || '-'}</div><div className="text-xs text-[#64748b]">{session.worker?.email || '-'}</div></td>
                  <td className="px-4 py-3">{session.device_label}</td>
                  <td className="px-4 py-3">{session.ip || '-'}</td><td className="px-4 py-3">{formatDate(session.first_seen_at)}</td><td className="px-4 py-3">{formatDate(session.last_seen_at)}</td>
                </tr>
              )) : audit.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3">{formatDate(entry.created_at)}</td>
                  <td className="px-4 py-3"><div className="font-semibold text-[#000935]">{entry.worker?.full_name || '-'}</div><div className="text-xs text-[#64748b]">{entry.worker?.email || '-'}</div></td>
                  <td className="px-4 py-3">{auditLabels[entry.action]}</td><td className="px-4 py-3">{deviceName(entry.current_device)}</td><td className="px-4 py-3">{entry.ip || '-'}</td>
                </tr>
              ))}
              {((view === 'devices' && sessions.length === 0) || (view === 'history' && audit.length === 0)) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748b]">No hay datos para mostrar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
