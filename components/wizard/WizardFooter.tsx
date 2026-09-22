'use client';

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import ActionBar from '@/components/common/ActionBar';
import { useT } from '@/lib/i18n';
import { pillGhost, pillPrimary } from '@/lib/ui';

/**
 * The wizard's Back / Continue row, on the shared ActionBar.
 *
 * Continue is never disabled. A greyed-out button says "no" and nothing else;
 * instead the caller passes a `hint` naming the one thing that is missing, and
 * tapping Continue reveals the field-level errors.
 */
export default function WizardFooter({
  onBack,
  onNext,
  nextLabel,
  loading = false,
  hint,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  loading?: boolean;
  /** Shown above the buttons once the user has tried to continue. */
  hint?: string | null;
}) {
  const t = useT();
  return (
    <ActionBar hint={hint}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className={`${pillGhost} h-12 text-base`}
        >
          <ArrowLeft className="h-5 w-5" />
          {t('common.back')}
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={loading}
        className={`${pillPrimary} ml-auto h-12 px-6 text-base`}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {t('components.rideWizard.submitting')}
          </>
        ) : (
          <>
            {nextLabel}
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
    </ActionBar>
  );
}
