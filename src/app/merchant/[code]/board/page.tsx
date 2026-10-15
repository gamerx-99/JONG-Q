import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { TicketStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getBangkokDate } from '@/lib/booking-window';
import { canAccessShop, getImpersonation, isImpersonating } from '@/lib/impersonation';
import AutoRefresh from '@/components/AutoRefresh';
import ImpersonationBanner from '@/components/ImpersonationBanner';

// Screen M3 (+ M2 open/close switch): live call board for a tablet at the counter.
// ponytail: polls every 10 s (AutoRefresh); move to SSE together with C4 when real-time matters.
// A2: an admin may run this board inside a shop via the impersonation cookie; `user` stays the
// real actor, so the banner + AdminLog below both point at the admin, not the shop owner.
export const dynamic = 'force-dynamic';

async function loadShop(code: string) {
  const user = await requireUser(['MERCHANT', 'ADMIN']);
  const shop = await prisma.shop.findUnique({ where: { branchCode: code } });
  if (!shop || shop.status !== 'APPROVED') notFound();
  const impersonation = getImpersonation();
  if (!canAccessShop(user, shop, impersonation)) redirect('/merchant');
  return { user, shop, impersonation };
}

const ACTIVE: TicketStatus[] = ['CALLED', 'SERVING'];

async function act(formData: FormData) {
  'use server';
  const code = String(formData.get('code'));
  const { user, shop } = await loadShop(code);
  const action = String(formData.get('action'));
  const ticketId = formData.get('ticketId') ? String(formData.get('ticketId')) : undefined;
  // "All" tab calls the oldest waiting ticket of the whole shop (one counter, FIFO); a category tab calls within it.
  const category = formData.get('cat') ? String(formData.get('cat')) : undefined;
  const today = getBangkokDate(0);
  const now = new Date();
  let error: string | undefined;
  let changed: string | undefined; // ticket number or state written to the audit log

  // Every transition is a conditional update on (shop, today, expected status) so double taps and stale forms are harmless.
  const move = async (from: TicketStatus[], data: Record<string, unknown>) => {
    if (!ticketId) return void (error = 'ไม่พบคิว');
    const where = { id: ticketId, shopId: shop.id, date: today, status: { in: from } };
    const target = await prisma.ticket.findFirst({ where });
    const r = target ? await prisma.ticket.updateMany({ where, data }) : { count: 0 };
    if (r.count === 0) error = 'คิวนี้ถูกเปลี่ยนสถานะไปแล้ว';
    else changed = target!.ticketNumber;
  };

  switch (action) {
    case 'toggle': {
      // The form carries the wanted state, so a double tap cannot flip it back.
      const isOpen = formData.get('open') === '1';
      await prisma.shop.update({ where: { id: shop.id }, data: { isOpen } });
      changed = isOpen ? 'OPEN' : 'CLOSED';
      break;
    }
    case 'next':
    case 'restore': {
      const busy = await prisma.ticket.findFirst({ where: { shopId: shop.id, date: today, status: { in: ACTIVE } } });
      if (busy) { error = `ปิดคิว ${busy.ticketNumber} ก่อน (เสร็จสิ้นหรือข้าม)`; break; }
      if (action === 'restore' && !ticketId) { error = 'ไม่พบคิว'; break; }
      const target = action === 'restore'
        ? await prisma.ticket.findFirst({ where: { id: ticketId, shopId: shop.id, date: today, status: 'SKIPPED' } })
        : await prisma.ticket.findFirst({
            where: { shopId: shop.id, date: today, status: 'WAITING', ...(category && { categoryId: category }) },
            orderBy: { createdAt: 'asc' },
          });
      if (!target) { error = 'ไม่มีคิวรอ'; break; }
      const r = await prisma.ticket.updateMany({
        where: { id: target.id, status: action === 'restore' ? 'SKIPPED' : 'WAITING' },
        data: { status: 'CALLED', calledAt: now },
      });
      if (r.count === 0) error = 'คิวนี้ถูกเปลี่ยนสถานะไปแล้ว ลองอีกครั้ง';
      else changed = target.ticketNumber;
      break;
    }
    case 'recall':
      // [EXTENSION_POINT]: ring the customer's live ticket page (sound) once C4 has a chime/SSE.
      await move(['CALLED'], { calledAt: now });
      break;
    case 'serve':
      await move(['CALLED'], { status: 'SERVING', servedAt: now });
      break;
    case 'complete':
      await move(ACTIVE, { status: 'COMPLETED', completedAt: now });
      break;
    case 'skip':
      await move(ACTIVE, { status: 'SKIPPED' });
      break;
  }

  // Evidence for "the shop skipped my queue" disputes. `user` is always the real signed-in
  // actor — the shop owner, or the admin when A2 impersonation is active — so the row names
  // whoever actually pressed the button. ponytail: split into a ShopLog table if admins need
  // a separate view.
  if (changed) {
    await prisma.adminLog.create({ data: { adminId: user.id, shopId: shop.id, action: `BOARD_${action.toUpperCase()}`, details: changed } });
  }

  revalidatePath(`/merchant/${code}/board`);
  const qs = new URLSearchParams({ ...(category && { cat: category }), ...(error && { error }) }).toString();
  redirect(`/merchant/${code}/board${qs ? `?${qs}` : ''}`);
}

