'use client';

import { useId } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { splitAddress } from '@/lib/address';
import { errorText, fieldLabel } from '@/lib/ui';

/**
 * A place, shown as a row rather than a text input.
 *
 * Typing an address into a bare field on a phone was the weakest part of the
 * flow: the suggestion list floated over the page and the soft keyboard covered
 * it. The row shows what is chosen in two readable lines and hands the actual
 * choosing to a full-height sheet.
 *
 * Pickup and drop-off get different markers - the old field took an `icon` prop
 * for exactly this and never used it, so both ends looked identical.
 */
export default function LocationField({
  which,
  label,
  placeholder,
  address,
  onOpen,
  error,
}: {
  which: 'pickup' | 'dropoff';
  label: string;
  placeholder: string;
  address: string;
  onOpen: () => void;
  error?: string | null;
}) {
  const errorId = useId();
  const { title, detail } = splitAddress(address || '');
  const Icon = which === 'pickup' ? Navigation : MapPin;

  return (
    <div>
      <span className={fieldLabel}>{label}</span>
      <button
        type="button"
        onClick={onOpen}
        aria-describedby={error ? errorId : undefined}
        className={`flex min-h-[3.5rem] w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition-colors active:bg-gray-50 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            which === 'pickup' ? 'bg-primary/10 text-primary' : 'bg-secondary/15 text-secondary-dark'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          {address ? (
            <>
              <span className="block truncate text-[15px] font-semibold text-gray-900">{title}</span>
              {detail && (
                <span className="mt-0.5 block truncate text-[13px] text-gray-500">{detail}</span>
              )}
            </>
          ) : (
            <span className="block truncate text-[15px] text-gray-400">{placeholder}</span>
          )}
        </span>
      </button>
      {error && (
        <p id={errorId} className={errorText}>
          {error}
        </p>
      )}
    </div>
  );
}
