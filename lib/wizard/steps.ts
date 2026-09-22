/**
 * The request flow, as data rather than JSX.
 *
 * Every service walks the same spine - Where, then Details, then Confirm - so
 * the layout, the field order and the position of the primary action are the
 * same wherever you are. A service with fewer than two things to ask on the
 * Details step folds them into Where; today that is Send a Rider.
 *
 * Keeping the sequence, the gates and the payload together means the footer
 * hint, the field errors and what gets posted can never disagree.
 */

import type { LocationState } from '@/components/landing/types';
import type { HireVehicleOption } from '@/components/client/HireVehicleSelector';
import { normalizeTzPhone } from '@/lib/phone';
import type { ServiceTypeKey } from '@/lib/serviceTypes';

export type StepId = 'where' | 'details' | 'confirm';

export interface BusinessProfile {
  name: string;
  phone: string;
  address: string;
}

export interface DraftPhoto {
  file: File;
  previewUrl: string;
  /** Set once the upload finishes; null while it is still in flight. */
  uploadedUrl: string | null;
}

export interface RequestDraft {
  /** The signed-in business. Survives a service switch so the pickup prefill
   *  can always be restored. */
  profile: BusinessProfile | null;
  service: ServiceTypeKey | null;
  step: number;

  pickup: LocationState;
  dropoff: LocationState;

  vehicleTypeId: string | null;
  vehicleName: string;

  hireCategory: 'people' | 'load' | null;
  hireVehicleId: string | null;
  hireVehicle: HireVehicleOption | null;
  hirePassengers: string;
  hirePurpose: string;
  hireLoadDesc: string;
  hireWeight: string;
  hireNotes: string;

  packageDetails: string;
  serviceDetails: string;
  errandReason: string;

  photo: DraftPhoto | null;

  scheduleLater: boolean;
  scheduledAt: string;

  /** Open the destination picker on arrival (set by Home's "Where to?"). */
  focusDropoff: boolean;
  /** Field errors stay hidden until the first attempt to continue. */
  showErrors: boolean;
}

const emptyLocation: LocationState = {
  address: '',
  latitude: null,
  longitude: null,
  name: '',
  phone: '',
};

/**
 * A clean draft, with the pickup seeded from the business profile.
 *
 * Everything else resets. Previously a service switch kept the drop-off, the
 * package text, the photo and the "schedule for later" flag, so tapping
 * "Later" on the home screen silently scheduled every subsequent request.
 */
export function freshDraft(profile: BusinessProfile | null): RequestDraft {
  return {
    profile,
    service: null,
    step: 0,
    pickup: {
      ...emptyLocation,
      name: profile?.name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
    },
    dropoff: { ...emptyLocation },
    vehicleTypeId: null,
    vehicleName: '',
    hireCategory: null,
    hireVehicleId: null,
    hireVehicle: null,
    hirePassengers: '',
    hirePurpose: '',
    hireLoadDesc: '',
    hireWeight: '',
    hireNotes: '',
    packageDetails: '',
    serviceDetails: '',
    errandReason: '',
    photo: null,
    scheduleLater: false,
    scheduledAt: '',
    focusDropoff: false,
    showErrors: false,
  };
}

/** Send a Rider asks little enough that a separate Details step would be a
 *  screen with one control on it. */
export function stepsFor(service: ServiceTypeKey | null): StepId[] {
  if (!service) return [];
  return service === 'errand' ? ['where', 'confirm'] : ['where', 'details', 'confirm'];
}

export interface Issue {
  /** Matches the control's `name`, so the first one can take focus. */
  field: string;
  messageKey: string;
}

const E = (k: string) => `components.rideWizard.errors.${k}`;

/** A Tanzanian mobile number is 9 digits after the country code. */
export function isUsablePhone(phone: string): boolean {
  return normalizeTzPhone(phone).replace(/\D/g, '').length >= 12;
}

