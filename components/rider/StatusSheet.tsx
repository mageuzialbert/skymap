'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Alert from '@/components/common/Alert';
import Sheet from '@/components/common/Sheet';
import { OptionGroup, OptionRow } from '@/components/wizard/OptionGroup';
import {
  BUCKET_DOT,
  BUCKET_TEXT,
  nextStatusesFor,
  statusBucket,
  statusLabelKey,
} from '@/lib/deliveryStatus';
import { useT } from '@/lib/i18n';
import { errorText, fieldLabel, pillGhost, pillPrimary, textareaClass } from '@/lib/ui';

/**
 * Move a job to its next status.
 *
 * On the shared Sheet, so it gets Escape, a focus trap, a scroll lock and the
 * right layer - the hand-rolled modal this replaces had none of those and sat
 * at z-50, below the chat launcher that can open on top of it.
 *
 * The legal transitions come from `lib/deliveryStatus`, which the status API
 * imports too; the old modal kept its own copy of that table.
 */
export default function StatusSheet({
  isOpen,
  onClose,
  currentStatus,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  onUpdate: (status: string, note: string) => Promise<void>;
}) {
  const t = useT();
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Start clean each time, so a previous attempt never pre-selects.
  useEffect(() => {
    if (isOpen) {
      setSelected('');
      setNote('');
      setError('');
    }
  }, [isOpen]);

  const options = nextStatusesFor(currentStatus);
  const tone = statusBucket(currentStatus);

  async function submit() {
    if (!selected) {
      setError(t('rider.statusModal.selectStatus'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onUpdate(selected, note);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rider.statusModal.failedUpdate'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={t('rider.statusModal.title')}
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
            onClick={submit}
            disabled={submitting}
            className={`${pillPrimary} h-12 flex-[2]`}
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {submitting ? t('rider.statusModal.updating') : t('rider.statusModal.updateStatus')}
          </button>
        </div>
      }
    >
      <div className="space-y-5 p-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div>
          <span className={fieldLabel}>{t('rider.statusModal.currentStatus')}</span>
          <span
            className={`inline-flex items-center gap-1.5 text-[15px] font-semibold ${BUCKET_TEXT[tone]}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${BUCKET_DOT[tone]}`} />
            {t(statusLabelKey(currentStatus))}
          </span>
        </div>

        <OptionGroup label={t('rider.statusModal.newStatus')}>
          {options.map((status) => (
            <OptionRow
              key={status}
              selected={selected === status}
              onSelect={() => {
                setSelected(status);
                setError('');
              }}
              disabled={submitting}
              title={t(statusLabelKey(status))}
              subtitle={t(`rider.statusModal.options.${status}.description`)}
            />
          ))}
        </OptionGroup>
        {options.length === 0 && <p className={errorText}>{t('rider.statusModal.selectStatus')}</p>}

        <div>
          <label className={fieldLabel} htmlFor="statusNote">
            {t('rider.statusModal.note')}
          </label>
          <textarea
            id="statusNote"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('rider.statusModal.notePlaceholder')}
            className={textareaClass}
            disabled={submitting}
          />
        </div>
      </div>
    </Sheet>
  );
}
