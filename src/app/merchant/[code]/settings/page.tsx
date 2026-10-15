import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getBangkokDate, ensureTimeSlotWindow } from '@/lib/booking-window';
import { canAccessShop, getImpersonation, isImpersonating } from '@/lib/impersonation';
import ImpersonationBanner from '@/components/ImpersonationBanner';

// Screen M4: shop setup — queue categories (A/B/C) + the 2-day time slot manager +
// a link to the print-ready QR standee. Merchant-only; an admin reaches it via A2 impersonation.
export const dynamic = 'force-dynamic';

async function loadShop(code: string) {
  const user = await requireUser(['MERCHANT', 'ADMIN']);
  const shop = await prisma.shop.findUnique({ where: { branchCode: code } });
  if (!shop || shop.status !== 'APPROVED') notFound();
  const impersonation = getImpersonation();
  if (!canAccessShop(user, shop, impersonation)) redirect('/merchant');
  return { user, shop, impersonation };
}

const CategoryInput = z.object({
  prefix: z.string().trim().toUpperCase().min(1).max(2),
  name: z.string().trim().min(2).max(80),
  people: z.coerce.number().int().min(1).max(50),
  avgWaitTime: z.coerce.number().int().min(1).max(480),
});

async function parse(formData: FormData) {
  const parsed = CategoryInput.safeParse(Object.fromEntries(formData));
  return parsed.success ? parsed.data : null;
}

async function addCategory(formData: FormData) {
  'use server';
  const code = String(formData.get('code'));
  const { shop } = await loadShop(code);
  const data = await parse(formData);
  if (!data) redirect(`/merchant/${code}/settings?error=info`);
  try {
    await prisma.queueCategory.create({ data: { shopId: shop.id, ...data } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      redirect(`/merchant/${code}/settings?error=prefix`);
    }
    throw e;
  }
  revalidatePath(`/merchant/${code}/settings`);
  redirect(`/merchant/${code}/settings`);
}

async function editCategory(formData: FormData) {
  'use server';
  const code = String(formData.get('code'));
  const { shop } = await loadShop(code);
  const id = String(formData.get('categoryId'));
  const data = await parse(formData);
  if (!data) redirect(`/merchant/${code}/settings?error=info`);
  try {
    await prisma.queueCategory.update({ where: { id, shopId: shop.id }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      redirect(`/merchant/${code}/settings?error=prefix`);
    }
    throw e;
  }
  revalidatePath(`/merchant/${code}/settings`);
  redirect(`/merchant/${code}/settings`);
}

async function deleteCategory(formData: FormData) {
  'use server';
  const code = String(formData.get('code'));
  const { shop } = await loadShop(code);
  const id = String(formData.get('categoryId'));
  const inUse = await prisma.ticket.count({ where: { shopId: shop.id, categoryId: id } });
  if (inUse > 0) redirect(`/merchant/${code}/settings?error=used`);
  await prisma.queueCategory.delete({ where: { id, shopId: shop.id } });
  revalidatePath(`/merchant/${code}/settings`);
  redirect(`/merchant/${code}/settings`);
}

const SlotInput = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  maxSlots: z.coerce.number().int().min(1).max(500),
});

async function addSlot(formData: FormData) {
  'use server';
  const code = String(formData.get('code'));
  const { shop } = await loadShop(code);
  const parsed = SlotInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.startTime >= parsed.data.endTime) {
    redirect(`/merchant/${code}/settings?error=slot`);
  }
  const today = getBangkokDate(0);
  const tomorrow = getBangkokDate(1);
  // Same slot row is created for both days so the 2-day window stays consistent.
  const res = await prisma.timeSlot.createMany({
    data: [today, tomorrow].map((date) => ({ shopId: shop.id, date, ...parsed.data })),
    skipDuplicates: true,
  });
  // count 0 = that time already exists on both days, which is the normal "you already have it" case.
  // count 1 = the window is genuinely half-built (e.g. tomorrow was missing) and is worth flagging.
  if (res.count === 0) redirect(`/merchant/${code}/settings?error=duplicate`);
  if (res.count === 1) redirect(`/merchant/${code}/settings?error=partial`);
  revalidatePath(`/merchant/${code}/settings`);
  redirect(`/merchant/${code}/settings`);
}

