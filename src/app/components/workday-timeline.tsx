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
      minute: minuteOfDay(e.date),
      timeLabel: e.date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    }));

    const segments: Segment[] = [];
    let openStart: number | null = null;
    for (const m of markers) {
      if (m.type === "CLOCK_IN") openStart = m.minute;
      if (m.type === "CLOCK_OUT" && openStart !== null) {
        segments.push({ start: openStart, end: m.minute });
        openStart = null;
      }
    }
    const hasOpenSegment = openStart !== null;
    if (openStart !== null) segments.push({ start: openStart, end: nowMinute });

    return { markers, segments, hasOpenSegment, openHandleMinute: hasOpenSegment ? nowMinute : null };
  }, [events, nowMinute]);

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
      <h3 className="text-[#000935] font-semibold mb-4">{title}</h3>

      <div className="rounded-3xl border-4 border-[#00C9CE] bg-[#f7fbfd] p-5">
        <div className="relative h-28">
          <div className="absolute top-1 left-0 right-0 text-center text-[44px] leading-none font-semibold text-[#2dc3d5]">
            {new Date(nowTick).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </div>

          <div className="absolute top-[68px] left-0 right-0 h-[6px] bg-[#9ca3af]" />
          <div className="absolute top-[94px] left-0 right-0 h-[6px] bg-[#9ca3af]" />

          {processed.segments.map((s, i) => (
            <div
              key={`${s.start}-${s.end}-${i}`}
              className="absolute top-[74px] h-5 rounded-full bg-[#2dc3d5]"
              style={{
                left: `${(s.start / DAY_MINUTES) * 100}%`,
                width: `${Math.max(((s.end - s.start) / DAY_MINUTES) * 100, 2.6)}%`,
              }}
            />
          ))}

          {processed.hasOpenSegment && processed.openHandleMinute !== null && (
            <div
              className="absolute top-[71px] h-[24px] w-[24px] rounded-full border-[4px] border-white bg-[#7ee83d] shadow-[0_0_0_3px_#2dc3d5]"
              style={{
                left: `calc(${(processed.openHandleMinute / DAY_MINUTES) * 100}% - 12px)`,
              }}
              aria-label="Punto actual de jornada"
              title={`Jornada activa - ${new Date(nowTick).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
