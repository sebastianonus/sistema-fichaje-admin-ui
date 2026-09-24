import { TEXTS } from "@/constants/texts";

const CLOCK_EVENT_LABELS: Record<string, string> = {
  CLOCK_IN: TEXTS.workerPortal.eventTypes.clockIn,
  BREAK_START: TEXTS.workerPortal.eventTypes.breakStart,
  BREAK_END: TEXTS.workerPortal.eventTypes.breakEnd,
  CLOCK_OUT: TEXTS.workerPortal.eventTypes.clockOut,
};

export function formatClockEventLabel(eventType: string) {
  return CLOCK_EVENT_LABELS[eventType] ?? TEXTS.workerPortal.eventTypes.unknown;
}
