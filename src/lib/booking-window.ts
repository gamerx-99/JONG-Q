import { prisma } from '@/lib/prisma';

/**
 * Strict 2-Day Sliding Booking Window Engine (Asia/Bangkok timezone)
 * Rule: Customers are ONLY allowed to book queues for Today or Tomorrow.
 */

export interface BookingWindow {
  today: string;      // YYYY-MM-DD
  tomorrow: string;   // YYYY-MM-DD
  allowedDates: [string, string];
}

const bangkokDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Returns the date in Bangkok (UTC+7, no DST) as YYYY-MM-DD, offset by whole days.
 */
export function getBangkokDate(offsetDays = 0): string {
  return bangkokDay.format(new Date(Date.now() + offsetDays * 86_400_000));
}

/**
 * Returns the active 2-day booking window (Today + Tomorrow)
 */
export function getActiveBookingWindow(): BookingWindow {
  const today = getBangkokDate(0);
  const tomorrow = getBangkokDate(1);

  return {
    today,
    tomorrow,
    allowedDates: [today, tomorrow],
  };
}

/**
 * Verifies if a given date string is within the strict 2-day window
 */
export function isWithinBookingWindow(dateStr: string): boolean {
  const { allowedDates } = getActiveBookingWindow();
  return allowedDates.includes(dateStr);
}

/**
 * Auto-populates the 2-day sliding time slot window for a shop.
 * If today or tomorrow has no slots, copies the structure from the most recently
 * populated day (idempotent — safe to call on every page load).
 *
 * This is the fix for the "พรุ่งนี้จองไม่ได้" bug: without this, every morning the
 * merchant would have to manually recreate tomorrow's slots. Now the window slides
 * automatically based on whatever template exists in the DB.
 */
export async function ensureTimeSlotWindow(shopId: string): Promise<void> {
  const today = getBangkokDate(0);
  const tomorrow = getBangkokDate(1);

  const [hasToday, hasTomorrow] = await Promise.all([
    prisma.timeSlot.findFirst({ where: { shopId, date: today } }),
    prisma.timeSlot.findFirst({ where: { shopId, date: tomorrow } }),
  ]);

  if (hasToday && hasTomorrow) return;

  const template = await prisma.timeSlot.findFirst({
    where: { shopId },
    orderBy: { date: 'desc' },
  });
  if (!template) return;

  const missing = [];
  if (!hasToday) missing.push(today);
  if (!hasTomorrow) missing.push(tomorrow);

  await Promise.all(missing.map(async (date) => {
    const rows = await prisma.timeSlot.findMany({
      where: { shopId, date: template.date },
      orderBy: { startTime: 'asc' },
    });
    if (rows.length === 0) return;
    await prisma.timeSlot.createMany({
      data: rows.map((r) => ({
        shopId,
        date,
        startTime: r.startTime,
        endTime: r.endTime,
        maxSlots: r.maxSlots,
        enabled: r.enabled,
      })),
      skipDuplicates: true,
    });
  }));
}
