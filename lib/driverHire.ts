/**
 * Driver Hire: a customer who owns a vehicle asks for a professional driver.
 *
 * Everything the browser and the API must agree on lives here - the option
 * lists, the status workflow and the validation - so the two cannot drift.
 * No imports on purpose: this file is used by client components and by API
 * routes alike.
 */

export type VehicleCategory = 'light' | 'heavy';
export type Transmission = 'manual' | 'automatic';

export const VEHICLE_CATEGORIES: VehicleCategory[] = ['light', 'heavy'];

/**
 * Vehicle types offered under each category. The `value` is fixed English: it
 * is stored with the request and read by the admin team, so it must not change
 * with the customer's language. Listed alphabetically and shown as written.
 */
export const VEHICLE_TYPES: Record<VehicleCategory, { id: string; value: string }[]> = {
  light: [
    { id: 'Ambulance', value: 'Ambulance' },
    { id: 'Camper Van', value: 'Camper Van' },
    { id: 'City Car', value: 'City Car' },
    { id: 'Convertible', value: 'Convertible' },
    { id: 'Coupe', value: 'Coupe' },
    { id: 'Crossover', value: 'Crossover' },
    { id: 'Double Cab Pickup', value: 'Double Cab Pickup' },
    { id: 'Electric Car', value: 'Electric Car' },
    { id: 'Estate Car', value: 'Estate Car' },
    { id: 'Hatchback', value: 'Hatchback' },
    { id: 'Hearse', value: 'Hearse' },
    { id: 'Hybrid Car', value: 'Hybrid Car' },
    { id: 'Jeep / 4x4', value: 'Jeep / 4x4' },
    { id: 'Kei Car', value: 'Kei Car' },
    { id: 'Light Truck', value: 'Light Truck' },
    { id: 'Limousine', value: 'Limousine' },
    { id: 'Luxury Car', value: 'Luxury Car' },
    { id: 'Microbus', value: 'Microbus' },
    { id: 'Minibus', value: 'Minibus' },
    { id: 'Minivan', value: 'Minivan' },
    { id: 'Motorcycle', value: 'Motorcycle' },
    { id: 'Motorhome', value: 'Motorhome' },
    { id: 'MPV', value: 'MPV' },
    { id: 'Off-Road Vehicle', value: 'Off-Road Vehicle' },
    { id: 'Panel Van', value: 'Panel Van' },
    { id: 'Pickup', value: 'Pickup' },
    { id: 'Quad Bike', value: 'Quad Bike' },
    { id: 'Roadster', value: 'Roadster' },
    { id: 'Safari Vehicle', value: 'Safari Vehicle' },
    { id: 'Scooter', value: 'Scooter' },
    { id: 'Sedan', value: 'Sedan' },
    { id: 'Sports Car', value: 'Sports Car' },
    { id: 'Station Wagon', value: 'Station Wagon' },
    { id: 'SUV', value: 'SUV' },
    { id: 'Taxi', value: 'Taxi' },
    { id: 'Tricycle (Bajaj)', value: 'Tricycle (Bajaj)' },
    { id: 'Van', value: 'Van' },
    { id: 'Other light vehicle', value: 'Other light vehicle' },
  ],
  heavy: [
    { id: 'Armoured Truck', value: 'Armoured Truck' },
    { id: 'Articulated Bus', value: 'Articulated Bus' },
    { id: 'Backhoe Loader', value: 'Backhoe Loader' },
    { id: 'Bowser', value: 'Bowser' },
    { id: 'Box Truck', value: 'Box Truck' },
    { id: 'Bulldozer', value: 'Bulldozer' },
    { id: 'Bus', value: 'Bus' },
    { id: 'Car Carrier', value: 'Car Carrier' },
    { id: 'Cargo Truck', value: 'Cargo Truck' },
    { id: 'Cement Mixer', value: 'Cement Mixer' },
    { id: 'Coach', value: 'Coach' },
    { id: 'Combine Harvester', value: 'Combine Harvester' },
    { id: 'Concrete Pump Truck', value: 'Concrete Pump Truck' },
    { id: 'Container Truck', value: 'Container Truck' },
    { id: 'Crane Truck', value: 'Crane Truck' },
    { id: 'Curtain-Side Truck', value: 'Curtain-Side Truck' },
    { id: 'Double-Decker Bus', value: 'Double-Decker Bus' },
    { id: 'Excavator', value: 'Excavator' },
    { id: 'Fire Truck', value: 'Fire Truck' },
    { id: 'Flatbed Truck', value: 'Flatbed Truck' },
    { id: 'Forklift', value: 'Forklift' },
    { id: 'Fuel Tanker', value: 'Fuel Tanker' },
    { id: 'Garbage Truck', value: 'Garbage Truck' },
    { id: 'Gas Tanker', value: 'Gas Tanker' },
    { id: 'Grader', value: 'Grader' },
    { id: 'Heavy Truck', value: 'Heavy Truck' },
    { id: 'Livestock Truck', value: 'Livestock Truck' },
    { id: 'Logging Truck', value: 'Logging Truck' },
    { id: 'Low Loader', value: 'Low Loader' },
    { id: 'Medium Truck', value: 'Medium Truck' },
    { id: 'Mining Dump Truck', value: 'Mining Dump Truck' },
    { id: 'Mobile Crane', value: 'Mobile Crane' },
    { id: 'Refrigerated Truck', value: 'Refrigerated Truck' },
    { id: 'Road Roller', value: 'Road Roller' },
    { id: 'Road Train', value: 'Road Train' },
    { id: 'School Bus', value: 'School Bus' },
    { id: 'Semi-Trailer', value: 'Semi-Trailer' },
    { id: 'Skip Loader', value: 'Skip Loader' },
    { id: 'Tipper / Dump Truck', value: 'Tipper / Dump Truck' },
    { id: 'Tow Truck', value: 'Tow Truck' },
    { id: 'Tractor', value: 'Tractor' },
    { id: 'Tractor Trailer', value: 'Tractor Trailer' },
    { id: 'Water Tanker', value: 'Water Tanker' },
    { id: 'Wheel Loader', value: 'Wheel Loader' },
    { id: 'Other heavy vehicle', value: 'Other heavy vehicle' },
  ],
};

