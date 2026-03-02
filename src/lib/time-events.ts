export type RawTimeEvent = {
  id: string;
  event_type: string;
  happened_at: string;
  note?: string | null;
  related_event_id?: string | null;
  corrected_event_type?: string | null;
  corrected_happened_at?: string | null;
};

export type EffectiveTimeEvent = RawTimeEvent & {
  corrected?: boolean;
  original_event_type?: string;
  original_happened_at?: string;
  correction_note?: string | null;
  correction_event_id?: string;
};

export function buildEffectiveTimeEvents(events: RawTimeEvent[]): EffectiveTimeEvent[] {
  const correctionByTarget = new Map<string, RawTimeEvent>();

  for (const event of events) {
    if (event.event_type !== "CORRECTION" || !event.related_event_id) continue;
    correctionByTarget.set(event.related_event_id, event);
  }

  return events
    .filter((event) => event.event_type !== "CORRECTION")
    .map((event) => {
      const correction = correctionByTarget.get(event.id);
      if (!correction) return { ...event, corrected: false };

      return {
        ...event,
        event_type: correction.corrected_event_type || event.event_type,
        happened_at: correction.corrected_happened_at || event.happened_at,
        corrected: true,
        original_event_type: event.event_type,
        original_happened_at: event.happened_at,
        correction_note: correction.note ?? null,
        correction_event_id: correction.id,
      };
    })
    .sort((a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime());
}
