import { redirect } from 'next/navigation';

// The public quick-order wizard is superseded by the authenticated Request Ride
// flow in the dashboard. Keep the route as a permanent redirect.
export default function QuickOrderRedirect() {
  redirect('/dashboard/business/request-ride');
}