export default async function CallBoard({ params, searchParams }: { params: { code: string }; searchParams: { error?: string; cat?: string } }) {
  const { user, shop, impersonation } = await loadShop(params.code);
  const adminMode = isImpersonating(impersonation, user);
  const today = getBangkokDate(0);
  const [categories, tickets] = await Promise.all([
    prisma.queueCategory.findMany({ where: { shopId: shop.id }, orderBy: { prefix: 'asc' } }),
    prisma.ticket.findMany({
      where: { shopId: shop.id, date: today, status: { in: ['WAITING', 'CALLED', 'SERVING', 'SKIPPED'] } },
      include: { customer: true, timeSlot: true, category: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const current = tickets.find((t) => t.status === 'CALLED' || t.status === 'SERVING');
  const waiting = tickets.filter((t) => t.status === 'WAITING');
  const skipped = tickets.filter((t) => t.status === 'SKIPPED');
  const cat = categories.find((c) => c.id === searchParams.cat);
  const shown = cat ? waiting.filter((t) => t.categoryId === cat.id) : waiting;
  const minutes = (d: Date) => Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));

  const hidden = (name: string, value: string) => <input type="hidden" name={name} value={value} />;
  const btn = 'w-full rounded-riso py-4 text-lg font-bold riso-btn disabled:opacity-40';

  return (
    <>
      {adminMode && <ImpersonationBanner shopName={shop.name} />}
      <main className="mx-auto max-w-6xl p-4 text-base">
        <AutoRefresh seconds={10} />
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/merchant" className="text-sm font-semibold">‹ ร้านของฉัน</Link>
            <h1 className="text-2xl font-bold">{shop.name} · เรียกคิว</h1>
            <p className="text-sm text-riso-muted">{today} · <Link href={`/merchant/${shop.branchCode}/settings`} className="underline">ตั้งค่า</Link></p>
          </div>
          <form action={act}>
            {hidden('code', shop.branchCode)}{hidden('action', 'toggle')}{hidden('open', shop.isOpen ? '0' : '1')}{cat && hidden('cat', cat.id)}
            <button className={`rounded-full px-5 py-3 font-bold riso-btn ${shop.isOpen ? 'bg-riso-teal text-white' : 'bg-canvas-muted'}`}>
              {shop.isOpen ? '● เปิดร้าน (รับคิวอยู่)' : '○ ปิดร้าน (หยุดรับคิว)'}
            </button>
          </form>
        </header>

        {searchParams.error && <p className="mt-4 rounded-riso bg-riso-yellow p-3 font-semibold riso-border">{searchParams.error}</p>}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Left: active calling panel */}
          <section className="rounded-riso-xl bg-canvas-card p-6 riso-border-thick riso-shadow-lg">
            <div className="text-center text-sm text-riso-muted">{current?.status === 'SERVING' ? 'กำลังให้บริการ' : 'กำลังเรียก'}</div>
            <div className="text-center font-mono text-8xl font-bold text-riso-orange">{current?.ticketNumber ?? '—'}</div>
            {current && (
              <div className="mt-1 text-center">
                {current.customer.name} · {current.customer.phone ?? 'ไม่มีเบอร์'} · {current.category.name}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <form action={act} className="col-span-2">
                {hidden('code', shop.branchCode)}{hidden('action', 'next')}
                {cat && hidden('cat', cat.id)}
                <button disabled={!!current || shown.length === 0} className={`${btn} bg-riso-teal text-white`}>
                  เรียกคิวถัดไป{cat ? ` (${cat.prefix})` : ''}
                </button>
              </form>
              {(
                [
                  ['recall', 'เรียกซ้ำ 🔔', current?.status === 'CALLED', 'bg-white'],
                  ['serve', 'เริ่มให้บริการ', current?.status === 'CALLED', 'bg-riso-yellow'],
                  ['complete', 'เสร็จสิ้น', !!current, 'bg-riso-indigo text-white'],
                  ['skip', 'ข้าม / พักคิว', !!current, 'bg-white'],
                ] as const
              ).map(([action, label, enabled, cls]) => (
                <form key={action} action={act}>
                  {hidden('code', shop.branchCode)}{hidden('action', action)}{current && hidden('ticketId', current.id)}{cat && hidden('cat', cat.id)}
                  <button disabled={!enabled} className={`${btn} ${cls}`}>{label}</button>
                </form>
              ))}
            </div>
          </section>

          {/* Right: waiting lists by category + skipped */}
          <section>
            <nav className="flex flex-wrap gap-2">
              <Link href="?" className={`rounded-full px-4 py-2 font-semibold riso-border ${!cat ? 'bg-riso-indigo text-white' : 'bg-white'}`}>
                ทั้งหมด ({waiting.length})
              </Link>
              {categories.map((c) => (
                <Link key={c.id} href={`?cat=${c.id}`} className={`rounded-full px-4 py-2 font-semibold riso-border ${cat?.id === c.id ? 'bg-riso-indigo text-white' : 'bg-white'}`}>
                  {c.prefix} ({waiting.filter((t) => t.categoryId === c.id).length})
                </Link>
              ))}
            </nav>

            <ul className="mt-4 space-y-2">
              {shown.length === 0 && <li className="text-riso-muted">ไม่มีคิวรอ</li>}
              {shown.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-riso bg-canvas-card p-3 riso-border">
                  <span className="font-mono text-2xl font-bold">{t.ticketNumber}</span>
                  <span className="min-w-0 flex-1 truncate">{t.customer.name} · {t.customer.phone ?? '-'}</span>
                  <span className="shrink-0 text-sm text-riso-muted">
                    {t.timeSlot ? `นัด ${t.timeSlot.startTime}` : `รอ ${minutes(t.createdAt)} นาที`}
                  </span>
                </li>
              ))}
            </ul>

            {skipped.length > 0 && (
              <>
                <h2 className="mt-6 font-bold">คิวที่พักไว้</h2>
                <ul className="mt-2 space-y-2">
                  {skipped.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 rounded-riso bg-riso-yellow/40 p-3 riso-border">
                      <span className="font-mono text-xl font-bold">{t.ticketNumber}</span>
                      <span className="min-w-0 flex-1 truncate">{t.customer.name}</span>
                      <form action={act}>
                        {hidden('code', shop.branchCode)}{hidden('action', 'restore')}{hidden('ticketId', t.id)}{cat && hidden('cat', cat.id)}
                        <button disabled={!!current} className="rounded-riso bg-white px-3 py-2 font-semibold riso-btn disabled:opacity-40">ดึงกลับมาเรียก</button>
                      </form>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
