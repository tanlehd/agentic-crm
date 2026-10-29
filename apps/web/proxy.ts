import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // The local Docker pipe adds a hop between FIN and Next's pooled upstream socket.
  // Close each HTTP exchange at this boundary; owner RPC pools remain independent.
  if (process.env.API_INTERNAL_URL !== 'http://127.0.0.1:13001' || request.headers.get('upgrade')?.toLowerCase()==='websocket') return NextResponse.next();
  const headers = new Headers(request.headers);
  headers.set('connection', 'close');
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ['/api/:path*', '/auth/:path*'] };
