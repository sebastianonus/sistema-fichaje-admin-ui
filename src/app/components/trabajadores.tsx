import { useEffect, useMemo, useState } from 'react';
import { Plus, Filter, X, Search, Calendar, Users } from 'lucide-react';
import { CreateWorkerModal } from '@/app/components/create-worker-modal';
import { TEXTS } from '@/constants/texts';
import { getWorkers, sendWorkerOnboardingMessages } from '@/lib/api';
import type { WorkerSummary } from '@/lib/types';
import type { WorkersPreset } from '@/app/App';

interface TrabajadoresProps {
  preset?: WorkersPreset;
  onOpenWorkerDetail?: (workerId: string) => void;
}

export function Trabajadores({ preset, onOpenWorkerDetail }: TrabajadoresProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterName, setFilterName] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterClockedIn, setFilterClockedIn] = useState(false);

  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendingCredentials, setSendingCredentials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const hasFilters = filterActive !== 'all' || filterName || filterEmail || filterDateFrom || filterDateTo || filterClockedIn;
  const isEmpty = workers.length === 0;

  const search = useMemo(() => `${filterName} ${filterEmail}`.trim(), [filterName, filterEmail]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      setError(null);
      setInfo(null);
      const data = await getWorkers({
        search: search || undefined,
        created_from: filterDateFrom || undefined,
        created_to: filterDateTo || undefined,
        is_active: filterActive === 'all' ? undefined : filterActive === 'active',
        clocked_in: filterClockedIn || undefined,
      });
      setWorkers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.trabajadores.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [filterActive, search, filterDateFrom, filterDateTo, filterClockedIn]);

  useEffect(() => {
    // keep selection only for visible workers
    const visible = new Set(workers.map((w) => w.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [workers]);

  useEffect(() => {
    if (!preset) return;
    setFilterName('');
    setFilterEmail('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterActive(preset.isActive ?? 'all');
    setFilterClockedIn(!!preset.clockedIn);
    setShowFilters(true);
  }, [preset?.token]);

  const openWorker = (workerId: string) => {
    if (onOpenWorkerDetail) onOpenWorkerDetail(workerId);
  };

  const clearFilters = () => {
    setFilterActive('all');
    setFilterName('');
    setFilterEmail('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterClockedIn(false);
  };

  const allVisibleSelected = workers.length > 0 && selectedIds.length === workers.length;

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(workers.map((w) => w.id));
    }
  };

  const toggleRowSelection = (workerId: string) => {
    setSelectedIds((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId],
    );
  };

  const handleSendCredentials = async (workerIds?: string[]) => {
    const ids = workerIds && workerIds.length ? workerIds : selectedIds;
    if (!ids.length) {
      setError(TEXTS.trabajadores.errors.selectAtLeastOne);
      return;
    }

    try {
      setSendingCredentials(true);
      setError(null);
      setInfo(null);
      const data = await sendWorkerOnboardingMessages(ids);
      const ready = data.results.filter((r) => r.status === 'READY' && r.whatsapp_url);
      const noPhone = data.results.filter((r) => r.status === 'READY_NO_PHONE').length;
      const failed = data.results.filter((r) => r.status.endsWith('FAILED')).length;

      for (const item of ready) {
        window.open(item.whatsapp_url!, '_blank', 'noopener,noreferrer');
      }

      const summary = TEXTS.trabajadores.info.onboardingSummary
        .replace('{ready}', String(ready.length))
        .replace('{noPhone}', String(noPhone))
        .replace('{failed}', String(failed));
      setInfo(summary);
      await fetchWorkers();
    } catch (err) {
      setError(err instanceof Error ? err.message : TEXTS.trabajadores.errors.generic);
    } finally {
      setSendingCredentials(false);
    }
  };

  return (
    <>
      <div className="p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1>{TEXTS.trabajadores.title}</h1>
            <p className="text-[#666666] mt-1">{TEXTS.trabajadores.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSendCredentials()}
              disabled={sendingCredentials || selectedIds.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#000935] text-white rounded-lg hover:bg-[#0a1850] transition-colors disabled:opacity-50"
            >
              {TEXTS.trabajadores.actions.sendCredentials}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
                showFilters
                  ? 'border-[#00C9CE] text-[#00C9CE] bg-[#00C9CE]/5'
                  : 'border-[#e5e5e5] text-[#000935] hover:bg-[#f9f9f9]'
              }`}
            >
              <Filter className="w-5 h-5" />
              {TEXTS.trabajadores.actions.filters}
              {hasFilters && <span className="w-2 h-2 bg-[#00C9CE] rounded-full" />}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] transition-colors"
            >
              <Plus className="w-5 h-5" />
              {TEXTS.trabajadores.actions.createWorker}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-[#f9f9f9] border border-[#e5e5e5] rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3>{TEXTS.trabajadores.filters.title}</h3>
              {hasFilters && (
                <button onClick={clearFilters} className="text-sm text-[#00C9CE] hover:underline">
                  {TEXTS.trabajadores.filters.clear}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block mb-2">{TEXTS.trabajadores.filters.estado}</label>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                >
                  <option value="all">{TEXTS.trabajadores.filters.options.all}</option>
                  <option value="active">{TEXTS.trabajadores.filters.options.active}</option>
                  <option value="inactive">{TEXTS.trabajadores.filters.options.inactive}</option>
                </select>
              </div>

              <div>
                <label className="block mb-2">{TEXTS.trabajadores.filters.nombre}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                  <input
                    type="text"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    placeholder={TEXTS.trabajadores.filters.placeholders.searchName}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2">{TEXTS.trabajadores.filters.email}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                  <input
                    type="text"
                    value={filterEmail}
                    onChange={(e) => setFilterEmail(e.target.value)}
                    placeholder={TEXTS.trabajadores.filters.placeholders.searchEmail}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2">{TEXTS.trabajadores.filters.createdFrom}</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2">{TEXTS.trabajadores.filters.createdTo}</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                  />
                </div>
              </div>

              <div className="flex items-center pt-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterClockedIn}
                    onChange={(e) => setFilterClockedIn(e.target.checked)}
                    className="w-4 h-4 text-[#00C9CE] border-[#e5e5e5] rounded focus:ring-[#00C9CE]"
                  />
                  <span>{TEXTS.trabajadores.filters.clockedIn}</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white border border-[#e5e5e5] rounded-lg p-6 text-[#666666]">{TEXTS.common.loading}</div>
        )}

        {error && (
          <div className="bg-white border border-[#e5e5e5] rounded-lg p-6">
            <p className="text-[#dc2626] mb-2">{TEXTS.common.error}: {error}</p>
            <button onClick={fetchWorkers} className="text-[#00C9CE] hover:underline">{TEXTS.dashboard.errors.retry}</button>
          </div>
        )}

        {info && (
          <div className="bg-white border border-[#e5e5e5] rounded-lg p-6">
            <p className="text-[#0f766e]">{info}</p>
          </div>
        )}

        {!loading && !error && isEmpty && !hasFilters && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-16 h-16 text-[#666666] mb-4" />
            <h2 className="mb-2">{TEXTS.trabajadores.empty.noWorkers.title}</h2>
            <p className="text-[#666666] mb-1">{TEXTS.trabajadores.empty.noWorkers.line1}</p>
            <p className="text-[#666666] mb-6">{TEXTS.trabajadores.empty.noWorkers.line2}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] transition-colors"
            >
              <Plus className="w-5 h-5" />
              {TEXTS.trabajadores.actions.createWorker}
            </button>
          </div>
        )}

        {!loading && !error && isEmpty && hasFilters && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-16 h-16 text-[#666666] mb-4" />
            <h2 className="mb-2">{TEXTS.trabajadores.empty.noResults.title}</h2>
            <p className="text-[#666666] mb-6">{TEXTS.trabajadores.empty.noResults.subtitle}</p>
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f9f9f9] transition-colors"
            >
              <X className="w-5 h-5" />
              {TEXTS.trabajadores.actions.clearFilters}
            </button>
          </div>
        )}

        {!loading && !error && !isEmpty && (
          <div className="bg-white border border-[#e5e5e5] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f9f9f9] border-b border-[#e5e5e5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-[#00C9CE] border-[#e5e5e5] rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.trabajadores.table.columns.nombre}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.trabajadores.table.columns.email}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.trabajadores.table.columns.telefono}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.trabajadores.table.columns.incidencia}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.trabajadores.table.columns.activo}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.trabajadores.table.columns.creado}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.trabajadores.table.columns.ultimoEvento}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.trabajadores.table.columns.acciones}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {workers.map((worker) => (
                    <tr
                      key={worker.id}
                      onClick={() => openWorker(worker.id)}
                      className="hover:bg-[#f9f9f9] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(worker.id)}
                          onChange={() => toggleRowSelection(worker.id)}
                          className="w-4 h-4 text-[#00C9CE] border-[#e5e5e5] rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="font-medium text-[#000935]">{worker.full_name}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#666666]">{worker.email || TEXTS.common.noData}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#666666]">{worker.phone_number || TEXTS.common.noData}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {worker.open_incident ? (
                          <div className="flex flex-col">
                            <span className="inline-flex px-2 py-1 text-xs rounded-full bg-[#fef2f2] text-[#dc2626]">
                              {TEXTS.trabajadores.incidents.badge}
                            </span>
                            <span className="text-xs text-[#999999] mt-1">
                              {TEXTS.trabajadores.incidents.longOpenShift}
                            </span>
                          </div>
                        ) : TEXTS.trabajadores.table.noEvent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${worker.is_active ? 'bg-[#00C9CE]/10 text-[#00C9CE]' : 'bg-[#f5f5f5] text-[#666666]'}`}>
                          {worker.is_active ? TEXTS.trabajadores.table.status.active : TEXTS.trabajadores.table.status.inactive}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#666666]">{new Date(worker.created_at).toLocaleDateString('es-ES')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#666666]">
                        {worker.last_event ? (
                          <div className="flex flex-col">
                            <span className="text-sm">{worker.last_event.event_type}</span>
                            <span className="text-xs text-[#999999]">{new Date(worker.last_event.happened_at).toLocaleString('es-ES')}</span>
                          </div>
                        ) : TEXTS.trabajadores.table.noEvent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openWorker(worker.id);
                            }}
                            className="text-[#00C9CE] hover:underline"
                          >
                            {TEXTS.trabajadores.table.actions.view}
                          </button>
                          <span className="text-[#e5e5e5]">|</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendCredentials([worker.id]);
                            }}
                            className="text-[#000935] hover:underline"
                          >
                            {TEXTS.trabajadores.actions.sendCredentials}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {showCreateModal && (
        <CreateWorkerModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchWorkers();
          }}
        />
      )}
    </>
  );
}

