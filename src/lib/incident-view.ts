type ClockEventType = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";

export type IncidentRelatedEvent = {
  id?: string;
  event_type?: string;
  happened_at?: string;
} | null | undefined;

export type IncidentTimelineEvent = {
  event_type?: string;
  happened_at?: string;
};

export type IncidentViewInput = {
  incident_type?: string | null;
  status?: string | null;
  detected_at?: string | null;
  related_event?: IncidentRelatedEvent;
  clock_in_at?: string | null;
  timeline_events?: IncidentTimelineEvent[];
  note?: string | null;
};

export type IncidentViewModel = {
  title: string;
  shortTitle: string;
  problemLabel: string;
  description: string;
  recommendedAction: string;
  eventToCorrect: ClockEventType;
  correctionButton: string;
  primaryTimeLabel: string;
  targetTimeLabel: string;
  elapsedLabel: string;
  actionLabel: string;
  netWorkedLabel: string;
  netWorkedValue: string;
  breakLabel: string;
  breakValue: string;
  targetHelp: string;
  clockInAt: string | null;
  currentOutAt: string | null;
  suggestedOutAt: string | null;
  technicalType: string;
  technicalEvent: string | null;
  statusLabel: string;
};

const WORKDAY_MINUTES = 450;
export const DEFAULT_INCIDENT_CORRECTION_NOTE = "Fichaje olvidado, mal uso de la herramienta";

function formatMinutesCompact(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function getWorkdayProgress(clockInAt?: string | null, events: IncidentTimelineEvent[] = []) {
  if (!clockInAt) {
    return {
      netWorkedMinutes: 0,
      breakMinutes: 0,
      activeBreakStartAt: null as string | null,
      activeBreakMinutes: 0,
    };
  }

  const startMs = new Date(clockInAt).getTime();
  if (Number.isNaN(startMs)) {
    return {
      netWorkedMinutes: 0,
      breakMinutes: 0,
      activeBreakStartAt: null as string | null,
      activeBreakMinutes: 0,
    };
  }

  let breakStartAt: string | null = null;
  let breakStartMs: number | null = null;
  let breakMs = 0;
  const nowMs = Date.now();

  const asc = [...events]
    .filter((event) => event.happened_at)
    .sort((a, b) => new Date(a.happened_at || "").getTime() - new Date(b.happened_at || "").getTime());

  for (const event of asc) {
    const atMs = new Date(event.happened_at || "").getTime();
    if (Number.isNaN(atMs) || atMs < startMs) continue;

    if (event.event_type === "BREAK_START" && breakStartMs === null) {
      breakStartMs = atMs;
      breakStartAt = event.happened_at || null;
      continue;
    }

    if (event.event_type === "BREAK_END" && breakStartMs !== null) {
      breakMs += Math.max(0, atMs - breakStartMs);
      breakStartMs = null;
      breakStartAt = null;
    }
  }

  const activeBreakMs = breakStartMs !== null ? Math.max(0, nowMs - breakStartMs) : 0;
  const totalBreakMs = breakMs + activeBreakMs;
  const netWorkedMinutes = Math.max(0, Math.round((nowMs - startMs - totalBreakMs) / 60000));

  return {
    netWorkedMinutes,
    breakMinutes: Math.round(breakMs / 60000),
    activeBreakStartAt: breakStartAt,
    activeBreakMinutes: Math.round(activeBreakMs / 60000),
  };
}

export function addWorkdayTarget(value: string) {
  return new Date(new Date(value).getTime() + WORKDAY_MINUTES * 60000).toISOString();
}

export function addNetWorkdayTarget(clockInAt: string, events: IncidentTimelineEvent[] = []) {
  const startMs = new Date(clockInAt).getTime();
  if (Number.isNaN(startMs)) return addWorkdayTarget(clockInAt);

  let targetMs = startMs + WORKDAY_MINUTES * 60000;
  let breakStartMs: number | null = null;

  const asc = [...events]
    .filter((event) => event.happened_at)
    .sort((a, b) => new Date(a.happened_at || "").getTime() - new Date(b.happened_at || "").getTime());

  for (const event of asc) {
    const atMs = new Date(event.happened_at || "").getTime();
    if (Number.isNaN(atMs) || atMs < startMs) continue;

    if (event.event_type === "BREAK_START" && breakStartMs === null && atMs <= targetMs) {
      breakStartMs = atMs;
      continue;
    }

    if (event.event_type === "BREAK_END" && breakStartMs !== null) {
      targetMs += Math.max(0, atMs - breakStartMs);
      breakStartMs = null;
    }
  }

  if (breakStartMs !== null && breakStartMs <= targetMs) {
    targetMs += Math.max(0, Date.now() - breakStartMs);
  }

  return new Date(targetMs).toISOString();
}

export function formatIncidentDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatElapsedSince(value?: string | null) {
  if (!value) return "-";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins.toString().padStart(2, "0")}m`;
  return `${mins}m`;
}

export function formatDurationBetween(from?: string | null, to?: string | null) {
  if (!from || !to) return "-";
  const minutes = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins.toString().padStart(2, "0")}m`;
  return `${mins}m`;
}

