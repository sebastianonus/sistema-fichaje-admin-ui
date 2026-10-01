import { useEffect, useMemo, useState } from "react";
import { Clock3, Eye, EyeOff, Lock, LogIn, LogOut, Mail, User, X } from "lucide-react";
import { changeCurrentUserPassword, signInWithRole, signOutAdmin, signOutWorker, supabase } from "@/lib/supabase";
import { acceptWorkerTerms, getMyTimeEvents, getWorkerProfile, getWorkerTermsStatus, sendClockEvent } from "@/lib/worker-api";
import { buildEffectiveTimeEvents } from "@/lib/time-events";
import { formatClockEventLabel } from "@/lib/time-event-labels";
import { isSessionReplacedError, validateWorkerDeviceSession } from "@/lib/device-session";
import { WorkdayTimeline } from "@/app/components/workday-timeline";
import { TEXTS } from "@/constants/texts";
import { DEFAULT_WORKDAY_MINUTES } from "@/lib/workday-policy";
import logo from "@/assets/e7e41f04542fce7954ea5453ee29ba88235cf6cb.png";
import headerLogo from "@/assets/logo-onus-express-color-2.png";
import workerLoginBg from "@/assets/login/worker-login-bg.jpg";

interface WorkerProfile {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  relationship_type: "EMPLOYEE" | "EXTERNAL";
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
  correction_action?: string | null;
  corrected_event_type?: string | null;
  corrected_happened_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  gps_accuracy_m?: number | null;
}

type ClockLocation = {
  latitude: number;
  longitude: number;
  gps_accuracy_m: number | null;
};

