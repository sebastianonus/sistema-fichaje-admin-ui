import { describe, expect, it } from "vitest";
import { buildWorkdayTimeline } from "@/app/components/workday-timeline";

function event(id: string, eventType: string, happenedAt: string) {
  return { id, event_type: eventType, happened_at: happenedAt };
}

describe("buildWorkdayTimeline", () => {
  it("draws the worked periods around a completed break", () => {
    const result = buildWorkdayTimeline([
      event("1", "CLOCK_IN", "2026-09-24T08:00:00"),
      event("2", "BREAK_START", "2026-09-24T13:00:00"),
      event("3", "BREAK_END", "2026-09-24T13:30:00"),
      event("4", "CLOCK_OUT", "2026-09-24T16:00:00"),
    ], new Date("2026-09-24T17:00:00"));

    expect(result.segments).toEqual([
      { start: 480, end: 780 },
      { start: 810, end: 960 },
    ]);
    expect(result.hasOpenSegment).toBe(false);
  });

  it("continues an open shift from midnight", () => {
    const result = buildWorkdayTimeline([
      event("1", "CLOCK_IN", "2026-09-23T22:00:00"),
    ], new Date("2026-09-24T02:00:00"));

    expect(result.segments).toEqual([{ start: 0, end: 120 }]);
    expect(result.hasOpenSegment).toBe(true);
    expect(result.openHandleMinute).toBe(120);
  });

  it("draws work from midnight until a break started today", () => {
    const result = buildWorkdayTimeline([
      event("1", "CLOCK_IN", "2026-09-23T22:00:00"),
      event("2", "BREAK_START", "2026-09-24T01:00:00"),
    ], new Date("2026-09-24T02:00:00"));

    expect(result.segments).toEqual([{ start: 0, end: 60 }]);
    expect(result.hasOpenSegment).toBe(false);
  });

  it("resumes today from a break that started yesterday", () => {
    const result = buildWorkdayTimeline([
      event("1", "CLOCK_IN", "2026-09-23T20:00:00"),
      event("2", "BREAK_START", "2026-09-23T23:00:00"),
      event("3", "BREAK_END", "2026-09-24T01:30:00"),
    ], new Date("2026-09-24T03:00:00"));

    expect(result.segments).toEqual([{ start: 90, end: 180 }]);
    expect(result.hasOpenSegment).toBe(true);
  });

  it("does not draw events that are in the future", () => {
    const result = buildWorkdayTimeline([
      event("1", "CLOCK_IN", "2026-09-24T16:00:00"),
    ], new Date("2026-09-24T15:00:00"));

    expect(result.segments).toEqual([]);
    expect(result.hasOpenSegment).toBe(false);
  });
});
