import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

export const proxy = (_request: NextRequest) => {
  if (process.env.MAINTENANCE_MODE !== '1') {
    return NextResponse.next();
  }

  return new Response('Service Unavailable', {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'Retry-After': '60',
    },
    status: 503,
  });
};

export const config = {
  matcher: ['/((?!_next(?:/|$)|.*\\.[^/]+$).*)'],
};
