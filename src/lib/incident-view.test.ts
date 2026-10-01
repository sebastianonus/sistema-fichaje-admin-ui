import { describe, expect, it } from "vitest";
import { getIncidentView } from "./incident-view";

describe("getIncidentView", () => {
  it("identifies a completed shift overrun as a warning", () => {
    const view = getIncidentView({
      incident_type: "SHIFT_OVERRUN",
      status: "OPEN",
      related_event: {
        event_type: "CLOCK_OUT",
        happened_at: "2026-10-01T18:00:00.000Z",
      },
      clock_in_at: "2026-10-01T08:00:00.000Z",
    });

    expect(view.shortTitle).toBe("Horario excedido");
    expect(view.tone).toBe("warning");
    expect(view.eventToCorrect).toBe("CLOCK_OUT");
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
