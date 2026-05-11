'use client';

import { useEffect } from 'react';
import { AlertTriangle, Info, Loader2, X } from 'lucide-react';

export type ConfirmTone = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const toneStyles: Record<ConfirmTone, { iconBg: string; icon: string; button: string }> = {
  danger: {
    iconBg: 'bg-red-100',
    icon: 'text-red-600',
    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-300',
  },
  warning: {
    iconBg: 'bg-amber-100',
    icon: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-300',
  },
  info: {
    iconBg: 'bg-primary/10',
    icon: 'text-primary',
    button: 'bg-primary hover:bg-primary-dark focus:ring-primary/40',
  },
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'info',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const styles = toneStyles[tone];
  const Icon = tone === 'info' ? Info : AlertTriangle;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={() => !loading && onCancel()}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-full ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${styles.icon}`} />
          </div>
          <div className="flex-1 pt-0.5">
            <h2 id="confirm-dialog-title" className="text-base font-bold text-gray-900">
              {title}
            </h2>
            <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg focus:outline-none focus:ring-4 transition-colors disabled:opacity-60 cursor-pointer ${styles.button}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
