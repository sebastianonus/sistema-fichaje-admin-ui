import { TEXTS } from "@/constants/texts";

const CLOCK_EVENT_LABELS: Record<string, string> = {
  CLOCK_IN: TEXTS.workerPortal.eventTypes.clockIn,
  BREAK_START: TEXTS.workerPortal.eventTypes.breakStart,
  BREAK_END: TEXTS.workerPortal.eventTypes.breakEnd,
  CLOCK_OUT: TEXTS.workerPortal.eventTypes.clockOut,
};

const EXTERNAL_EVENT_LABELS: Record<string, string> = {
  CLOCK_IN: TEXTS.workerPortal.external.eventTypes.clockIn,
  BREAK_START: TEXTS.workerPortal.external.eventTypes.breakStart,
  BREAK_END: TEXTS.workerPortal.external.eventTypes.breakEnd,
  CLOCK_OUT: TEXTS.workerPortal.external.eventTypes.clockOut,
};

export function formatClockEventLabel(eventType: string, relationshipType: "EMPLOYEE" | "EXTERNAL" = "EMPLOYEE") {
  if (relationshipType === "EXTERNAL") {
    return EXTERNAL_EVENT_LABELS[eventType] ?? TEXTS.workerPortal.external.eventTypes.unknown;
  }
  return CLOCK_EVENT_LABELS[eventType] ?? TEXTS.workerPortal.eventTypes.unknown;
}
