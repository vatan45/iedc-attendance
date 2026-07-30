import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only protect /admin and /home routes
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/home')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('attendance_session_token')?.value;
  const role = request.cookies.get('attendance_session_role')?.value;

  // If no token or role, redirect to login
  if (!token || !role) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If role is employee but trying to access admin, redirect to home
  if (role === 'employee' && pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/home/:path*'],
};
