import { redirect } from 'next/navigation';

// The root is the app's launcher and is normally resolved by the middleware,
// which sends signed-in users to their dashboard and everyone else to /login.
// This page only runs if that redirect is ever bypassed, so it keeps `/` from
// 404ing and falls back to the authentication screen.
export default function RootLauncher() {
  redirect('/login');
}
