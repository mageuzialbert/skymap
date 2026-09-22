/**
 * Dates, in the reader's language.
 *
 * Several screens called `toLocaleDateString('en-US', …)`, so dates stayed in
 * English even with the app switched to Swahili. Passing `undefined` as the
 * locale uses the browser's, which follows the device.
 */

/** "14:32" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** "21 Sep, 14:32" - a timestamp compact enough for a list row. */
export function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * The heading for a day group: "Today", "Yesterday", or a date. Needs `t`
 * because the first two are words, not dates.
 */
export function formatDayLabel(day: Date, t: (key: string) => string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (day.getTime() === today.getTime()) return t('business.rides.today');
  if (day.getTime() === yesterday.getTime()) return t('business.rides.yesterday');
  return day.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(day.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** Midnight on the day an ISO timestamp falls, for grouping. */
export function startOfDay(iso: string): Date {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Group rows that are already sorted newest-first into day sections, in one
 * pass. Used by every activity list.
 */
export function groupByDay<T>(
  rows: T[],
  getDate: (row: T) => string,
  t: (key: string) => string
): { key: string; label: string; rows: T[] }[] {
  const out: { key: string; label: string; rows: T[] }[] = [];
  for (const row of rows) {
    const day = startOfDay(getDate(row));
    const key = day.toDateString();
    if (out[out.length - 1]?.key !== key) {
      out.push({ key, label: formatDayLabel(day, t), rows: [] });
    }
    out[out.length - 1].rows.push(row);
  }
  return out;
}
