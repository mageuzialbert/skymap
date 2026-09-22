'use client';

import Link from 'next/link';
import { cardClass, sectionLabel } from '@/lib/ui';

export interface Stat {
  label: string;
  value: string | number;
  /** Makes the column tappable. */
  href?: string;
  /** Tints the number, e.g. a bucket colour for a status count. */
  tone?: string;
}

/**
 * A row of numbers on one surface.
 *
 * Replaces the `md:grid-cols-3/4` grids of big individual cards. Inside the
 * dashboard's 768px measure those collapse into a column of full-width cards
 * that pushes the actual content below the fold; three numbers side by side
 * read faster and cost one screen-height less.
 */
export default function StatStrip({ stats, label }: { stats: Stat[]; label?: string }) {
  if (stats.length === 0) return null;
  return (
    <section>
      {label && <h2 className={sectionLabel}>{label}</h2>}
      <div className={`${cardClass} grid divide-x divide-gray-100`} style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
        {stats.map((s) => {
          const body = (
            <>
              <span className={`block text-2xl font-bold ${s.tone || 'text-gray-900'}`}>
                {s.value}
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-gray-500">{s.label}</span>
            </>
          );
          return s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="px-3 py-4 text-center transition-colors active:bg-gray-50"
            >
              {body}
            </Link>
          ) : (
            <div key={s.label} className="px-3 py-4 text-center">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
