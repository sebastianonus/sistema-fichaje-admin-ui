import { useEffect, useState } from 'react';
import { Sidebar } from '@/app/components/sidebar';
import { Dashboard } from '@/app/components/dashboard';
import { Trabajadores } from '@/app/components/trabajadores';
import { WorkerDetailPage } from '@/app/components/worker-detail-page';
import { Exports } from '@/app/components/exports';
import { Ajustes } from '@/app/components/ajustes';
import { Login } from '@/app/components/login';
import { TEXTS } from '@/constants/texts';
import { ensureRole, hasStaticAdminToken, signOutAdmin, supabase } from '@/lib/supabase';

export type Page = 'dashboard' | 'trabajadores' | 'workerDetail' | 'exports' | 'ajustes';
export type WorkersPreset = {
  isActive?: 'active' | 'inactive';
  clockedIn?: boolean;
  token: number;
} | null;

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [workersPreset, setWorkersPreset] = useState<WorkersPreset>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        setIsAuthenticated(false);
      }
      setAuthReady(true);
    }

    boot();
  }, []);

  const handleLogout = async () => {
    await signOutAdmin();
    setIsAuthenticated(false);
    setCurrentPage('dashboard');
  };

  const handleOpenWorkersFiltered = (preset: { isActive?: 'active' | 'inactive'; clockedIn?: boolean }) => {
    setWorkersPreset({
      ...preset,
      token: Date.now(),
    });
    setCurrentPage('trabajadores');
  };

  const handleOpenWorkerDetail = (workerId: string) => {
    setSelectedWorkerId(workerId);
    setCurrentPage('workerDetail');
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
        onNavigate={setCurrentPage}
        showLogout={!hasStaticAdminToken()}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        {currentPage === 'dashboard' && (
          <Dashboard
            onNavigate={setCurrentPage}
            onOpenWorkersFiltered={handleOpenWorkersFiltered}
          />
        )}
        {currentPage === 'trabajadores' && (
          <Trabajadores
            preset={workersPreset}
            onOpenWorkerDetail={handleOpenWorkerDetail}
          />
        )}
        {currentPage === 'workerDetail' && selectedWorkerId && (
          <WorkerDetailPage
            workerId={selectedWorkerId}
            onBack={() => setCurrentPage('trabajadores')}
          />
        )}
        {currentPage === 'exports' && <Exports />}
        {currentPage === 'ajustes' && <Ajustes />}
      </main>
    </div>
  );
}
