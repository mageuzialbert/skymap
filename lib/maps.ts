/**
 * One shared Google Maps loader configuration.
 *
 * `@react-google-maps/api` keys its loader on the options it is given: a call
 * site that omits `libraries`, or passes a fresh array literal on every render,
 * looks like a *different* loader and injects the script a second time. That is
 * what produced "You have included the Google Maps JavaScript API multiple
 * times on this page" when navigating from the request wizard (which asks for
 * `places`) to a delivery detail page (which did not).
 *
 * Import this constant everywhere instead of writing the array inline, so every
 * call site shares both the same options and the same array identity.
 */
export const MAPS_LIBRARIES: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places'];

export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
