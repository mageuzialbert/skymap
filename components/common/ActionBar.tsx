'use client';

import type { ReactNode } from 'react';
import { actionBar } from '@/lib/ui';

/**
 * The actions for a screen, pinned to the bottom of the scroll area.
 *
 * Exists as a component so the positioning is decided once. The dashboard
 * shell (`app/dashboard/layout.tsx`) is `h-[100dvh] flex flex-col overflow-hidden`
 * with the bottom tab bar as a normal-flow `shrink-0` sibling carrying no
 * z-index - so a `fixed bottom-0` bar paints straight over Home/Activity/Account.
 * Sticking inside the scrolling <main> lands the bar exactly above the tabs
 * with no z-index at all.
 */
export default function ActionBar({
  children,
  hint,
}: {
  children: ReactNode;
  /** A short line above the buttons, e.g. what is missing. */
  hint?: ReactNode;
}) {
  return (
    <div className={actionBar}>
      {hint && (
        <p role="status" className="mb-2 text-[13px] font-medium text-red-600">
          {hint}
        </p>
      )}
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}
