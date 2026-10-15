import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getBangkokDate } from '@/lib/booking-window';
import { getSessionUser } from '@/lib/session';
import { findActiveTicket } from '@/lib/queue';

// Screen C1: directory of shops that are open right now (APPROVED + isOpen only).
export const dynamic = 'force-dynamic';

const CATEGORIES = ['ทั้งหมด', 'ร้านอาหาร/คาเฟ่', 'คลินิก/สุขภาพ', 'ตัดผม/เสริมสวย', 'สปา/นวด', 'บริการอื่นๆ'];

export default async function HomePage({ searchParams }: { searchParams: { q?: string; cat?: string } }) {
  const today = getBangkokDate(0);
  const q = searchParams.q?.trim();
  const cat = searchParams.cat && searchParams.cat !== 'ทั้งหมด' ? searchParams.cat : undefined;

  const where: Prisma.ShopWhereInput = {
    status: 'APPROVED',
    isOpen: true,
    ...(cat && { category: cat }),
    ...(q && { OR: [{ name: { contains: q, mode: 'insensitive' } }, { address: { contains: q, mode: 'insensitive' } }] }),
  };
  const [me, shops] = await Promise.all([
    getSessionUser(),
    prisma.shop.findMany({
      where,
      include: { queueCategories: { orderBy: { prefix: 'asc' } }, tickets: { where: { date: today, status: 'WAITING', slotId: null } } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  const active = me ? await findActiveTicket(me.id) : null;

  return (
    <main className="mx-auto max-w-3xl p-4">
      <header className="flex items-center justify-between py-2">
        <div>
          <h1 className="font-zine text-3xl font-bold">Jong-Q <span className="text-riso-orange">จองคิว</span></h1>
          <p className="text-sm text-riso-muted">จองคิวร้านในแม่ฮ่องสอน ไม่ต้องยืนรอ</p>
        </div>
        {me ? (
          <Link href="/profile" className="max-w-[45%] truncate rounded-full bg-canvas-card px-3 py-1 text-sm font-semibold riso-border">{me.name}</Link>
        ) : (
          <Link href="/dev-login" className="rounded-riso bg-white px-3 py-1 text-sm font-semibold riso-btn">เข้าสู่ระบบ</Link>
        )}
      </header>

      {active && (
        <Link href={`/t/${active.id}`} className="mt-2 block rounded-riso bg-riso-teal p-3 font-semibold text-white riso-border riso-shadow">
          คุณมีคิวที่กำลังรอ: {active.shop.name} ({active.ticketNumber}) · แตะเพื่อดูสถานะ ➜
        </Link>
      )}

      <form className="mt-4">
        {cat && <input type="hidden" name="cat" value={cat} />}
        <input name="q" defaultValue={q} placeholder="ค้นหาชื่อร้านหรือพื้นที่" className="w-full rounded-riso bg-white px-4 py-3 riso-border" />
      </form>
      <nav className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((c) => {
          const on = (cat ?? 'ทั้งหมด') === c;
          const href = { pathname: '/', query: { ...(q && { q }), ...(c !== 'ทั้งหมด' && { cat: c }) } };
          return (
            <Link key={c} href={href} className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold riso-border ${on ? 'bg-riso-indigo text-white' : 'bg-white'}`}>
              {c}
            </Link>
          );
        })}
      </nav>

      {shops.length === 0 ? (
        <p className="mt-10 text-center text-riso-muted">ตอนนี้ยังไม่มีร้านที่เปิดรับคิว{q || cat ? 'ตามที่ค้นหา' : ''}</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {shops.map((s) => {
            const waiting = s.tickets.length;
            const avg = s.queueCategories[0]?.avgWaitTime ?? 20; // ponytail: first category's average; refine per category in C3
            return (
              <li key={s.id} className="flex flex-col rounded-riso-lg bg-canvas-card p-4 riso-border riso-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-zine text-lg font-bold">{s.name}</h2>
                    <p className="text-sm text-riso-muted">{s.category}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-riso-teal px-2 py-0.5 text-xs font-semibold text-white">● เปิดรับคิว</span>
                </div>
                <p className="mt-2 text-sm">{waiting > 0 ? `รออยู่ ${waiting} คิว (ประมาณ ${waiting * avg} นาที)` : 'ไม่มีคิวรอ'}</p>
                <Link href={`/shop/${s.branchCode}`} className="mt-4 block rounded-riso bg-riso-orange py-3 text-center font-bold text-white riso-btn">
                  กดรับคิว / จองเวลา
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
