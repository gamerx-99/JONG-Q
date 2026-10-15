import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveBookingWindow } from '@/lib/booking-window';

// Evaluated per request: a static build would cache 'healthy' and never return 503.
export const dynamic = 'force-dynamic';

// Public liveness probe: reports only up/down and the booking window. Row counts are dev-only.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const body: Record<string, unknown> = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      bookingWindow: getActiveBookingWindow(),
    };

    if (process.env.NODE_ENV !== 'production') {
      const [shops, users, tickets] = await Promise.all([
        prisma.shop.count(),
        prisma.user.count(),
        prisma.ticket.count(),
      ]);
      body.metrics = { shops, users, tickets };
    }

    return NextResponse.json(body);
  } catch (error) {
    console.error('Healthcheck Error:', error);
    return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
  }
}
