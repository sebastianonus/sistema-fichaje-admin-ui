import { useEffect, useMemo, useState } from "react";
import { Clock3, LogIn, LogOut, User } from "lucide-react";
import { ensureRole, signInWithRole, signOutAdmin, supabase } from "@/lib/supabase";
import { getMyTimeEvents, getWorkerProfile, sendClockEvent } from "@/lib/worker-api";
import { WorkdayTimeline } from "@/app/components/workday-timeline";

interface WorkerProfile {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  email: string;
}

interface WorkerEvent {
  id: string;
  event_type: string;
  happened_at: string;
  note?: string | null;
}

export default function WorkerApp() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [events, setEvents] = useState<WorkerEvent[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const lastEvent = events[0]?.event_type ?? null;
  const isClockedIn = lastEvent === "CLOCK_IN";

  const workerName = useMemo(() => profile?.full_name || "Trabajador", [profile]);

  const load = async () => {
    try {
      setLoadingData(true);
      setError(null);
      const p = await getWorkerProfile();
      const ev = await getMyTimeEvents();
      setProfile(p);
      setEvents(ev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    async function boot() {
      if (!supabase) {
        setReady(true);
        setAuthed(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      const ok = !!data.session;
      if (!ok) {
        setAuthed(false);
        setReady(true);
        return;
      }

      try {
        await ensureRole("worker");
        setAuthed(true);
        await load();
      } catch (err) {
        setAuthed(false);
        setError(err instanceof Error ? err.message : "Sesion no valida para trabajador");
      } finally {
        setReady(true);
      }
    }

    boot();
  }, []);

  useEffect(() => {
    if (!authed) return;
    const id = window.setInterval(() => {
      load();
    }, 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginLoading(true);
      setError(null);
      await signInWithRole(email.trim(), password, "worker");
      setAuthed(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleClock = async (eventType: "CLOCK_IN" | "CLOCK_OUT") => {
    try {
      setActionLoading(true);
      setError(null);
      await sendClockEvent(eventType);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el evento");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutAdmin();
    setAuthed(false);
    setProfile(null);
    setEvents([]);
  };

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-[#666666]">Cargando...</div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000935] via-[#0a1b6a] to-[#00C9CE]/20 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white border border-[#e5e5e5] rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
          <h1 className="text-2xl font-bold text-[#000935]">Portal trabajador</h1>
          <p className="text-sm text-[#666666]">Inicia sesion para fichar entrada y salida</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="trabajador@empresa.com"
            className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
            required
          />
          {error && <p className="text-sm text-[#dc2626]">{error}</p>}
          <button
            type="submit"
            disabled={loginLoading || !email.trim() || !password.trim()}
            className="w-full px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] disabled:opacity-50"
          >
            {loginLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white border border-[#e5e5e5] rounded-xl p-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#000935]">Portal trabajador</h1>
            <p className="text-sm text-[#666666] mt-1 inline-flex items-center gap-1">
              <User className="w-4 h-4" /> {workerName} ({profile?.email})
            </p>
          </div>
          <button onClick={handleLogout} className="px-3 py-2 border border-[#e5e5e5] rounded-lg text-[#000935] hover:bg-[#f9f9f9]">
            Cerrar sesion
          </button>
        </div>

        <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
          <h2 className="font-semibold text-[#000935] mb-3 inline-flex items-center gap-2">
            <Clock3 className="w-4 h-4" /> Estado de fichaje
          </h2>
          <p className="text-sm text-[#666666] mb-4">
            {profile?.is_active
              ? (isClockedIn ? "Tienes fichaje abierto (entrada registrada)." : "No tienes fichaje abierto.")
              : "Tu usuario esta inactivo. Contacta con administracion."}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => handleClock("CLOCK_IN")}
              disabled={!profile?.is_active || isClockedIn || actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d] disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" /> Fichar entrada
            </button>
            <button
              onClick={() => handleClock("CLOCK_OUT")}
              disabled={!profile?.is_active || !isClockedIn || actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#dc2626] text-white rounded-lg hover:bg-[#b91c1c] disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" /> Fichar salida
            </button>
          </div>
          {error && <p className="text-sm text-[#dc2626] mt-3">{error}</p>}
        </div>

        <WorkdayTimeline events={events} title="Linea de fichaje de hoy" />

        <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
          <h2 className="font-semibold text-[#000935] mb-3">Ultimos eventos</h2>
          {loadingData ? (
            <p className="text-sm text-[#666666]">Cargando...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-[#666666]">Sin eventos registrados.</p>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="p-3 rounded-lg bg-[#f9f9f9] flex items-center justify-between">
                  <span className="text-sm font-medium text-[#000935]">{ev.event_type}</span>
                  <span className="text-sm text-[#666666]">{new Date(ev.happened_at).toLocaleString("es-ES")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
