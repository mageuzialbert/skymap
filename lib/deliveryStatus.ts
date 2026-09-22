/**
 * How a delivery's status is shown to a customer or rider.
 *
 * The eight database statuses collapse into three states people actually act
 * on - in flight, done, went wrong - which is what the Activity filter chips
 * and the status dots use. The exact status is still spelled out next to the
 * dot, so nothing is hidden.
 *
 * The labels live in the business namespace but every locale dictionary is
 * merged into one tree, so rider and staff screens can read them too.
 */

export type StatusBucket = 'ACTIVE' | 'DONE' | 'FAILED';

/** Everything that has not finished yet - the rows a home screen surfaces. */
export const ACTIVE_STATUSES = [
  'CREATED',
  'PENDING_CONFIRMATION',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
];

export function statusBucket(status: string): StatusBucket {
  if (status === 'DELIVERED') return 'DONE';
  if (status === 'FAILED' || status === 'REJECTED') return 'FAILED';
  return 'ACTIVE';
}

/** A dot in one of three tones reads faster than eight bordered pills. */
export const BUCKET_DOT: Record<StatusBucket, string> = {
  ACTIVE: 'bg-blue-500',
  DONE: 'bg-emerald-500',
  FAILED: 'bg-red-500',
};

export const BUCKET_TEXT: Record<StatusBucket, string> = {
  ACTIVE: 'text-blue-700',
  DONE: 'text-emerald-700',
  FAILED: 'text-red-700',
};

const STATUS_KEYS: Record<string, string> = {
  CREATED: 'created',
  PENDING_CONFIRMATION: 'pendingConfirmation',
  ASSIGNED: 'assigned',
  PICKED_UP: 'pickedUp',
  IN_TRANSIT: 'inTransit',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  REJECTED: 'rejected',
};

/** i18n key for a status label, e.g. t(statusLabelKey('IN_TRANSIT')). */
export function statusLabelKey(status: string): string {
  return `business.rides.status.${STATUS_KEYS[status] || 'created'}`;
}

/**
 * Which statuses a rider may move a job to next.
 *
 * The server enforces this in `app/api/rider/deliveries/[id]/status/route.ts`,
 * which imports the same table - the client had its own copy, so the two could
 * disagree about whether a transition was legal.
 *
 * PENDING_CONFIRMATION is not a rider transition: only staff/admin can confirm,
 * via the separate confirm endpoint.
 */
export const RIDER_TRANSITIONS: Record<string, string[]> = {
  PENDING_CONFIRMATION: [],
  ASSIGNED: ['PICKED_UP', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
  REJECTED: [],
};

export function nextStatusesFor(status: string): string[] {
  return RIDER_TRANSITIONS[status] || [];
}
