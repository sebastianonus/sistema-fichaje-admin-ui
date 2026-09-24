import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCcw } from "lucide-react";
import { TEXTS } from "@/constants/texts";
import { correctWorkerEvent, getIncidentsHistory } from "@/lib/api";
import {
  DEFAULT_INCIDENT_CORRECTION_NOTE,
  formatIncidentDateTime,
  getIncidentView,
} from "@/lib/incident-view";
import type { IncidentHistoryItem } from "@/lib/types";

interface IncidenciasProps {
  onOpenWorkerDetail: (workerId: string, incidentId?: string) => void;
}

type StatusFilter = "ALL" | "OPEN" | "RESOLVED" | "DISMISSED";

function toDateTimeLocalValue(value: string) {
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function Incidencias({ onOpenWorkerDetail }: IncidenciasProps) {
  const [items, setItems] = useState<IncidentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [status, setStatus] = useState<StatusFilter>("OPEN");
  const [search, setSearch] = useState("");
  const [detectedFrom, setDetectedFrom] = useState("");
  const [detectedTo, setDetectedTo] = useState("");

  const [selectedIncident, setSelectedIncident] = useState<IncidentHistoryItem | null>(null);
  const [correctionType, setCorrectionType] = useState<"CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END">("CLOCK_IN");
  const [correctionAt, setCorrectionAt] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getIncidentsHistory({
        status: status === "ALL" ? undefined : status,
        search: search.trim() || undefined,
        detected_from: detectedFrom || undefined,
        detected_to: detectedTo || undefined,
        limit: 400,
      });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.incidencias.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [status, detectedFrom, detectedTo]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) =>
      i.worker_name.toLowerCase().includes(term) ||
      i.worker_email.toLowerCase().includes(term) ||
      String(i.worker_phone_number ?? "").toLowerCase().includes(term),
    );
  }, [items, search]);

  const openCorrection = (incident: IncidentHistoryItem) => {
    if (!incident.related_event) return;
    const view = getIncidentView({
      incident_type: incident.incident_type,
      status: incident.status,
      related_event: incident.related_event,
      clock_in_at: incident.clock_in_event?.happened_at ?? null,
      detected_at: incident.detected_at,
      note: incident.note,
    });
    setSelectedIncident(incident);
    setCorrectionType(view.eventToCorrect);
    setCorrectionAt(toDateTimeLocalValue(view.suggestedOutAt ?? incident.related_event.happened_at));
    setCorrectionNote(DEFAULT_INCIDENT_CORRECTION_NOTE);
    setInfo(null);
    setError(null);
  };

  const closeCorrection = () => {
    setSelectedIncident(null);
    setCorrectionNote("");
  };

  const submitCorrection = async () => {
    if (!selectedIncident?.related_event || !correctionAt.trim() || !correctionNote.trim()) return;
    try {
      setSaving(true);
      setError(null);
      setInfo(null);
      await correctWorkerEvent({
        related_event_id: selectedIncident.related_event.id,
        corrected_event_type: correctionType,
        corrected_happened_at: new Date(correctionAt).toISOString(),
        note: correctionNote.trim(),
      });
      closeCorrection();
      setInfo("Correccion registrada. La incidencia se ha marcado como resuelta.");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.incidencias.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-5 md:px-6 md:py-6">
      <div className="mb-5">
        <h1>{TEXTS.incidencias.title}</h1>
        <p className="text-[#666666] mt-1">{TEXTS.incidencias.subtitle}</p>
      </div>

      <div className="bg-[#f9f9f9] border border-[#e5e5e5] rounded-lg p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block mb-2">{TEXTS.incidencias.filters.status}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg"
            >
              <option value="ALL">{TEXTS.incidencias.filters.options.all}</option>
              <option value="OPEN">{TEXTS.incidencias.filters.options.open}</option>
              <option value="RESOLVED">{TEXTS.incidencias.filters.options.resolved}</option>
              <option value="DISMISSED">{TEXTS.incidencias.filters.options.dismissed}</option>
            </select>
          </div>

          <div>
            <label className="block mb-2">{TEXTS.incidencias.filters.search}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={TEXTS.incidencias.filters.placeholder}
                className="w-full pl-10 pr-3 py-2 bg-white border border-[#e5e5e5] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block mb-2">{TEXTS.incidencias.filters.detectedFrom}</label>
            <input
              type="date"
              value={detectedFrom}
              onChange={(e) => setDetectedFrom(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg"
            />
          </div>

          <div>
            <label className="block mb-2">{TEXTS.incidencias.filters.detectedTo}</label>
            <input
              type="date"
              value={detectedTo}
              onChange={(e) => setDetectedTo(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchData}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#000935] text-white rounded-lg hover:bg-[#0a1850] transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              {TEXTS.incidencias.actions.refresh}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-4 mb-4 text-[#dc2626]">
          {error}
        </div>
      )}
      {info && (
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-4 mb-4 text-[#0f766e]">
          {info}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-4 text-[#666666]">{TEXTS.common.loading}</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-4 text-[#666666]">{TEXTS.incidencias.empty}</div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const incidentView = getIncidentView({
              incident_type: item.incident_type,
              status: item.status,
              related_event: item.related_event,
              clock_in_at: item.clock_in_event?.happened_at ?? null,
              detected_at: item.detected_at,
              note: item.note,
            });

            return (
            <div key={item.id} className="bg-white border border-[#e5e5e5] rounded-lg p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#000935]">{incidentView.title}</div>
                  <div className="text-sm text-[#666666] mt-0.5">{item.worker_name}</div>
                  <div className="text-sm text-[#666666]">{item.worker_email}{item.worker_phone_number ? ` | ${item.worker_phone_number}` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs ${item.status === "OPEN" ? "bg-[#fef2f2] text-[#dc2626]" : "bg-[#ecfeff] text-[#0f766e]"}`}>
                    {item.status === "OPEN"
                      ? TEXTS.incidencias.table.states.open
                      : item.status === "RESOLVED"
                        ? TEXTS.incidencias.table.states.resolved
                        : TEXTS.incidencias.table.states.dismissed}
                  </span>
                  {item.status !== "OPEN" && (
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs ${item.has_correction ? "bg-[#ecfeff] text-[#0f766e]" : "bg-[#f5f5f5] text-[#666666]"}`}>
                      {item.has_correction ? TEXTS.incidencias.table.correction.yes : TEXTS.incidencias.table.correction.no}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 mt-2.5 text-sm">
                <div>
                  <div className="text-[#666666]">{incidentView.primaryTimeLabel}</div>
                  <div className="font-semibold text-[#000935]">{formatIncidentDateTime(incidentView.clockInAt)}</div>
                </div>
                <div>
                  <div className="text-[#666666]">{incidentView.targetTimeLabel}</div>
                  <div className="font-semibold text-[#000935]">{formatIncidentDateTime(incidentView.suggestedOutAt)}</div>
                  <div className="text-xs text-[#666666] mt-1">{incidentView.targetHelp}</div>
                </div>
                <div>
                  <div className="text-[#666666]">{incidentView.netWorkedLabel}</div>
                  <div className="font-semibold text-[#000935]">{incidentView.netWorkedValue}</div>
                </div>
                <div>
                  <div className="text-[#666666]">{incidentView.breakLabel}</div>
                  <div className="font-semibold text-[#000935]">{incidentView.breakValue}</div>
                </div>
                <div>
                  <div className="text-[#666666]">{incidentView.actionLabel}</div>
                  <div className="font-semibold text-[#dc2626]">{incidentView.correctionButton}</div>
                </div>
                <div className="md:col-span-5 rounded-lg bg-[#fff7f7] border border-[#fecaca] px-3 py-2 flex flex-wrap gap-x-2 text-sm">
                  <span className="text-[#991b1b] font-semibold">{incidentView.problemLabel}:</span>
                  <span className="text-[#000935]">{incidentView.description}</span>
                </div>
              </div>

              <div className="mt-2.5 pt-2.5 border-t border-[#e5e5e5] flex items-center gap-3 text-sm">
                <button
                  onClick={() => onOpenWorkerDetail(item.worker_id, item.id)}
                  className="text-[#000935] hover:underline"
                >
                  {TEXTS.incidencias.actions.openIncident}
                </button>
                {item.can_correct && item.related_event && (
                  <button
                    onClick={() => openCorrection(item)}
                    disabled={saving}
                    className="inline-flex px-3 py-1.5 rounded-lg bg-[#00C9CE] text-white hover:bg-[#00b3b8] disabled:opacity-50"
                  >
                    {incidentView.correctionButton}
                  </button>
                )}
              </div>
            </div>
          )})}
        </div>
      )}

      {selectedIncident?.related_event && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            {(() => {
              const view = getIncidentView({
                incident_type: selectedIncident.incident_type,
                status: selectedIncident.status,
                related_event: selectedIncident.related_event,
                clock_in_at: selectedIncident.clock_in_event?.happened_at ?? null,
              });
              return (
                <>
                  <h3 className="mb-2">{view.correctionButton}</h3>
                  <p className="text-sm text-[#666666] mb-4">{view.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-sm rounded-lg border border-[#e5e5e5] bg-[#f9f9f9] p-3">
                    <div>
                      <div className="text-[#666666]">{view.primaryTimeLabel}</div>
                      <div className="font-semibold text-[#000935]">{formatIncidentDateTime(view.clockInAt)}</div>
                    </div>
                    <div>
                      <div className="text-[#666666]">{view.targetTimeLabel}</div>
                      <div className="font-semibold text-[#000935]">{formatIncidentDateTime(view.suggestedOutAt)}</div>
                    </div>
                  </div>
                </>
              );
            })()}
            <div className="space-y-4">
              <div>
                <label className="block mb-2">{TEXTS.workerDetail.correction.eventType}</label>
                <select
                  value={correctionType}
                  onChange={(e) => setCorrectionType(e.target.value as "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END")}
                  className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg"
                >
                  <option value="CLOCK_IN">Entrada</option>
                  <option value="BREAK_START">Inicio pausa</option>
                  <option value="BREAK_END">Final pausa</option>
                  <option value="CLOCK_OUT">Salida</option>
                </select>
              </div>
              <div>
                <label className="block mb-2">{TEXTS.workerDetail.correction.happenedAt}</label>
                <input
                  type="datetime-local"
                  value={correctionAt}
                  onChange={(e) => setCorrectionAt(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg"
                />
              </div>
              <div>
                <label className="block mb-2">{TEXTS.workerDetail.correction.note}</label>
                <textarea
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  placeholder={TEXTS.workerDetail.correction.notePlaceholder}
                  className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg min-h-[96px]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={submitCorrection}
                disabled={saving || !correctionAt.trim() || !correctionNote.trim()}
                className="px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] disabled:opacity-50"
              >
                {TEXTS.workerDetail.correction.submit}
              </button>
              <button
                onClick={closeCorrection}
                disabled={saving}
                className="px-4 py-2.5 border border-[#e5e5e5] rounded-lg text-[#000935] hover:bg-[#f5f5f5]"
              >
                {TEXTS.workerDetail.correction.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
