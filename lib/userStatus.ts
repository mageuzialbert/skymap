/**
 * How a user's role and active state are shown.
 *
 * The sibling of lib/deliveryStatus.ts and lib/invoiceStatus.ts. The console
 * rendered `{user.role}` raw in three places, hardcoded 'Active'/'Inactive' in
 * English, and carried a fourth private colour vocabulary for roles.
 *
 * Role labels reuse `account.roles.*`, which the Account screen already shows
 * to the person whose role it is - so staff and that person read the same word.
 */

export const ROLE_TINT: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  STAFF: 'bg-blue-100 text-blue-700',
  RIDER: 'bg-emerald-100 text-emerald-700',
  BUSINESS: 'bg-amber-100 text-amber-700',
};

const KNOWN_ROLES = ['ADMIN', 'STAFF', 'RIDER', 'BUSINESS'];

/** i18n key for a role label, e.g. t(roleLabelKey('RIDER')). */
export function roleLabelKey(role: string): string {
  return KNOWN_ROLES.includes(role) ? `account.roles.${role}` : '';
}

/** A role label, falling back to the raw value for anything unrecognised. */
export function roleLabel(role: string, t: (key: string) => string): string {
  const key = roleLabelKey(role);
  return key ? t(key) : role;
}

/** The dot and label for an active / inactive record. */
export function activeDot(active: boolean): string {
  return active ? 'bg-emerald-500' : 'bg-gray-400';
}

export function activeText(active: boolean): string {
  return active ? 'text-emerald-700' : 'text-gray-500';
}

export function activeLabelKey(active: boolean): string {
  return active ? 'common.active' : 'common.inactive';
}