/**
 * Which transmissions can be asked for, per category - change this to change
 * the form. `required: false` adds a "not sure / does not apply" choice, so a
 * customer with a heavy vehicle is never forced to pick one. An empty
 * `options` list removes the question for that category altogether.
 */
export const TRANSMISSION_RULES: Record<
  VehicleCategory,
  { options: Transmission[]; required: boolean }
> = {
  light: { options: ['manual', 'automatic'], required: true },
  heavy: { options: ['manual', 'automatic'], required: false },
};

export const DRIVER_REQUEST_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'CONTACTED',
  'DRIVER_ARRANGEMENT',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type DriverRequestStatus = (typeof DRIVER_REQUEST_STATUSES)[number];

/** Finished either way; nothing moves a request out of these. */
export const TERMINAL_STATUSES: DriverRequestStatus[] = ['COMPLETED', 'CANCELLED'];

/** A customer may cancel until the arrangement has been agreed. */
export const CUSTOMER_CANCELLABLE: DriverRequestStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'CONTACTED',
  'DRIVER_ARRANGEMENT',
];

/** Statuses an administrator may move a request to from `status`. */
export function adminNextStatuses(status: string): DriverRequestStatus[] {
  if (TERMINAL_STATUSES.includes(status as DriverRequestStatus)) return [];
  return DRIVER_REQUEST_STATUSES.filter((s) => s !== status && s !== 'SUBMITTED');
}

/** Fixed English labels, for SMS/email and server logs. */
export const STATUS_LABELS_EN: Record<DriverRequestStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  CONTACTED: 'We have contacted you',
  DRIVER_ARRANGEMENT: 'Arranging a driver',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/** Dot and text colours for a status, in the app's three-tone vocabulary. */
export function statusTone(status: string): { dot: string; text: string } {
  if (status === 'COMPLETED' || status === 'CONFIRMED') {
    return { dot: 'bg-emerald-500', text: 'text-emerald-700' };
  }
  if (status === 'CANCELLED') return { dot: 'bg-red-500', text: 'text-red-700' };
  return { dot: 'bg-blue-500', text: 'text-blue-700' };
}

export function statusLabelKey(status: string): string {
  return `driverHire.status.${
    (DRIVER_REQUEST_STATUSES as readonly string[]).includes(status) ? status : 'SUBMITTED'
  }`;
}

/* ------------------------------------------------------------ dates */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}/;

/** The app serves Tanzania: wall-clock times are East Africa Time (UTC+3, no DST). */
const EAT_OFFSET = '+03:00';

/** The instant a date + time entered in Tanzania refers to. */
export function eatInstant(date: string, time: string): Date {
  return new Date(`${date}T${time.slice(0, 5)}:00${EAT_OFFSET}`);
}

