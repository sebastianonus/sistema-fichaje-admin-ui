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

  it.each([
    ["CLOCK_IN", "Inicio de servicio"],
    ["BREAK_START", "Inicio pausa"],
    ["BREAK_END", "Final pausa"],
    ["CLOCK_OUT", "Fin de servicio"],
  ])("renders %s for an external collaborator", (eventType, expected) => {
    expect(formatClockEventLabel(eventType, "EXTERNAL")).toBe(expected);
  });
});
