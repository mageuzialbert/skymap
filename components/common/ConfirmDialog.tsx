'use client';

import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import Sheet from '@/components/common/Sheet';
import { useT } from '@/lib/i18n';
import { pillGhost, pillPrimary } from '@/lib/ui';

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
    button: 'bg-red-600 hover:bg-red-700 shadow-red-600/25',
  },
  warning: {
    iconBg: 'bg-amber-100',
    icon: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25',
  },
  info: {
    iconBg: 'bg-primary/10',
    icon: 'text-primary',
    button: '',
  },
};

/**
 * Confirm or cancel a consequential action.
 *
 * Built on the shared Sheet, so it inherits Escape, a focus trap, the scroll
 * lock and the z-ladder. Its buttons were `px-4 py-2 text-sm` - about 34px,
 * under the 44px touch minimum - on a dialog that already appears on the
 * redesigned account screen.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'info',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useT();
  const styles = toneStyles[tone];
  const Icon = tone === 'info' ? Info : AlertTriangle;

  return (
    <Sheet
      open={isOpen}
      onClose={() => !loading && onCancel()}
      title={title}
      layer="dialog"
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`${pillGhost} h-12 flex-1`}
          >
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`${pillPrimary} h-12 flex-1 ${styles.button}`}
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {confirmLabel ?? t('common.confirm')}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-4 p-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}
        >
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </span>
        <p className="min-w-0 flex-1 pt-2 text-[15px] leading-relaxed text-gray-600">{message}</p>
      </div>
    </Sheet>
  );
}
