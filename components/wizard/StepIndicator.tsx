'use client';

import { useT } from '@/lib/i18n';
import { getServiceType, type ServiceTypeKey } from '@/lib/serviceTypes';

/**
 * Where you are in the flow. The wizard previously had no progress indication
 * at all - the step labels were translated into both languages and never
 * rendered.
 *
 * Completed segments are tappable so you can go back and change an answer;
 * steps ahead are not, because they may not be valid yet.
 */
export default function StepIndicator({
  service,
  steps,
  current,
  onJump,
}: {
  service: ServiceTypeKey;
  steps: { id: string; label: string }[];
  /** Zero-based index into `steps`. */
  current: number;
  onJump?: (index: number) => void;
}) {
  const t = useT();
  const { accent } = getServiceType(service);

  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5" aria-hidden>
        {steps.map((step, i) => {
          const done = i <= current;
          const canJump = i < current && onJump;
          const bar = (
            <span
              className={`block h-1 rounded-full transition-colors ${done ? accent.bar : 'bg-gray-200'}`}
            />
          );
          return canJump ? (
            <button
              key={step.id}
              type="button"
              onClick={() => onJump(i)}
              aria-label={step.label}
              className="flex-1 py-2"
            >
              {bar}
            </button>
          ) : (
            <span key={step.id} className="flex-1 py-2">
              {bar}
            </span>
          );
        })}
      </div>
      {/* No step name here - StepShell's heading right below already says what
          this step is asking for. */}
      <p className="text-[13px] font-semibold text-gray-500">
        {t('components.rideWizard.stepOf', { n: current + 1, total: steps.length })}
      </p>
    </div>
  );
}
