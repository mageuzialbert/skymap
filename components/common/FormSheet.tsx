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
  hideFooter = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  error?: string;
  submitting?: boolean;
  submitLabel?: string;
  /** For callers whose embedded form brings its own submit button - without
   *  this the sheet rendered a second, non-functional "Save". */
  hideFooter?: boolean;
  children: ReactNode;
}) {
  const t = useT();

  // Some callers embed a form that brings its own submit button. Without this
  // the sheet still rendered its own primary "Save", wired to whatever onSubmit
  // was passed - a prominent button that did nothing.
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <Sheet
      open={open}
      onClose={() => !submitting && onClose()}
      title={title}
      footer={hideFooter ? undefined : (
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
      )}
    >
      {/* The form element stays so Enter submits and browsers autofill. */}
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        {error && <Alert tone="error">{error}</Alert>}
        {children}
      </form>
    </Sheet>
  );
}
