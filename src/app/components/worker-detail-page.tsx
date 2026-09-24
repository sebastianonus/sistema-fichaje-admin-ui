import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, AlertTriangle, MapPin } from 'lucide-react';
import { WorkdayTimeline } from '@/app/components/workday-timeline';
import { ConfirmationModal } from '@/app/components/confirmation-modal';
import { TEXTS } from '@/constants/texts';
import { activateWorker, addWorkerEvent, changeWorkerPassword, correctWorkerEvent, deactivateWorker, deleteWorkerEvent, getWorker, resolveIncident, updateWorker } from '@/lib/api';
import {
  DEFAULT_INCIDENT_CORRECTION_NOTE,
  addNetWorkdayTarget,
  formatDurationBetween,
  formatElapsedSince,
  formatIncidentDateTime,
  getIncidentView,
} from '@/lib/incident-view';
import { buildEffectiveTimeEvents, summarizeWorkdayEvents } from '@/lib/time-events';
import type { WorkerDetail } from '@/lib/types';

interface WorkerDetailPageProps {
  workerId: string;
  focusIncidentId?: string | null;
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

function formatEventTime(value: string) {
  return new Date(value).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatEventDateTime(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function eventLabel(type: string) {
  if (type === 'CLOCK_IN') return 'Entrada';
  if (type === 'CLOCK_OUT') return 'Salida';
  if (type === 'BREAK_START') return 'Inicio pausa';
  if (type === 'BREAK_END') return 'Fin pausa';
  if (type === 'CORRECTION') return 'Correccion';
  return type;
}

function suggestedEventToAdd(events: Array<{ event_type: string; happened_at: string }>) {
  const asc = [...events].sort(
    (a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime(),
  );
  let openBreakStart: string | null = null;
  let lastEventAt = asc[asc.length - 1]?.happened_at ?? new Date().toISOString();

  for (const event of asc) {
    if (event.event_type === 'BREAK_START') openBreakStart = event.happened_at;
    if (event.event_type === 'BREAK_END') openBreakStart = null;
    if (event.event_type === 'CLOCK_OUT') lastEventAt = event.happened_at;
  }

  if (openBreakStart) return { type: 'BREAK_END' as const, happened_at: lastEventAt };
  return { type: 'BREAK_END' as const, happened_at: lastEventAt };
}

export function WorkerDetailPage({ workerId, focusIncidentId, onBack }: WorkerDetailPageProps) {
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
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [selectedCorrectionEventId, setSelectedCorrectionEventId] = useState<string | null>(null);
  const [selectedDeleteEventId, setSelectedDeleteEventId] = useState<string | null>(null);
  const [selectedCorrectionClockInAt, setSelectedCorrectionClockInAt] = useState<string | null>(null);
  const [selectedCorrectionTargetOutAt, setSelectedCorrectionTargetOutAt] = useState<string | null>(null);
  const [correctionType, setCorrectionType] = useState<'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END'>('CLOCK_IN');
  const [correctionAt, setCorrectionAt] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');
  const [newEventType, setNewEventType] = useState<'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END'>('BREAK_END');
  const [newEventAt, setNewEventAt] = useState('');
  const [newEventNote, setNewEventNote] = useState('');
  const [deleteEventNote, setDeleteEventNote] = useState('');
  const incidentsSectionRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!worker || !focusIncidentId) return;
    window.setTimeout(() => {
      incidentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [worker, focusIncidentId]);

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
      summary: summarizeWorkdayEvents(dayEvents),
    }));
  }, [filteredEvents]);

  const incidentByRelatedEventId = useMemo(() => {
    const out = new Map<string, NonNullable<WorkerDetail['incident_history']>[number]>();
    for (const incident of worker?.incident_history ?? []) {
      if (!incident.related_event_id) continue;
      const current = out.get(incident.related_event_id);
      if (current?.status === 'OPEN') continue;
      if (current && incident.status !== 'OPEN') continue;
      out.set(incident.related_event_id, incident);
    }
    return out;
  }, [worker?.incident_history]);

  const clockInByIncidentEventId = useMemo(() => {
    const out = new Map<string, (typeof effectiveEvents)[number]>();
    const asc = [...effectiveEvents].sort(
      (a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime(),
    );
    let lastClockIn: (typeof effectiveEvents)[number] | null = null;

    for (const event of asc) {
      if (event.event_type === 'CLOCK_IN') lastClockIn = event;
      if (event.event_type === 'CLOCK_OUT') {
        if (lastClockIn) out.set(event.id, lastClockIn);
        lastClockIn = null;
      }
    }

    for (const event of asc) {
      if (event.event_type === 'CLOCK_IN') out.set(event.id, event);
    }

    return out;
  }, [effectiveEvents]);

  const eventById = useMemo(() => {
    const out = new Map<string, (typeof effectiveEvents)[number]>();
    for (const event of effectiveEvents) out.set(event.id, event);
    return out;
  }, [effectiveEvents]);

  const incidentClosingOutByClockInId = useMemo(() => {
    const out = new Map<string, (typeof effectiveEvents)[number]>();
    for (const event of effectiveEvents) {
      if (event.event_type !== 'CLOCK_OUT' || !event.related_event_id) continue;
      const related = eventById.get(event.related_event_id);
      if (related?.event_type === 'CLOCK_IN') out.set(event.related_event_id, event);
    }
    return out;
  }, [effectiveEvents, eventById]);

  const targetOutForClockIn = (clockInAt: string | null | undefined) =>
    clockInAt ? addNetWorkdayTarget(clockInAt, effectiveEvents) : null;

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
    const incident = incidentByRelatedEventId.get(event.id);
    const incidentClockIn = incident ? clockInByIncidentEventId.get(event.id) : null;
    const targetOut = incidentClockIn ? targetOutForClockIn(incidentClockIn.happened_at) : null;

    setSelectedCorrectionEventId(event.id);
    setSelectedCorrectionClockInAt(incidentClockIn?.happened_at ?? null);
    setSelectedCorrectionTargetOutAt(targetOut);
    if (incident && incidentClockIn) {
      setCorrectionType('CLOCK_OUT');
      setCorrectionAt(toDateTimeLocalValue(targetOut ?? event.happened_at));
    } else {
      setCorrectionType(
        event.event_type === 'CLOCK_OUT'
          ? 'CLOCK_OUT'
          : event.event_type === 'BREAK_START'
            ? 'BREAK_START'
            : event.event_type === 'BREAK_END'
              ? 'BREAK_END'
              : 'CLOCK_IN',
      );
      setCorrectionAt(toDateTimeLocalValue(event.happened_at));
    }
    setCorrectionNote(DEFAULT_INCIDENT_CORRECTION_NOTE);
    setShowCorrectionModal(true);
  };

  const closeCorrectionModal = () => {
    setShowCorrectionModal(false);
    setSelectedCorrectionEventId(null);
    setSelectedCorrectionClockInAt(null);
    setSelectedCorrectionTargetOutAt(null);
    setCorrectionNote('');
  };

  const openAddEventModal = (events?: Array<{ event_type: string; happened_at: string }>) => {
    const suggestion = suggestedEventToAdd(events?.length ? events : effectiveEvents);
    setNewEventType(suggestion.type);
    setNewEventAt(toDateTimeLocalValue(suggestion.happened_at));
    setNewEventNote('Evento anadido por administracion para completar la jornada.');
    setShowAddEventModal(true);
  };

  const closeAddEventModal = () => {
    setShowAddEventModal(false);
    setNewEventAt('');
    setNewEventNote('');
  };

  const openDeleteEventModal = (event: (typeof filteredEvents)[number]) => {
    setSelectedDeleteEventId(event.id);
    setDeleteEventNote('Evento eliminado por administracion tras revision.');
    setShowDeleteEventModal(true);
  };

  const closeDeleteEventModal = () => {
    setShowDeleteEventModal(false);
    setSelectedDeleteEventId(null);
    setDeleteEventNote('');
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

  const handleAddEventSave = async () => {
    if (!worker || !newEventAt.trim() || !newEventNote.trim()) return;
    try {
      setSaving(true);
      setError(null);
      await addWorkerEvent({
        worker_id: worker.id,
        event_type: newEventType,
        happened_at: new Date(newEventAt).toISOString(),
        note: newEventNote.trim(),
      });
      closeAddEventModal();
      await fetchWorker();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.workerDetail.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEventSave = async () => {
    if (!selectedDeleteEventId || !deleteEventNote.trim()) return;
    try {
      setSaving(true);
      setError(null);
      await deleteWorkerEvent({
        related_event_id: selectedDeleteEventId,
        note: deleteEventNote.trim(),
      });
      closeDeleteEventModal();
      await fetchWorker();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.workerDetail.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    try {
      setSaving(true);
      setError(null);
      setInfo(null);
      await resolveIncident(incidentId, 'Incidencia revisada y fichaje corregido');
      setInfo(TEXTS.workerDetail.incidents.resolvedSuccess);
      await fetchWorker();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.workerDetail.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="px-4 py-5 md:px-6 md:py-6 space-y-4">
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
            <div className="bg-white border border-[#e5e5e5] rounded-lg p-4">
              <h3 className="mb-3">{TEXTS.workerDetail.sections.basicInfo}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
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
                      <p className="basis-full text-xs text-[#666666]">{TEXTS.workerDetail.phone.formatHelp}</p>
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

            <div className="bg-white border border-[#e5e5e5] rounded-lg p-4">
              <WorkdayTimeline events={effectiveEvents} title={TEXTS.workerPortal.sections.timelineTitle} />
            </div>

            <div ref={incidentsSectionRef} className="bg-white border border-[#e5e5e5] rounded-lg p-4 scroll-mt-20">
              <h3 className="mb-3">{TEXTS.workerDetail.sections.incidents}</h3>
              {worker.open_incidents && worker.open_incidents.length > 0 ? (
                <div className="space-y-2">
                  {worker.open_incidents.map((incident) => {
                    const historyIncident = worker.incident_history?.find((row) => row.id === incident.id);
                    const relatedEvent = historyIncident?.related_event_id ? eventById.get(historyIncident.related_event_id) : null;
                    const incidentClockIn = relatedEvent ? clockInByIncidentEventId.get(relatedEvent.id) : null;
                    const view = getIncidentView({
                      incident_type: incident.incident_type,
                      status: incident.status,
                      detected_at: incident.detected_at,
                      related_event: relatedEvent,
                      clock_in_at: incidentClockIn?.happened_at ?? null,
                      timeline_events: effectiveEvents,
                      note: incident.note,
                    });

                    return (
                      <div
                        key={incident.id}
                        className={`p-4 rounded-lg bg-[#fef2f2] border ${focusIncidentId === incident.id ? 'border-[#dc2626] ring-2 ring-[#fecaca]' : 'border-[#fecaca]'}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-[#991b1b]">{view.title}</div>
                            <div className="text-sm text-[#7f1d1d] mt-1">{view.description}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {relatedEvent && (
                              <button
                                type="button"
                                onClick={() => openCorrectionModal(relatedEvent)}
                                disabled={saving}
                                className="px-3 py-2 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] disabled:opacity-50"
                              >
                                {view.correctionButton}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mt-3 text-sm">
                          <div>
                            <div className="text-[#7f1d1d]">{view.primaryTimeLabel}</div>
                            <div className="font-semibold text-[#000935]">{formatIncidentDateTime(view.clockInAt)}</div>
                          </div>
                          <div>
                            <div className="text-[#7f1d1d]">{view.targetTimeLabel}</div>
                            <div className="font-semibold text-[#000935]">{formatIncidentDateTime(view.suggestedOutAt)}</div>
                            <div className="text-xs text-[#7f1d1d] mt-1">{view.targetHelp}</div>
                          </div>
                          <div>
                            <div className="text-[#7f1d1d]">{view.netWorkedLabel}</div>
                            <div className="font-semibold text-[#000935]">{view.netWorkedValue}</div>
                          </div>
                          <div>
                            <div className="text-[#7f1d1d]">{view.breakLabel}</div>
                            <div className="font-semibold text-[#000935]">{view.breakValue}</div>
                          </div>
                          <div>
                            <div className="text-[#7f1d1d]">{view.actionLabel}</div>
                            <div className="font-semibold text-[#dc2626]">{view.correctionButton}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#666666]">{TEXTS.workerDetail.incidents.empty}</p>
              )}
            </div>

            <div className="bg-white border border-[#e5e5e5] rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3>{TEXTS.workerDetail.sections.timeEvents}</h3>
                <button
                  type="button"
                  onClick={() => openAddEventModal(filteredEvents)}
                  disabled={saving}
                  className="px-3 py-2 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] disabled:opacity-50"
                >
                  Anadir evento
                </button>
              </div>
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
                          {TEXTS.workerPortal.status.totalLabel}{' '}
                          {group.summary.hasIncompleteSegment
                            ? `Pendiente (${group.summary.totalClosedMinutes > 0 ? formatMinutes(group.summary.totalClosedMinutes) : TEXTS.workerPortal.status.noClosedSegments} cerrado)`
                            : group.summary.totalClosedMinutes > 0
                              ? formatMinutes(group.summary.totalClosedMinutes)
                              : TEXTS.workerPortal.status.noClosedSegments}
                        </span>
                      </summary>
                      <div className="px-3 pb-3 space-y-2">
                        {group.summary.hasIncompleteSegment && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => openAddEventModal(group.events)}
                              disabled={saving}
                              className="text-sm text-[#00C9CE] hover:underline disabled:opacity-50 disabled:no-underline"
                            >
                              Anadir evento que falta
                            </button>
                          </div>
                        )}
                        {group.events.map((event) => {
                          const incident = incidentByRelatedEventId.get(event.id);
                          const incidentClockIn = incident ? clockInByIncidentEventId.get(event.id) : null;
                          const incidentTargetOut = incidentClockIn ? targetOutForClockIn(incidentClockIn.happened_at) : null;
                          const incidentClosingOut = incident ? incidentClosingOutByClockInId.get(event.id) : null;
                          const eventIncidentView = incident ? getIncidentView({
                            incident_type: incident.incident_type,
                            status: incident.status,
                            detected_at: incident.detected_at,
                            related_event: event,
                            clock_in_at: incidentClockIn?.happened_at ?? null,
                            timeline_events: effectiveEvents,
                            note: incident.note,
                          }) : null;
                          const closesIncidentFrom = event.related_event_id ? eventById.get(event.related_event_id) : null;
                          const incidentIsOpen = incident?.status === 'OPEN';
                          const incidentIsClosed = !!incident && (incident.status !== 'OPEN' || !!incidentClosingOut);
                          const eventClosesIncident = event.event_type === 'CLOCK_OUT' && closesIncidentFrom?.event_type === 'CLOCK_IN';
                          const eventNeedsMissingClockOut = incidentIsOpen && event.event_type === 'CLOCK_IN';
                          const canCorrectEvent =
                            (event.event_type === 'CLOCK_IN' ||
                              event.event_type === 'CLOCK_OUT' ||
                              event.event_type === 'BREAK_START' ||
                              event.event_type === 'BREAK_END') &&
                            !saving;
                          return (
                          <div key={event.id} className="flex flex-wrap justify-between items-start gap-3 p-3 bg-[#f9f9f9] rounded-lg">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-medium text-[#000935]">{eventLabel(event.event_type)}</div>
                                {incident && !incidentIsClosed && (
                                  <span className={`inline-flex px-2 py-0.5 text-[11px] rounded-full ${incidentIsClosed ? 'bg-[#ecfeff] text-[#0f766e]' : 'bg-[#fef2f2] text-[#dc2626]'}`}>
                                    {incidentIsClosed
                                      ? incident.has_correction
                                        ? TEXTS.workerDetail.correction.incidentCorrectedBadge
                                        : TEXTS.workerDetail.correction.incidentResolvedBadge
                                      : TEXTS.workerDetail.correction.incidentDetectedBadge}
                                  </span>
                                )}
                                {event.corrected && !incidentIsOpen && (
                                  <span className="inline-flex px-2 py-0.5 text-[11px] rounded-full bg-[#00C9CE]/10 text-[#0f766e]">
                                    {TEXTS.workerDetail.correction.correctedBadge}
                                  </span>
                                )}
                                {eventClosesIncident && (
                                  <span className="inline-flex px-2 py-0.5 text-[11px] rounded-full bg-[#ecfeff] text-[#0f766e]">
                                    {TEXTS.workerDetail.correction.incidentCloseOutBadge}
                                  </span>
                                )}
                              </div>
                              {event.corrected && !incidentIsOpen && (
                                <div className="text-sm text-[#666666] mt-1 break-words">
                                  {TEXTS.workerDetail.correction.originalLabel}{' '}
                                  {event.original_event_type} {formatEventTime(event.original_happened_at ?? event.happened_at)}
                                </div>
                              )}
                              {event.correction_note && !incidentIsOpen && (
                                <div className="text-sm text-[#666666] mt-1 break-words">
                                  {TEXTS.workerDetail.correction.reasonLabel} {event.correction_note}
                                </div>
                              )}
                              {event.note && !event.correction_note && (
                                <div className="text-sm text-[#666666] mt-1 break-words">{event.note}</div>
                              )}
                              {eventClosesIncident && closesIncidentFrom && (
                                <div className="text-sm text-[#666666] mt-1 break-words">
                                  {TEXTS.workerDetail.correction.closesIncidentFromLabel}{' '}
                                  <span className="font-semibold text-[#000935]">{formatEventDateTime(closesIncidentFrom.happened_at)}</span>
                                </div>
                              )}
                              {incident && (
                                <div className={`mt-3 rounded-lg border p-3 ${incidentIsClosed ? 'border-[#99f6e4] bg-[#f0fdfa]' : 'border-[#fecaca] bg-[#fff7f7]'}`}>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <div className="text-[#666666]">{TEXTS.workerDetail.correction.incidentStartLabel}</div>
                                      <div className="font-semibold text-[#000935]">
                                        {incidentClockIn ? formatEventDateTime(incidentClockIn.happened_at) : TEXTS.common.noData}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[#666666]">{eventIncidentView?.targetTimeLabel ?? TEXTS.workerDetail.correction.incidentTargetOutLabel}</div>
                                      <div className="font-semibold text-[#000935]">
                                        {incidentTargetOut ? formatEventDateTime(incidentTargetOut) : TEXTS.common.noData}
                                      </div>
                                      {eventIncidentView?.targetHelp && (
                                        <div className="text-xs text-[#666666] mt-1">{eventIncidentView.targetHelp}</div>
                                      )}
                                    </div>
                                    {!incidentIsOpen && (
                                      <div>
                                        <div className="text-[#666666]">{TEXTS.workerDetail.correction.incidentStatusLabel}</div>
                                        <div className={incidentIsClosed ? 'font-semibold text-[#0f766e]' : 'font-semibold text-[#dc2626]'}>
                                          {incidentIsClosed ? TEXTS.workerDetail.correction.resolvedIncident : TEXTS.workerDetail.correction.incidentDetectedBadge}
                                        </div>
                                      </div>
                                    )}
                                    <div>
                                      <div className="text-[#666666]">{TEXTS.workerDetail.correction.incidentDetectedAtLabel}</div>
                                      <div className="font-semibold text-[#000935]">{formatEventDateTime(incident.detected_at)}</div>
                                    </div>
                                    {incident.resolved_at && (
                                      <div className="sm:col-span-2">
                                        <div className="text-[#666666]">{TEXTS.workerDetail.correction.incidentResolvedAtLabel}</div>
                                        <div className="font-semibold text-[#000935]">{formatEventDateTime(incident.resolved_at)}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
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
                                {formatEventTime(event.happened_at)}
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
                              {(event.event_type === 'CLOCK_IN' || event.event_type === 'CLOCK_OUT' || event.event_type === 'BREAK_START' || event.event_type === 'BREAK_END') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openCorrectionModal(event)}
                                    disabled={!canCorrectEvent}
                                    className="text-sm text-[#00C9CE] hover:underline disabled:opacity-50 disabled:no-underline"
                                  >
                                    {eventNeedsMissingClockOut ? 'Registrar salida' : TEXTS.workerDetail.correction.action}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openDeleteEventModal(event)}
                                    disabled={saving}
                                    className="text-sm text-[#dc2626] hover:underline disabled:opacity-50 disabled:no-underline"
                                  >
                                    Eliminar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          );
                        })}
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

      {showAddEventModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="mb-2">Anadir evento</h3>
            <p className="text-sm text-[#666666] mb-4">
              Se registra un nuevo fichaje administrativo auditado. Usalo solo para completar un evento que falta.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block mb-2">Tipo de evento</label>
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END')}
                  className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg"
                >
                  <option value="CLOCK_IN">Entrada</option>
                  <option value="BREAK_START">Inicio pausa</option>
                  <option value="BREAK_END">Fin pausa</option>
                  <option value="CLOCK_OUT">Salida</option>
                </select>
              </div>
              <div>
                <label className="block mb-2">Hora del evento</label>
                <input
                  type="datetime-local"
                  value={newEventAt}
                  onChange={(e) => setNewEventAt(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg"
                />
              </div>
              <div>
                <label className="block mb-2">Motivo</label>
                <textarea
                  value={newEventNote}
                  onChange={(e) => setNewEventNote(e.target.value)}
                  placeholder="Ej. Fin de pausa omitido por error y validado por administracion"
                  rows={4}
                  className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg resize-none"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={handleAddEventSave}
                disabled={saving || !newEventAt.trim() || !newEventNote.trim()}
                className="px-4 py-2 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] disabled:opacity-50"
              >
                Guardar evento
              </button>
              <button
                onClick={closeAddEventModal}
                className="px-4 py-2 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5]"
              >
                {TEXTS.workerDetail.correction.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteEventModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="mb-2">Eliminar evento</h3>
            <p className="text-sm text-[#666666] mb-4">
              El evento se retirara de la jornada efectiva y quedara auditado como correccion administrativa.
            </p>
            <div>
              <label className="block mb-2">Motivo</label>
              <textarea
                value={deleteEventNote}
                onChange={(e) => setDeleteEventNote(e.target.value)}
                placeholder="Ej. Evento duplicado o registrado por error"
                rows={4}
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg resize-none"
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={handleDeleteEventSave}
                disabled={saving || !deleteEventNote.trim()}
                className="px-4 py-2 bg-[#dc2626] text-white rounded-lg hover:bg-[#b91c1c] disabled:opacity-50"
              >
                Eliminar evento
              </button>
              <button
                onClick={closeDeleteEventModal}
                className="px-4 py-2 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5]"
              >
                {TEXTS.workerDetail.correction.cancel}
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
            {(selectedCorrectionClockInAt || selectedCorrectionTargetOutAt) && (
              <div className="mb-4 rounded-lg border border-[#fecaca] bg-[#fff7f7] p-3">
                <div className="text-sm font-semibold text-[#991b1b] mb-2">
                  {TEXTS.workerDetail.correction.modalIncidentContext}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-[#666666]">{TEXTS.workerDetail.correction.incidentStartLabel}</div>
                    <div className="font-semibold text-[#000935]">
                      {selectedCorrectionClockInAt ? formatEventDateTime(selectedCorrectionClockInAt) : TEXTS.common.noData}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#666666]">{TEXTS.workerDetail.correction.incidentTargetOutLabel}</div>
                    <div className="font-semibold text-[#000935]">
                      {selectedCorrectionTargetOutAt ? formatEventDateTime(selectedCorrectionTargetOutAt) : TEXTS.common.noData}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block mb-2">{TEXTS.workerDetail.correction.eventType}</label>
                <select
                  value={correctionType}
                  onChange={(e) => setCorrectionType(e.target.value as 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END')}
                  className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg"
                >
                  <option value="CLOCK_IN">CLOCK_IN</option>
                  <option value="CLOCK_OUT">CLOCK_OUT</option>
                  <option value="BREAK_START">BREAK_START</option>
                  <option value="BREAK_END">BREAK_END</option>
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
