import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { createExternalServicePeriod, getExternalServicePeriods, updateExternalServicePeriod } from '@/lib/api';
import type { ExternalServicePeriod } from '@/lib/types';

interface ExternalServicePeriodsProps {
  workerId: string;
}

type PeriodForm = {
  periodStart: string;
  periodEnd: string;
  agreedHours: string;
  invoicedHours: string;
  validatedHours: string;
  invoiceReference: string;
  status: ExternalServicePeriod['status'];
  notes: string;
};

const emptyForm: PeriodForm = {
  periodStart: '',
  periodEnd: '',
  agreedHours: '',
  invoicedHours: '',
  validatedHours: '',
  invoiceReference: '',
  status: 'DRAFT',
  notes: '',
};

const statusLabels: Record<ExternalServicePeriod['status'], string> = {
  DRAFT: 'Borrador',
  REVIEWED: 'Revisado',
  APPROVED: 'Aprobado',
  DISPUTED: 'Con discrepancia',
};

function formatMinutes(minutes: number | null) {
  if (minutes === null) return '-';
  const sign = minutes < 0 ? '-' : '';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  return `${sign}${hours}h ${String(rest).padStart(2, '0')}m`;
}

function hoursToMinutes(value: string, nullable = true) {
  if (!value.trim()) return nullable ? null : 0;
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 0) throw new Error('Introduce una cantidad de horas valida.');
  return Math.round(hours * 60);
}

function minutesToHours(value: number | null) {
  return value === null ? '' : String(Math.round((value / 60) * 100) / 100);
}

function periodErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'EXTERNAL_PERIOD_EXISTS') return 'Ya existe un periodo que coincide o se solapa con esas fechas.';
  if (message === 'TEXT_TOO_LONG') return 'La referencia o las observaciones superan la longitud permitida.';
  if (message === 'WORKER_IS_NOT_EXTERNAL') return 'Este usuario ya no esta clasificado como colaborador externo.';
  return message || fallback;
}