export function validateStep(step: StepId, d: RequestDraft): Issue[] {
  const issues: Issue[] = [];
  const svc = d.service;

  if (step === 'where') {
    if (!d.pickup.address) issues.push({ field: 'pickup', messageKey: E('pickupRequired') });
    if (!d.dropoff.address) {
      issues.push({
        field: 'dropoff',
        messageKey: E(svc === 'errand' ? 'errandDestinationRequired' : 'dropoffRequired'),
      });
    }
    if (svc === 'delivery' && !isUsablePhone(d.dropoff.phone)) {
      issues.push({ field: 'recipientPhone', messageKey: E('recipientPhoneRequired') });
    }
    if (svc === 'errand' && !d.errandReason.trim()) {
      issues.push({ field: 'errandReason', messageKey: E('errandReasonRequired') });
    }
  }

  if (step === 'details') {
    if ((svc === 'delivery' || svc === 'ride') && !d.vehicleTypeId) {
      issues.push({ field: 'vehicle', messageKey: E('vehicleRequired') });
    }
    if (svc === 'hire') {
      if (!d.hireCategory) issues.push({ field: 'hireCategory', messageKey: E('hireCategoryRequired') });
      else if (!d.hireVehicleId)
        issues.push({ field: 'hireVehicle', messageKey: E('hireVehicleRequired') });
      if (d.hireCategory === 'people' && !d.hirePassengers.trim()) {
        issues.push({ field: 'hirePassengers', messageKey: E('passengersRequired') });
      }
      if (d.hireCategory === 'load' && !d.hireLoadDesc.trim()) {
        issues.push({ field: 'hireLoadDesc', messageKey: E('loadRequired') });
      }
    }
  }

  if (step === 'confirm' && d.scheduleLater) {
    // The old flow let you choose "Schedule for later", leave the time blank,
    // and post no schedule at all.
    if (!d.scheduledAt) {
      issues.push({ field: 'scheduledAt', messageKey: E('scheduleTimeRequired') });
    } else if (new Date(d.scheduledAt).getTime() <= Date.now()) {
      issues.push({ field: 'scheduledAt', messageKey: E('scheduleTimePast') });
    }
  }

  return issues;
}

/**
 * The supportive info for a hire, as one readable block.
 *
 * Labels are fixed English on purpose: staff and admin screens render
 * `service_details` raw, so a Swahili customer must not produce a block only
 * they can read.
 */
export function buildHireDetails(d: RequestDraft): string {
  const lines: string[] = [];
  if (d.hireCategory === 'people') {
    if (d.hirePassengers) lines.push(`Passengers: ${d.hirePassengers}`);
    if (d.hirePurpose) lines.push(`Purpose: ${d.hirePurpose}`);
  } else if (d.hireCategory === 'load') {
    if (d.hireLoadDesc) lines.push(`Load: ${d.hireLoadDesc}`);
    if (d.hireWeight) lines.push(`Weight / quantity: ${d.hireWeight}`);
  }
  if (d.hireNotes) lines.push(d.hireNotes);
  return lines.join('\n');
}

/** What gets posted to /api/client/rides. */
export function buildPayload(d: RequestDraft): Record<string, any> {
  const svc = d.service;
  const payload: Record<string, any> = {
    service_type: svc,
    vehicle_type_id: svc === 'delivery' || svc === 'ride' ? d.vehicleTypeId : null,
    pickup_address: d.pickup.address,
    pickup_latitude: d.pickup.latitude,
    pickup_longitude: d.pickup.longitude,
    pickup_name: d.pickup.name,
    pickup_phone: d.pickup.phone ? normalizeTzPhone(d.pickup.phone) : d.pickup.phone,
    scheduled_pickup_at:
      d.scheduleLater && d.scheduledAt ? new Date(d.scheduledAt).toISOString() : null,
    dropoff_address: d.dropoff.address,
    dropoff_latitude: d.dropoff.latitude,
    dropoff_longitude: d.dropoff.longitude,
  };

  if (svc === 'delivery') {
    payload.dropoff_name = d.dropoff.name;
    payload.dropoff_phone = d.dropoff.phone ? normalizeTzPhone(d.dropoff.phone) : d.dropoff.phone;
    payload.package_description = d.packageDetails || null;
    payload.package_image_url = d.photo?.uploadedUrl || null;
  } else if (svc === 'ride') {
    payload.service_details = d.serviceDetails || null;
  } else if (svc === 'errand') {
    payload.service_details = d.errandReason || null;
    payload.package_image_url = d.photo?.uploadedUrl || null;
  } else if (svc === 'hire') {
    payload.hire_vehicle_id = d.hireVehicleId;
    payload.hire_category = d.hireCategory;
    payload.service_details = buildHireDetails(d) || null;
  }

  return payload;
}
