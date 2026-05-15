import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const ROLE_ROUTES: Record<string, string[]> = {
  '/forecasting': ['ADMIN', 'PHARMACIST', 'OWNER'],
  '/dss': ['ADMIN', 'PHARMACIST', 'OWNER'],
  '/reports': ['ADMIN', 'PHARMACIST', 'OWNER'],
  '/suppliers': ['ADMIN', 'PHARMACIST', 'OWNER', 'ASSISTANT'],
  '/inventory': ['ADMIN', 'PHARMACIST', 'OWNER', 'ASSISTANT'],
  '/patients': ['ADMIN', 'PHARMACIST', 'OWNER', 'ASSISTANT'],
  '/pos': ['ADMIN', 'PHARMACIST', 'OWNER', 'ASSISTANT'],
  '/dashboard': ['ADMIN', 'PHARMACIST', 'OWNER', 'ASSISTANT'],
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip auth routes, public pages and API auth
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/consent') ||
    pathname.startsWith('/unauthorized') ||
    pathname.startsWith('/_next') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Not logged in — redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = token.role as string

  // Check role-based route access
  for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}