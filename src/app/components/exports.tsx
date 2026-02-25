import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, FileText, AlertTriangle, Calendar } from 'lucide-react';
import { ConfirmationModal } from '@/app/components/confirmation-modal';
import { TEXTS } from '@/constants/texts';
import { createExport, getExportSignedUrl, getExports, revokeExport } from '@/lib/api';
import type { ExportRecord } from '@/lib/types';

export function Exports() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revokeExportId, setRevokeExportId] = useState<string | null>(null);
  const [exportsData, setExportsData] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isEmpty = useMemo(() => exportsData.length === 0, [exportsData]);

  const fetchExports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getExports();
      setExportsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExports();
  }, []);

  const handleDownload = async (exportId: string) => {
    try {
      const data = await getExportSignedUrl(exportId);
      window.open(data.signed_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    }
  };

  const handleRevoke = async () => {
    if (!revokeExportId) return;

    try {
      await revokeExport(revokeExportId);
      setRevokeExportId(null);
      await fetchExports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    }
  };

  return (
    <>
      <div className="p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1>{TEXTS.exports.title}</h1>
            <p className="text-[#666666] mt-1">{TEXTS.exports.subtitle}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] transition-colors"
          >
            <Plus className="w-5 h-5" />
            {TEXTS.exports.actions.generate}
          </button>
        </div>

        {loading && <div className="bg-white border border-[#e5e5e5] rounded-lg p-6 text-[#666666]">{TEXTS.common.loading}</div>}

        {error && (
          <div className="bg-white border border-[#e5e5e5] rounded-lg p-6 mb-6">
            <p className="text-[#dc2626] mb-2">{TEXTS.common.error}: {error}</p>
            <button onClick={fetchExports} className="text-[#00C9CE] hover:underline">{TEXTS.dashboard.errors.retry}</button>
          </div>
        )}

        {!loading && !error && isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-16 h-16 text-[#666666] mb-4" />
            <h2 className="mb-2">{TEXTS.exports.empty.title}</h2>
            <p className="text-[#666666] mb-1">{TEXTS.exports.empty.line1}</p>
            <p className="text-[#666666] mb-6">{TEXTS.exports.empty.line2}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] transition-colors"
            >
              <Plus className="w-5 h-5" />
              {TEXTS.exports.actions.generate}
            </button>
          </div>
        )}

        {!loading && !error && !isEmpty && (
          <div className="bg-white border border-[#e5e5e5] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f9f9f9] border-b border-[#e5e5e5]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.exports.table.columns.archivo}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.exports.table.columns.periodo}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.exports.table.columns.creado}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.exports.table.columns.creadoPor}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.exports.table.columns.hash}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.exports.table.columns.estado}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#666666] uppercase tracking-wider">{TEXTS.exports.table.columns.acciones}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {exportsData.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#f9f9f9] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#666666]" />
                          <span className="font-medium text-[#000935]">{exp.storage_path?.split('/').pop() || `${exp.id}.csv`}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#666666]">
                        <div className="flex flex-col">
                          <span className="text-sm">{exp.filters.from ? new Date(exp.filters.from).toLocaleDateString('es-ES') : TEXTS.common.noData}</span>
                          <span className="text-sm">{exp.filters.to ? new Date(exp.filters.to).toLocaleDateString('es-ES') : TEXTS.common.noData}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#666666]">{new Date(exp.created_at).toLocaleString('es-ES')}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-[#000935]">{exp.created_by_name || `${exp.created_by.slice(0, 8)}...`}</span>
                          <span className="text-xs text-[#666666]">{exp.created_by}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs text-[#666666] bg-[#f9f9f9] px-2 py-1 rounded">
                          {exp.sha256_hex ? `${exp.sha256_hex.slice(0, 8)}...` : TEXTS.common.noData}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        {exp.status === 'DELETED' ? (
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-[#f5f5f5] text-[#666666]">{TEXTS.exports.table.status.revoked}</span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-[#00C9CE]/10 text-[#00C9CE]">{TEXTS.exports.table.status.active}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {exp.status === 'READY' && !exp.deleted_at && (
                            <>
                              <button onClick={() => handleDownload(exp.id)} className="text-[#00C9CE] hover:underline">{TEXTS.exports.table.actions.download}</button>
                              <span className="text-[#e5e5e5]">|</span>
                              <button onClick={() => setRevokeExportId(exp.id)} className="text-[#dc2626] hover:underline">{TEXTS.exports.table.actions.revoke}</button>
                            </>
                          )}
                          {(exp.status !== 'READY' || exp.deleted_at) && <span className="text-[#666666]">{TEXTS.exports.table.actions.noActions}</span>}
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
        <CreateExportModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchExports();
          }}
        />
      )}

      {revokeExportId && (
        <ConfirmationModal
          title={TEXTS.revokeExport.title}
          message={TEXTS.revokeExport.message}
          confirmText={TEXTS.revokeExport.confirm}
          type="danger"
          onConfirm={handleRevoke}
          onCancel={() => setRevokeExportId(null)}
        />
      )}
    </>
  );
}

interface CreateExportModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

function CreateExportModal({ onClose, onCreated }: CreateExportModalProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await createExport({ from: dateFrom, to: dateTo });
      window.open(created.signed_url, '_blank', 'noopener,noreferrer');
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = dateFrom && dateTo && dateFrom <= dateTo;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5]">
          <h2>{TEXTS.createExport.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#f5f5f5] rounded-lg transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-[#e3f2fd] border border-[#2196f3] rounded-lg flex gap-2">
            <AlertTriangle className="w-5 h-5 text-[#1565c0] flex-shrink-0" />
            <div className="text-sm text-[#1565c0]">
              <p className="font-medium mb-1">{TEXTS.createExport.info.title}</p>
              <p>{TEXTS.createExport.info.description}</p>
            </div>
          </div>

          <div>
            <label className="block mb-2">
              {TEXTS.createExport.fields.dateFrom} <span className="text-[#dc2626]">{TEXTS.createExport.required}</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-2">
              {TEXTS.createExport.fields.dateTo} <span className="text-[#dc2626]">{TEXTS.createExport.required}</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
                required
              />
            </div>
          </div>

          {dateFrom && dateTo && dateFrom > dateTo && (
            <div className="p-3 bg-[#fef2f2] border border-[#dc2626] rounded-lg">
              <p className="text-sm text-[#dc2626]">{TEXTS.createExport.validation.dateError}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-[#fef2f2] border border-[#dc2626] rounded-lg text-sm text-[#dc2626]">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1 px-4 py-2.5 bg-[#00C9CE] text-white rounded-lg hover:bg-[#00b3b8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? TEXTS.createExport.actions.generating : TEXTS.createExport.actions.generate}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5] transition-colors"
            >
              {TEXTS.createExport.actions.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
