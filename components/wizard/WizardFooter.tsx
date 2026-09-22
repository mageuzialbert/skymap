'use client';

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { pillGhost, pillPrimary } from '@/lib/ui';

/**
 * The step's actions, stuck to the bottom of the scroll area.
 *
 * It sticks inside <main>, which is the scrolling element, so it lands exactly
 * above the bottom tab bar (a flex sibling) with no overlap and no z-index
 * fight. Previously this row sat in normal flow, which put the primary action
 * below the fold on every two-card step.
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
    <div className="sticky bottom-0 -mx-4 mt-6 border-t border-gray-100 bg-gray-50/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-6 sm:px-6">
      {hint && (
        <p role="status" className="mb-2 text-[13px] font-medium text-red-600">
          {hint}
        </p>
      )}
      <div className="flex items-center gap-3">
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
      </div>
    </div>
  );
}
