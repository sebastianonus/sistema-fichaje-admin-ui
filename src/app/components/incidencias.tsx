import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCcw } from "lucide-react";
import { TEXTS } from "@/constants/texts";
import { correctWorkerEvent, getIncidentsHistory } from "@/lib/api";
import type { IncidentHistoryItem } from "@/lib/types";

interface IncidenciasProps {
  onOpenWorkerDetail: (workerId: string) => void;
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

  const [status, setStatus] = useState<StatusFilter>("ALL");
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
    setSelectedIncident(incident);
    setCorrectionType(
      incident.related_event.event_type === "CLOCK_OUT"
        ? "CLOCK_OUT"
        : incident.related_event.event_type === "BREAK_START"
          ? "BREAK_START"
          : incident.related_event.event_type === "BREAK_END"
            ? "BREAK_END"
            : "CLOCK_IN",
    );
    setCorrectionAt(toDateTimeLocalValue(incident.related_event.happened_at));
    setCorrectionNote("");
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
      setInfo("Correccion registrada. La incidencia asociada queda trazada como resuelta.");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.incidencias.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1>{TEXTS.incidencias.title}</h1>
        <p className="text-[#666666] mt-1">{TEXTS.incidencias.subtitle}</p>
      </div>

      <div className="bg-[#f9f9f9] border border-[#e5e5e5] rounded-lg p-4 mb-6">
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
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-6 text-[#666666]">{TEXTS.common.loading}</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-6 text-[#666666]">{TEXTS.incidencias.empty}</div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white border border-[#e5e5e5] rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#000935]">{item.worker_name}</div>
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
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs ${item.has_correction ? "bg-[#ecfeff] text-[#0f766e]" : "bg-[#f5f5f5] text-[#666666]"}`}>
                    {item.has_correction ? TEXTS.incidencias.table.correction.yes : TEXTS.incidencias.table.correction.no}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
                <div>
                  <div className="text-[#666666]">{TEXTS.incidencias.table.columns.incidencia}</div>
                  <div className="text-[#000935]">{item.incident_type}</div>
                </div>
                <div>
                  <div className="text-[#666666]">{TEXTS.incidencias.table.columns.detectada}</div>
                  <div className="text-[#000935]">{new Date(item.detected_at).toLocaleString("es-ES")}</div>
                </div>
                <div>
                  <div className="text-[#666666]">{TEXTS.incidencias.table.columns.evento}</div>
                  <div className="text-[#000935]">
                    {item.related_event
                      ? `${item.related_event.event_type} - ${new Date(item.related_event.happened_at).toLocaleString("es-ES")}`
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-[#666666]">{TEXTS.workerDetail.correction.reasonLabel}</div>
                  <div className="text-[#000935]">{item.note || "-"}</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#e5e5e5] flex items-center gap-3 text-sm">
                <button
                  onClick={() => onOpenWorkerDetail(item.worker_id)}
                  className="text-[#000935] hover:underline"
                >
                  {TEXTS.incidencias.actions.openWorker}
                </button>
                {item.can_correct && item.related_event && (
                  <button
                    onClick={() => openCorrection(item)}
                    className="text-[#00C9CE] hover:underline"
                  >
                    {TEXTS.incidencias.actions.correctNow}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedIncident?.related_event && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="mb-2">{TEXTS.incidencias.correctionModal.title}</h3>
            <p className="text-sm text-[#666666] mb-4">{TEXTS.incidencias.correctionModal.description}</p>
            <div className="space-y-4">
              <div>
                <label className="block mb-2">{TEXTS.workerDetail.correction.eventType}</label>
                <select
                  value={correctionType}
                  onChange={(e) => setCorrectionType(e.target.value as "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END")}
                  className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg"
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
