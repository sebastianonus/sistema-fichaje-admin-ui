import { AlertTriangle } from 'lucide-react';
import { TEXTS } from '@/constants/texts';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'default' | 'danger';
}

export function ConfirmationModal({
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  type = 'default',
}: ConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        {type === 'danger' && (
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#dc2626]/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-[#dc2626]" />
            </div>
            <h3 className="text-[#dc2626]">{title}</h3>
          </div>
        )}
        {type === 'default' && <h3 className="mb-4">{title}</h3>}
        
        <p className="text-[#666666] mb-6">{message}</p>

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors ${
              type === 'danger'
                ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                : 'bg-[#00C9CE] text-white hover:bg-[#00b3b8]'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-[#e5e5e5] text-[#000935] rounded-lg hover:bg-[#f5f5f5] transition-colors"
          >
            {TEXTS.confirmation.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
