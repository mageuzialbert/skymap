import type { LocationState } from '@/components/landing/types';
import type { ServiceTypeKey } from '@/lib/serviceTypes';
import { freshDraft, type BusinessProfile, type DraftPhoto, type RequestDraft } from './steps';

export type DraftAction =
  | { type: 'SET_PROFILE'; profile: BusinessProfile }
  | { type: 'SELECT_SERVICE'; service: ServiceTypeKey; seed?: Partial<RequestDraft> }
  | { type: 'SET_LOCATION'; which: 'pickup' | 'dropoff'; patch: Partial<LocationState> }
  | { type: 'SET_FIELD'; patch: Partial<RequestDraft> }
  | { type: 'SET_PHOTO'; photo: DraftPhoto | null }
  | { type: 'GO'; step: number }
  | { type: 'SHOW_ERRORS' }
  | { type: 'RESTART' };

export function draftReducer(state: RequestDraft, action: DraftAction): RequestDraft {
  switch (action.type) {
    case 'SET_PROFILE': {
      // Anything the user has already typed wins; this only fills blanks.
      const { profile } = action;
      return {
        ...state,
        profile,
        pickup: {
          ...state.pickup,
          name: state.pickup.name || profile.name || '',
          phone: state.pickup.phone || profile.phone || '',
          address: state.pickup.address || profile.address || '',
        },
      };
    }

    case 'SELECT_SERVICE': {
      // Reset, then seed - in that order. Home's entry points used to set their
      // flag *before* switching service, so it outlived the switch.
      if (state.photo) URL.revokeObjectURL(state.photo.previewUrl);
      return {
        ...freshDraft(state.profile),
        service: action.service,
        step: 0,
        ...action.seed,
      };
    }

    case 'SET_LOCATION':
      return {
        ...state,
        [action.which]: { ...state[action.which], ...action.patch },
      };

    case 'SET_FIELD':
      return { ...state, ...action.patch };

    case 'SET_PHOTO': {
      if (state.photo && state.photo.previewUrl !== action.photo?.previewUrl) {
        URL.revokeObjectURL(state.photo.previewUrl);
      }
      return { ...state, photo: action.photo };
    }

    case 'GO':
      // Errors are per-attempt: moving between steps starts clean.
      return { ...state, step: action.step, showErrors: false };

    case 'SHOW_ERRORS':
      return { ...state, showErrors: true };

    case 'RESTART': {
      if (state.photo) URL.revokeObjectURL(state.photo.previewUrl);
      return freshDraft(state.profile);
    }

    default:
      return state;
  }
}
