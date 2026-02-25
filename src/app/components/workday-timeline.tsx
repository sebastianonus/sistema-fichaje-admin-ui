import { useEffect, useMemo, useState } from "react";

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

const DAY_MINUTES = 24 * 60;

function minuteOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function clampMinute(minute: number) {
  return Math.min(Math.max(minute, 0), DAY_MINUTES);
}

function isToday(d: Date) {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function WorkdayTimeline({ events, title = "Jornada en tiempo real" }: WorkdayTimelineProps) {
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const nowMinute = useMemo(() => minuteOfDay(new Date(nowTick)), [nowTick]);

  const processed = useMemo(() => {
    const todays = events
      .map((e) => ({ ...e, date: new Date(e.happened_at) }))
      .filter((e) => isToday(e.date))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const markers = todays.map((e) => ({
      id: e.id,
      type: e.event_type,
      minute: clampMinute(minuteOfDay(e.date)),
      timeLabel: e.date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    }));

    const segments: Segment[] = [];
    let openStart: number | null = null;
    for (const m of markers) {
      if (m.type === "CLOCK_IN") openStart = m.minute;
      if (m.type === "CLOCK_OUT" && openStart !== null) {
        segments.push({ start: clampMinute(openStart), end: clampMinute(m.minute) });
        openStart = null;
      }
    }
    const hasOpenSegment = openStart !== null;
    if (openStart !== null) segments.push({ start: clampMinute(openStart), end: clampMinute(nowMinute) });

    return { markers, segments, hasOpenSegment, openHandleMinute: hasOpenSegment ? nowMinute : null };
  }, [events, nowMinute]);

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
      <h3 className="text-[#000935] font-semibold mb-4">{title}</h3>

      <div className="rounded-3xl border-4 border-[#00C9CE] bg-[#f7fbfd] p-5">
        <div className="relative h-24">
          <div className="absolute top-0 left-0 right-0 flex justify-between px-1 text-[12px] md:text-[16px] leading-none font-semibold text-[#2dc3d5]">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>

          <div className="absolute top-[48px] left-0 right-0 h-8 rounded-full border-[5px] border-[#9b9b9b] bg-[#f8f8f8]">
            <div className="absolute top-1/2 left-[6px] right-[6px] h-[14px] -translate-y-1/2">
              {processed.segments.map((s, i) => {
                const startPct = (clampMinute(s.start) / DAY_MINUTES) * 100;
                const endPct = (clampMinute(s.end) / DAY_MINUTES) * 100;
                const widthPct = Math.max(endPct - startPct, 0);

                return (
                  <div
                    key={`${s.start}-${s.end}-${i}`}
                    className="absolute top-0 h-[14px] rounded-full bg-[#2dc3d5]"
                    style={{
                      left: `${startPct}%`,
                      width: `max(${widthPct}%, 2px)`,
                    }}
                  />
                );
              })}

              {processed.hasOpenSegment && processed.openHandleMinute !== null && (
                <div
                  className="absolute top-1/2 h-[20px] w-[20px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#7ee83d] shadow-[0_0_0_2px_#2dc3d5]"
                  style={{
                    left: `${(clampMinute(processed.openHandleMinute) / DAY_MINUTES) * 100}%`,
                  }}
                  aria-label="Punto actual de jornada"
                  title={`Jornada activa - ${new Date(nowTick).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