const SHIFT_TARGET_MINUTES = DEFAULT_WORKDAY_MINUTES;
const SHIFT_REMINDER_BUFFER_MINUTES = 15;
const WORKER_TERMS_VERSION = "v1.2-2026-09-29";
const WORKER_TERMS_DOC_URL = (import.meta.env.VITE_WORKER_TERMS_DOC_URL as string | undefined)?.trim() || "";
const WORKER_PRIVACY_DOC_URL = (import.meta.env.VITE_WORKER_PRIVACY_DOC_URL as string | undefined)?.trim() || "";
const APP_VERSION_LABEL = (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim() || "worker-portal";
const WORKER_TERMS_READING_TEXT = [
  "1. Uso del sistema: El portal de fichaje solo puede utilizarse para registrar de forma veraz tu hora de entrada, pausa y salida durante tu jornada laboral.",
  "2. Credenciales personales: Esta prohibido compartir el email, la contrasena o cualquier medio de acceso. La cuenta es personal e intransferible.",
  "3. Dispositivo autorizado: Solo puedes iniciar sesion desde un dispositivo de tu propiedad y bajo tu control exclusivo. No se permite utilizar dispositivos publicos, compartidos o de terceros.",
  "4. Una sola sesion: Solo puede existir una sesion activa por cuenta. Al acceder desde otro dispositivo, la sesion anterior quedara sustituida y administracion recibira una alerta.",
  "5. Datos de seguridad: Se registran el identificador tecnico del dispositivo, navegador, plataforma, direccion IP y fechas de acceso para prevenir usos indebidos y mantener la auditoria.",
  "6. Veracidad del fichaje: Debes fichar en el momento real de inicio y fin de trabajo. Queda prohibido fichar por otra persona o manipular registros.",
  "7. Geolocalizacion: El sistema puede registrar ubicacion y precision GPS unicamente para verificar la trazabilidad del fichaje.",
  "8. Correcciones e incidencias: Si detectas un error, debes comunicarlo a administracion para su revision y, si procede, correccion auditada.",
  "9. Proteccion de datos: Los datos se tratan para control horario, seguridad de acceso, cumplimiento normativo y gestion laboral interna, y se conservan durante los plazos aplicables.",
  "10. Aceptacion: Al marcar la casilla y continuar, declaras que has leido y comprendido estas condiciones y la informacion de proteccion de datos.",
].join("\n\n");
const EXTERNAL_TERMS_READING_TEXT = [
  "1. Uso del sistema: El portal se utiliza para registrar de forma veraz el inicio, las pausas y el final de los servicios prestados.",
  "2. Credenciales personales: Esta prohibido compartir el email, la contrasena o cualquier medio de acceso. La cuenta es personal e intransferible.",
  "3. Dispositivo autorizado: Solo puedes iniciar sesion desde un dispositivo de tu propiedad y bajo tu control exclusivo. No se permite utilizar dispositivos publicos, compartidos o de terceros.",
  "4. Una sola sesion: Solo puede existir una sesion activa por cuenta. Al acceder desde otro dispositivo, la sesion anterior quedara sustituida y administracion recibira una alerta.",
  "5. Datos de seguridad: Se registran el identificador tecnico del dispositivo, navegador, plataforma, direccion IP y fechas de acceso para prevenir usos indebidos y mantener la auditoria.",
  "6. Veracidad del registro: Debes registrar cada accion en el momento real. Queda prohibido registrar servicios por otra persona o manipular los datos.",
  "7. Geolocalizacion: El sistema puede registrar ubicacion y precision GPS unicamente para acreditar la trazabilidad de la prestacion.",
  "8. Correcciones: Si detectas un error, debes comunicarlo a administracion para su revision y, si procede, correccion auditada.",
  "9. Finalidad de los datos: Los registros se tratan para verificar los servicios prestados, conciliarlos con los periodos facturados y proteger el acceso a la cuenta.",
  "10. Naturaleza y aceptacion: El registro no altera la naturaleza mercantil de la colaboracion. Al continuar, declaras haber leido estas condiciones y la informacion de proteccion de datos.",
].join("\n\n");

function termsVersionFor(relationshipType?: WorkerProfile["relationship_type"]) {
  return relationshipType === "EXTERNAL" ? `${WORKER_TERMS_VERSION}-external-v1` : WORKER_TERMS_VERSION;
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
  let breakStart: number | null = null;
  let breakAccum = 0;
  let total = 0;
  for (const ev of asc) {
    if (ev.event_type === "CLOCK_IN") {
      openIn = ev;
      breakStart = null;
      breakAccum = 0;
      continue;
    }
    if (ev.event_type === "BREAK_START" && openIn && breakStart === null) {
      breakStart = new Date(ev.happened_at).getTime();
      continue;
    }
    if (ev.event_type === "BREAK_END" && openIn && breakStart !== null) {
      const breakEnd = new Date(ev.happened_at).getTime();
      breakAccum += Math.max(0, breakEnd - breakStart);
      breakStart = null;
      continue;
    }
    if (ev.event_type === "CLOCK_OUT" && openIn) {
      const outMs = new Date(ev.happened_at).getTime();
      if (breakStart !== null) {
        breakAccum += Math.max(0, outMs - breakStart);
      }
      const minutes = Math.max(
        0,
        Math.round((outMs - new Date(openIn.happened_at).getTime() - breakAccum) / 60000),
      );
      total += minutes;
      openIn = null;
      breakStart = null;
      breakAccum = 0;
    }
  }
  return total;
}

function buildWorkerShiftState(events: WorkerEvent[]) {
  const asc = [...events].sort(
    (a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime(),
  );
  let state: "OUT" | "IN" | "BREAK" = "OUT";
  let openClockIn: WorkerEvent | null = null;

  for (const ev of asc) {
    if (ev.event_type === "CLOCK_IN") {
      state = "IN";
      openClockIn = ev;
      continue;
    }
    if (ev.event_type === "BREAK_START") {
      if (state === "IN") state = "BREAK";
      continue;
    }
    if (ev.event_type === "BREAK_END") {
      if (state === "BREAK") state = "IN";
      continue;
    }
    if (ev.event_type === "CLOCK_OUT") {
      if (state === "IN" || state === "BREAK") {
        state = "OUT";
        openClockIn = null;
      }
    }
  }

  return {
    isClockedIn: state === "IN" || state === "BREAK",
    isOnBreak: state === "BREAK",
    openClockIn,
  };
}

async function getCurrentLocation(): Promise<ClockLocation | null> {
  if (!("geolocation" in navigator)) return null;

  return await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          gps_accuracy_m: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        }),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
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
  const [locationWarning, setLocationWarning] = useState<string | null>(null);
  const [showShiftReminder, setShowShiftReminder] = useState(false);
  const [dismissedShiftReminderKey, setDismissedShiftReminderKey] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

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
  const [termsChecking, setTermsChecking] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsSubmitting, setTermsSubmitting] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  const effectiveEvents = useMemo(() => buildEffectiveTimeEvents(events), [events]);
  const shiftState = useMemo(() => buildWorkerShiftState(effectiveEvents), [effectiveEvents]);
  const isOnBreak = shiftState.isOnBreak;
  const isClockedIn = shiftState.isClockedIn;
  const isExternal = profile?.relationship_type === "EXTERNAL";
  const portalSections = isExternal ? t.external.sections : t.sections;
  const portalActions = isExternal ? t.external.actions : t.actions;
  const portalStatus = isExternal ? t.external.status : t.status;
  const activeTermsVersion = termsVersionFor(profile?.relationship_type);

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
  const termsGateBlocked = termsChecking || !termsAccepted;
  const clockBlockedReason = useMemo(() => {
    if (!profile?.is_active) return t.status.inactiveUser;
    if (passwordChangeBlocksClock) return t.status.passwordChangeBlocking;
    if (termsGateBlocked) {
      return termsChecking
        ? "Verificando condiciones de uso..."
        : "Debes aceptar las condiciones de uso y la informacion RGPD para habilitar el fichaje.";
    }
    if (actionLoading) return t.loading;
    return null;
  }, [profile?.is_active, passwordChangeBlocksClock, termsGateBlocked, termsChecking, actionLoading, t]);

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const prefillEmail = qs.get("email")?.trim() || "";
    const prefillPassword = qs.get("password") || "";
    if (prefillEmail) setEmail(prefillEmail);
    if (prefillPassword) setPassword(prefillPassword);
    if (prefillEmail || prefillPassword) {
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);
    }
  }, []);

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
    let openBreakStartMs: number | null = null;
    let openBreakAccumMs = 0;
    const durationByClockOutId = new Map<string, number>();
    let totalClosedMinutesToday = 0;

    for (const ev of asc) {
      if (ev.event_type === "CLOCK_IN") {
        openClockIn = ev;
        openBreakStartMs = null;
        openBreakAccumMs = 0;
        continue;
      }
      if (ev.event_type === "BREAK_START" && openClockIn && openBreakStartMs === null) {
        openBreakStartMs = new Date(ev.happened_at).getTime();
        continue;
      }
      if (ev.event_type === "BREAK_END" && openClockIn && openBreakStartMs !== null) {
        const breakEnd = new Date(ev.happened_at).getTime();
        openBreakAccumMs += Math.max(0, breakEnd - openBreakStartMs);
        openBreakStartMs = null;
        continue;
      }

      if (ev.event_type === "CLOCK_OUT" && openClockIn) {
        const inTime = new Date(openClockIn.happened_at).getTime();
        const outTime = new Date(ev.happened_at).getTime();
        const totalBreakMs = openBreakAccumMs + (openBreakStartMs !== null ? Math.max(0, outTime - openBreakStartMs) : 0);
        const minutes = Math.max(0, Math.round((outTime - inTime - totalBreakMs) / 60000));
        durationByClockOutId.set(ev.id, minutes);

        if (isTodayLocal(openClockIn.happened_at) && isTodayLocal(ev.happened_at)) {
          totalClosedMinutesToday += minutes;
        }

        openClockIn = null;
        openBreakStartMs = null;
        openBreakAccumMs = 0;
      }
    }

    let openMinutesToday = 0;
    if (openClockIn && isTodayLocal(openClockIn.happened_at)) {
      const openBreakMs = openBreakAccumMs + (openBreakStartMs !== null ? Math.max(0, nowTick - openBreakStartMs) : 0);
      openMinutesToday = Math.max(
        0,
        Math.round((nowTick - new Date(openClockIn.happened_at).getTime() - openBreakMs) / 60000),
      );
    }

    return {
      durationByClockOutId,
      totalClosedMinutesToday,
      hasClosedToday: totalClosedMinutesToday > 0,
      openClockIn,
      openMinutesToday,
      totalWorkedMinutesToday: totalClosedMinutesToday + openMinutesToday,
    };
  }, [effectiveEvents, nowTick]);

  const shiftReminderKey = useMemo(() => {
    if (!workedStats.openClockIn) return null;
    return `${dayKeyLocal(workedStats.openClockIn.happened_at)}:${workedStats.openClockIn.id}`;
  }, [workedStats.openClockIn]);

  const shouldShowShiftReminder = Boolean(
    profile?.is_active &&
    !isExternal &&
    isClockedIn &&
    shiftReminderKey &&
    workedStats.totalWorkedMinutesToday >= (SHIFT_TARGET_MINUTES - SHIFT_REMINDER_BUFFER_MINUTES) &&
    workedStats.totalWorkedMinutesToday < SHIFT_TARGET_MINUTES + 60 &&
    dismissedShiftReminderKey !== shiftReminderKey,
  );

  const load = async () => {
    try {
      setLoadingData(true);
      setError(null);
      const p = await getWorkerProfile();
      const ev = await getMyTimeEvents();
      setProfile(p);
      setEvents(ev as WorkerEvent[]);
      return p;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.generic);
      return null;
    } finally {
      setLoadingData(false);
    }
  };

  const loadTermsStatus = async (relationshipType = profile?.relationship_type) => {
    try {
      setTermsChecking(true);
      setTermsError(null);
      const status = await getWorkerTermsStatus(termsVersionFor(relationshipType));
      setTermsAccepted(status.accepted);
      setTermsChecked(status.accepted);
    } catch (err) {
      setTermsAccepted(false);
      setTermsChecked(false);
      setTermsError(err instanceof Error ? err.message : "No se pudo verificar la aceptacion de terminos.");
    } finally {
      setTermsChecking(false);
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
        await validateWorkerDeviceSession(data.session!.access_token);
        setAuthed(true);
        const loadedProfile = await load();
        await loadTermsStatus(loadedProfile?.relationship_type);
      } catch (err) {
        await signOutAdmin();
        setAuthed(false);
        setError(err instanceof Error ? err.message : t.errors.invalidSession);
      } finally {
        setReady(true);
      }
    }

    boot();
  }, []);

  useEffect(() => {
    if (!authed || !supabase) return;
    const id = window.setInterval(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.access_token) throw new Error(t.errors.invalidSession);
        await validateWorkerDeviceSession(data.session.access_token);
      } catch (err) {
        await signOutAdmin();
        setAuthed(false);
        setProfile(null);
        setEvents([]);
        setError(err instanceof Error ? err.message : t.errors.invalidSession);
      }
    }, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [authed, t.errors.invalidSession]);

  useEffect(() => {
    if (!authed) return;
    const id = window.setInterval(async () => {
      const loadedProfile = await load();
      await loadTermsStatus(loadedProfile?.relationship_type);
    }, 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    const id = window.setInterval(() => {
      setNowTick(Date.now());
    }, 30000);
    return () => window.clearInterval(id);
  }, [authed]);

  useEffect(() => {
    if (!mustChangePassword) {
      setDismissedResetModal(false);
    }
  }, [mustChangePassword]);

  useEffect(() => {
    if (!isClockedIn || !shiftReminderKey) {
      setShowShiftReminder(false);
      return;
    }

    if (shouldShowShiftReminder) {
      setShowShiftReminder(true);
    }
  }, [isClockedIn, shiftReminderKey, shouldShowShiftReminder]);

  useEffect(() => {
    if (!dismissedShiftReminderKey || !shiftReminderKey) return;
    if (dismissedShiftReminderKey !== shiftReminderKey) {
      setDismissedShiftReminderKey(null);
    }
  }, [dismissedShiftReminderKey, shiftReminderKey]);

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
      const loadedProfile = await load();
      await loadTermsStatus(loadedProfile?.relationship_type);
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.login.errors.workerLoginError);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAcceptTerms = async () => {
    try {
      setTermsSubmitting(true);
      setTermsError(null);
      await acceptWorkerTerms(activeTermsVersion, APP_VERSION_LABEL);
      setTermsAccepted(true);
    } catch (err) {
      setTermsError(err instanceof Error ? err.message : "No se pudo registrar la aceptacion.");
    } finally {
      setTermsSubmitting(false);
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

  const handleClock = async (eventType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END") => {
    try {
      setActionLoading(true);
      setError(null);
      setLocationWarning(null);

      const freshEvents = await getMyTimeEvents();
      const freshEffectiveEvents = buildEffectiveTimeEvents(freshEvents as WorkerEvent[]);
      const freshShiftState = buildWorkerShiftState(freshEffectiveEvents);
      setEvents(freshEvents as WorkerEvent[]);

      let nextEventType = eventType;
      if (eventType === "BREAK_START" || eventType === "BREAK_END") {
        if (!freshShiftState.isClockedIn) {
          throw new Error(isExternal ? "No hay un servicio abierto. Registra primero el inicio de servicio." : "No hay una jornada abierta. Registra primero la entrada.");
        }
        nextEventType = freshShiftState.isOnBreak ? "BREAK_END" : "BREAK_START";
      } else if (eventType === "CLOCK_IN" && freshShiftState.isClockedIn) {
        throw new Error(isExternal ? "Ya tienes un servicio abierto. Actualiza el estado antes de iniciar otro." : "Ya tienes una jornada abierta. Actualiza el estado antes de volver a fichar entrada.");
      } else if (eventType === "CLOCK_OUT" && !freshShiftState.isClockedIn) {
        throw new Error(isExternal ? "No hay un servicio abierto que se pueda finalizar." : "No hay una jornada abierta que se pueda finalizar.");
      }

      const location = await getCurrentLocation();
      if (!location) {
        setLocationWarning(isExternal ? t.external.status.gpsMissingWarning : t.status.gpsMissingWarning);
        throw new Error(isExternal ? t.external.status.gpsRequired : t.errors.gpsRequired);
      }
      await sendClockEvent(nextEventType, undefined, location);
      setLocationWarning(null);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.clockError;
      const sessionWasReplaced = isSessionReplacedError(err) || message.includes("sesion ha sido sustituida");
      if (sessionWasReplaced) {
        await signOutAdmin();
        setAuthed(false);
        setProfile(null);
        setEvents([]);
      } else {
        await load();
      }
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutWorker();
    setAuthed(false);
    setProfile(null);
    setEvents([]);
    setLocationWarning(null);
    setShowShiftReminder(false);
    setDismissedShiftReminderKey(null);
    setTermsAccepted(false);
    setTermsChecking(false);
    setTermsSubmitting(false);
    setTermsChecked(false);
    setTermsError(null);
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

          <form onSubmit={handleLogin} className="p-6 space-y-4" autoComplete="off">
            <div>
              <label className="block mb-2">{TEXTS.login.fields.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                <input
                  type="email"
                  name="worker_login_email"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
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
                  name="worker_login_password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
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
    <div className="min-h-screen bg-[#f8fafc] p-3 md:p-6">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <img src={headerLogo} alt="ONUS Express" className="h-7 md:h-8 w-auto mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-[#000935] leading-tight">{isExternal ? 'Portal colaborador externo' : t.title}</h1>
                </div>
              </div>
              <button onClick={handleLogout} className="px-3 py-2 border border-[#e5e5e5] rounded-lg text-[#000935] hover:bg-[#f9f9f9] whitespace-nowrap">
                {t.actions.closeSession}
              </button>
            </div>
            <p className="text-sm text-[#666666] inline-flex items-start gap-1 break-words">
              <User className="w-4 h-4 shrink-0 mt-0.5" /> <span className="break-all">{workerName} ({profile?.email})</span>
            </p>
            {isExternal && (
              <span className="inline-flex w-fit rounded-full bg-[#fff7ed] px-2 py-1 text-xs font-semibold text-[#9a3412]">
                {t.external.badge}
              </span>
            )}
          </div>
        </div>
        {showIosInstallHint && !isStandalone && (
          <div className="bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 text-sm text-[#666666]">
            {t.status.iosInstallHint}
          </div>
        )}
        {locationWarning && (
          <div className="bg-[#fff7ed] border border-[#fdba74] rounded-xl px-4 py-3 text-sm text-[#9a3412]">
            {locationWarning}
          </div>
        )}

        <div className="bg-white border border-[#e5e5e5] rounded-lg p-4">
          <h2 className="font-semibold text-[#000935] mb-3 inline-flex items-center gap-2">
            <Clock3 className="w-4 h-4" /> {portalSections.clockStatus}
          </h2>
          <p className="text-sm text-[#666666] mb-4">
            {profile?.is_active
              ? (isOnBreak ? portalStatus.openBreak : isClockedIn ? portalStatus.openClock : portalStatus.noOpenClock)
              : t.status.inactiveUser}
          </p>
          {workedStats.hasClosedToday && (
            <p className="text-sm text-[#0f766e] mb-4">
              {isExternal ? 'Horas de servicio registradas hoy:' : t.status.workedToday} {formatMinutes(workedStats.totalClosedMinutesToday)}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => handleClock("CLOCK_IN")}
              disabled={!profile?.is_active || isClockedIn || actionLoading || passwordChangeBlocksClock || termsGateBlocked}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d] disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" /> {portalActions.clockIn}
            </button>
            <button
              onClick={() => handleClock(isOnBreak ? "BREAK_END" : "BREAK_START")}
              disabled={!profile?.is_active || !isClockedIn || actionLoading || passwordChangeBlocksClock || termsGateBlocked}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-[#0ea5e9] text-white rounded-lg hover:bg-[#0284c7] disabled:opacity-50"
            >
              <Clock3 className="w-4 h-4" /> {isOnBreak ? portalActions.breakEnd : portalActions.breakStart}
            </button>
            <button
              onClick={() => handleClock("CLOCK_OUT")}
              disabled={!profile?.is_active || !isClockedIn || actionLoading || passwordChangeBlocksClock || termsGateBlocked}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-[#dc2626] text-white rounded-lg hover:bg-[#b91c1c] disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" /> {portalActions.clockOut}
            </button>
          </div>
          {mustChangePassword && (
            <p className="text-sm text-[#856404] mt-3">
              {passwordChangeBlocksClock ? t.status.passwordChangeBlocking : t.status.passwordChangePending}
            </p>
          )}
          {!termsChecking && !termsAccepted && (
            <p className="text-sm text-[#856404] mt-3">
              Debes aceptar las condiciones de uso y la informacion RGPD para habilitar el registro.
            </p>
          )}
          {clockBlockedReason && (
            <p className="text-sm text-[#856404] mt-3">
              Botones bloqueados: {clockBlockedReason}
            </p>
          )}
          {error && <p className="text-sm text-[#dc2626] mt-3">{error}</p>}
        </div>

        <WorkdayTimeline events={effectiveEvents} title={portalSections.timelineTitle} />

        <div className="bg-white border border-[#e5e5e5] rounded-lg p-4">
          <h2 className="font-semibold text-[#000935] mb-3">{portalSections.latestEvents}</h2>
          {loadingData ? (
            <p className="text-sm text-[#666666]">{t.loading}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-[#666666]">{t.status.noEvents}</p>
          ) : (
            <div className="space-y-2">
              {groupedEvents.map((group, idx) => (
                <details key={group.key} className="border border-[#e5e5e5] rounded-lg bg-white" open={idx === 0}>
                  <summary className="list-none cursor-pointer p-3 flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#0f766e]">{isExternal ? 'Servicio' : t.status.journeyLabel} {group.label}</span>
                    <span className="text-[#475569]">
                      {t.status.totalLabel} {group.totalClosedMinutes > 0 ? formatMinutes(group.totalClosedMinutes) : t.status.noClosedSegments}
                    </span>
                  </summary>
                  <div className="px-3 pb-3 space-y-1.5">
                    {group.events.map((ev) => (
                      <div key={ev.id} className="px-3 py-2 rounded-lg bg-[#f9f9f9] flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#000935]">{formatClockEventLabel(ev.event_type, isExternal ? "EXTERNAL" : "EMPLOYEE")}</span>
                          {ev.event_type === "CLOCK_OUT" && workedStats.durationByClockOutId.has(ev.id) && (
                            <span className="text-xs text-[#0f766e]">
                              {isExternal ? 'Total servicio:' : t.status.segmentTotal} {formatMinutes(workedStats.durationByClockOutId.get(ev.id) ?? 0)}
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

      {authed && !termsAccepted && (
        <div className="fixed inset-0 z-[70] bg-[#000935]/70 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#d9e3ee] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 bg-[#00C9CE] text-white">
              <h2 className="text-xl font-bold text-white">{isExternal ? 'Condiciones del registro de servicios' : 'Condiciones de uso del portal de fichaje'}</h2>
              <p className="text-sm text-white/90 mt-2">
                Antes de continuar, debes aceptar las condiciones de uso y declarar que has recibido la informacion de proteccion de datos.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 text-sm text-[#334155] space-y-2">
                <p>Version de condiciones: <strong>{activeTermsVersion}</strong></p>
                <p>Este acuse quedara registrado con fecha y hora para fines de auditoria interna.</p>
                {WORKER_TERMS_DOC_URL && (
                  <p>
                    <a href={WORKER_TERMS_DOC_URL} target="_blank" rel="noreferrer" className="text-[#0f766e] underline">
                      {isExternal ? 'Ver protocolo de registro de servicios' : 'Ver protocolo interno de fichaje'}
                    </a>
                  </p>
                )}
                {WORKER_PRIVACY_DOC_URL && (
                  <p>
                    <a href={WORKER_PRIVACY_DOC_URL} target="_blank" rel="noreferrer" className="text-[#0f766e] underline">
                      Ver clausula informativa RGPD
                    </a>
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-[#e2e8f0] bg-white p-4">
                <p className="text-sm font-semibold text-[#0f172a] mb-2">Texto de lectura obligatoria</p>
                <div className="max-h-40 overflow-y-auto whitespace-pre-line text-sm text-[#334155] pr-1">
                  {isExternal ? EXTERNAL_TERMS_READING_TEXT : WORKER_TERMS_READING_TEXT}
                </div>
              </div>

              <label className="flex items-start gap-3 text-sm text-[#0f172a]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-[#94a3b8]"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                  disabled={termsChecking || termsSubmitting}
                />
                <span>
                  He leido y acepto las condiciones de uso, incluida la prohibicion de compartir credenciales y de acceder desde dispositivos ajenos o compartidos, y declaro haber recibido la informacion de proteccion de datos.
                </span>
              </label>

              {termsError && <p className="text-sm text-[#dc2626]">{termsError}</p>}

              <button
                type="button"
                onClick={handleAcceptTerms}
                disabled={!termsChecked || termsChecking || termsSubmitting}
                className="w-full px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] disabled:opacity-50"
              >
                {termsChecking ? "Verificando..." : termsSubmitting ? "Guardando aceptacion..." : "Aceptar y continuar"}
              </button>
            </div>
          </div>
        </div>
      )}

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
      {showShiftReminder && (
        <div className="fixed inset-0 z-40 bg-[#000935]/55 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#d9e3ee] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 bg-[#fff7ed] border-b border-[#fdba74]">
              <h2 className="text-xl font-bold text-[#9a3412]">{t.shiftReminder.title}</h2>
              <p className="text-sm text-[#9a3412] mt-2">{t.shiftReminder.message}</p>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-[#666666]">
                {t.shiftReminder.workedLabel} <strong className="text-[#000935]">{formatMinutes(workedStats.totalWorkedMinutesToday)}</strong>
              </p>
              <p className="text-sm text-[#666666]">
                {t.shiftReminder.targetLabel} <strong className="text-[#000935]">{formatMinutes(SHIFT_TARGET_MINUTES)}</strong>
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowShiftReminder(false);
                  if (shiftReminderKey) setDismissedShiftReminderKey(shiftReminderKey);
                }}
                className="w-full px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8]"
              >
                {t.shiftReminder.acknowledge}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
