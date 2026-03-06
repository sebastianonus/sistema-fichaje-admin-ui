import { useEffect, useState } from 'react';
import { Users, UserCheck, Clock, Plus, Download, AlertTriangle } from 'lucide-react';
import { Page } from '@/app/App';
import { TEXTS } from '@/constants/texts';
import { getDashboardMetrics } from '@/lib/api';
import type { DashboardMetrics } from '@/lib/types';

interface DashboardProps {
  onNavigate: (page: Page) => void;
  onOpenWorkersFiltered: (preset: { isActive?: 'active' | 'inactive'; clockedIn?: boolean }) => void;
}

export function Dashboard({ onNavigate, onOpenWorkersFiltered }: DashboardProps) {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const metrics = await getDashboardMetrics();
      setData(metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.dashboard.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1>{TEXTS.dashboard.title}</h1>
        <p className="text-[#666666] mt-1">{TEXTS.dashboard.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => onNavigate('trabajadores')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] transition-colors"
        >
          <Plus className="w-5 h-5" />
          {TEXTS.dashboard.actions.createWorker}
        </button>
        <button
          onClick={() => onNavigate('exports')}
          className="flex items-center gap-2 px-4 py-2.5 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f9f9f9] transition-colors"
        >
          <Download className="w-5 h-5" />
          {TEXTS.dashboard.actions.generateExport}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title={TEXTS.dashboard.cards.activeWorkers}
          icon={Users}
          loading={loading}
          error={error}
          onRetry={fetchMetrics}
          onClick={() => onOpenWorkersFiltered({ isActive: 'active' })}
          actionLabel={TEXTS.dashboard.actions.viewActive}
        >
          <div className="text-3xl font-bold text-[#000935]">{data?.active_workers ?? TEXTS.common.noData}</div>
        </MetricCard>

        <MetricCard
          title={TEXTS.dashboard.cards.clockedInWorkers}
          icon={UserCheck}
          loading={loading}
          error={error}
          onRetry={fetchMetrics}
          expandable
          onClick={() => onOpenWorkersFiltered({ isActive: 'active', clockedIn: true })}
          actionLabel={TEXTS.dashboard.actions.viewClockedIn}
        >
          <div className="text-3xl font-bold text-[#000935]">{data?.clocked_in_workers_count ?? TEXTS.common.noData}</div>
          {!!data?.clocked_in_workers?.length && (
            <div className="mt-4 space-y-2">
              {data.clocked_in_workers.slice(0, 5).map((worker) => (
                <div key={worker.id} className="flex justify-between text-sm">
                  <span>{worker.full_name}</span>
                  <span className="text-[#666666]">{new Date(worker.clock_in_time).toLocaleTimeString('es-ES')}</span>
                </div>
              ))}
            </div>
          )}
        </MetricCard>

        <MetricCard
          title={TEXTS.dashboard.cards.todayEvents}
          icon={Clock}
          loading={loading}
          error={error}
          onRetry={fetchMetrics}
          onClick={() => onNavigate('exports')}
          actionLabel={TEXTS.dashboard.actions.goToExports}
        >
          <div className="text-3xl font-bold text-[#000935]">{data?.events_today ?? TEXTS.common.noData}</div>
        </MetricCard>

        <MetricCard
          title={TEXTS.dashboard.cards.openIncidents}
          icon={AlertTriangle}
          loading={loading}
          error={error}
          onRetry={fetchMetrics}
          onClick={() => onNavigate('incidencias')}
          actionLabel={TEXTS.dashboard.actions.viewIncidents}
        >
          <div className="text-3xl font-bold text-[#000935]">{data?.open_incidents_count ?? TEXTS.common.noData}</div>
          {!!data?.open_incidents?.length && (
            <div className="mt-4 space-y-2">
              {data.open_incidents.slice(0, 3).map((incident) => (
                <div key={`${incident.id}-${incident.detected_at}`} className="text-sm">
                  <div className="font-medium text-[#000935]">{incident.full_name}</div>
                  <div className="text-[#666666]">{incident.phone_number || incident.email || TEXTS.dashboard.incidents.noPhone}</div>
                </div>
              ))}
            </div>
          )}
        </MetricCard>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  expandable?: boolean;
  onClick?: () => void;
  actionLabel?: string;
  children: React.ReactNode;
}

function MetricCard({ title, icon: Icon, loading, error, onRetry, expandable, onClick, actionLabel, children }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-white border border-[#e5e5e5] rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-[#f5f5f5] rounded w-1/2 mb-4" />
        <div className="h-10 bg-[#f5f5f5] rounded w-1/3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-[#e5e5e5] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2 text-[#666666]">
          <Icon className="w-5 h-5" />
          <h3 className="font-medium">{title}</h3>
        </div>
        <div className="text-sm text-[#dc2626]">
          {TEXTS.dashboard.errors.loadError}
          <button onClick={onRetry} className="ml-2 text-[#00C9CE] hover:underline">{TEXTS.dashboard.errors.retry}</button>
        </div>
      </div>
    );
  }

  const className = `bg-white border border-[#e5e5e5] rounded-lg p-6 text-left ${
    onClick || expandable ? 'hover:shadow-lg transition-shadow cursor-pointer' : ''
  }`;

  const content = (
    <>
      <div className="flex items-center gap-2 mb-4 text-[#666666]">
        <Icon className="w-5 h-5" />
        <h3 className="font-medium">{title}</h3>
      </div>
      {children}
      {actionLabel && <div className="mt-4 text-sm font-medium text-[#00C9CE]">{actionLabel}</div>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
