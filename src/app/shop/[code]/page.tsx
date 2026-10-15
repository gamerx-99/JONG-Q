import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getActiveBookingWindow, ensureTimeSlotWindow } from '@/lib/booking-window';
import { getSessionUser, requireUser } from '@/lib/session';
import { BookingError, issueTicket } from '@/lib/queue';

export const dynamic = 'force-dynamic';

async function book(formData: FormData) {
  'use server';
  const code = String(formData.get('code'));
  const back = `/shop/${code}?mode=${formData.get('mode')}&day=${formData.get('day')}`;
  const user = await requireUser();
  if (!user.phone) redirect(`/profile?next=${encodeURIComponent(back)}`);

  const slotId = formData.get('slotId') ? String(formData.get('slotId')) : undefined;
  try {
    const t = await issueTicket({
      shopId: String(formData.get('shopId')),
      categoryId: String(formData.get('categoryId')),
      customerId: user.id,
      date: String(formData.get('date')),
      slotId,
    });
    redirect(`/t/${t.id}`);
  } catch (e) {
    if (e instanceof BookingError) redirect(`${back}&error=${encodeURIComponent(e.message)}`);
    throw e;
  }
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: { mode?: string; day?: string; error?: string };
}) {
  const { today, tomorrow } = getActiveBookingWindow();
  const mode = searchParams.mode === 'slot' ? 'slot' : 'walkin';
  const day = searchParams.day === 'tomorrow' ? 'tomorrow' : 'today';
  const date = mode === 'walkin' ? today : day === 'today' ? today : tomorrow;

  const shop = await prisma.shop.findUnique({ where: { branchCode: params.code } });
  if (!shop || shop.status !== 'APPROVED') notFound();

  await ensureTimeSlotWindow(shop.id);

  const shopData = await prisma.shop.findUnique({
    where: { branchCode: params.code },
    include: {
      queueCategories: { orderBy: { prefix: 'asc' } },
      timeSlots: { where: { date, enabled: true }, orderBy: { startTime: 'asc' } },
      tickets: { where: { date: today, status: 'WAITING', slotId: null }, select: { categoryId: true } },
    },
  });
  if (!shopData) notFound();

  const me = await getSessionUser();
  const tab = (on: boolean) => `flex-1 rounded-riso py-2 text-center font-semibold riso-border ${on ? 'bg-riso-indigo text-white' : 'bg-white'}`;
  const nowHHMM = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }).format(new Date());

  return (
    <main className="mx-auto max-w-md p-4">
      <Link href="/" className="text-sm font-semibold">‹ กลับ</Link>
      <header className="mt-2">
        <h1 className="font-zine text-2xl font-bold">{shopData.name}</h1>
        <p className="text-sm text-riso-muted">{shopData.address}{shopData.landmark ? ` · ${shopData.landmark}` : ''}</p>
      </header>

      {!shopData.isOpen ? (
        <div className="mt-6 rounded-riso-lg bg-canvas-muted p-6 text-center font-bold riso-border">
          ขณะนี้ร้านปิดให้บริการรับคิวชั่วคราว
        </div>
      ) : (
        <>
          {searchParams.error && (
            <p className="mt-4 rounded-riso bg-riso-orange/10 p-3 font-semibold text-riso-orange riso-border">{searchParams.error}</p>
          )}
          <div className="mt-4 flex gap-2">
            <Link href={`?mode=walkin`} className={tab(mode === 'walkin')}>รับคิวสดหน้าร้าน</Link>
            <Link href={`?mode=slot&day=today`} className={tab(mode === 'slot')}>จองรอบเวลา</Link>
          </div>

          {mode === 'slot' && (
            <div className="mt-3 flex gap-2">
              <Link href={`?mode=slot&day=today`} className={tab(day === 'today')}>วันนี้</Link>
              <Link href={`?mode=slot&day=tomorrow`} className={tab(day === 'tomorrow')}>พรุ่งนี้</Link>
            </div>
          )}

          {!me && <p className="mt-4 text-sm"><Link href="/dev-login" className="font-semibold underline">เข้าสู่ระบบ</Link> ก่อนกดรับคิว</p>}

          <form action={book} className="mt-4 space-y-4">
            <input type="hidden" name="code" value={shop.branchCode} />
            <input type="hidden" name="shopId" value={shop.id} />
            <input type="hidden" name="mode" value={mode} />
            <input type="hidden" name="day" value={day} />
            <input type="hidden" name="date" value={date} />

            <fieldset className="space-y-2">
              <legend className="mb-2 font-semibold">เลือกบริการ</legend>
              {shopData.queueCategories.map((c, i) => {
                const waiting = shopData.tickets.filter((t) => t.categoryId === c.id).length;
                return (
                  <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-riso bg-canvas-card p-3 riso-border has-[:checked]:bg-riso-yellow">
                    <input type="radio" name="categoryId" value={c.id} defaultChecked={i === 0} required className="h-5 w-5 accent-riso-orange" />
                    <span className="font-mono font-bold">{c.prefix}</span>
                    <span className="min-w-0 flex-1">{c.name}</span>
                    <span className="shrink-0 whitespace-nowrap text-sm text-riso-muted">{c.people} คน</span>
                    {mode === 'walkin' && (
                      <span className="shrink-0 whitespace-nowrap text-sm text-riso-muted">{waiting ? `รอ ${waiting} · ~${waiting * c.avgWaitTime} นาที` : 'ไม่มีคิวรอ'}</span>
                    )}
                  </label>
                );
              })}
            </fieldset>

            {mode === 'slot' && (
              <fieldset>
                <legend className="mb-2 font-semibold">รอบเวลา ({date === today ? 'วันนี้' : 'พรุ่งนี้'})</legend>
                {shopData.timeSlots.length === 0 && <p className="text-riso-muted">ยังไม่มีรอบเวลาของ {date === today ? 'วันนี้' : 'พรุ่งนี้'}</p>}
                <div className="grid grid-cols-3 gap-2">
                  {shopData.timeSlots.map((s) => {
                    const left = s.maxSlots - s.currentBooked;
                    const past = date === today && s.startTime <= nowHHMM;
                    const disabled = left <= 0 || past;
                    return (
                      <label key={s.id} className={`rounded-riso p-2 text-center riso-border ${disabled ? 'bg-canvas-muted text-riso-muted' : 'cursor-pointer bg-white has-[:checked]:bg-riso-yellow'}`}>
                        <input type="radio" name="slotId" value={s.id} disabled={disabled} required className="sr-only" />
                        <div className="font-mono font-bold">{s.startTime}</div>
                        <div className="text-xs">{past ? 'ผ่านไปแล้ว' : left > 0 ? `ว่าง ${left}` : 'เต็ม'}</div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <button className="w-full rounded-riso bg-riso-orange py-4 text-lg font-bold text-white riso-btn">
              {mode === 'walkin' ? 'กดรับบัตรคิว Walk-in' : 'ยืนยันการจองรอบเวลานี้'}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
