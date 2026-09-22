'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { sectionLabel } from '@/lib/ui';

/**
 * One way to choose one thing. The wizard had four near-identical versions of
 * this - vehicle types, hire vehicles, people-or-load, and now-or-later - with
 * different border weights, different selected states, and in one case no
 * checkmark at all, so selection read only as a faint tint that is hard to see
 * on a phone outdoors.
 *
 * Selection is always brand teal, never the service accent: what is tappable
 * has to be learnable once for the whole app.
 */
export function OptionGroup({
  label,
  columns = 1,
  children,
}: {
  label?: string;
  /** 2 for short side-by-side choices, 1 for rows with detail. */
  columns?: 1 | 2;
  children: ReactNode;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      {label && <h2 className={sectionLabel}>{label}</h2>}
      <div className={columns === 2 ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
        {children}
      </div>
    </div>
  );
}

export function OptionRow({
  selected,
  onSelect,
  icon,
  imageUrl,
  imageFit = 'cover',
  title,
  subtitle,
  layout = 'row',
  disabled = false,
}: {
  selected: boolean;
  onSelect: () => void;
  /** A Lucide-style icon element, shown when there is no image. */
  icon?: ReactNode;
  imageUrl?: string | null;
  /** 'cover' for photographs, 'contain' for a logo or glyph that must not crop. */
  imageFit?: 'cover' | 'contain';
  title: string;
  subtitle?: string | null;
  /** 'tile' stacks the icon above a wrapping label - a half-width row cannot
   *  fit a chip and a label like "Carrying People" without truncating it. */
  layout?: 'row' | 'tile';
  disabled?: boolean;
}) {
  const tile = layout === 'tile';
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={`relative flex min-h-[3.5rem] rounded-2xl border p-3 transition-colors disabled:opacity-50 ${
        tile ? 'flex-col items-center gap-2 text-center' : 'items-center gap-3 text-left'
      } ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50'
      }`}
    >
      {(imageUrl || icon) && (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ${
            selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className={imageFit === 'contain' ? 'h-6 w-6 object-contain' : 'h-full w-full object-cover'}
            />
          ) : (
            icon
          )}
        </span>
      )}
      <span className={tile ? 'w-full' : 'min-w-0 flex-1'}>
        <span
          className={`block text-[15px] font-semibold leading-tight text-gray-900 ${
            tile ? '' : 'truncate'
          }`}
        >
          {title}
        </span>
        {subtitle && (
          <span className={`mt-0.5 block text-[13px] text-gray-500 ${tile ? '' : 'truncate'}`}>
            {subtitle}
          </span>
        )}
      </span>
      {/* Every option gets the tick, so selection never depends on a tint alone. */}
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          // Floated into the corner only when an icon already occupies the top
          // of the tile; otherwise it sits under the label, where a wrapping
          // label cannot run into it.
          tile && (icon || imageUrl) ? 'absolute right-2 top-2' : ''
        } ${selected ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}
