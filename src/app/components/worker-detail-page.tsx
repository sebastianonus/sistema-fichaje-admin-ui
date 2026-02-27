import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { WorkdayTimeline } from '@/app/components/workday-timeline';
import { ConfirmationModal } from '@/app/components/confirmation-modal';
import { TEXTS } from '@/constants/texts';
import { activateWorker, changeWorkerPassword, deactivateWorker, getWorker, updateWorker } from '@/lib/api';
import type { WorkerDetail } from '@/lib/types';

interface WorkerDetailPageProps {
  workerId: string;
  onBack: () => void;
}

function localDay(value: string) {
  return new Date(value).toLocaleDateString('sv-SE');
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function closedMinutesFromEvents(events: WorkerDetail['time_events']) {
  const asc = [...events].sort(
    (a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime(),
  );
  let openIn: WorkerDetail['time_events'][number] | null = null;
  let total = 0;
  for (const ev of asc) {
    if (ev.event_type === 'CLOCK_IN') {
      openIn = ev;
      continue;
    }
    if (ev.event_type === 'CLOCK_OUT' && openIn) {
      const minutes = Math.max(
        0,
        Math.round((new Date(ev.happened_at).getTime() - new Date(openIn.happened_at).getTime()) / 60000),
      );
      total += minutes;
      openIn = null;
    }
  }
  return total;
}

export function WorkerDetailPage({ workerId, onBack }: WorkerDetailPageProps) {
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [maxEvents, setMaxEvents] = useState(50);

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');

  const fetchWorker = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWorker(workerId);
      setWorker(data);
      setEmailDraft(data.email ?? '');
      setPhoneDraft(data.phone_number ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.workerDetail.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorker();
  }, [workerId]);

  const filteredEvents = useMemo(() => {
    const events = [...(worker?.time_events ?? [])].sort(
      (a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime(),
    );

    const byDate = events.filter((event) => {
      const d = localDay(event.happened_at);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });

    return byDate.slice(0, maxEvents);
  }, [worker?.time_events, dateFrom, dateTo, maxEvents]);

  const groupedFilteredEvents = useMemo(() => {
    const grouped = new Map<string, WorkerDetail['time_events']>();
    for (const ev of filteredEvents) {
      const key = localDay(ev.happened_at);
      const bucket = grouped.get(key);
      if (bucket) bucket.push(ev);
      else grouped.set(key, [ev]);
    }
    return [...grouped.entries()].map(([key, dayEvents]) => ({
      key,
      label: new Date(`${key}T00:00:00`).toLocaleDateString('es-ES'),
      events: dayEvents,
      totalClosedMinutes: closedMinutesFromEvents(dayEvents),
    }));
  }, [filteredEvents]);

  const handleDeactivate = async () => {
    if (!worker) return;
    try {
      setSaving(true);
      setError(null);
      await deactivateWorker(worker.id);
      setShowDeactivateModal(false);
      await fetchWorker();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.workerDetail.errors.generic);
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
      setError(err instanceof Error ? err.message : TEXTS.workerDetail.errors.generic);
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
      setError(err instanceof Error ? err.message : TEXTS.workerDetail.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneSave = async () => {
    if (!worker) return;
    try {
      setSaving(true);
      setError(null);
      await updateWorker(worker.id, { phone_number: phoneDraft.trim() });
      setEditingPhone(false);
      await fetchWorker();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.workerDetail.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  const handleEmailSave = async () => {
    if (!worker) return;
    try {
      setSaving(true);
      setError(null);
      await updateWorker(worker.id, { email: emailDraft.trim() });
      setEditingEmail(false);
      await fetchWorker();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.workerDetail.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-2 border border-[#e5e5e5] rounded-lg hover:bg-[#f9f9f9]"
          >
            <ArrowLeft className="w-4 h-4" />
            {TEXTS.workerDetail.backToWorkers}
          </button>
          <h1>{TEXTS.workerDetail.title}</h1>
        </div>

        {loading && <p className="text-[#666666]">{TEXTS.common.loading}</p>}
        {error && <div className="p-3 bg-[#fef2f2] border border-[#dc2626] rounded-lg text-sm text-[#dc2626]">{error}</div>}

        {!loading && worker && (
          <>
            <div className="bg-white border border-[#e5e5e5] rounded-lg p-6">
              <h3 className="mb-4">{TEXTS.workerDetail.sections.basicInfo}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block mb-2">{TEXTS.workerDetail.fields.nombre}</label>
                  <p className="text-[#000935]">{worker.full_name}</p>
                </div>
                <div>
                  <label className="block mb-2">{TEXTS.workerDetail.fields.email}</label>
                  {editingEmail ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="email"
                        value={emailDraft}
                        onChange={(e) => setEmailDraft(e.target.value)}
                        placeholder={TEXTS.workerDetail.email.placeholder}
                        className="px-3 py-2 border border-[#e5e5e5] rounded-lg"
                      />
                      <button
                        onClick={handleEmailSave}
                        disabled={saving || !emailDraft.trim()}
                        className="px-3 py-2 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] disabled:opacity-50"
                      >
                        {TEXTS.workerDetail.email.save}
                      </button>
                      <button
                        onClick={() => {
                          setEmailDraft(worker.email ?? '');
                          setEditingEmail(false);
                        }}
                        className="px-3 py-2 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5]"
                      >
                        {TEXTS.workerDetail.email.cancel}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-[#000935]">{worker.email || TEXTS.common.noData}</p>
                      <button
                        onClick={() => setEditingEmail(true)}
                        className="text-[#00C9CE] hover:underline"
                      >
                        {TEXTS.workerDetail.email.edit}
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block mb-2">{TEXTS.workerDetail.fields.telefono}</label>
                  {editingPhone ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={phoneDraft}
                        onChange={(e) => setPhoneDraft(e.target.value)}
                        placeholder={TEXTS.workerDetail.phone.placeholder}
                        className="px-3 py-2 border border-[#e5e5e5] rounded-lg"
                      />
                      <button
                        onClick={handlePhoneSave}
                        disabled={saving}
                        className="px-3 py-2 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] disabled:opacity-50"
                      >
                        {TEXTS.workerDetail.phone.save}
                      </button>
                      <button
                        onClick={() => {
                          setPhoneDraft(worker.phone_number ?? '');
                          setEditingPhone(false);
                        }}
                        className="px-3 py-2 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5]"
                      >
                        {TEXTS.workerDetail.phone.cancel}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-[#000935]">{worker.phone_number || TEXTS.common.noData}</p>
                      <button
                        onClick={() => setEditingPhone(true)}
                        className="text-[#00C9CE] hover:underline"
                      >
                        {TEXTS.workerDetail.phone.edit}
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block mb-2">{TEXTS.workerDetail.fields.estado}</label>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${worker.is_active ? 'bg-[#00C9CE]/10 text-[#00C9CE]' : 'bg-[#f5f5f5] text-[#666666]'}`}>
                    {worker.is_active ? TEXTS.workerDetail.status.active : TEXTS.workerDetail.status.inactive}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5]"
                >
                  {TEXTS.workerDetail.actions.changePassword}
                </button>
                {worker.is_active ? (
                  <button
                    onClick={() => setShowDeactivateModal(true)}
                    className="px-4 py-2 bg-[#dc2626] text-white rounded-lg hover:bg-[#b91c1c]"
                  >
                    {TEXTS.workerDetail.actions.deactivate}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowActivateModal(true)}
                    className="px-4 py-2 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8]"
                  >
                    {TEXTS.workerDetail.actions.activate}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#e5e5e5] rounded-lg p-6">
              <WorkdayTimeline events={worker.time_events} title={TEXTS.workerPortal.sections.timelineTitle} />
            </div>

            <div className="bg-white border border-[#e5e5e5] rounded-lg p-6">
              <div className="flex flex-wrap items-end gap-3 mb-4">
                <div>
                  <label className="block text-sm mb-1">{TEXTS.workerDetail.filters.fromDate}</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2 border border-[#e5e5e5] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">{TEXTS.workerDetail.filters.toDate}</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2 border border-[#e5e5e5] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">{TEXTS.workerDetail.filters.maxEvents}</label>
                  <select
                    value={maxEvents}
                    onChange={(e) => setMaxEvents(Number(e.target.value))}
                    className="px-3 py-2 border border-[#e5e5e5] rounded-lg"
                  >
                    {TEXTS.workerDetail.filters.eventsOptions.map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto space-y-2">
                {filteredEvents.length === 0 ? (
                  <p className="text-[#666666] text-sm">{TEXTS.workerDetail.timeEvents.noEvents}</p>
                ) : (
                  groupedFilteredEvents.map((group, idx) => (
                    <details key={group.key} className="border border-[#e5e5e5] rounded-lg bg-white" open={idx === 0}>
                      <summary className="list-none cursor-pointer p-3 flex items-center justify-between text-xs font-semibold">
                        <span className="text-[#0f766e]">{TEXTS.workerPortal.status.journeyLabel} {group.label}</span>
                        <span className="text-[#475569]">
                          {TEXTS.workerPortal.status.totalLabel} {group.totalClosedMinutes > 0 ? formatMinutes(group.totalClosedMinutes) : TEXTS.workerPortal.status.noClosedSegments}
                        </span>
                      </summary>
                      <div className="px-3 pb-3 space-y-2">
                        {group.events.map((event) => (
                          <div key={event.id} className="flex justify-between items-start p-3 bg-[#f9f9f9] rounded-lg">
                            <div>
                              <div className="font-medium text-[#000935]">{event.event_type}</div>
                              {event.note && <div className="text-sm text-[#666666] mt-1">{event.note}</div>}
                            </div>
                            <div className="text-sm text-[#666666]">
                              {new Date(event.happened_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {showDeactivateModal && (
        <ConfirmationModal
          title={TEXTS.deactivateWorker.title}
          message={TEXTS.deactivateWorker.messages.line1}
          confirmText={TEXTS.deactivateWorker.actions.deactivate}
          type="danger"
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
    </>
  );
}