export function ExternalServicePeriods({ workerId }: ExternalServicePeriodsProps) {
  const [periods, setPeriods] = useState<ExternalServicePeriod[]>([]);
  const [form, setForm] = useState<PeriodForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setPeriods(await getExternalServicePeriods(workerId));
    } catch (err) {
      setError(periodErrorMessage(err, 'No se pudieron cargar los periodos.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [workerId]);

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  };

  const editPeriod = (period: ExternalServicePeriod) => {
    setEditingId(period.id);
    setForm({
      periodStart: period.period_start,
      periodEnd: period.period_end,
      agreedHours: minutesToHours(period.agreed_minutes),
      invoicedHours: minutesToHours(period.invoiced_minutes),
      validatedHours: minutesToHours(period.validated_minutes),
      invoiceReference: period.invoice_reference ?? '',
      status: period.status,
      notes: period.notes ?? '',
    });
    setShowForm(true);
    setError(null);
  };

  const savePeriod = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.periodStart || !form.periodEnd) return;
    try {
      setSaving(true);
      setError(null);
      const payload = {
        agreed_minutes: hoursToMinutes(form.agreedHours),
        invoiced_minutes: hoursToMinutes(form.invoicedHours, false) ?? 0,
        validated_minutes: hoursToMinutes(form.validatedHours),
        invoice_reference: form.invoiceReference.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      };
      if (editingId) {
        await updateExternalServicePeriod(workerId, editingId, payload);
      } else {
        await createExternalServicePeriod(workerId, {
          ...payload,
          period_start: form.periodStart,
          period_end: form.periodEnd,
        });
      }
      closeForm();
      await load();
    } catch (err) {
      setError(periodErrorMessage(err, 'No se pudo guardar el periodo.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white border border-[#e5e5e5] rounded-lg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3>Contraste de servicios facturados</h3>
          <p className="mt-1 text-sm text-[#666666]">Compara horas registradas, acordadas y facturadas por periodo.</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#00C9CE] px-3 py-2 text-sm font-semibold text-white hover:bg-[#00b3b8]"
          >
            <Plus className="h-4 w-4" /> Anadir periodo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={savePeriod} className="mt-4 border-t border-[#e5e5e5] pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="font-semibold text-[#000935]">{editingId ? 'Editar periodo' : 'Nuevo periodo'}</h4>
            <button type="button" onClick={closeForm} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#f5f5f5]" aria-label="Cerrar formulario" title="Cerrar formulario">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium text-[#000935]">
              Desde
              <input type="date" value={form.periodStart} onChange={(e) => setForm((current) => ({ ...current, periodStart: e.target.value }))} disabled={!!editingId} required className="mt-1 w-full rounded-lg border border-[#dbe3eb] px-3 py-2 disabled:bg-[#f5f5f5]" />
            </label>
            <label className="text-sm font-medium text-[#000935]">
              Hasta
              <input type="date" value={form.periodEnd} onChange={(e) => setForm((current) => ({ ...current, periodEnd: e.target.value }))} disabled={!!editingId} required className="mt-1 w-full rounded-lg border border-[#dbe3eb] px-3 py-2 disabled:bg-[#f5f5f5]" />
            </label>
            <label className="text-sm font-medium text-[#000935]">
              Horas acordadas
              <input type="number" min="0" step="0.25" value={form.agreedHours} onChange={(e) => setForm((current) => ({ ...current, agreedHours: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#dbe3eb] px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-[#000935]">
              Horas facturadas
              <input type="number" min="0" step="0.25" value={form.invoicedHours} onChange={(e) => setForm((current) => ({ ...current, invoicedHours: e.target.value }))} required className="mt-1 w-full rounded-lg border border-[#dbe3eb] px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-[#000935]">
              Horas validadas
              <input type="number" min="0" step="0.25" value={form.validatedHours} onChange={(e) => setForm((current) => ({ ...current, validatedHours: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#dbe3eb] px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-[#000935]">
              Referencia factura
              <input type="text" maxLength={200} value={form.invoiceReference} onChange={(e) => setForm((current) => ({ ...current, invoiceReference: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#dbe3eb] px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-[#000935]">
              Estado
              <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as ExternalServicePeriod['status'] }))} className="mt-1 w-full rounded-lg border border-[#dbe3eb] bg-white px-3 py-2">
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-[#000935] sm:col-span-2 lg:col-span-1">
              Observaciones
              <input type="text" maxLength={4000} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#dbe3eb] px-3 py-2" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="rounded-lg border border-[#dbe3eb] px-3 py-2 text-sm font-semibold text-[#000935] hover:bg-[#f5f5f5]">Cancelar</button>
            <button type="submit" disabled={saving || !form.periodStart || !form.periodEnd || !form.invoicedHours} className="inline-flex items-center gap-2 rounded-lg bg-[#000935] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <Check className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar periodo'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-[#dc2626]">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[#666666]">Cargando...</p>
        ) : periods.length === 0 ? (
          <p className="text-sm text-[#666666]">Todavia no hay periodos de facturacion registrados.</p>
        ) : (
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-[#dbe3eb] text-xs uppercase text-[#666666]">
              <tr>
                <th className="px-3 py-2">Periodo</th>
                <th className="px-3 py-2">Registradas</th>
                <th className="px-3 py-2">Acordadas</th>
                <th className="px-3 py-2">Facturadas</th>
                <th className="px-3 py-2">Diferencia</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f6]">
              {periods.map((period) => {
                const difference = period.registered_minutes - period.invoiced_minutes;
                return (
                  <tr key={period.id}>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#000935]">{new Date(`${period.period_start}T00:00:00`).toLocaleDateString('es-ES')} - {new Date(`${period.period_end}T00:00:00`).toLocaleDateString('es-ES')}</div>
                      {period.invoice_reference && <div className="mt-0.5 text-xs text-[#666666]">Factura: {period.invoice_reference}</div>}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#0f766e]">{formatMinutes(period.registered_minutes)}</td>
                    <td className="px-3 py-3">{formatMinutes(period.agreed_minutes)}</td>
                    <td className="px-3 py-3">{formatMinutes(period.invoiced_minutes)}</td>
                    <td className={`px-3 py-3 font-semibold ${difference === 0 ? 'text-[#0f766e]' : 'text-[#b45309]'}`}>{difference > 0 ? '+' : ''}{formatMinutes(difference)}</td>
                    <td className="px-3 py-3"><span className="inline-flex rounded-full bg-[#eef2ff] px-2 py-1 text-xs font-semibold text-[#3730a3]">{statusLabels[period.status]}</span></td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" onClick={() => editPeriod(period)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#00AEB3] hover:bg-[#ecfeff]" aria-label="Editar periodo" title="Editar periodo">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