async function editSlot(formData: FormData) {
  'use server';
  const code = String(formData.get('code'));
  const { shop } = await loadShop(code);
  const startTime = String(formData.get('startTime'));
  const maxSlots = z.coerce.number().int().min(1).max(500).safeParse(formData.get('maxSlots'));
  if (!maxSlots.success) redirect(`/merchant/${code}/settings?error=slot`);
  const [today, tomorrow] = [getBangkokDate(0), getBangkokDate(1)];
  const window = { shopId: shop.id, date: { in: [today, tomorrow] }, startTime };
  const total = await prisma.timeSlot.count({ where: window });
  // Atomic: the capacity guard sits in the WHERE clause, so a booking landing between the read
  // and the write cannot slip past and leave the slot over-subscribed.
  const res = await prisma.timeSlot.updateMany({
    where: { ...window, currentBooked: { lte: maxSlots.data } },
    data: { maxSlots: maxSlots.data },
  });
  if (res.count < total) redirect(`/merchant/${code}/settings?error=capacity`);
  revalidatePath(`/merchant/${code}/settings`);
  redirect(`/merchant/${code}/settings`);
}

async function toggleSlot(formData: FormData) {
  'use server';
  const code = String(formData.get('code'));
  const { shop } = await loadShop(code);
  const startTime = String(formData.get('startTime'));
  const enabled = formData.get('enabled') === '1';
  // The on/off switch controls the slot on both today and tomorrow at once.
  await prisma.timeSlot.updateMany({
    where: { shopId: shop.id, date: { in: [getBangkokDate(0), getBangkokDate(1)] }, startTime },
    data: { enabled },
  });
  revalidatePath(`/merchant/${code}/settings`);
  redirect(`/merchant/${code}/settings`);
}

