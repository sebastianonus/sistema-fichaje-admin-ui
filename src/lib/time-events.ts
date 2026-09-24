export type RawTimeEvent = {
  id: string;
  event_type: string;
  happened_at: string;
  note?: string | null;
  related_event_id?: string | null;
  correction_action?: string | null;
  corrected_event_type?: string | null;
  corrected_happened_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  gps_accuracy_m?: number | null;
};

export type EffectiveTimeEvent = RawTimeEvent & {
  corrected?: boolean;
  original_event_type?: string;
  original_happened_at?: string;
  correction_note?: string | null;
  correction_action?: string | null;
  correction_event_id?: string;
};

export type WorkdaySummaryEvent = Pick<RawTimeEvent, "event_type" | "happened_at">;

export type WorkdaySummary = {
  totalClosedMinutes: number;
  hasIncompleteSegment: boolean;
};

export function buildEffectiveTimeEvents(events: RawTimeEvent[]): EffectiveTimeEvent[] {
  const correctionByTarget = new Map<string, RawTimeEvent>();

  const correctionsDesc = [...events].sort(
    (a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime(),
  );

  for (const event of correctionsDesc) {
    if (event.event_type !== "CORRECTION" || !event.related_event_id) continue;
    if (correctionByTarget.has(event.related_event_id)) continue;
    correctionByTarget.set(event.related_event_id, event);
  }

  return events
    .filter((event) => event.event_type !== "CORRECTION")
    .map((event) => {
      const correction = correctionByTarget.get(event.id);
      if (!correction) return { ...event, corrected: false };
      if (correction.correction_action === "DELETE") return null;

      return {
        ...event,
        event_type: correction.corrected_event_type || event.event_type,
        happened_at: correction.corrected_happened_at || event.happened_at,
        corrected: true,
        correction_action: correction.correction_action ?? "UPDATE",
        original_event_type: event.event_type,
        original_happened_at: event.happened_at,
        correction_note: correction.note ?? null,
        correction_event_id: correction.id,
      };
    })
    .filter((event): event is EffectiveTimeEvent => event !== null)
    .sort((a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime());
}

export function summarizeWorkdayEvents(events: WorkdaySummaryEvent[]): WorkdaySummary {
  const asc = [...events].sort(
    (a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime(),
  );

  let state: "OUT" | "IN" | "BREAK" = "OUT";
  let openWorkStartMs: number | null = null;
  let totalMs = 0;
  let hasIncompleteSegment = false;

  for (const event of asc) {
    const atMs = new Date(event.happened_at).getTime();
    if (Number.isNaN(atMs)) continue;

    if (event.event_type === "CLOCK_IN") {
      if (state !== "OUT") hasIncompleteSegment = true;
      state = "IN";
      openWorkStartMs = atMs;
      continue;
    }

    if (event.event_type === "BREAK_START") {
      if (state === "IN" && openWorkStartMs !== null) {
        totalMs += Math.max(0, atMs - openWorkStartMs);
        state = "BREAK";
        openWorkStartMs = null;
      } else {
        hasIncompleteSegment = true;
      }
      continue;
    }

    if (event.event_type === "BREAK_END") {
      if (state === "BREAK") {
        state = "IN";
        openWorkStartMs = atMs;
      } else {
        hasIncompleteSegment = true;
      }
      continue;
    }

    if (event.event_type === "CLOCK_OUT") {
      if (state === "IN" && openWorkStartMs !== null) {
        totalMs += Math.max(0, atMs - openWorkStartMs);
      } else if (state !== "OUT") {
        hasIncompleteSegment = true;
      }
      state = "OUT";
      openWorkStartMs = null;
    }
  }

  if (state !== "OUT") hasIncompleteSegment = true;

  return {
    totalClosedMinutes: Math.max(0, Math.round(totalMs / 60000)),
    hasIncompleteSegment,
  };
}
