import { useEffect, useMemo, useState } from "react";
import { TEXTS } from "@/constants/texts";

type TimelineEvent = {
  id: string;
  event_type: string;
  happened_at: string;
};

interface WorkdayTimelineProps {
  events: TimelineEvent[];
  title?: string;
}

type Segment = {
  start: number;
  end: number;
};

type TimelineState = "OUT" | "IN" | "BREAK";

const DAY_MINUTES = 24 * 60;

function minuteOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function clampMinute(minute: number) {
  return Math.min(Math.max(minute, 0), DAY_MINUTES);
}

export function buildWorkdayTimeline(events: TimelineEvent[], now: Date) {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const ordered = events
    .map((event) => ({ ...event, date: new Date(event.happened_at) }))
    .filter((event) => !Number.isNaN(event.date.getTime()) && event.date <= now && event.date < dayEnd)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let state: TimelineState = "OUT";
  for (const event of ordered) {
    if (event.date >= dayStart) break;
    if (event.event_type === "CLOCK_IN") state = "IN";
    else if (event.event_type === "BREAK_START" && state === "IN") state = "BREAK";
    else if (event.event_type === "BREAK_END" && state === "BREAK") state = "IN";
    else if (event.event_type === "CLOCK_OUT") state = "OUT";
  }

  const markers = ordered
    .filter((event) => event.date >= dayStart)
    .map((event) => ({
      id: event.id,
      type: event.event_type,
      minute: clampMinute(minuteOfDay(event.date)),
      timeLabel: event.date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    }));

  const segments: Segment[] = [];
  let openStart: number | null = state === "IN" ? 0 : null;
  for (const marker of markers) {
    if (marker.type === "CLOCK_IN" && state === "OUT") {
      state = "IN";
      openStart = marker.minute;
      continue;
    }
    if (marker.type === "BREAK_START" && state === "IN" && openStart !== null) {
      segments.push({ start: clampMinute(openStart), end: clampMinute(marker.minute) });
      state = "BREAK";
      openStart = null;
      continue;
    }
    if (marker.type === "BREAK_END" && state === "BREAK") {
      state = "IN";
      openStart = marker.minute;
      continue;
    }
    if (marker.type === "CLOCK_OUT" && (state === "IN" || state === "BREAK")) {
      if (state === "IN" && openStart !== null) {
        segments.push({ start: clampMinute(openStart), end: clampMinute(marker.minute) });
      }
      state = "OUT";
      openStart = null;
    }
  }

  const nowMinute = clampMinute(minuteOfDay(now));
  const hasOpenSegment = state === "IN" && openStart !== null;
  if (hasOpenSegment && openStart !== null) {
    segments.push({ start: clampMinute(openStart), end: Math.max(clampMinute(openStart), nowMinute) });
  }

  return {
    markers,
    segments,
    hasOpenSegment,
    openHandleMinute: hasOpenSegment ? nowMinute : null,
  };
}

export function WorkdayTimeline({ events, title = TEXTS.timeline.defaultTitle }: WorkdayTimelineProps) {
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const processed = useMemo(() => buildWorkdayTimeline(events, new Date(nowTick)), [events, nowTick]);

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-lg p-4">
      <h3 className="text-[#000935] font-semibold mb-3">{title}</h3>

      <div className="rounded-xl border-2 border-[#00C9CE] bg-[#f7fbfd] p-4">
        <div className="relative h-20">
          <div className="absolute top-0 left-0 right-0 flex justify-between px-1 text-[11px] md:text-sm leading-none font-semibold text-[#2dc3d5]">
            <span>{TEXTS.timeline.hours.start}</span>
            <span>{TEXTS.timeline.hours.six}</span>
            <span>{TEXTS.timeline.hours.twelve}</span>
            <span>{TEXTS.timeline.hours.eighteen}</span>
            <span>{TEXTS.timeline.hours.end}</span>
          </div>

          <div className="absolute top-10 left-0 right-0 h-7 rounded-full border-4 border-[#9b9b9b] bg-[#f8f8f8]">
            <div className="absolute top-1/2 left-[6px] right-[6px] h-3 -translate-y-1/2">
              {processed.segments.map((s, i) => {
                const startPct = (clampMinute(s.start) / DAY_MINUTES) * 100;
                const endPct = (clampMinute(s.end) / DAY_MINUTES) * 100;
                const widthPct = Math.max(endPct - startPct, 0);

                return (
                  <div
                    key={`${s.start}-${s.end}-${i}`}
                    className="absolute top-0 h-3 rounded-full bg-[#2dc3d5]"
                    style={{
                      left: `${startPct}%`,
                      width: `max(${widthPct}%, 2px)`,
                    }}
                  />
                );
              })}

              {processed.hasOpenSegment && processed.openHandleMinute !== null && (
                <div
                  className="absolute top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#7ee83d] shadow-[0_0_0_2px_#2dc3d5]"
                  style={{
                    left: `${(clampMinute(processed.openHandleMinute) / DAY_MINUTES) * 100}%`,
                  }}
                  aria-label={TEXTS.timeline.currentPointAria}
                  title={`${TEXTS.timeline.activeTitlePrefix} - ${new Date(nowTick).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
