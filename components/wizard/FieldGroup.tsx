'use client';

import type { ReactNode } from 'react';
import { cardClass, sectionLabel } from '@/lib/ui';

/**
 * A labelled group of fields or rows on one card surface. Replaces nine
 * hand-written copies of the card class string in the wizard, so `cardClass`
 * is genuinely the single source for what a surface looks like.
 *
 * `padded` (the default) is for form controls; turn it off for edge-to-edge
 * rows that bring their own px-4, like selectable options and list items.
 */
export default function FieldGroup({
  label,
  padded = true,
  compact = false,
  children,
}: {
  label?: string;
  padded?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      {label && <h2 className={sectionLabel}>{label}</h2>}
      <div className={`${cardClass} overflow-hidden ${padded ? (compact ? 'p-3' : 'p-4 sm:p-5') : ''}`}>
        {padded ? <div className={compact ? "space-y-2" : "space-y-4"}>{children}</div> : children}
      </div>
    </section>
  );
}
