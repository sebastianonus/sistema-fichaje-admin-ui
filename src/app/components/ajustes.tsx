import { useEffect, useState } from 'react';
import { CheckCircle2, Shield, Server, RefreshCw } from 'lucide-react';
import { TEXTS } from '@/constants/texts';
import { getDashboardMetrics, getExports, getWorkers } from '@/lib/api';
import { changeCurrentUserPassword, hasStaticAdminToken, supabase } from '@/lib/supabase';

export function Ajustes() {
  const [email, setEmail] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState<{ dashboard: string; workers: string; exports: string }>({
    dashboard: 'pendiente',
    workers: 'pendiente',
    exports: 'pendiente',
  });

  const authMode = hasStaticAdminToken() ? 'token-env' : 'session';

  useEffect(() => {
    async function loadUser() {
      if (!supabase || authMode !== 'session') return;
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    }

    loadUser();
  }, [authMode]);

  const runHealthCheck = async () => {
    setChecking(true);
    setHealth({ dashboard: 'comprobando...', workers: 'comprobando...', exports: 'comprobando...' });

    try {
      await getDashboardMetrics();
      setHealth((h) => ({ ...h, dashboard: 'ok' }));
    } catch {
      setHealth((h) => ({ ...h, dashboard: 'error' }));
    }

    try {
      await getWorkers({});
      setHealth((h) => ({ ...h, workers: 'ok' }));
    } catch {
      setHealth((h) => ({ ...h, workers: 'error' }));
    }

    try {
      await getExports();
      setHealth((h) => ({ ...h, exports: 'ok' }));
    } catch {
      setHealth((h) => ({ ...h, exports: 'error' }));
    }

    setChecking(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim() || !newPassword.trim() || !supabase || authMode !== 'session') return;

    try {
      setSavingPassword(true);
      setPasswordErr(null);
      setPasswordMsg(null);
      await changeCurrentUserPassword(currentPassword.trim(), newPassword.trim());
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMsg(TEXTS.ajustes.password.success);
    } catch (err) {
      setPasswordErr(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1>{TEXTS.ajustes.title}</h1>
        <p className="text-[#666666] mt-1">{TEXTS.ajustes.subtitle}</p>
      </div>

      <section className="bg-white border border-[#e5e5e5] rounded-lg p-6 space-y-3">
        <div className="flex items-center gap-2 text-[#000935]">
          <Server className="w-5 h-5" />
          <h3>{TEXTS.ajustes.connection.title}</h3>
        </div>
        <p className="text-sm text-[#666666]">{TEXTS.ajustes.connection.urlLabel}: {import.meta.env.VITE_SUPABASE_URL || TEXTS.common.noData}</p>
        <p className="text-sm text-[#666666]">{TEXTS.ajustes.connection.modeLabel}: {authMode === 'token-env' ? TEXTS.ajustes.connection.modeToken : TEXTS.ajustes.connection.modeSession}</p>
      </section>

      <section className="bg-white border border-[#e5e5e5] rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#000935]">
            <CheckCircle2 className="w-5 h-5" />
            <h3>{TEXTS.ajustes.health.title}</h3>
          </div>
          <button
            onClick={runHealthCheck}
            disabled={checking}
            className="px-3 py-2 rounded-lg border border-[#e5e5e5] text-[#000935] hover:bg-[#f9f9f9] transition-colors disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              {TEXTS.ajustes.health.checkAction}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <StatusCard title="Dashboard" value={health.dashboard} />
          <StatusCard title="Trabajadores" value={health.workers} />
          <StatusCard title="Exports" value={health.exports} />
        </div>
      </section>

      {authMode === 'session' && (
        <section className="bg-white border border-[#e5e5e5] rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#000935]">
            <Shield className="w-5 h-5" />
            <h3>{TEXTS.ajustes.password.title}</h3>
          </div>
          <p className="text-sm text-[#666666]">{TEXTS.ajustes.password.userLabel}: {email || TEXTS.common.noData}</p>

          <form onSubmit={handlePasswordChange} className="space-y-3 max-w-md">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
              placeholder={TEXTS.ajustes.password.currentPlaceholder}
              required
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
              placeholder={TEXTS.ajustes.password.newPlaceholder}
              required
            />
            <button
              type="submit"
              disabled={!currentPassword.trim() || !newPassword.trim() || savingPassword}
              className="px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] transition-colors disabled:opacity-50"
            >
              {savingPassword ? TEXTS.createWorker.actions.creating : TEXTS.ajustes.password.action}
            </button>
          </form>

          {passwordMsg && <p className="text-sm text-[#16a34a]">{passwordMsg}</p>}
          {passwordErr && <p className="text-sm text-[#dc2626]">{passwordErr}</p>}
        </section>
      )}
    </div>
  );
}

function StatusCard({ title, value }: { title: string; value: string }) {
  const bg = value === 'ok' ? 'bg-[#ecfdf5] border-[#16a34a]' : value === 'error' ? 'bg-[#fef2f2] border-[#dc2626]' : 'bg-[#f9f9f9] border-[#e5e5e5]';
  const text = value === 'ok' ? 'text-[#166534]' : value === 'error' ? 'text-[#991b1b]' : 'text-[#666666]';

  return (
    <div className={`p-3 rounded-lg border ${bg}`}>
      <p className="font-medium text-[#000935]">{title}</p>
      <p className={`mt-1 ${text}`}>{value}</p>
    </div>
  );
}
