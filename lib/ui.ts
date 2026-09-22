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

/** Modal backdrop. */
export const overlayClass = 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm';

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
