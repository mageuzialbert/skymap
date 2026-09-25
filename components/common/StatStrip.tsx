'use client';

import Link from 'next/link';
import { cardClass, sectionLabel } from '@/lib/ui';

export interface Stat {
  label: string;
  value: string | number;
  /** Makes the tile tappable. */
  href?: string;
  /** Tints the number, e.g. a bucket colour for a status count. */
  tone?: string;
}

/**
 * Metrics as a grid of tiles - two per row on a phone.
 *
 * The previous version set `gridTemplateColumns: repeat(N, 1fr)` as an inline
 * style, which no media query can override, so it forced every stat onto one
 * row at any width. Inside the dashboard's `max-w-3xl p-4` measure a 390px
 * phone has 358px, so four stats got 89px each - 65px of text after padding -
 * and the `truncate`d 13px label clipped: "Awaiting confirmation" and
 * "Completed Today" both rendered as an ellipsis.
 *
 * Two columns give each tile ~163px and the label room to wrap onto a second
 * line, which is the design rather than a failure. `sm:` restores a single row
 * once there is width for it; the column classes are looked up from a literal
 * map because Tailwind cannot see a class name built by interpolation.
 */
const SM_COLS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
};

export default function StatStrip({
  stats,
  label,
  size = 'md',
}: {
  stats: Stat[];
  label?: string;
  /** `sm` drops the value to text-xl - use it for currency, which is far
   *  longer than a count and would otherwise overflow a 163px tile. */
  size?: 'md' | 'sm';
}) {
  if (stats.length === 0) return null;

  const valueSize = size === 'sm' ? 'text-xl' : 'text-2xl';

  return (
    <section>
      {label && <h2 className={sectionLabel}>{label}</h2>}
      <div className={`grid grid-cols-2 gap-3 ${SM_COLS[stats.length] ?? 'sm:grid-cols-4'}`}>
        {stats.map((s, i) => {
          // An odd tile last would leave a hole in a 2-up grid, so it spans.
          const spans = stats.length % 2 === 1 && i === stats.length - 1;
          const tile = `${cardClass} px-4 py-3.5 ${spans ? 'col-span-2 sm:col-span-1' : ''}`;
          const body = (
            <>
              <span
                className={`block min-w-0 tabular-nums ${valueSize} font-bold leading-tight ${
                  s.tone || 'text-gray-900'
                }`}
              >
                {s.value}
              </span>
              <span className="mt-1 block text-[13px] leading-tight text-gray-500">{s.label}</span>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className={`${tile} transition-colors active:bg-gray-50`}>
              {body}
            </Link>
          ) : (
            <div key={s.label} className={tile}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
