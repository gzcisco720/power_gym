import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getRedirectForRole } from '@/lib/auth/middleware-helpers';
import type { UserRole } from '@/types/auth';

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  const role = req.auth.user.role as UserRole;
  const redirect = getRedirectForRole(role, req.nextUrl.pathname);

  if (redirect) {
    return NextResponse.redirect(new URL(redirect, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*'],
};
