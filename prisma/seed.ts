import { PrismaClient, Role, ShopStatus, TicketStatus } from '@prisma/client';

import { getBangkokDate as getBangkokDateString } from "../src/lib/booking-window";

const prisma = new PrismaClient();

// The seed wipes every table. Refuse anything but a local database unless explicitly allowed.
function assertLocalDatabase() {
  const url = process.env.DATABASE_URL ?? '';
  const host = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
  if (!['localhost', '127.0.0.1', '::1'].includes(host) && process.env.SEED_ALLOW_REMOTE !== 'true') {
    throw new Error(`Refusing to seed: DATABASE_URL host "${host || 'unknown'}" is not local (set SEED_ALLOW_REMOTE=true to override).`);
  }
}

async function main() {
  assertLocalDatabase();
  console.log('🌱 Starting Jong-Q Database Seeding...');

  // 1. Clean up existing records (reverse dependency order)
  await prisma.adminLog.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.timeSlot.deleteMany({});
  await prisma.queueCategory.deleteMany({});
  await prisma.shop.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Super Admin
  const adminUser = await prisma.user.create({
    data: {
      lineUserId: 'U_ADMIN_MHS_001',
      name: 'Super Admin Mae Hong Son',
      phone: '0800000000',
      role: Role.ADMIN,
    },
  });
  console.log('✅ Created Admin:', adminUser.name);

  // 3. Create Merchant Owner
  const merchantUser = await prisma.user.create({
    data: {
      lineUserId: 'U_MERCHANT_BARBERSHOP',
      name: 'ช่างสมชาย (เจ้าของร้าน The Barbershop)',
      phone: '0812345678',
      role: Role.MERCHANT,
    },
  });
  console.log('✅ Created Merchant Owner:', merchantUser.name);

  // 4. Create Customers
  const customer1 = await prisma.user.create({
    data: {
      lineUserId: 'U_CUSTOMER_001',
      name: 'คุณก้องเกียรติ พลอยงาม',
      phone: '0891112233',
      role: Role.CUSTOMER,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      lineUserId: 'U_CUSTOMER_002',
      name: 'น้องมายด์ แม่ฮ่องสอน',
      phone: '0894445566',
      role: Role.CUSTOMER,
    },
  });
  console.log('✅ Created 2 Sample Customers');

  // 5. Create Sample Shop: The Barbershop Mae Hong Son
  const shop = await prisma.shop.create({
    data: {
      name: 'The Barbershop Mae Hong Son',
      category: 'ตัดผม/เสริมสวย',
      branchCode: 'MHS-01',
      address: '142 ถนนสิงหนาทบำรุง ตำบลจองคำ อำเภอเมือง จังหวัดแม่ฮ่องสอน 58000',
      landmark: 'ริมหนองจองคำ เยื้องวัดจองคำและวัดจองกลาง',
      province: 'แม่ฮ่องสอน',
      latLng: '19.3008,97.9654',
      coverImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
      isOpen: true,
      status: ShopStatus.APPROVED,
      telegramChatId: '123456789',
      slotInterval: 30,
      maxCapacity: 6,
      ownerId: merchantUser.id,
    },
  });
  console.log('✅ Created Shop:', shop.name, `[${shop.branchCode}]`);

  // 6. Create Queue Categories
  const catHaircut = await prisma.queueCategory.create({
    data: {
      shopId: shop.id,
      prefix: 'A',
      name: 'ตัดผมชายวินเทจ (Haircut & Styling)',
      people: 1,
      avgWaitTime: 30,
    },
  });

  const catBeard = await prisma.queueCategory.create({
    data: {
      shopId: shop.id,
      prefix: 'B',
      name: 'โกนหนวด / จัดแต่งเครา (Beard Grooming)',
      people: 1,
      avgWaitTime: 20,
    },
  });

  const catWash = await prisma.queueCategory.create({
    data: {
      shopId: shop.id,
      prefix: 'C',
      name: 'สระไดร์ / ทรีตเมนต์ (Wash & Treatment)',
      people: 1,
      avgWaitTime: 25,
    },
  });
  console.log('✅ Created 3 Queue Categories (A, B, C)');

  // 7. Create 2-Day Sliding Window TimeSlots (Today + Tomorrow)
  const todayStr = getBangkokDateString(0);
  const tomorrowStr = getBangkokDateString(1);
  const dates = [todayStr, tomorrowStr];

  const intervals = [
    { start: '10:00', end: '10:30' },
    { start: '10:30', end: '11:00' },
    { start: '11:00', end: '11:30' },
    { start: '11:30', end: '12:00' },
    { start: '13:00', end: '13:30' },
    { start: '13:30', end: '14:00' },
    { start: '14:00', end: '14:30' },
    { start: '14:30', end: '15:00' },
    { start: '15:00', end: '15:30' },
    { start: '15:30', end: '16:00' },
    { start: '16:00', end: '16:30' },
    { start: '16:30', end: '17:00' },
  ];

  let firstSlotTodayId: string | null = null;

  for (const d of dates) {
    for (const slot of intervals) {
      const createdSlot = await prisma.timeSlot.create({
        data: {
          shopId: shop.id,
          date: d,
          startTime: slot.start,
          endTime: slot.end,
          maxSlots: 2,
          currentBooked: 0,
        },
      });

      if (!firstSlotTodayId && d === todayStr) {
        firstSlotTodayId = createdSlot.id;
      }
    }
  }
  console.log(`✅ Generated ${dates.length * intervals.length} TimeSlots across 2 days (${todayStr} & ${tomorrowStr})`);

  // 8. Create Sample Live Tickets
  // Ticket 1: CALLED (Current active serving queue)
  const ticket1 = await prisma.ticket.create({
    data: {
      shopId: shop.id,
      categoryId: catHaircut.id,
      customerId: customer1.id,
      ticketNumber: 'A-001',
      date: todayStr,
      status: TicketStatus.CALLED,
      calledAt: new Date(),
    },
  });

  // Ticket 2: WAITING (Next in line)
  const ticket2 = await prisma.ticket.create({
    data: {
      shopId: shop.id,
      categoryId: catHaircut.id,
      customerId: customer2.id,
      ticketNumber: 'A-002',
      date: todayStr,
      status: TicketStatus.WAITING,
    },
  });

  // Ticket 3: Scheduled slot booking for Today
  if (firstSlotTodayId) {
    await prisma.ticket.create({
      data: {
        shopId: shop.id,
        categoryId: catBeard.id,
        customerId: customer1.id,
        slotId: firstSlotTodayId,
        ticketNumber: 'B-001',
        date: todayStr,
        status: TicketStatus.WAITING,
      },
    });

    await prisma.timeSlot.update({
      where: { id: firstSlotTodayId },
      data: { currentBooked: { increment: 1 } },
    });
  }
  console.log('✅ Created 3 Sample Tickets (A-001 [CALLED], A-002 [WAITING], B-001 [SCHEDULED])');

  // 9. Admin Impersonation Log
  await prisma.adminLog.create({
    data: {
      adminId: adminUser.id,
      shopId: shop.id,
      action: 'INITIAL_SEED_VERIFY',
      details: 'Automated Phase 1 verification and seed initial data',
    },
  });
  console.log('✅ Created Sample Admin Impersonation Audit Log');

  console.log('🎉 Jong-Q Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