export function getIncidentView(input: IncidentViewInput): IncidentViewModel {
  const eventType = input.related_event?.event_type ?? null;
  const eventAt = input.related_event?.happened_at ?? null;
  const clockInAt = input.clock_in_at ?? (eventType === "CLOCK_IN" || eventType === "BREAK_END" ? eventAt : null);
  const currentOutAt = eventType === "CLOCK_OUT" ? eventAt : null;
  const suggestedOutAt = clockInAt ? addNetWorkdayTarget(clockInAt, input.timeline_events ?? []) : null;
  const progress = getWorkdayProgress(clockInAt, input.timeline_events ?? []);
  const netWorkedValue = formatMinutesCompact(progress.netWorkedMinutes);
  const breakValue = progress.activeBreakStartAt
    ? `En pausa desde ${formatIncidentDateTime(progress.activeBreakStartAt)}`
    : progress.breakMinutes > 0
      ? `${formatMinutesCompact(progress.breakMinutes)} de pausa descontada`
      : "Sin pausa registrada";
  const targetHelp = progress.activeBreakStartAt
    ? `Calculo provisional: entrada + 7h30 netas + ${formatMinutesCompact(progress.activeBreakMinutes)} de pausa abierta hasta ahora.`
    : progress.breakMinutes > 0
      ? `Calculo: entrada + 7h30 netas + ${formatMinutesCompact(progress.breakMinutes)} de pausa.`
      : "Calculo: entrada + 7h30 netas.";
  const technicalType = input.incident_type || "INCIDENT";
  const technicalEvent = eventType && eventAt ? `${eventType} - ${formatIncidentDateTime(eventAt)}` : null;

  if (technicalType === "LONG_OPEN_SHIFT" && currentOutAt) {
    return {
      title: "Accion necesaria: ajustar salida",
      shortTitle: "Ajustar salida",
      problemLabel: "Problema",
      description: "La salida registrada deja una jornada superior a 7h30.",
      recommendedAction: "Ajustar la hora de salida y resolver la incidencia.",
      eventToCorrect: "CLOCK_OUT",
      correctionButton: "Ajustar salida y resolver",
      primaryTimeLabel: "Entrada registrada",
      targetTimeLabel: "Salida objetivo",
      elapsedLabel: "Duracion registrada",
      actionLabel: "Accion necesaria",
      netWorkedLabel: "Trabajo neto registrado",
      netWorkedValue,
      breakLabel: "Pausas",
      breakValue,
      targetHelp,
      clockInAt,
      currentOutAt,
      suggestedOutAt,
      technicalType,
      technicalEvent,
      statusLabel: input.status === "OPEN" ? "Pendiente" : "Resuelta",
    };
  }

  if (technicalType === "LONG_OPEN_SHIFT") {
    return {
      title: "Accion necesaria: registrar salida",
      shortTitle: "Falta salida",
      problemLabel: "Problema",
      description: "Hay una entrada sin salida valida y ya supera las 7h30.",
      recommendedAction: "Registrar la salida administrativa y resolver la incidencia.",
      eventToCorrect: "CLOCK_OUT",
      correctionButton: "Registrar salida y resolver",
      primaryTimeLabel: "Entrada registrada",
      targetTimeLabel: "Salida a registrar",
      elapsedLabel: "Tiempo sin cerrar",
      actionLabel: "Accion necesaria",
      netWorkedLabel: "Trabajo neto hasta ahora",
      netWorkedValue,
      breakLabel: "Pausa",
      breakValue,
      targetHelp,
      clockInAt,
      currentOutAt: null,
      suggestedOutAt,
      technicalType,
      technicalEvent,
      statusLabel: input.status === "OPEN" ? "Pendiente" : "Resuelta",
    };
  }

  return {
    title: "Incidencia de fichaje",
    shortTitle: "Revisar fichaje",
    problemLabel: "Problema",
    description: "Hay un fichaje que requiere revision.",
    recommendedAction: "Revisar el evento y corregirlo si corresponde.",
    eventToCorrect: (eventType === "CLOCK_OUT" || eventType === "BREAK_START" || eventType === "BREAK_END"
      ? eventType
      : "CLOCK_IN") as ClockEventType,
    correctionButton: "Corregir fichaje",
    primaryTimeLabel: "Evento registrado",
    targetTimeLabel: "Hora objetivo",
    elapsedLabel: "Tiempo",
    actionLabel: "Accion necesaria",
    netWorkedLabel: "Trabajo neto",
    netWorkedValue,
    breakLabel: "Pausa",
    breakValue,
    targetHelp,
    clockInAt,
    currentOutAt,
    suggestedOutAt,
    technicalType,
    technicalEvent,
    statusLabel: input.status === "OPEN" ? "Pendiente" : "Resuelta",
  };
}
