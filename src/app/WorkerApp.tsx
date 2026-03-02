import { useEffect, useMemo, useState } from "react";
import { Clock3, Eye, EyeOff, Lock, LogIn, LogOut, Mail, User, X } from "lucide-react";
import { changeCurrentUserPassword, ensureRole, signInWithRole, signOutAdmin, supabase } from "@/lib/supabase";
import { getMyTimeEvents, getWorkerProfile, sendClockEvent } from "@/lib/worker-api";
import { buildEffectiveTimeEvents } from "@/lib/time-events";
import { WorkdayTimeline } from "@/app/components/workday-timeline";
import { TEXTS } from "@/constants/texts";
import logo from "@/assets/e7e41f04542fce7954ea5453ee29ba88235cf6cb.png";
import headerLogo from "@/assets/logo-onus-express-color-2.png";
import workerLoginBg from "@/assets/login/worker-login-bg.jpg";

interface WorkerProfile {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  email: string;
  password_reset_required: boolean;
  password_reset_deadline?: string | null;
  password_changed_at?: string | null;
}

interface WorkerEvent {
  id: string;
  event_type: string;
  happened_at: string;
  note?: string | null;
  related_event_id?: string | null;
  corrected_event_type?: string | null;
  corrected_happened_at?: string | null;
}

