'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Z } from '@/lib/ui';

type Variant = 'sheet' | 'fullscreen';
type Layer = keyof typeof Z;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * The one modal surface. Before this, three components hand-rolled their own
 * scrim and container, two had no Escape key and none trapped focus - and the
 * camera opened *underneath* the map picker because each picked its own
 * z-index. Layers now come from the shared `Z` ladder.
 *
 * `sheet` rises from the bottom on a phone and centres above `sm`;
 * `fullscreen` fills the screen for map- and camera-sized content.
 */
export default function Sheet({
  open,
  onClose,
  title,
  variant = 'sheet',
  layer = 'sheet',
  headerRight,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  variant?: Variant;
  layer?: Layer;
  /** Optional control opposite the close button. */
  headerRight?: ReactNode;
  /** Pinned below the scrolling body, above the home indicator. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape to close, Tab kept inside the panel, and the page behind frozen so
  // a phone does not scroll the list under the sheet.
  useEffect(() => {
    if (!open) return;
    const returnFocusTo = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus() ?? panel?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      returnFocusTo?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const fullscreen = variant === 'fullscreen';

  return (
    <div className={`fixed inset-0 ${Z[layer]} flex ${fullscreen ? '' : 'items-end sm:items-center'} justify-center`}>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        // Not `overlayClass`: that token carries its own `fixed inset-0 z-50`,
        // and Tailwind emits .z-50 after .z-0, so composing the two put the
        // scrim *above* the panel - veiling the sheet and swallowing taps.
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${fullscreen ? 'hidden' : ''}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={
          fullscreen
            ? 'relative z-10 flex h-full w-full flex-col bg-white'
            : 'relative z-10 flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl'
        }
      >
        <header
          className={`flex shrink-0 items-center gap-2 border-b border-gray-100 px-4 py-3 ${
            fullscreen ? 'pt-[max(0.75rem,env(safe-area-inset-top))]' : ''
          }`}
        >
          <h2 className="min-w-0 flex-1 truncate font-display text-lg font-bold text-gray-900">
            {title}
          </h2>
          {headerRight}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 active:bg-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
