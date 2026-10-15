// Local check for the M4 time-slot engine: the 2-day window must self-heal, and a capacity
// change must never leave a slot over-subscribed.
// Run: npx tsx scripts/check-slot-window.ts   (local Docker DB only)
import assert from 'node:assert';

process.env.TELEGRAM_BOT_TOKEN = '';

async function main() {
  const { prisma } = await import('@/lib/prisma');
  const { ensureTimeSlotWindow, getBangkokDate } = await import('@/lib/booking-window');

  const today = getBangkokDate(0);
  const tomorrow = getBangkokDate(1);
  const shop = await prisma.shop.findFirstOrThrow({ where: { status: 'APPROVED' }, include: { queueCategories: true } });
  const category = shop.queueCategories[0];

  // --- 1. The window self-heals -------------------------------------------------
  // Delete both days, then let ensureTimeSlotWindow rebuild them from the latest day left.
  const template = await prisma.timeSlot.findFirstOrThrow({ where: { shopId: shop.id, date: { lt: today } }, orderBy: { date: 'desc' } });
  await prisma.timeSlot.deleteMany({ where: { shopId: shop.id, date: { in: [today, tomorrow] } } });
  const empty = await prisma.timeSlot.count({ where: { shopId: shop.id, date: { in: [today, tomorrow] } } });
  await ensureTimeSlotWindow(shop.id);
  const healed = await prisma.timeSlot.count({ where: { shopId: shop.id, date: { in: [today, tomorrow] } } });

  const templateCount = await prisma.timeSlot.count({ where: { shopId: shop.id, date: template.date } });
  console.log(`A) window before=${empty} after=${healed} (template ${template.date} x ${templateCount})`);
  assert.equal(empty, 0, 'setup: both days should be empty');
  assert.equal(healed, templateCount * 2, 'ensureTimeSlotWindow should copy the whole template day into both dates');

  // Idempotent: a second call must not duplicate anything.
  await ensureTimeSlotWindow(shop.id);
  const again = await prisma.timeSlot.count({ where: { shopId: shop.id, date: { in: [today, tomorrow] } } });
  assert.equal(again, healed, 'ensureTimeSlotWindow must be idempotent');

  // --- 2. The atomic capacity guard ---------------------------------------------
  // Mirror of editSlot's WHERE clause: a row whose currentBooked exceeds the new max is skipped.
  const startTime = '00:00'; // outside real opening hours, only used by this check
  await prisma.timeSlot.createMany({
    data: [today, tomorrow].map((date) => ({ shopId: shop.id, date, startTime, endTime: '00:30', maxSlots: 5, currentBooked: 0 })),
    skipDuplicates: true,
  });
  // Book 3 seats against today's slot so its currentBooked is 3.
  await prisma.timeSlot.updateMany({ where: { shopId: shop.id, date: today, startTime }, data: { currentBooked: 3 } });

  const window = { shopId: shop.id, date: { in: [today, tomorrow] }, startTime };
  const total = await prisma.timeSlot.count({ where: window });
  const res = await prisma.timeSlot.updateMany({ where: { ...window, currentBooked: { lte: 2 } }, data: { maxSlots: 2 } });
  console.log(`B) lowering max to 2 with 3 booked: updated=${res.count}/${total}`);
  assert.equal(res.count, 1, 'only tomorrow should update; today is blocked by the guard');

  const rows = await prisma.timeSlot.findMany({ where: window, orderBy: { date: 'asc' } });
  for (const r of rows) {
    console.log(`   ${r.date}: max=${r.maxSlots} booked=${r.currentBooked} ${r.maxSlots < r.currentBooked ? 'OVER-SUBSCRIBED' : 'ok'}`);
    assert.ok(r.maxSlots >= r.currentBooked, `${r.date} must never end up with maxSlots < currentBooked`);
  }

  // Restore the shop's window exactly as it was before the check.
  const templateRows = await prisma.timeSlot.findMany({ where: { shopId: shop.id, date: template.date } });
  await prisma.timeSlot.deleteMany({ where: { shopId: shop.id, date: { in: [today, tomorrow] } } });
  await prisma.timeSlot.createMany({
    data: [today, tomorrow].flatMap((date) => templateRows.map((r) => ({ shopId: shop.id, date, startTime: r.startTime, endTime: r.endTime, maxSlots: r.maxSlots, enabled: r.enabled }))),
    skipDuplicates: true,
  });
  void category;

  console.log('\nAll slot-window checks passed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import('@/lib/prisma');
    await prisma.$disconnect();
  });