export default async function SettingsPage({ params, searchParams }: { params: { code: string }; searchParams: { error?: string } }) {
  const { user, shop, impersonation } = await loadShop(params.code);
  const adminMode = isImpersonating(impersonation, user);
  const today = getBangkokDate(0);
  const tomorrow = getBangkokDate(1);

  // Auto-populate the 2-day window if tomorrow's slots are missing (P0 fix: sliding window).
  await ensureTimeSlotWindow(shop.id);

  const [categories, slots] = await Promise.all([
    prisma.queueCategory.findMany({
      where: { shopId: shop.id },
      include: { _count: { select: { tickets: true } } },
      orderBy: { prefix: 'asc' },
    }),
    prisma.timeSlot.findMany({
      where: { shopId: shop.id, date: { in: [today, tomorrow] } },
      orderBy: { startTime: 'asc' },
    }),
  ]);

  // Merge today+tomorrow rows by startTime so the merchant sees one row per time with two statuses.
  const byId = new Map(slots.map((s) => [`${s.date}/${s.startTime}`, s]));
  const times = Array.from(new Set(slots.map((s) => s.startTime))).sort();

  const ERRORS: Record<string, string> = {
    info: 'กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง ลองอีกครั้ง',
    prefix: 'รหัสหมวดนี้ซ้ำ ต้องไม่เหมือนร้านเดิม',
    used: 'หมวดนี้มีคิวอยู่แล้ว ลบไม่ได้ ให้เปลี่ยนสถานะคิวเป็นเสร็จก่อน',
    slot: 'ข้อมูลรอบเวลาไม่ถูกต้อง ลองอีกครั้ง',
    capacity: 'ไม่สามารถลดจำนวนรับต่ำกว่าคิวที่จองไว้แล้ว (มีคนจองเพิ่มระหว่างที่กำลังแก้)',
    duplicate: 'ช่วงเวลานี้มีอยู่แล้วทั้งวันนี้และพรุ่งนี้',
    partial: 'สร้างได้แค่ 1 วัน เพราะอีกวันมีช่วงเวลานี้อยู่แล้ว ตรวจสอบตารางด้านบน',
  };

  const field = 'w-full rounded-riso bg-white px-3 py-2 riso-border';

  return (
    <>
      {adminMode && <ImpersonationBanner shopName={shop.name} />}
      <main className="mx-auto max-w-5xl p-4 text-base">
        <Link href="/merchant" className="text-sm font-semibold">‹ ร้านของฉัน</Link>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{shop.name} · ตั้งค่า</h1>
            <p className="text-sm text-riso-muted">{shop.branchCode} · เปิดรับคิว {today}</p>
          </div>
          <Link href={`/merchant/${shop.branchCode}/board`} className="rounded-full bg-riso-teal px-5 py-2.5 font-bold text-white riso-btn">
            กลับไปเรียกคิว
          </Link>
        </header>

        {searchParams.error && (
          <p className="mt-4 rounded-riso bg-riso-yellow p-3 font-semibold riso-border">{ERRORS[searchParams.error] ?? 'เกิดข้อผิดพลาด'}</p>
        )}

        {/* ── Section 1: Queue Categories ── */}
        <section className="mt-8">
          <h2 className="text-lg font-bold">หมวดหมู่คิว (Prefix A/B/C)</h2>
          <p className="text-sm text-riso-muted">กำหนดประเภทบริการของทางร้าน ที่ใช้ทั้งหน้าเรียกคิวและหน้าจองของลูกค้า</p>

          <div className="mt-4 space-y-3">
            {categories.map((c) => (
              <form key={c.id} action={editCategory} className="flex flex-wrap items-end gap-3 rounded-riso-lg bg-canvas-card p-4 riso-border riso-shadow">
                <input type="hidden" name="code" value={shop.branchCode} />
                <input type="hidden" name="categoryId" value={c.id} />
                <label className="w-16">
                  <span className="text-xs text-riso-muted">รหัส</span>
                  <input
                    name="prefix"
                    defaultValue={c.prefix}
                    maxLength={2}
                    readOnly={c._count.tickets > 0}
                    className={`${field} text-center font-mono font-bold uppercase ${c._count.tickets > 0 ? 'bg-canvas-muted cursor-not-allowed' : ''}`}
                    title={c._count.tickets > 0 ? 'เปลี่ยนไม่ได้เพราะมีคิวใช้หมวดนี้แล้ว' : undefined}
                  />
                </label>
                <label className="min-w-40 flex-1">
                  <span className="text-xs text-riso-muted">ชื่อบริการ</span>
                  <input name="name" defaultValue={c.name} className={field} />
                </label>
                <label className="w-24">
                  <span className="text-xs text-riso-muted">จำนวนคน</span>
                  <input name="people" type="number" defaultValue={c.people} min={1} className={`${field} text-center`} />
                </label>
                <label className="w-28">
                  <span className="text-xs text-riso-muted">เวลารอ (นาที)</span>
                  <input name="avgWaitTime" type="number" defaultValue={c.avgWaitTime} min={1} className={`${field} text-center`} />
                </label>
                <div className="ml-auto flex gap-2">
                  <button className="rounded-riso bg-riso-indigo px-4 py-2 font-semibold text-white riso-btn">บันทึก</button>
                  {c._count.tickets === 0 && (
                    <button formAction={deleteCategory} className="rounded-riso bg-white px-3 py-2 font-semibold text-riso-orange riso-btn">ลบ</button>
                  )}
                </div>
                {c._count.tickets > 0 && <span className="text-xs text-riso-muted">มีคิว {c._count.tickets} ใบ ลบไม่ได้</span>}
              </form>
            ))}
          </div>

          <form action={addCategory} className="mt-3 flex flex-wrap items-end gap-3 rounded-riso-lg bg-canvas-muted p-4 riso-border">
            <input type="hidden" name="code" value={shop.branchCode} />
            <label className="w-16">
              <span className="text-xs text-riso-muted">รหัสใหม่</span>
              <input name="prefix" required maxLength={2} placeholder="E" className={`${field} text-center font-mono font-bold uppercase`} />
            </label>
            <label className="min-w-40 flex-1">
              <span className="text-xs text-riso-muted">ชื่อบริการ</span>
              <input name="name" required minLength={2} placeholder="เช่น ตัดผมทรงใหม่" className={field} />
            </label>
            <label className="w-24">
              <span className="text-xs text-riso-muted">จำนวนคน</span>
              <input name="people" type="number" defaultValue={1} min={1} className={`${field} text-center`} />
            </label>
            <label className="w-28">
              <span className="text-xs text-riso-muted">เวลารอ (นาที)</span>
              <input name="avgWaitTime" type="number" defaultValue={20} min={1} className={`${field} text-center`} />
            </label>
            <button className="rounded-riso bg-riso-orange px-4 py-2 font-bold text-white riso-btn">+ เพิ่มหมวด</button>
          </form>
        </section>

        {/* ── Section 2: 2-Day Time Slot Manager ── */}
        <section className="mt-10">
          <h2 className="text-lg font-bold">รอบเวลานัดหมาย 2 วัน</h2>
          <p className="text-sm text-riso-muted">ช่วงเวลา (เช่น 10:00–10:30) รับจำนวนเท่าไหร่ และเปิด/ปิดให้จองพร้อมกันทั้ง 2 วัน</p>

          <div className="mt-4 overflow-x-auto rounded-riso-lg bg-canvas-card riso-border riso-shadow">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-canvas-muted">
                  <th className="p-3 text-left font-bold">ช่วงเวลา</th>
                  <th className="p-3 text-left font-bold">จำนวนรับ (สูงสุด)</th>
                  <th className="p-3 text-left font-bold">สถานะ <span className="font-normal text-riso-muted">(ทั้ง 2 วัน)</span></th>
                  <th className="p-3 text-left font-bold">ข้อมูล</th>
                </tr>
              </thead>
              <tbody>
                {times.map((t) => {
                  const todayRow = byId.get(`${today}/${t}`);
                  const tomorrowRow = byId.get(`${tomorrow}/${t}`);
                  const enabled = todayRow?.enabled ?? tomorrowRow?.enabled ?? true;
                  return (
                    <tr key={t} className="border-t border-riso-indigo/20">
                      <td className="p-3 font-mono font-bold whitespace-nowrap">{t}–{(byId.get(`${today}/${t}`)?.endTime ?? byId.get(`${tomorrow}/${t}`)?.endTime) ?? ''}</td>
                      <td className="p-3">
                        <form action={editSlot} className="flex items-center gap-2">
                          <input type="hidden" name="code" value={shop.branchCode} />
                          <input type="hidden" name="startTime" value={t} />
                          <input type="hidden" name="date" value={today} />
                          <input name="maxSlots" type="number" defaultValue={todayRow?.maxSlots ?? tomorrowRow?.maxSlots ?? 5} min={1} className="w-20 rounded-riso bg-white px-2 py-1 text-center riso-border" />
                          <button className="rounded-riso bg-riso-indigo px-3 py-1 text-xs font-bold text-white riso-btn">บันทึก</button>
                        </form>
                      </td>
                      <td className="p-3">
                        {todayRow || tomorrowRow ? (
                          <form action={toggleSlot} className="flex items-center">
                            <input type="hidden" name="code" value={shop.branchCode} />
                            <input type="hidden" name="startTime" value={t} />
                            <input type="hidden" name="enabled" value={enabled ? '0' : '1'} />
                            <button className={`rounded-full px-3 py-1 text-sm font-bold riso-btn ${enabled ? 'bg-riso-teal text-white' : 'bg-canvas-muted'}`}>
                              {enabled ? '● เปิด' : '○ ปิด'}
                            </button>
                          </form>
                        ) : (
                          <span className="text-riso-muted">–</span>
                        )}
                      </td>
                      <td className="p-3 text-riso-muted whitespace-nowrap">
                        วันนี้ {todayRow ? `${todayRow.maxSlots - todayRow.currentBooked} ที่ว่าง` : 'ไม่มี'}
                        <span className="mx-2">·</span>
                        {tomorrowRow ? `พรุ่งนี้ ${tomorrowRow.maxSlots - tomorrowRow.currentBooked} ที่ว่าง` : 'ไม่มี'}
                      </td>
                    </tr>
                  );
                })}
                {times.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-riso-muted">ยังไม่มีรอบเวลา เพิ่มด้านล่าง</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <form action={addSlot} className="mt-3 flex flex-wrap items-end gap-3 rounded-riso-lg bg-canvas-muted p-4 riso-border">
            <input type="hidden" name="code" value={shop.branchCode} />
            <label className="grid grid-cols-2 gap-2">
              <span className="col-span-2 text-xs text-riso-muted">ช่วงเวลา (นำไปสร้างทั้ง 2 วัน)</span>
              <input name="startTime" type="time" required className={field} />
              <input name="endTime" type="time" required className={field} />
            </label>
            <label>
              <span className="text-xs text-riso-muted">จำนวนรับ</span>
              <input name="maxSlots" type="number" defaultValue={5} min={1} className={`${field} w-24 text-center`} />
            </label>
            <button className="rounded-riso bg-riso-teal px-4 py-2 font-bold text-white riso-btn">+ เพิ่มรอบเวลา</button>
          </form>
        </section>

        {/* ── Section 3: QR Standee ── */}
        <section className="mt-10">
          <h2 className="text-lg font-bold">ป้าย QR หน้าร้าน</h2>
          <p className="text-sm text-riso-muted">พิมพ์ป้าย QR สแกนเก็นคิวผ่าน LINE ได้ทันที ไม่ต้องโหลดแอป</p>
          <div className="mt-4 flex items-center justify-between rounded-riso-lg bg-canvas-card p-5 riso-border riso-shadow">
            <div className="text-sm">
              <p className="font-bold">ขนาด A4 / A5 ตั้งค่าแล้วในการพิมพ์</p>
              <p className="text-riso-muted">สแกน QR เพื่อเปิดหน้ารับคิวจองคิวของ {shop.name}</p>
            </div>
            <Link href={`/merchant/${shop.branchCode}/qr`} className="rounded-riso bg-riso-orange px-5 py-2.5 font-bold text-white riso-btn">ดูตัวอย่าง / พิมพ์</Link>
          </div>
        </section>
    </main>
    </>
  );
}