/** "2026-11-23" -> "23/11/2026". String slicing, so no time zone can shift it. */
export function formatDate(date?: string | null): string {
  if (!date) return '';
  const [y, m, d] = date.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}

/** "14:30:00" -> "14:30". */
export function formatClock(time?: string | null): string {
  return time ? time.slice(0, 5) : '';
}

/** "23/11/2026 14:30", or just the date when there is no time. */
export function formatDateAndTime(date?: string | null, time?: string | null): string {
  return [formatDate(date), formatClock(time)].filter(Boolean).join(' ');
}

/* ------------------------------------------------------- validation */

export interface DriverRequestInput {
  vehicle_category: string;
  vehicle_type?: string | null;
  transmission_type?: string | null;
  departure_date: string;
  departure_time: string;
  return_date?: string | null;
  return_time?: string | null;
  pickup_location: string;
  destination: string;
  passenger_count?: number | string | null;
  trip_duration?: string | null;
  additional_information?: string | null;
}

export type DriverRequestField =
  | 'category'
  | 'transmission'
  | 'departureDate'
  | 'departureTime'
  | 'returnDate'
  | 'returnTime'
  | 'pickup'
  | 'destination'
  | 'passengers';

export interface DriverRequestIssue {
  field: DriverRequestField;
  /** Looked up under driverHire.errors.<code>. */
  code: string;
}

/**
 * Every problem with a request. Used by each wizard step (filtered to that
 * step's fields) and again by the API, which trusts nothing from the browser.
 */
export function validateDriverRequest(
  input: DriverRequestInput,
  now: Date = new Date()
): DriverRequestIssue[] {
  const issues: DriverRequestIssue[] = [];
  const category = input.vehicle_category as VehicleCategory;

  if (!VEHICLE_CATEGORIES.includes(category)) {
    issues.push({ field: 'category', code: 'categoryRequired' });
  } else {
    const rule = TRANSMISSION_RULES[category];
    const tx = input.transmission_type || '';
    if (tx && !rule.options.includes(tx as Transmission)) {
      issues.push({ field: 'transmission', code: 'transmissionInvalid' });
    } else if (!tx && rule.required && rule.options.length > 0) {
      issues.push({ field: 'transmission', code: 'transmissionRequired' });
    }
  }

  const hasDate = DATE_RE.test(input.departure_date || '');
  const hasTime = TIME_RE.test(input.departure_time || '');
  if (!hasDate) issues.push({ field: 'departureDate', code: 'departureDateRequired' });
  if (!hasTime) issues.push({ field: 'departureTime', code: 'departureTimeRequired' });

  let departure: Date | null = null;
  if (hasDate && hasTime) {
    departure = eatInstant(input.departure_date, input.departure_time);
    if (isNaN(departure.getTime())) {
      issues.push({ field: 'departureDate', code: 'departureDateRequired' });
      departure = null;
    } else if (departure.getTime() < now.getTime()) {
      issues.push({ field: 'departureTime', code: 'departureInPast' });
    }
  }

  const returnDate = input.return_date || '';
  const returnTime = input.return_time || '';
  if (returnTime && !returnDate) {
    issues.push({ field: 'returnDate', code: 'returnDateRequired' });
  } else if (returnDate) {
    if (!DATE_RE.test(returnDate) || (returnTime && !TIME_RE.test(returnTime))) {
      issues.push({ field: 'returnDate', code: 'returnInvalid' });
    } else if (departure) {
      // With no return time, the return day only has to be the same or later.
      const back = eatInstant(returnDate, returnTime || '23:59');
      if (isNaN(back.getTime())) {
        issues.push({ field: 'returnDate', code: 'returnInvalid' });
      } else if (back.getTime() <= departure.getTime()) {
        issues.push({
          field: returnTime && returnDate === input.departure_date ? 'returnTime' : 'returnDate',
          code: 'returnBeforeDeparture',
        });
      }
    }
  }

  if (!(input.pickup_location || '').trim()) {
    issues.push({ field: 'pickup', code: 'pickupRequired' });
  }
  if (!(input.destination || '').trim()) {
    issues.push({ field: 'destination', code: 'destinationRequired' });
  }

  const pc = input.passenger_count;
  if (pc !== null && pc !== undefined && pc !== '') {
    const n = Number(pc);
    if (!Number.isInteger(n) || n < 0 || n > 200) {
      issues.push({ field: 'passengers', code: 'passengersInvalid' });
    }
  }

  return issues;
}
