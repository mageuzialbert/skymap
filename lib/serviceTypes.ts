// Shared definitions for the four built-in transport services.
// Used by the client request wizard and every admin/staff/rider/history display
// so labels, icons and colours stay consistent.

export type ServiceTypeKey = 'delivery' | 'ride' | 'hire' | 'errand';

/**
 * A service's identity colour. Accent marks *which flow you are in*; it never
 * marks what is tappable - every interactive affordance stays brand teal, so a
 * customer learns the controls once instead of per service.
 *
 * It is allowed in exactly three places: the step header chip, the filled
 * segments of the step indicator, and the service badge on review / success.
 */
export interface ServiceAccent {
  /** Chip background. */
  bg: string;
  /** Chip icon and the one accented word. */
  text: string;
  /** Filled step-indicator segments. */
  bar: string;
}

export interface ServiceTypeDef {
  key: ServiceTypeKey;
  /** Lucide icon name (import the icon where rendered). */
  icon: 'Package' | 'UserRound' | 'Clock' | 'ShoppingBag' | 'Motorbike' | 'Bajaj' | 'Lorry';
  label: string;
  /** i18n key for the label (components.serviceTypes.<key>.label). */
  labelKey: string;
  /** i18n key for the 2-3 word benefit line under the label on the home tiles
   *  (components.serviceTypes.<key>.tagline). Deliberately short - the old
   *  full-sentence descriptions were removed. */
  taglineKey: string;
  /** Self-hosted 256x256 thumbnail (see scripts/gen-service-images.js).
   *  Used by the public landing tiles; the signed-in home uses the icon. */
  image: string;
  /** Tailwind classes for a small badge. */
  badgeClass: string;
  /** Identity colour - see ServiceAccent for where it may appear. */
  accent: ServiceAccent;
}

// Order matters — the client wizard renders them in this order. "Send a Rider"
// (errand) is intentionally first.
export const SERVICE_TYPES: ServiceTypeDef[] = [
  {
    key: 'errand',
    icon: 'Motorbike',
    label: 'Send a Rider',
    labelKey: 'components.serviceTypes.errand.label',
    taglineKey: 'components.serviceTypes.errand.tagline',
    image: '/services/errand.webp',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
    accent: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  },
  {
    key: 'delivery',
    icon: 'Package',
    label: 'Package Delivery',
    labelKey: 'components.serviceTypes.delivery.label',
    taglineKey: 'components.serviceTypes.delivery.tagline',
    image: '/services/delivery.webp',
    badgeClass: 'bg-primary/10 text-primary border border-primary/20',
    accent: { bg: 'bg-primary/10', text: 'text-primary', bar: 'bg-primary' },
  },
  {
    key: 'ride',
    icon: 'Bajaj',
    label: 'Ride',
    labelKey: 'components.serviceTypes.ride.label',
    taglineKey: 'components.serviceTypes.ride.tagline',
    image: '/services/ride.webp',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200',
    accent: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
  },
  {
    key: 'hire',
    icon: 'Lorry',
    label: 'Vehicle Hire',
    labelKey: 'components.serviceTypes.hire.label',
    taglineKey: 'components.serviceTypes.hire.tagline',
    image: '/services/hire.webp',
    badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
    accent: { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
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
