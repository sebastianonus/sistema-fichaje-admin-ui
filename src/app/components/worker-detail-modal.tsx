import { useEffect, useMemo, useState } from 'react';
import { X, Edit2, Copy, Check, AlertTriangle } from 'lucide-react';
import { ConfirmationModal } from '@/app/components/confirmation-modal';
import { WorkdayTimeline } from '@/app/components/workday-timeline';
import { TEXTS } from '@/constants/texts';
import { activateWorker, changeWorkerPassword, deactivateWorker, getWorker, updateWorker } from '@/lib/api';
import type { WorkerDetail } from '@/lib/types';

interface WorkerDetailModalProps {
  workerId: string;
  onClose: () => void;
}

export function WorkerDetailModal({ workerId, onClose }: WorkerDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [copiedUuid, setCopiedUuid] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchWorker = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWorker(workerId);
      setWorker(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorker();
  }, [workerId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      fetchWorker();
    }, 15000);
    return () => window.clearInterval(id);
  }, [workerId]);

  useEffect(() => {
    setShowFullHistory(false);
  }, [workerId]);

  const historyState = useMemo(() => {
    const allEvents = [...(worker?.time_events ?? [])].sort(
      (a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime(),
    );
    if (!allEvents.length) {
      return {
        latestJourneyDate: null as string | null,
        latestJourneyEvents: [] as WorkerDetail['time_events'],
        latestClockIn: null as WorkerDetail['time_events'][number] | null,
        latestClockOut: null as WorkerDetail['time_events'][number] | null,
        totalMinutes: null as number | null,
      };
    }

    const grouped = new Map<string, WorkerDetail['time_events']>();
    for (const event of allEvents) {
      const key = new Date(event.happened_at).toLocaleDateString('sv-SE');
      const group = grouped.get(key);
      if (group) group.push(event);
      else grouped.set(key, [event]);
    }

    const latestJourneyDate = [...grouped.keys()].sort((a, b) => b.localeCompare(a))[0];
    const latestJourneyEvents = [...(grouped.get(latestJourneyDate) ?? [])].sort(
      (a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime(),
    );
    const latestClockIn = latestJourneyEvents.find((e) => e.event_type === 'CLOCK_IN') ?? null;
    const latestClockOut = [...latestJourneyEvents].reverse().find((e) => e.event_type === 'CLOCK_OUT') ?? null;
    const totalMinutes = latestClockIn && latestClockOut
      ? Math.max(
        0,
        Math.round(
          (new Date(latestClockOut.happened_at).getTime() - new Date(latestClockIn.happened_at).getTime()) / 60000,
        ),
      )
      : null;

    return {
      latestJourneyDate,
      latestJourneyEvents,
      latestClockIn,
      latestClockOut,
      totalMinutes,
    };
  }, [worker?.time_events]);

  const formatMinutes = (minutes: number | null) => {
    if (minutes === null) return 'N/A';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const handleCopyUuid = () => {
    navigator.clipboard.writeText(workerId);
    setCopiedUuid(true);
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  const handleEdit = () => {
    if (!worker) return;
    setEditedName(worker.full_name);
    setEditedEmail(worker.email);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedName('');
    setEditedEmail('');
  };

  const handleSaveConfirm = async () => {
    if (!worker) return;

    try {
      setSaving(true);
      setError(null);
      await updateWorker(worker.id, {
        full_name: editedName.trim(),
        email: editedEmail.trim(),
      });
      await fetchWorker();
      setShowSaveConfirm(false);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!worker || !newPassword.trim()) return;

    try {
      setSaving(true);
      setError(null);
      await changeWorkerPassword(worker.id, newPassword.trim());
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!worker) return;

    try {
      setSaving(true);
      setError(null);
      await deactivateWorker(worker.id);
      setShowDeactivateModal(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!worker) return;

    try {
      setSaving(true);
      setError(null);
      await activateWorker(worker.id);
      setShowActivateModal(false);
      await fetchWorker();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col md:max-h-[85vh]">
          <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5]">
            <h2>{TEXTS.workerDetail.title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-[#f5f5f5] rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading && <p className="text-[#666666]">{TEXTS.common.loading}</p>}

            {error && (
              <div className="p-3 bg-[#fef2f2] border border-[#dc2626] rounded-lg text-sm text-[#dc2626]">
                {error}
              </div>
            )}

            {!loading && worker && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3>{TEXTS.workerDetail.sections.basicInfo}</h3>
                    {!isEditing && (
                      <button
                        onClick={handleEdit}
                        className="flex items-center gap-2 px-3 py-1.5 text-[#00C9CE] hover:bg-[#00C9CE]/5 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        {TEXTS.workerDetail.actions.edit}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2">{TEXTS.workerDetail.fields.nombre}</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                        />
                      ) : (
                        <p className="text-[#000935]">{worker.full_name || TEXTS.common.noData}</p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2">{TEXTS.workerDetail.fields.email}</label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editedEmail}
                          onChange={(e) => setEditedEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                        />
                      ) : (
                        <p className="text-[#000935]">{worker.email || TEXTS.common.noData}</p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2">{TEXTS.workerDetail.fields.estado}</label>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${worker.is_active ? 'bg-[#00C9CE]/10 text-[#00C9CE]' : 'bg-[#f5f5f5] text-[#666666]'}`}>
                        {worker.is_active ? TEXTS.workerDetail.status.active : TEXTS.workerDetail.status.inactive}
                      </span>
                    </div>

                    <div>
                      <label className="block mb-2">{TEXTS.workerDetail.fields.uuid}</label>
                      <button onClick={handleCopyUuid} className="flex items-center gap-2 text-[#000935] hover:text-[#00C9CE] transition-colors">
                        <span className="font-mono text-sm">{workerId.slice(0, 8)}...</span>
                        {copiedUuid ? <Check className="w-4 h-4 text-[#00C9CE]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setShowSaveConfirm(true)}
                        disabled={saving}
                        className="px-4 py-2 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] transition-colors disabled:opacity-50"
                      >
                        {TEXTS.workerDetail.actions.save}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5] transition-colors"
                      >
                        {TEXTS.workerDetail.actions.cancel}
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#e5e5e5] pt-6">
                  <h3 className="mb-4">{TEXTS.workerDetail.sections.password}</h3>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="px-4 py-2 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5] transition-colors"
                  >
                    {TEXTS.workerDetail.actions.changePassword}
                  </button>
                </div>

                <div className="border-t border-[#e5e5e5] pt-6">
                  <h3 className="mb-4">{TEXTS.workerDetail.sections.timeEvents}</h3>
                  <div className="mb-4">
                    <WorkdayTimeline events={worker.time_events} title="Fichaje de hoy (tiempo real)" />
                  </div>

                  <div className="mb-4 p-3 bg-[#f9f9f9] border border-[#e5e5e5] rounded-lg">
                    <div className="font-medium text-[#000935] mb-1">Ultima jornada registrada</div>
                    {historyState.latestJourneyDate ? (
                      <>
                        <div className="text-sm text-[#666666] mb-1">
                          Fecha: {new Date(`${historyState.latestJourneyDate}T00:00:00`).toLocaleDateString('es-ES')}
                        </div>
                        <div className="text-sm text-[#666666]">
                          Entrada: {historyState.latestClockIn ? new Date(historyState.latestClockIn.happened_at).toLocaleTimeString('es-ES') : 'N/A'} | Salida: {historyState.latestClockOut ? new Date(historyState.latestClockOut.happened_at).toLocaleTimeString('es-ES') : 'Pendiente'} | Total: {formatMinutes(historyState.totalMinutes)}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-[#666666]">{TEXTS.workerDetail.timeEvents.noEvents}</p>
                    )}
                  </div>

                  {!!worker.time_events.length && (
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm text-[#666666]">
                        {showFullHistory ? 'Historial completo' : 'Eventos de la ultima jornada'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowFullHistory((v) => !v)}
                        className="text-sm text-[#00C9CE] hover:underline"
                      >
                        {showFullHistory ? 'Ver solo ultima jornada' : 'Ver historial completo'}
                      </button>
                    </div>
                  )}

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {worker.time_events.length === 0 ? (
                      <p className="text-[#666666] text-sm">{TEXTS.workerDetail.timeEvents.noEvents}</p>
                    ) : (
                      (showFullHistory ? worker.time_events : historyState.latestJourneyEvents).map((event) => (
                        <div key={event.id} className="flex justify-between items-start p-3 bg-[#f9f9f9] rounded-lg">
                          <div>
                            <div className="font-medium text-[#000935]">{event.event_type}</div>
                            {event.note && <div className="text-sm text-[#666666] mt-1">{event.note}</div>}
                          </div>
                          <div className="text-sm text-[#666666]">{new Date(event.happened_at).toLocaleString('es-ES')}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t border-[#e5e5e5] pt-6">
                  <h3 className="mb-2 text-[#dc2626]">{TEXTS.workerDetail.sections.dangerZone}</h3>
                  <p className="text-sm text-[#666666] mb-4">{TEXTS.workerDetail.dangerZone.warning}</p>
                  {worker.is_active ? (
                    <button
                      onClick={() => setShowDeactivateModal(true)}
                      className="px-4 py-2 bg-[#dc2626] text-white rounded-lg hover:bg-[#b91c1c] transition-colors"
                    >
                      {TEXTS.workerDetail.actions.deactivate}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowActivateModal(true)}
                      className="px-4 py-2 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] transition-colors"
                    >
                      {TEXTS.workerDetail.actions.activate}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showSaveConfirm && (
        <ConfirmationModal
          title={TEXTS.confirmation.save.title}
          message={TEXTS.confirmation.save.message}
          confirmText={TEXTS.confirmation.save.confirm}
          onConfirm={handleSaveConfirm}
          onCancel={() => setShowSaveConfirm(false)}
        />
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="mb-4">{TEXTS.workerPassword.title}</h3>
            <div className="mb-4">
              <label className="block mb-2">{TEXTS.workerPassword.fields.newPassword}</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={TEXTS.workerPassword.fields.placeholder}
                className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
              />
              <div className="mt-2 p-3 bg-[#fff3cd] border border-[#ffc107] rounded-lg flex gap-2">
                <AlertTriangle className="w-5 h-5 text-[#856404] flex-shrink-0" />
                <p className="text-sm text-[#856404]">{TEXTS.workerPassword.warning}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePasswordChange}
                disabled={!newPassword || saving}
                className="px-4 py-2 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {TEXTS.workerPassword.actions.change}
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                }}
                className="px-4 py-2 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5] transition-colors"
              >
                {TEXTS.workerPassword.actions.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeactivateModal && (
        <DeactivateWorkerModal
          onConfirm={handleDeactivate}
          onCancel={() => setShowDeactivateModal(false)}
        />
      )}

      {showActivateModal && (
        <ConfirmationModal
          title={TEXTS.activateWorker.title}
          message={TEXTS.activateWorker.message}
          confirmText={TEXTS.activateWorker.confirm}
          onConfirm={handleActivate}
          onCancel={() => setShowActivateModal(false)}
        />
      )}
    </>
  );
}

interface DeactivateWorkerModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function DeactivateWorkerModal({ onConfirm, onCancel }: DeactivateWorkerModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const isValid = confirmText === TEXTS.deactivateWorker.messages.confirmWord;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#dc2626]/10 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-[#dc2626]" />
          </div>
          <h3 className="text-[#dc2626]">{TEXTS.deactivateWorker.title}</h3>
        </div>

        <div className="space-y-3 mb-6 text-sm text-[#666666]">
          <p>{TEXTS.deactivateWorker.messages.line1}</p>
          <p>{TEXTS.deactivateWorker.messages.line2}</p>
          <p>
            {TEXTS.deactivateWorker.messages.line3}{' '}
            <strong className="text-[#000935]">{TEXTS.deactivateWorker.messages.confirmWord}</strong>{' '}
            {TEXTS.deactivateWorker.messages.line3b}
          </p>
        </div>

        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={TEXTS.deactivateWorker.placeholder}
          className="w-full px-3 py-2 mb-6 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
        />

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={!isValid}
            className="px-4 py-2 bg-[#dc2626] text-white rounded-lg hover:bg-[#b91c1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {TEXTS.deactivateWorker.actions.deactivate}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5] transition-colors"
          >
            {TEXTS.deactivateWorker.actions.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}


