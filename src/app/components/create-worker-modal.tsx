import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { TEXTS } from '@/constants/texts';
import { createWorker } from '@/lib/api';

interface CreateWorkerModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateWorkerModal({ onClose, onCreated }: CreateWorkerModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);
      await createWorker({
        full_name: fullName.trim(),
        email: email.trim(),
        password: password.trim(),
      });
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = fullName.trim() && email.trim() && password.trim();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5]">
          <h2>{TEXTS.createWorker.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#f5f5f5] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-2">
              {TEXTS.createWorker.fields.fullName} <span className="text-[#dc2626]">{TEXTS.createWorker.required}</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={TEXTS.createWorker.fields.placeholders.fullName}
              className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
              required
            />
          </div>

          <div>
            <label className="block mb-2">
              {TEXTS.createWorker.fields.email} <span className="text-[#dc2626]">{TEXTS.createWorker.required}</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={TEXTS.createWorker.fields.placeholders.email}
              className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
              required
            />
          </div>

          <div>
            <label className="block mb-2">
              {TEXTS.createWorker.fields.password} <span className="text-[#dc2626]">{TEXTS.createWorker.required}</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={TEXTS.createWorker.fields.placeholders.password}
              className="w-full px-3 py-2 bg-white border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
              required
            />
            <div className="mt-2 p-3 bg-[#fff3cd] border border-[#ffc107] rounded-lg flex gap-2">
              <AlertTriangle className="w-5 h-5 text-[#856404] flex-shrink-0" />
              <p className="text-sm text-[#856404]">{TEXTS.createWorker.warning}</p>
            </div>
          </div>

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
              {isSubmitting ? TEXTS.createWorker.actions.creating : TEXTS.createWorker.actions.create}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5] transition-colors"
            >
              {TEXTS.createWorker.actions.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
