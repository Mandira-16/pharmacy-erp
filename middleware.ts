import { auth } from './auth'
import { NextResponse } from 'next/server'

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

export default auth((req) => {
  const { pathname } = req.nextUrl
  const role = (req.auth?.user as any)?.role

  // Not logged in — redirect to login
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Check role-based route access
  for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pos/:path*',
    '/inventory/:path*',
    '/patients/:path*',
    '/suppliers/:path*',
    '/forecasting/:path*',
    '/dss/:path*',
    '/reports/:path*',
  ],
}