'use client';

import type { FormEvent, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import Alert from '@/components/common/Alert';
import Sheet from '@/components/common/Sheet';
import { useT } from '@/lib/i18n';
import { pillGhost, pillPrimary } from '@/lib/ui';

/**
 * Create or edit one record.
 *
 * The console had fifteen of these: nine hand-rolled overlays and six inline
 * panels that replaced the list in place, so opening "Add" scrolled you away
 * from where you were. None had Escape, a focus trap, `role="dialog"` or a
 * scroll lock, and all sat at z-50 - below the chat launcher. This has all of
 * that by virtue of being a Sheet.
 */
export default function FormSheet({
  open,
  onClose,
  onSubmit,
  title,
  error,
  submitting = false,
  submitLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  error?: string;
  submitting?: boolean;
  submitLabel?: string;
  children: ReactNode;
}) {
  const t = useT();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <Sheet
      open={open}
      onClose={() => !submitting && onClose()}
      title={title}
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={`${pillGhost} h-12 flex-1`}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className={`${pillPrimary} h-12 flex-[2]`}
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {submitting ? t('common.saving') : submitLabel || t('common.save')}
          </button>
        </div>
      }
    >
      {/* The form element stays so Enter submits and browsers autofill. */}
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        {error && <Alert tone="error">{error}</Alert>}
        {children}
      </form>
    </Sheet>
  );
}
