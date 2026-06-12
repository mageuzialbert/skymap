import { redirect } from 'next/navigation';

// The Request Ride flow now lives inside the dashboard shell for a uniform
// look with the rest of the client pages. Keep /order as a permanent redirect
// so old links/bookmarks still work.
export default function OrderRedirect() {
  redirect('/dashboard/business/request-ride');
}
