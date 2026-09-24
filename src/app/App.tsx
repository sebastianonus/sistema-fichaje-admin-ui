import { useEffect, useState } from 'react';
import { Sidebar } from '@/app/components/sidebar';
import { Dashboard } from '@/app/components/dashboard';
import { Trabajadores } from '@/app/components/trabajadores';
import { Incidencias } from '@/app/components/incidencias';
import { WorkerDetailPage } from '@/app/components/worker-detail-page';
import { Exports } from '@/app/components/exports';
import { Ajustes } from '@/app/components/ajustes';
import { Login } from '@/app/components/login';
import { TEXTS } from '@/constants/texts';
import { ensureRole, hasStaticAdminToken, signOutAdmin, supabase } from '@/lib/supabase';

export type Page = 'dashboard' | 'trabajadores' | 'incidencias' | 'workerDetail' | 'exports' | 'ajustes';
export type WorkersPreset = {
  isActive?: 'active' | 'inactive';
  clockedIn?: boolean;
  token: number;
} | null;

type AppHistoryState = {
  onusApp: true;
  page: Page;
  workerId?: string | null;
  incidentId?: string | null;
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [workersPreset, setWorkersPreset] = useState<WorkersPreset>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const applyHistoryState = (state: AppHistoryState | null | undefined) => {
    if (!state?.onusApp) return;
    const nextPage = state.page === 'workerDetail' && !state.workerId ? 'trabajadores' : state.page;
    setCurrentPage(nextPage);
    setSelectedWorkerId(state.workerId ?? null);
    setSelectedIncidentId(state.incidentId ?? null);
  };

  const navigateTo = (
    page: Page,
    options?: { workerId?: string | null; incidentId?: string | null; replace?: boolean },
  ) => {
    const nextPage = page === 'workerDetail' && !options?.workerId ? 'trabajadores' : page;
    const state: AppHistoryState = {
      onusApp: true,
      page: nextPage,
      workerId: options?.workerId ?? null,
      incidentId: options?.incidentId ?? null,
    };

    if (options?.replace) {
      window.history.replaceState(state, '', window.location.href);
    } else {
      window.history.pushState(state, '', window.location.href);
    }

    applyHistoryState(state);
  };

  useEffect(() => {
    async function boot() {
      if (hasStaticAdminToken()) {
        setIsAuthenticated(true);
        setAuthReady(true);
        return;
      }

      if (!supabase) {
        setIsAuthenticated(false);
        setAuthReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setIsAuthenticated(false);
        setAuthReady(true);
        return;
      }

      try {
        await ensureRole('admin');
        setIsAuthenticated(true);
      } catch {
        await signOutAdmin();
        setIsAuthenticated(false);
      }
      setAuthReady(true);
    }

    boot();
  }, []);

  useEffect(() => {
    const initialState = window.history.state as AppHistoryState | null;
    if (!initialState?.onusApp) {
      window.history.replaceState(
        { onusApp: true, page: currentPage, workerId: selectedWorkerId, incidentId: selectedIncidentId } satisfies AppHistoryState,
        '',
        window.location.href,
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      applyHistoryState(event.state as AppHistoryState | null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogout = async () => {
    await signOutAdmin();
    setIsAuthenticated(false);
    navigateTo('dashboard', { replace: true });
  };

  const handleOpenWorkersFiltered = (preset: { isActive?: 'active' | 'inactive'; clockedIn?: boolean }) => {
    setWorkersPreset({
      ...preset,
      token: Date.now(),
    });
    navigateTo('trabajadores');
  };

  const handleOpenWorkerDetail = (workerId: string, incidentId?: string) => {
    navigateTo('workerDetail', { workerId, incidentId: incidentId ?? null });
  };

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center text-[#666666]">{TEXTS.common.loading}</div>;
  }

  if (!isAuthenticated) {
    return <Login onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigateTo}
        showLogout={!hasStaticAdminToken()}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        {currentPage === 'dashboard' && (
          <Dashboard
            onNavigate={navigateTo}
            onOpenWorkersFiltered={handleOpenWorkersFiltered}
          />
        )}
        {currentPage === 'trabajadores' && (
          <Trabajadores
            preset={workersPreset}
            onOpenWorkerDetail={handleOpenWorkerDetail}
          />
        )}
        {currentPage === 'incidencias' && (
          <Incidencias onOpenWorkerDetail={handleOpenWorkerDetail} />
        )}
        {currentPage === 'workerDetail' && selectedWorkerId && (
          <WorkerDetailPage
            workerId={selectedWorkerId}
            focusIncidentId={selectedIncidentId}
            onBack={() => navigateTo('trabajadores')}
          />
        )}
        {currentPage === 'exports' && <Exports />}
        {currentPage === 'ajustes' && <Ajustes />}
      </main>
    </div>
  );
}
