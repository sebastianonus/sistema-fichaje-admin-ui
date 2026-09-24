import { describe, expect, it } from "vitest";
import { formatClockEventLabel } from "@/lib/time-event-labels";

describe("formatClockEventLabel", () => {
  it.each([
    ["CLOCK_IN", "Entrada"],
    ["BREAK_START", "Inicio pausa"],
    ["BREAK_END", "Final pausa"],
    ["CLOCK_OUT", "Salida"],
  ])("renders %s as a worker-facing label", (eventType, expected) => {
    expect(formatClockEventLabel(eventType)).toBe(expected);
  });

  it("does not expose unknown backend values", () => {
    expect(formatClockEventLabel("INTERNAL_EVENT")).toBe("Evento de fichaje");
  });
});
