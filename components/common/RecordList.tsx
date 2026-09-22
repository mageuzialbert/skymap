'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cardClass, chipCount, chipTrack, filterChip, sectionLabel, stickyFilterBar } from '@/lib/ui';

/**
 * One list, one rendering.
 *
 * Every list screen in the console had a `<table>` for desktop and a
 * `md:hidden` card list for phones - except the dashboard caps content at
 * 768px and `md:` switches at 768px, so the table was always the one on
 * screen, scrolling sideways, and the better view was never seen. This is the
 * card list, at every width.
 */
export function RecordList({ children }: { children: ReactNode }) {
  return (
    <div className={`${cardClass} overflow-hidden`}>
      <ul className="divide-y divide-gray-100">{children}</ul>
    </div>
  );
}

export interface RowStatus {
  /** A `BUCKET_DOT` / `INVOICE_DOT` class. */
  dot: string;
  /** A `BUCKET_TEXT` / `INVOICE_TEXT` class. */
  text: string;
  label: string;
}

/**
 * One record. `title` and `trailing` share the top line; `subtitle` and `meta`
 * the second; `status` and `actions` the third.
 */
export function RecordRow({
  leading,
  title,
  trailing,
  subtitle,
  meta,
  status,
  actions,
  href,
  onClick,
}: {
  /** An icon chip or avatar. */
  leading?: ReactNode;
  title: ReactNode;
  /** Right of the title - an amount, a time. */
  trailing?: ReactNode;
  subtitle?: ReactNode;
  /** Right of the subtitle - quieter than `trailing`. */
  meta?: ReactNode;
  status?: RowStatus | null;
  /** At most a few secondary buttons; anything more belongs in a Sheet. */
  actions?: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      {leading && <span className="mt-0.5 shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-gray-900">
            {title}
          </span>
          {trailing && <span className="shrink-0 text-[13px] text-gray-500">{trailing}</span>}
        </span>
        {(subtitle || meta) && (
          <span className="mt-0.5 flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] text-gray-500">{subtitle}</span>
            {meta && <span className="shrink-0 text-[13px] text-gray-400">{meta}</span>}
          </span>
        )}
        {status && (
          <span
            className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium ${status.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        )}
      </span>
      {(href || onClick) && !actions && (
        <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />
      )}
    </>
  );

  const rowClasses =
    'flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100';

  return (
    <li>
      {href ? (
        <Link href={href} className={rowClasses}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={rowClasses}>
          {body}
        </button>
      ) : (
        <div className={`${rowClasses} hover:bg-transparent active:bg-transparent`}>{body}</div>
      )}
      {actions && <div className="flex flex-wrap gap-2 px-4 pb-3.5 pl-4">{actions}</div>}
    </li>
  );
}

export interface FilterChip<T extends string> {
  key: T;
  label: string;
  count?: number;
}

/** The sticky chip row above a list. Replaces every `<select>` status filter. */
export function ListToolbar<T extends string>({
  chips,
  active,
  onChange,
  right,
}: {
  chips: FilterChip<T>[];
  active: T;
  onChange: (key: T) => void;
  /** An extra control pinned to the right of the chips. */
  right?: ReactNode;
}) {
  return (
    <div className={`${stickyFilterBar} flex items-center gap-2`}>
      <div className={`${chipTrack} flex-1`}>
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            aria-pressed={active === c.key}
            className={filterChip(active === c.key)}
          >
            {c.label}
            {c.count !== undefined && (
              <span className={chipCount(active === c.key)}>{c.count}</span>
            )}
          </button>
        ))}
      </div>
      {right}
    </div>
  );
}

/** Nothing here - and what to do about it. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: any;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`${cardClass} px-6 py-12 text-center`}>
      <Icon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
      <p className="text-base font-semibold text-gray-900">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-xs text-[15px] text-gray-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** "Showing 25 of 340" plus Load more. No page-size select: that is desktop
 *  furniture on a list you scroll with a thumb. */
export function ListFooter({
  shown,
  total,
  onLoadMore,
  loading,
  labels,
}: {
  shown: number;
  total: number;
  onLoadMore?: () => void;
  loading?: boolean;
  labels: { showing: string; loadMore: string };
}) {
  return (
    <div className="mt-3 flex flex-col items-center gap-3">
      <p className="text-[13px] text-gray-500">{labels.showing}</p>
      {onLoadMore && shown < total && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="min-h-[2.75rem] rounded-full border border-gray-300 bg-white px-5 text-[15px] font-semibold text-gray-700 transition-colors active:bg-gray-50 disabled:opacity-60"
        >
          {labels.loadMore}
        </button>
      )}
    </div>
  );
}
