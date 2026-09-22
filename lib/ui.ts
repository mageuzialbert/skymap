/**
 * Shared UI class strings for the dashboard / client pages, so every surface
 * uses the same modern look (matching the home + auth pages): rounded-2xl
 * cards, pill buttons, rounded-xl inputs, Sora page titles, brand-tinted chips.
 *
 * Usage: import { cardClass, pillPrimary } from '@/lib/ui';
 *        <div className={cardClass}> ... </div>
 * Compose with extra classes via template strings: `${cardClass} p-6`.
 */

/** Standard card / surface. */
export const cardClass = 'rounded-2xl border border-gray-100 bg-white shadow-sm';

/** Primary action button (teal pill). */
export const pillPrimary =
  'inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed';

/** Secondary / neutral button (outline pill). */
export const pillGhost =
  'inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed';

/** Text input / select. */
export const inputClass =
  'w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15';

/** Page heading (Sora display face). */
export const pageTitle = 'font-display text-2xl sm:text-3xl font-bold text-gray-900';

/** Section heading inside a card. */
export const sectionTitle = 'font-display text-lg font-bold text-gray-900';

/** Brand-tinted icon chip. */
export const chipClass = 'flex items-center justify-center rounded-2xl bg-primary/10 text-primary';

/**
 * Read-only / prefilled field.
 *
 * Built by swapping the token's background, not by appending `bg-gray-50`:
 * Tailwind emits `.bg-gray-50` *before* `.bg-white`, so a composed grey would
 * silently lose to the white already in `inputClass`.
 */
export const inputReadOnly = `${inputClass.replace('bg-white', 'bg-gray-50')} text-gray-500`;

/** Multi-line input. Inherits the token's 16px so iOS does not zoom the page
 *  on focus - the reason `text-sm` was dropped from `inputClass`. */
export const textareaClass = `${inputClass} h-auto min-h-[6rem] py-3`;

/* ---------------------------------------------------------------------------
   List and form vocabulary, matching the Account / Activity / Home screens.
   --------------------------------------------------------------------------- */

/** Quiet heading above a card or list. Sentence case, never uppercase. */
export const sectionLabel = 'mb-2 ml-1 text-[13px] font-semibold text-gray-500';

/** Label above a form control. */
export const fieldLabel = 'mb-1.5 block text-[13px] font-medium text-gray-600';

/** Helper text under a control. */
export const helpText = 'mt-1.5 text-[13px] text-gray-500';

/** Validation message under a control. */
export const errorText = 'mt-1.5 text-[13px] text-red-600';

/** Tappable row inside a card list. 56px, with touch feedback. */
export const rowClass =
  'flex min-h-[3.5rem] items-center gap-3 px-4 transition-colors hover:bg-gray-50 active:bg-gray-100';

/** Hairline between rows, inset to start under the label. */
export const insetDivider = 'ml-[3.25rem] block h-px bg-gray-100';

/**
 * One ladder for everything that floats, so layers stop fighting. Before this,
 * the camera (z-[60]) opened *underneath* the map picker (z-[200]).
 * Later entries sit on top of earlier ones.
 */
export const Z = {
  chat: 'z-[60]',
  sheet: 'z-[100]',
  fullscreen: 'z-[110]',
  camera: 'z-[120]',
  dialog: 'z-[130]',
} as const;

/* ---------------------------------------------------------------------------
   Filter chips and sticky bars, shared by every list screen.
   --------------------------------------------------------------------------- */

/** The strip a chip row sits in, stuck to the top of the scroll area. */
export const stickyFilterBar =
  'sticky top-0 z-10 -mx-4 mb-4 bg-gray-50/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6';

/** Horizontally scrolling chip track, with the scrollbar hidden. */
export const chipTrack =
  '-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/** One filter chip. Selected is near-black, not brand teal: the chips say what
 *  you are looking at, they are not the page's primary action. */
export function filterChip(active: boolean): string {
  return `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
    active
      ? 'bg-gray-900 text-white'
      : 'border border-gray-200 bg-white text-gray-700 active:bg-gray-100'
  }`;
}

/** Count shown inside a chip, dimmed against whichever background it sits on. */
export function chipCount(active: boolean): string {
  return active ? 'text-white/60' : 'text-gray-400';
}

/**
 * A bar of actions pinned to the bottom of the scroll area.
 *
 * `sticky`, never `fixed`: the dashboard shell is `h-[100dvh] flex flex-col`
 * with the tab bar as a normal-flow sibling, so a `fixed` bar paints straight
 * over the navigation. Sticky inside <main> lands exactly above it.
 */
export const actionBar =
  'sticky bottom-0 -mx-4 mt-6 border-t border-gray-100 bg-gray-50/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-6 sm:px-6';
