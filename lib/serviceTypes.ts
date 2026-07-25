// Shared definitions for the four built-in transport services.
// Used by the client request wizard and every admin/staff/rider/history display
// so labels, icons and colours stay consistent.

export type ServiceTypeKey = 'delivery' | 'ride' | 'hire' | 'errand';

export interface ServiceTypeDef {
  key: ServiceTypeKey;
  /** Lucide icon name (import the icon where rendered). */
  icon: 'Package' | 'UserRound' | 'Clock' | 'ShoppingBag' | 'Send';
  label: string;
  /** i18n key for the label (components.serviceTypes.<key>.label). */
  labelKey: string;
  /** One-line description shown on the purpose-selection card. */
  description: string;
  /** i18n key for the description (components.serviceTypes.<key>.desc). */
  descriptionKey: string;
  /** Tailwind classes for a small badge. */
  badgeClass: string;
}

// Order matters — the client wizard renders them in this order. "Send a Rider"
// (errand) is intentionally first.
export const SERVICE_TYPES: ServiceTypeDef[] = [
  {
    key: 'errand',
    icon: 'Send',
    label: 'Send a Rider',
    labelKey: 'components.serviceTypes.errand.label',
    description: 'Send a rider to a place to buy, collect or hand over something for you.',
    descriptionKey: 'components.serviceTypes.errand.desc',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
  {
    key: 'delivery',
    icon: 'Package',
    label: 'Package Delivery',
    labelKey: 'components.serviceTypes.delivery.label',
    description: 'Send a parcel from one place to a recipient at another.',
    descriptionKey: 'components.serviceTypes.delivery.desc',
    badgeClass: 'bg-primary/10 text-primary border border-primary/20',
  },
  {
    key: 'ride',
    icon: 'UserRound',
    label: 'Ride',
    labelKey: 'components.serviceTypes.ride.label',
    description: 'Get picked up and taken to your destination.',
    descriptionKey: 'components.serviceTypes.ride.desc',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200',
  },
  {
    key: 'hire',
    icon: 'Clock',
    label: 'Vehicle Hire',
    labelKey: 'components.serviceTypes.hire.label',
    description: 'Book a whole vehicle for people or loads - route and time may vary.',
    descriptionKey: 'components.serviceTypes.hire.desc',
    badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
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
