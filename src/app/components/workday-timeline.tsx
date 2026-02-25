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
        <div className="relative h-24">
          <div className="absolute top-3 left-0 right-0 flex justify-between text-xs font-semibold text-[#00C9CE]">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>

          <div className="absolute top-11 left-0 right-0 h-5 rounded-full border-2 border-[#a3a3a3] bg-white" />

          {processed.segments.map((s, i) => (
            <div
              key={`${s.start}-${s.end}-${i}`}
              className="absolute top-[47px] h-3 rounded-full bg-[#00C9CE]/70"
              style={{
                left: `${(s.start / DAY_MINUTES) * 100}%`,
                width: `${Math.max(((s.end - s.start) / DAY_MINUTES) * 100, 0.6)}%`,
              }}
            />
          ))}

          <div
            className="absolute top-[38px] h-9 w-[2px] bg-[#111827]"
            style={{ left: `${(nowMinute / DAY_MINUTES) * 100}%` }}
            aria-label="Hora actual"
            title={`Ahora: ${new Date(nowTick).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`}
          />

          {processed.markers.map((m) => (
            <div
              key={m.id}
              className={`absolute top-[45px] h-4 w-[3px] rounded-full ${
                m.type === "CLOCK_IN" ? "bg-[#16a34a]" : "bg-[#dc2626]"
              }`}
              style={{
                left: `calc(${(m.minute / DAY_MINUTES) * 100}% - 1px)`,
              }}
              title={`${m.type} - ${m.timeLabel}`}
            />
          ))}

          {processed.hasOpenSegment && processed.openHandleMinute !== null && (
            <div
              className="absolute top-[43px] h-[18px] w-[18px] rounded-full border-2 border-white bg-[#22c55e]/15 ring-1 ring-[#16a34a]/70"
              style={{
                left: `calc(${(processed.openHandleMinute / DAY_MINUTES) * 100}% - 9px)`,
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
