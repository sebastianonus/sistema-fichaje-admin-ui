import { describe, expect, it } from "vitest";
import { addNetWorkdayTarget, addWorkdayTarget, getIncidentView } from "./incident-view";

describe("getIncidentView", () => {
  it("uses an 8-hour workday when no pause is registered", () => {
    expect(addWorkdayTarget("2026-10-01T08:00:00.000Z")).toBe("2026-10-01T16:00:00.000Z");
    expect(addNetWorkdayTarget("2026-10-01T08:00:00.000Z", [])).toBe("2026-10-01T16:00:00.000Z");
  });

  it("adds an optional pause to the expected clock-out", () => {
    expect(addNetWorkdayTarget("2026-10-01T08:00:00.000Z", [
      { event_type: "BREAK_START", happened_at: "2026-10-01T12:00:00.000Z" },
      { event_type: "BREAK_END", happened_at: "2026-10-01T12:30:00.000Z" },
    ])).toBe("2026-10-01T16:30:00.000Z");
  });

  it("identifies a completed shift overrun as a warning", () => {
    const view = getIncidentView({
      incident_type: "SHIFT_OVERRUN",
      status: "OPEN",
      related_event: {
        event_type: "CLOCK_OUT",
        happened_at: "2026-10-01T18:00:00.000Z",
      },
      clock_in_at: "2026-10-01T08:00:00.000Z",
      timeline_events: [
        { event_type: "BREAK_START", happened_at: "2026-10-01T12:00:00.000Z" },
        { event_type: "BREAK_END", happened_at: "2026-10-01T12:30:00.000Z" },
      ],
    });

    expect(view.shortTitle).toBe("Horario excedido");
    expect(view.description).toBe("La jornada supera las 8h.");
    expect(view.tone).toBe("warning");
    expect(view.eventToCorrect).toBe("CLOCK_OUT");
    expect(view.netWorkedValue).toBe("9h 30m");
    expect(view.breakValue).toBe("30m de pausa descontada");
  });

  it("keeps a genuinely open shift as a missing clock-out", () => {
    const view = getIncidentView({
      incident_type: "LONG_OPEN_SHIFT",
      status: "OPEN",
      related_event: {
        event_type: "CLOCK_IN",
        happened_at: "2026-10-01T08:00:00.000Z",
      },
    });

    expect(view.shortTitle).toBe("Falta salida");
    expect(view.description).toBe("No hay salida tras 8h de jornada.");
    expect(view.breakValue).toBe("-");
    expect(view.tone).toBe("danger");
  });

  it("recognizes legacy overrun records from their clock-out event", () => {
    const view = getIncidentView({
      incident_type: "LONG_OPEN_SHIFT",
      status: "OPEN",
      related_event: {
        event_type: "CLOCK_OUT",
        happened_at: "2026-10-01T18:00:00.000Z",
      },
    });

    expect(view.shortTitle).toBe("Horario excedido");
    expect(view.tone).toBe("warning");
  });
});
