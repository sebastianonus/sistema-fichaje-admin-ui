import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, AlertTriangle, MapPin } from 'lucide-react';
import { WorkdayTimeline } from '@/app/components/workday-timeline';
import { ConfirmationModal } from '@/app/components/confirmation-modal';
import { TEXTS } from '@/constants/texts';
import { activateWorker, changeWorkerPassword, correctWorkerEvent, deactivateWorker, getWorker, updateWorker } from '@/lib/api';
import { buildEffectiveTimeEvents } from '@/lib/time-events';
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

function toDateTimeLocalValue(value: string) {
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function formatCoordinate(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value.toFixed(6);
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
  const [info, setInfo] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [maxEvents, setMaxEvents] = useState(50);

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedCorrectionEventId, setSelectedCorrectionEventId] = useState<string | null>(null);
  const [correctionType, setCorrectionType] = useState<'CLOCK_IN' | 'CLOCK_OUT'>('CLOCK_IN');
  const [correctionAt, setCorrectionAt] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');

  const fetchWorker = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWorker(workerId);
      setWorker(data);
      setNameDraft(data.full_name ?? '');
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

  const effectiveEvents = useMemo(
    () => buildEffectiveTimeEvents(worker?.time_events ?? []),
    [worker?.time_events],
  );

  const filteredEvents = useMemo(() => {
    const events = [...effectiveEvents].sort(
      (a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime(),
    );

    const byDate = events.filter((event) => {
      const d = localDay(event.happened_at);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });

    return byDate.slice(0, maxEvents);
  }, [effectiveEvents, dateFrom, dateTo, maxEvents]);

  const groupedFilteredEvents = useMemo(() => {
    const grouped = new Map<string, Array<(typeof filteredEvents)[number]>>();
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
    const normalizedDraft = phoneDraft.trim();
    const currentPhone = worker.phone_number ?? '';
    if (normalizedDraft === currentPhone) {
      setEditingPhone(false);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setInfo(null);
      await updateWorker(worker.id, { phone_number: normalizedDraft || null });
      setEditingPhone(false);
      await fetchWorker();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.workerDetail.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  const handleNameSave = async () => {
    if (!worker) return;
    const normalizedDraft = nameDraft.trim();
    if (!normalizedDraft) return;
    if (normalizedDraft === worker.full_name) {
      setEditingName(false);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setInfo(null);
      await updateWorker(worker.id, { full_name: normalizedDraft });
      setEditingName(false);
      await fetchWorker();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.workerDetail.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  const handleEmailSave = async () => {
    if (!worker) return;
    const normalizedDraft = emailDraft.trim();
    const currentEmail = worker.email ?? '';
    if (!normalizedDraft) return;
    if (normalizedDraft === currentEmail) {
      setEditingEmail(false);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setInfo(null);
      const result = await updateWorker(worker.id, { email: normalizedDraft });
      if (result.warning === 'AUTH_USER_EMAIL_SYNC_FAILED') {
        setInfo('Email actualizado en la ficha. El acceso de ese usuario en Auth requiere revision adicional.');
      }
      setEditingEmail(false);
      await fetchWorker();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.workerDetail.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  const openCorrectionModal = (event: (typeof filteredEvents)[number]) => {
    setSelectedCorrectionEventId(event.id);
    setCorrectionType((event.event_type === 'CLOCK_OUT' ? 'CLOCK_OUT' : 'CLOCK_IN'));
    setCorrectionAt(toDateTimeLocalValue(event.happened_at));
    setCorrectionNote('');
    setShowCorrectionModal(true);
  };

  const closeCorrectionModal = () => {
    setShowCorrectionModal(false);
    setSelectedCorrectionEventId(null);
    setCorrectionNote('');
  };

  const handleCorrectionSave = async () => {
    if (!selectedCorrectionEventId || !correctionAt.trim() || !correctionNote.trim()) return;
    try {
      setSaving(true);
      setError(null);
      await correctWorkerEvent({
        related_event_id: selectedCorrectionEventId,
        corrected_event_type: correctionType,
        corrected_happened_at: new Date(correctionAt).toISOString(),
        note: correctionNote.trim(),
      });
      closeCorrectionModal();
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
        {info && <div className="p-3 bg-[#fff7ed] border border-[#fdba74] rounded-lg text-sm text-[#9a3412]">{info}</div>}

        {!loading && worker && (
          <>
            <div className="bg-white border border-[#e5e5e5] rounded-lg p-6">
              <h3 className="mb-4">{TEXTS.workerDetail.sections.basicInfo}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block mb-2">{TEXTS.workerDetail.fields.nombre}</label>
                  {editingName ? (
                    <div className="flex flex-wrap items-start gap-2">
                      <input
                        type="text"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        placeholder={TEXTS.createWorker.fields.placeholders.fullName}
                        className="px-3 py-2 border border-[#e5e5e5] rounded-lg min-w-0 flex-1 w-full sm:w-auto"
                      />
                      <button
                        onClick={handleNameSave}
                        disabled={saving || !nameDraft.trim()}
                        className="px-3 py-2 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] disabled:opacity-50"
                      >
                        {TEXTS.workerDetail.actions.save}
                      </button>
                      <button
                        onClick={() => {
                          setNameDraft(worker.full_name);
                          setEditingName(false);
                        }}
                        className="px-3 py-2 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5]"
                      >
                        {TEXTS.workerDetail.actions.cancel}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start gap-2">
                      <p className="text-[#000935] min-w-0 flex-1 break-words">{worker.full_name}</p>
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-[#00C9CE] hover:underline shrink-0"
                      >
                        {TEXTS.workerDetail.actions.edit}
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block mb-2">{TEXTS.workerDetail.fields.email}</label>
                  {editingEmail ? (
                    <div className="flex flex-wrap items-start gap-2">
                      <input
                        type="email"
                        value={emailDraft}
                        onChange={(e) => setEmailDraft(e.target.value)}
                        placeholder={TEXTS.workerDetail.email.placeholder}
                        className="px-3 py-2 border border-[#e5e5e5] rounded-lg min-w-0 flex-1 w-full sm:w-auto"
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
                    <div className="flex flex-wrap items-start gap-2">
                      <p className="text-[#000935] min-w-0 flex-1 break-all">{worker.email || TEXTS.common.noData}</p>
                      <button
                        onClick={() => setEditingEmail(true)}
                        className="text-[#00C9CE] hover:underline shrink-0"
                      >
                        {TEXTS.workerDetail.email.edit}
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block mb-2">{TEXTS.workerDetail.fields.telefono}</label>
                  {editingPhone ? (
                    <div className="flex flex-wrap items-start gap-2">
                      <input
                        type="text"
                        value={phoneDraft}
                        onChange={(e) => setPhoneDraft(e.target.value)}
                        placeholder={TEXTS.workerDetail.phone.placeholder}
                        className="px-3 py-2 border border-[#e5e5e5] rounded-lg min-w-0 flex-1 w-full sm:w-auto"
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
                    <div className="flex flex-wrap items-start gap-2">
                      <p className="text-[#000935] min-w-0 flex-1 break-all">{worker.phone_number || TEXTS.common.noData}</p>
                      <button
                        onClick={() => setEditingPhone(true)}
                        className="text-[#00C9CE] hover:underline shrink-0"
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
              <WorkdayTimeline events={effectiveEvents} title={TEXTS.workerPortal.sections.timelineTitle} />
            </div>

            <div className="bg-white border border-[#e5e5e5] rounded-lg p-6">
              <h3 className="mb-4">{TEXTS.workerDetail.sections.incidents}</h3>
              {worker.open_incidents && worker.open_incidents.length > 0 ? (
                <div className="space-y-2">
                  {worker.open_incidents.map((incident) => (
                    <div key={incident.id} className="p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca]">
                      <div className="font-medium text-[#991b1b]">{TEXTS.workerDetail.incidents.longOpenShift}</div>
                      <div className="text-sm text-[#7f1d1d] mt-1">
                        {TEXTS.workerDetail.incidents.detectedAt} {new Date(incident.detected_at).toLocaleString('es-ES')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#666666]">{TEXTS.workerDetail.incidents.empty}</p>
              )}
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
                          <div key={event.id} className="flex flex-wrap justify-between items-start gap-3 p-3 bg-[#f9f9f9] rounded-lg">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-medium text-[#000935]">{event.event_type}</div>
                                {event.corrected && (
                                  <span className="inline-flex px-2 py-0.5 text-[11px] rounded-full bg-[#00C9CE]/10 text-[#0f766e]">
                                    {TEXTS.workerDetail.correction.correctedBadge}
                                  </span>
                                )}
                              </div>
                              {event.corrected && (
                                <div className="text-sm text-[#666666] mt-1 break-words">
                                  {TEXTS.workerDetail.correction.originalLabel}{' '}
                                  {event.original_event_type} {new Date(event.original_happened_at ?? event.happened_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                              {event.correction_note && (
                                <div className="text-sm text-[#666666] mt-1 break-words">
                                  {TEXTS.workerDetail.correction.reasonLabel} {event.correction_note}
                                </div>
                              )}
                              {event.note && !event.correction_note && (
                                <div className="text-sm text-[#666666] mt-1 break-words">{event.note}</div>
                              )}
                              <div className="text-sm text-[#666666] mt-1 break-words">
                                {TEXTS.workerDetail.location.label}{' '}
                                {formatCoordinate(event.latitude) && formatCoordinate(event.longitude) ? (
                                  <>
                                    {formatCoordinate(event.latitude)}, {formatCoordinate(event.longitude)}
                                    {typeof event.gps_accuracy_m === 'number' && Number.isFinite(event.gps_accuracy_m) && (
                                      <> | {TEXTS.workerDetail.location.accuracy} {Math.round(event.gps_accuracy_m)} m</>
                                    )}
                                    </>
                                  ) : (
                                    TEXTS.workerDetail.location.noData
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-sm text-[#666666]">
                                {new Date(event.happened_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {formatCoordinate(event.latitude) && formatCoordinate(event.longitude) && (
                                <a
                                  href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center text-[#00C9CE] hover:text-[#0f766e]"
                                  aria-label={TEXTS.workerDetail.location.openMap}
                                  title={TEXTS.workerDetail.location.openMap}
                                >
                                  <MapPin className="w-4 h-4" />
                                </a>
                              )}
                              {(event.event_type === 'CLOCK_IN' || event.event_type === 'CLOCK_OUT') && (
                                <button
                                  type="button"
                                  onClick={() => openCorrectionModal(event)}
                                  disabled={saving || event.corrected}
                                  className="text-sm text-[#00C9CE] hover:underline disabled:opacity-50 disabled:no-underline"
                                >
                                  {event.corrected ? TEXTS.workerDetail.correction.alreadyCorrected : TEXTS.workerDetail.correction.action}
                                </button>
                              )}
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

      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="mb-2">{TEXTS.workerDetail.correction.title}</h3>
            <p className="text-sm text-[#666666] mb-4">{TEXTS.workerDetail.correction.description}</p>
            <div className="space-y-4">
              <div>
                <label className="block mb-2">{TEXTS.workerDetail.correction.eventType}</label>
                <select
                  value={correctionType}
                  onChange={(e) => setCorrectionType(e.target.value as 'CLOCK_IN' | 'CLOCK_OUT')}
                  className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg"
                >
                  <option value="CLOCK_IN">CLOCK_IN</option>
                  <option value="CLOCK_OUT">CLOCK_OUT</option>
                </select>
              </div>
              <div>
                <label className="block mb-2">{TEXTS.workerDetail.correction.happenedAt}</label>
                <input
                  type="datetime-local"
                  value={correctionAt}
                  onChange={(e) => setCorrectionAt(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg"
                />
              </div>
              <div>
                <label className="block mb-2">{TEXTS.workerDetail.correction.note}</label>
                <textarea
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  placeholder={TEXTS.workerDetail.correction.notePlaceholder}
                  rows={4}
                  className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg resize-none"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={handleCorrectionSave}
                disabled={saving || !correctionAt.trim() || !correctionNote.trim()}
                className="px-4 py-2 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] disabled:opacity-50"
              >
                {TEXTS.workerDetail.correction.submit}
              </button>
              <button
                onClick={closeCorrectionModal}
                className="px-4 py-2 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5]"
              >
                {TEXTS.workerDetail.correction.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