function isTodayLocal(value: string) {
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function dayKeyLocal(value: string) {
  return new Date(value).toLocaleDateString("sv-SE");
}

function closedMinutesFromEvents(dayEvents: WorkerEvent[]) {
  const asc = [...dayEvents].sort(
    (a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime(),
  );
  let openIn: WorkerEvent | null = null;
  let total = 0;
  for (const ev of asc) {
    if (ev.event_type === "CLOCK_IN") {
      openIn = ev;
      continue;
    }
    if (ev.event_type === "CLOCK_OUT" && openIn) {
      const minutes = Math.max(
        0,
        Math.round((new Date(ev.happened_at).getTime() - new Date(openIn.happened_at).getTime()) / 60000),
      );
      total += minutes;
      openIn = null;
    }
  }
  return total;
}

export default function WorkerApp() {
  const t = TEXTS.workerPortal;
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [events, setEvents] = useState<WorkerEvent[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [resetCurrentPassword, setResetCurrentPassword] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [dismissedResetModal, setDismissedResetModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);

  const effectiveEvents = useMemo(() => buildEffectiveTimeEvents(events), [events]);
  const lastEvent = effectiveEvents[0]?.event_type ?? null;
  const isClockedIn = lastEvent === "CLOCK_IN";

  const mustChangePassword = profile?.password_reset_required === true;
  const resetDeadline = profile?.password_reset_deadline ? new Date(profile.password_reset_deadline) : null;
  const deadlineDayStart = resetDeadline
    ? new Date(resetDeadline.getFullYear(), resetDeadline.getMonth(), resetDeadline.getDate()).getTime()
    : null;
  const isDeadlineDayOrLater = deadlineDayStart !== null ? Date.now() >= deadlineDayStart : false;
  const resetDeadlineExpired = resetDeadline ? Date.now() > resetDeadline.getTime() : false;
  const showPasswordResetModal = mustChangePassword && (!dismissedResetModal || isDeadlineDayOrLater);
  const canClosePasswordResetModal = mustChangePassword && !isDeadlineDayOrLater;
  const passwordChangeBlocksClock = mustChangePassword && resetDeadlineExpired;

  const workerName = useMemo(() => profile?.full_name || t.fallbackWorkerName, [profile]);
  const groupedEvents = useMemo(() => {
    const grouped = new Map<string, WorkerEvent[]>();
    for (const ev of effectiveEvents) {
      const key = dayKeyLocal(ev.happened_at);
      const bucket = grouped.get(key);
      if (bucket) bucket.push(ev);
      else grouped.set(key, [ev]);
    }
    return [...grouped.entries()].map(([key, dayEvents]) => ({
      key,
      label: new Date(`${key}T00:00:00`).toLocaleDateString("es-ES"),
      events: dayEvents,
      totalClosedMinutes: closedMinutesFromEvents(dayEvents),
    }));
  }, [effectiveEvents]);

  const workedStats = useMemo(() => {
    const asc = [...effectiveEvents].sort(
      (a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime(),
    );

    let openClockIn: WorkerEvent | null = null;
    const durationByClockOutId = new Map<string, number>();
    let totalClosedMinutesToday = 0;

    for (const ev of asc) {
      if (ev.event_type === "CLOCK_IN") {
        openClockIn = ev;
        continue;
      }

      if (ev.event_type === "CLOCK_OUT" && openClockIn) {
        const inTime = new Date(openClockIn.happened_at).getTime();
        const outTime = new Date(ev.happened_at).getTime();
        const minutes = Math.max(0, Math.round((outTime - inTime) / 60000));
        durationByClockOutId.set(ev.id, minutes);

        if (isTodayLocal(openClockIn.happened_at) && isTodayLocal(ev.happened_at)) {
          totalClosedMinutesToday += minutes;
        }

        openClockIn = null;
      }
    }

    return {
      durationByClockOutId,
      totalClosedMinutesToday,
      hasClosedToday: totalClosedMinutesToday > 0,
    };
  }, [effectiveEvents]);

  const load = async () => {
    try {
      setLoadingData(true);
      setError(null);
      const p = await getWorkerProfile();
      const ev = await getMyTimeEvents();
      setProfile(p);
      setEvents(ev as WorkerEvent[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.generic);
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
        setError(err instanceof Error ? err.message : t.errors.invalidSession);
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

  useEffect(() => {
    if (!mustChangePassword) {
      setDismissedResetModal(false);
    }
  }, [mustChangePassword]);

  useEffect(() => {
    const isStandaloneMode = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      ((window.navigator as Navigator & { standalone?: boolean }).standalone === true);

    const isIosSafari = () => {
      const ua = window.navigator.userAgent;
      const isIos = /iphone|ipad|ipod/i.test(ua);
      const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
      return isIos && isSafari;
    };

    const updateInstallState = () => {
      const standalone = isStandaloneMode();
      setIsStandalone(standalone);
      setShowIosInstallHint(!standalone && isIosSafari());
    };

    updateInstallState();
    const media = window.matchMedia("(display-mode: standalone)");
    const onModeChange = () => updateInstallState();
    media.addEventListener("change", onModeChange);

    return () => {
      media.removeEventListener("change", onModeChange);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginLoading(true);
      setError(null);
      await signInWithRole(email.trim(), password, "worker");
      setAuthed(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.login.errors.workerLoginError);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleMandatoryPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCurrentPassword.trim() || !resetNewPassword.trim()) return;

    try {
      setResetSaving(true);
      setResetError(null);

      if (resetCurrentPassword.trim() === resetNewPassword.trim()) {
        throw new Error(t.passwordModal.samePasswordError);
      }

      await changeCurrentUserPassword(resetCurrentPassword.trim(), resetNewPassword.trim());
      setResetCurrentPassword("");
      setResetNewPassword("");
      await load();
    } catch (err) {
      setResetError(err instanceof Error ? err.message : t.passwordModal.updateError);
    } finally {
      setResetSaving(false);
    }
  };

  const handleClock = async (eventType: "CLOCK_IN" | "CLOCK_OUT") => {
    try {
      setActionLoading(true);
      setError(null);
      await sendClockEvent(eventType);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.clockError);
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
    return <div className="min-h-screen flex items-center justify-center text-[#666666]">{t.loading}</div>;
  }

  if (!authed) {
    return (
      <div
        className="login-bg-worker min-h-screen flex items-center justify-center p-4 bg-cover bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 9, 53, 0.66), rgba(0, 9, 53, 0.5)), url(${workerLoginBg})`,
        }}
      >
        <div className="w-full max-w-md bg-white/92 backdrop-blur-[2px] rounded-2xl shadow-2xl border border-[#d9e3ee] overflow-hidden">
          <div className="px-6 py-5 bg-[#00C9CE] text-white">
            <img src={logo} alt="ONUS" className="h-8 mb-3 brightness-0 invert" />
            <h1 className="text-white text-2xl font-bold">{t.loginTitle}</h1>
            <p className="text-white/90 mt-1">{t.loginSubtitle}</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block mb-2">{TEXTS.login.fields.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={TEXTS.login.placeholders.workerEmail}
                  className="w-full pl-10 pr-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-2">{TEXTS.login.fields.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={TEXTS.login.placeholders.passwordMask}
                  className="w-full pl-10 pr-10 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#666666] hover:text-[#000935]"
                  aria-label={showPassword ? TEXTS.login.aria.hidePassword : TEXTS.login.aria.showPassword}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-[#dc2626]">{error}</p>}

            <button
              type="submit"
              disabled={loginLoading || !email.trim() || !password.trim()}
              className="w-full px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] disabled:opacity-50"
            >
              {loginLoading ? TEXTS.login.actions.loggingIn : TEXTS.login.actions.login}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 md:p-5">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <img src={headerLogo} alt="ONUS Express" className="h-7 md:h-8 w-auto mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-[#000935] leading-tight">{t.title}</h1>
                </div>
              </div>
              <button onClick={handleLogout} className="px-3 py-2 border border-[#e5e5e5] rounded-lg text-[#000935] hover:bg-[#f9f9f9] whitespace-nowrap">
                {t.actions.closeSession}
              </button>
            </div>
            <p className="text-sm text-[#666666] inline-flex items-start gap-1 break-words">
              <User className="w-4 h-4 shrink-0 mt-0.5" /> <span className="break-all">{workerName} ({profile?.email})</span>
            </p>
          </div>
        </div>
        {showIosInstallHint && !isStandalone && (
          <div className="bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm text-[#666666]">
            {t.status.iosInstallHint}
          </div>
        )}

        <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
          <h2 className="font-semibold text-[#000935] mb-3 inline-flex items-center gap-2">
            <Clock3 className="w-4 h-4" /> {t.sections.clockStatus}
          </h2>
          <p className="text-sm text-[#666666] mb-4">
            {profile?.is_active
              ? (isClockedIn ? t.status.openClock : t.status.noOpenClock)
              : t.status.inactiveUser}
          </p>
          {workedStats.hasClosedToday && (
            <p className="text-sm text-[#0f766e] mb-4">
              {t.status.workedToday} {formatMinutes(workedStats.totalClosedMinutesToday)}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleClock("CLOCK_IN")}
              disabled={!profile?.is_active || isClockedIn || actionLoading || passwordChangeBlocksClock}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d] disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" /> {t.actions.clockIn}
            </button>
            <button
              onClick={() => handleClock("CLOCK_OUT")}
              disabled={!profile?.is_active || !isClockedIn || actionLoading || passwordChangeBlocksClock}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#dc2626] text-white rounded-lg hover:bg-[#b91c1c] disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" /> {t.actions.clockOut}
            </button>
          </div>
          {mustChangePassword && (
            <p className="text-sm text-[#856404] mt-3">
              {passwordChangeBlocksClock ? t.status.passwordChangeBlocking : t.status.passwordChangePending}
            </p>
          )}
          {error && <p className="text-sm text-[#dc2626] mt-3">{error}</p>}
        </div>

        <WorkdayTimeline events={effectiveEvents} title={t.sections.timelineTitle} />

        <div className="bg-white border border-[#e5e5e5] rounded-xl p-5">
          <h2 className="font-semibold text-[#000935] mb-3">{t.sections.latestEvents}</h2>
          {loadingData ? (
            <p className="text-sm text-[#666666]">{t.loading}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-[#666666]">{t.status.noEvents}</p>
          ) : (
            <div className="space-y-3">
              {groupedEvents.map((group, idx) => (
                <details key={group.key} className="border border-[#e5e5e5] rounded-lg bg-white" open={idx === 0}>
                  <summary className="list-none cursor-pointer p-3 flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#0f766e]">{t.status.journeyLabel} {group.label}</span>
                    <span className="text-[#475569]">
                      {t.status.totalLabel} {group.totalClosedMinutes > 0 ? formatMinutes(group.totalClosedMinutes) : t.status.noClosedSegments}
                    </span>
                  </summary>
                  <div className="px-3 pb-3 space-y-2">
                    {group.events.map((ev) => (
                      <div key={ev.id} className="p-3 rounded-lg bg-[#f9f9f9] flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#000935]">{ev.event_type}</span>
                          {ev.event_type === "CLOCK_OUT" && workedStats.durationByClockOutId.has(ev.id) && (
                            <span className="text-xs text-[#0f766e]">
                              {t.status.segmentTotal} {formatMinutes(workedStats.durationByClockOutId.get(ev.id) ?? 0)}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-[#666666]">
                          {new Date(ev.happened_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPasswordResetModal && (
        <div className="fixed inset-0 z-50 bg-[#000935]/65 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#d9e3ee] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 bg-[#00C9CE] text-white flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">{t.passwordModal.title}</h2>
                <p className="text-sm text-white/90 mt-1">
                  {resetDeadline
                    ? `${t.passwordModal.messageWithDeadlinePrefix} ${resetDeadline.toLocaleDateString("es-ES")}.`
                    : t.passwordModal.messageNoDeadline}
                </p>
                {canClosePasswordResetModal && (
                  <p className="text-xs text-white/85 mt-2">
                    {t.passwordModal.dismissHint}
                  </p>
                )}
                {resetDeadlineExpired && (
                  <p className="text-sm font-semibold text-white mt-2">{t.passwordModal.deadlineExpired}</p>
                )}
              </div>
              {canClosePasswordResetModal && (
                <button
                  type="button"
                  onClick={() => setDismissedResetModal(true)}
                  className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full border border-white/80 text-white !bg-transparent hover:bg-white/15"
                  style={{ backgroundColor: "transparent" }}
                  aria-label={t.passwordModal.closeAria}
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
            <form onSubmit={handleMandatoryPasswordChange} className="p-6 space-y-4">
              <div>
                <label className="block mb-2">{t.passwordModal.currentPassword}</label>
                <input
                  type="password"
                  value={resetCurrentPassword}
                  onChange={(e) => setResetCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                  required
                />
              </div>
              <div>
                <label className="block mb-2">{t.passwordModal.newPassword}</label>
                <input
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                  required
                />
              </div>
              {resetError && <p className="text-sm text-[#dc2626]">{resetError}</p>}
              <button
                type="submit"
                disabled={!resetCurrentPassword.trim() || !resetNewPassword.trim() || resetSaving}
                className="w-full px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] disabled:opacity-50"
              >
                {resetSaving ? t.actions.updatingPassword : t.actions.updatePassword}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
