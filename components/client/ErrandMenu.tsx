'use client';

import { ArrowLeft, ChevronRight, ClipboardPen } from 'lucide-react';
import { useT } from '@/lib/i18n';

/**
 * The kinds of errand a customer can ask for. `label` is fixed English on
 * purpose: it is posted with the request and read raw on staff screens, so it
 * must not change with the customer's language. What the customer reads comes
 * from business.home.errands.types.<id>; `points` is how many bullet lines
 * that entry has (p1..pN).
 */
export const ERRAND_TYPES = [
  { id: 'documents', label: 'Document Handling', points: 4 },
  { id: 'shopping', label: 'Shopping Errands', points: 3 },
  { id: 'payments', label: 'Payment Assistance', points: 3 },
  { id: 'inspection', label: 'Follow-up & Inspection', points: 4 },
  { id: 'personal', label: 'Personal Assistance', points: 3 },
  { id: 'pickup', label: 'Pickup & Collection', points: 4 },
  // Anything permitted that the six above do not cover. It has no photo.
  { id: 'other', label: 'Other Task', points: 1 },
] as const;

/**
 * Shown when "Running Errands" is tapped on the home screen: a numbered list
 * of errand kinds, each with a photo and what it covers. Picking one starts
 * the errand request with that kind attached.
 */
export default function ErrandMenu({
  onBack,
  onChoose,
}: {
  onBack: () => void;
  /** Receives the fixed English label of the chosen errand kind. */
  onChoose: (label: string) => void;
}) {
  const t = useT();
  return (
    <div>
      <header className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700 transition-colors active:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-[20px] font-bold leading-tight tracking-tight text-slate-900">
            {t('business.home.errands.title')}
          </h1>
          <p className="text-[13px] leading-snug text-gray-500">
            {t('business.home.errands.subtitle')}
          </p>
        </div>
      </header>

      <ul className="divide-y divide-gray-200">
        {ERRAND_TYPES.map(({ id, label, points }, i) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onChoose(label)}
              className="flex w-full items-start gap-3 py-3.5 text-left transition-colors active:bg-gray-50"
            >
              {id === 'other' ? (
                <span className="flex h-[5.25rem] w-[5.25rem] shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ClipboardPen className="h-8 w-8" strokeWidth={1.5} />
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/services/errands/${id}.webp`}
                  alt=""
                  loading="lazy"
                  className="h-[5.25rem] w-[5.25rem] shrink-0 rounded-2xl object-cover"
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold leading-tight text-slate-900">
                  {i + 1}. {t(`business.home.errands.types.${id}.title`)}
                </span>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px] leading-snug text-slate-700 marker:text-slate-400">
                  {Array.from({ length: points }, (_, n) => (
                    <li key={n}>{t(`business.home.errands.types.${id}.p${n + 1}`)}</li>
                  ))}
                </ul>
              </span>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-400" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
