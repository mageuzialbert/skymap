import { redirect } from 'next/navigation';

// The client landing after login is the Order Delivery flow. The old overview
// stats now live on the Ride History page. Keep this route as a redirect so any
// existing links/bookmarks still work.
export default function BusinessIndex() {
  redirect('/dashboard/business/request-ride');
}
