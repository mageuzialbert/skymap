// Shared definitions for the four built-in transport services.
// Used by the client request wizard and every admin/staff/rider/history display
// so labels, icons and colours stay consistent.

export type ServiceTypeKey = 'delivery' | 'ride' | 'hire' | 'errand';

export interface ServiceTypeDef {
  key: ServiceTypeKey;
  /** Lucide icon name (import the icon where rendered). */
  icon: 'Package' | 'UserRound' | 'Clock' | 'ShoppingBag';
  label: string;
  /** One-line description shown on the purpose-selection card. */
  description: string;
  /** Tailwind classes for a small badge. */
  badgeClass: string;
}

export const SERVICE_TYPES: ServiceTypeDef[] = [
  {
    key: 'delivery',
    icon: 'Package',
    label: 'Package Delivery',
    description: 'Send a parcel from one place to a recipient at another.',
    badgeClass: 'bg-primary/10 text-primary border border-primary/20',
  },
  {
    key: 'ride',
    icon: 'UserRound',
    label: 'Ride',
    description: 'Get picked up and taken to your destination.',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200',
  },
  {
    key: 'hire',
    icon: 'Clock',
    label: 'Vehicle Hire',
    description: 'Book a vehicle and rider for a period - route and time may vary.',
    badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
  },
  {
    key: 'errand',
    icon: 'ShoppingBag',
    label: 'Errand',
    description: 'Send a rider to buy or do something and bring it to you.',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
];

const BY_KEY: Record<string, ServiceTypeDef> = SERVICE_TYPES.reduce(
  (acc, s) => {
    acc[s.key] = s;
    return acc;
  },
  {} as Record<string, ServiceTypeDef>
);

/** Look up a service def by key, defaulting to delivery for legacy rows. */
export function getServiceType(key: string | null | undefined): ServiceTypeDef {
  return (key && BY_KEY[key]) || BY_KEY['delivery'];
}

/** Human label for a service key (e.g. for SMS / events). */
export function serviceLabel(key: string | null | undefined): string {
  return getServiceType(key).label;
}
