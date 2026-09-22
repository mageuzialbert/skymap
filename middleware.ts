import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { dashboardPathForRole } from '@/lib/dashboardRoutes';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if expired - this will update the cookies
  // This is the key part: it ensures cookies are synced on every request
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A redirect response is a fresh response object, so any cookies the session
  // refresh above just wrote onto `response` have to be carried over — losing
  // them would sign the user out on the very request that renewed their token.
  const redirectTo = (pathname: string, search?: URLSearchParams) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search ? `?${search}` : '';
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  const { pathname } = request.nextUrl;

  // The app launches on the authentication screen: opening the root sends a
  // visitor to /login, while someone already signed in goes straight to their
  // dashboard. The marketing page stays reachable at /welcome.
  if (pathname === '/') {
    if (!user) return redirectTo('/login');

    // Role decides which dashboard is "home". The metadata copy saves a query
    // on the common path; the users table is the fallback source of truth.
    let role = user.user_metadata?.role as string | undefined;
    if (!role) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      role = userData?.role ?? undefined;
    }

    return redirectTo(dashboardPathForRole(role));
  }

  // Auth gating: all platform activity requires authentication.
  const protectedPrefixes = ['/dashboard', '/order', '/quick-order'];
  const isProtected = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !user) {
    const params = new URLSearchParams({ redirect: pathname });
    return redirectTo('/login', params);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
