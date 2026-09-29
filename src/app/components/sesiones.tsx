import { useEffect, useMemo, useState } from 'react';
import { Check, History, RefreshCcw, Search, ShieldAlert } from 'lucide-react';
import { acknowledgeSecurityAlert, getAdminSessions } from '@/lib/api';
import type { AdminSessionsData, WorkerSecurityAlert } from '@/lib/types';

type View = 'alerts' | 'history';

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

function deviceIp(snapshot: Record<string, unknown> | null | undefined) {
  return String(snapshot?.ip || 'IP no registrada');
}

const auditLabels = {
  INITIAL_LOGIN: 'Primer acceso verificado',
  LOGIN: 'Inicio de sesión verificado',
  LOGOUT: 'Cierre de sesión verificado',
  DEVICE_CHANGED: 'Cambio de dispositivo detectado',
} as const;

export function Sesiones() {
  const [data, setData] = useState<AdminSessionsData>({ sessions: [], alerts: [], audit: [] });
  const [view, setView] = useState<View>('alerts');
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
  const alerts = openAlerts.filter((alert) => {
    if (!term) return true;
    return [
      alert.worker?.full_name,
      alert.worker?.email,
      deviceName(alert.previous_device),
      deviceIp(alert.previous_device),
      deviceName(alert.current_device),
      deviceIp(alert.current_device),
    ]
      .some((value) => String(value ?? '').toLowerCase().includes(term));
  });
  const audit = data.audit.filter((entry) => {
    if (!term) return true;
    return [entry.worker?.full_name, entry.worker?.email, deviceName(entry.current_device), deviceIp(entry.current_device), entry.ip]
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
    <div className="min-w-0 max-w-full px-4 py-5 md:px-6 md:py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Seguridad de accesos</h1>
          <p className="mt-1 text-[#666666]">Cambios de dispositivo que requieren revisión.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[#dbe3eb] px-3 py-2 text-sm font-semibold text-[#000935] hover:bg-[#f5f7fa] disabled:opacity-50">
          <RefreshCcw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-grid grid-cols-2 rounded-lg border border-[#dbe3eb] bg-white p-1" role="tablist" aria-label="Vista de sesiones">
          <button type="button" role="tab" aria-selected={view === 'alerts'} onClick={() => setView('alerts')} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${view === 'alerts' ? 'bg-[#000935] text-white' : 'text-[#475569] hover:bg-[#f5f7fa]'}`}>
            <ShieldAlert className="h-4 w-4" /> Por revisar{openAlerts.length > 0 ? ` (${openAlerts.length})` : ''}
          </button>
          <button type="button" role="tab" aria-selected={view === 'history'} onClick={() => setView('history')} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${view === 'history' ? 'bg-[#000935] text-white' : 'text-[#475569] hover:bg-[#f5f7fa]'}`}>
            <History className="h-4 w-4" /> Historial
          </button>
        </div>
        <label className="relative block w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuario, dispositivo o IP" className="w-full rounded-lg border border-[#dbe3eb] py-2 pl-9 pr-3 text-sm" />
        </label>
      </div>

      {error && <p className="mb-4 text-sm text-[#dc2626]">{error}</p>}
      {loading ? <p className="text-sm text-[#666666]">Cargando...</p> : (
        view === 'alerts' && alerts.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-[#dbe3eb] bg-white px-4 text-center">
            <Check className="h-6 w-6 text-[#008f7a]" />
            <p className="font-semibold text-[#000935]">No hay accesos sospechosos pendientes.</p>
          </div>
        ) : (
          <>
            {view === 'alerts' && (
              <div className="space-y-3 md:hidden">
                {alerts.map((alert) => (
                  <article key={alert.id} className="rounded-lg border border-[#dbe3eb] bg-white p-4">
                    <div className="font-semibold text-[#000935]">{alert.worker?.full_name || 'Usuario desconocido'}</div>
                    <div className="mb-4 break-all text-xs text-[#64748b]">{alert.worker?.email || '-'}</div>
                    <dl className="space-y-3 text-sm">
                      <div><dt className="text-xs font-bold uppercase text-[#64748b]">Acceso original</dt><dd className="mt-1">{deviceName(alert.previous_device)}</dd><dd className="text-xs font-semibold text-[#64748b]">IP {deviceIp(alert.previous_device)}</dd></div>
                      <div><dt className="text-xs font-bold uppercase text-[#991b1b]">Nuevo acceso</dt><dd className="mt-1 font-semibold text-[#991b1b]">{deviceName(alert.current_device)}</dd><dd className="text-xs font-semibold text-[#991b1b]">IP {deviceIp(alert.current_device)}</dd></div>
                      <div><dt className="text-xs font-bold uppercase text-[#64748b]">Detectado</dt><dd className="mt-1">{formatDate(alert.detected_at)}</dd></div>
                    </dl>
                    <button type="button" onClick={() => acknowledge(alert)} disabled={savingId === alert.id} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#000935] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" /> {savingId === alert.id ? 'Guardando...' : 'Marcar revisado'}</button>
                  </article>
                ))}
              </div>
            )}
          <div className={`${view === 'alerts' ? 'hidden md:block' : ''} w-[calc(100vw-2rem)] overflow-x-auto rounded-lg border border-[#dbe3eb] md:w-full`}>
            <table className="w-full min-w-[980px] table-fixed text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase text-[#64748b]">
                {view === 'alerts' ? (
                  <tr><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Acceso original</th><th className="px-4 py-3">Nuevo acceso</th><th className="px-4 py-3">Detectado</th><th className="px-4 py-3"><span className="sr-only">Acciones</span></th></tr>
                ) : (
                  <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Evento</th><th className="px-4 py-3">Dispositivo</th><th className="px-4 py-3">IP</th></tr>
                )}
              </thead>
              <tbody className="divide-y divide-[#e5e7eb] bg-white">
                {view === 'alerts' ? alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="px-4 py-3"><div className="font-semibold text-[#000935]">{alert.worker?.full_name || 'Usuario desconocido'}</div><div className="text-xs text-[#64748b]">{alert.worker?.email || '-'}</div></td>
                    <td className="px-4 py-3"><div>{deviceName(alert.previous_device)}</div><div className="mt-1 text-xs font-semibold text-[#64748b]">IP {deviceIp(alert.previous_device)}</div></td>
                    <td className="px-4 py-3"><div className="font-semibold text-[#991b1b]">{deviceName(alert.current_device)}</div><div className="mt-1 text-xs font-semibold text-[#991b1b]">IP {deviceIp(alert.current_device)}</div></td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(alert.detected_at)}</td>
                    <td className="px-4 py-3 text-right"><button type="button" onClick={() => acknowledge(alert)} disabled={savingId === alert.id} className="inline-flex items-center gap-2 rounded-lg bg-[#000935] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" /> {savingId === alert.id ? 'Guardando...' : 'Marcar revisado'}</button></td>
                  </tr>
                )) : audit.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(entry.created_at)}</td>
                    <td className="px-4 py-3"><div className="font-semibold text-[#000935]">{entry.worker?.full_name || '-'}</div><div className="text-xs text-[#64748b]">{entry.worker?.email || '-'}</div></td>
                    <td className="px-4 py-3">{auditLabels[entry.action]}</td><td className="px-4 py-3">{deviceName(entry.current_device)}</td><td className="px-4 py-3">{deviceIp(entry.current_device)}</td>
                  </tr>
                ))}
                {view === 'history' && audit.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748b]">No hay actividad registrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          </>
        )
      )}
    </div>
  );
}
