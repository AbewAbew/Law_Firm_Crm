// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Get the authentication cookie from the request
  const authCookie = request.cookies.get('access_token');

  // 2. Define URLs
  const loginUrl = new URL('/login', request.url);
  const dashboardUrl = new URL('/dashboard', request.url);

  // 3. Logic for logged-in users
  if (authCookie) {
    // If a logged-in user tries to access the login page, redirect them to the dashboard
    if (request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(dashboardUrl);
    }
    // Otherwise, let them proceed
    return NextResponse.next();
  }

  // 4. Logic for logged-out users
  // If a logged-out user tries to access any page other than the login page,
  // redirect them to the login page.
  if (request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(loginUrl);
  }

  // Allow access to the login page for logged-out users
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  // This matcher ensures the middleware runs on all paths EXCEPT for
  // static files (_next), images (favicon.ico), etc.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};