import { describe, expect, it } from "vitest";
import { summarizeWorkdayEvents } from "./time-events";

describe("summarizeWorkdayEvents", () => {
  it("marks a day with an unclosed break as incomplete", () => {
    const summary = summarizeWorkdayEvents([
      { event_type: "CLOCK_OUT", happened_at: "2026-05-25T18:06:42.000Z" },
      { event_type: "BREAK_START", happened_at: "2026-05-25T13:58:18.000Z" },
      { event_type: "CLOCK_IN", happened_at: "2026-05-25T08:57:23.000Z" },
    ]);

    expect(summary).toEqual({
      totalClosedMinutes: 301,
      hasIncompleteSegment: true,
    });
  });

  it("adds both work segments when the break is closed", () => {
    const summary = summarizeWorkdayEvents([
      { event_type: "CLOCK_IN", happened_at: "2026-05-25T08:57:23.000Z" },
      { event_type: "BREAK_START", happened_at: "2026-05-25T13:58:18.000Z" },
      { event_type: "BREAK_END", happened_at: "2026-05-25T14:30:00.000Z" },
      { event_type: "CLOCK_OUT", happened_at: "2026-05-25T18:06:42.000Z" },
    ]);

    expect(summary).toEqual({
      totalClosedMinutes: 518,
      hasIncompleteSegment: false,
    });
  });
});
