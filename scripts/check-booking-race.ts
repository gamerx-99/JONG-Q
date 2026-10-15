// Local check for concurrent walk-in booking: N customers book the same category at once,
// every one must get a ticket and the numbers must be unique. Cleans up what it creates.
// Run: npx tsx scripts/check-booking-race.ts [n]   (local Docker DB only)
import assert from 'node:assert';

process.env.TELEGRAM_BOT_TOKEN = ''; // never send real Telegram alerts from a test

async function main() {
  const { prisma } = await import('@/lib/prisma');
  const { issueTicket } = await import('@/lib/queue');
  const { getBangkokDate } = await import('@/lib/booking-window');

  const n = Number(process.argv[2] ?? 8);
  const shop = await prisma.shop.findFirstOrThrow({ where: { status: 'APPROVED', isOpen: true }, include: { queueCategories: true } });
  const category = shop.queueCategories[0];
  const users = await Promise.all(
    Array.from({ length: n }, (_, i) => prisma.user.create({ data: { name: `race-${i}`, phone: '0000000000' } })),
  );

  try {
    const results = await Promise.allSettled(
      users.map((u) => issueTicket({ shopId: shop.id, categoryId: category.id, customerId: u.id, date: getBangkokDate(0) })),
    );
    const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value.ticketNumber] : []));
    const errors = results.flatMap((r) => (r.status === 'rejected' ? [String(r.reason?.code ?? r.reason?.message)] : []));
    console.log(`n=${n} ok=${ok.length}/${n} numbers=${ok.sort().join(',')} errors=[${errors.join(', ')}]`);
    assert.equal(ok.length, n, 'every concurrent booking should succeed');
    assert.equal(new Set(ok).size, n, 'ticket numbers must be unique');
  } finally {
    const ids = users.map((u) => u.id);
    await prisma.ticket.deleteMany({ where: { customerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
