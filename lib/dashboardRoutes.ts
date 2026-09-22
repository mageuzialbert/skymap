// Route constants shared by the middleware and the client auth helpers.
// Deliberately dependency-free (the `UserRole` import is type-only, so it is
// erased at compile time) — the middleware runs before the browser Supabase
// client exists and must not pull it in.
import type { UserRole } from './roles';

// The root path is the authentication launcher, so the marketing/landing page
// lives here instead.
export const LANDING_PATH = '/welcome';

// Where a signed-in user belongs, by role. Unknown or missing roles fall back
// to the business dashboard, which is what the vast majority of accounts are.
export function dashboardPathForRole(role?: UserRole | string | null): string {
  switch (role) {
    case 'ADMIN':
      return '/dashboard/admin';
    case 'STAFF':
      return '/dashboard/staff';
    case 'RIDER':
      return '/dashboard/rider';
    default:
      return '/dashboard/business/request-ride';
  }
}
