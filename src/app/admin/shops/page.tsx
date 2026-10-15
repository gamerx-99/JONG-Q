import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { ShopStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getBangkokDate } from '@/lib/booking-window';
import { getImpersonation, isImpersonating, startImpersonation, stopImpersonation } from '@/lib/impersonation';
import ImpersonationBanner from '@/components/ImpersonationBanner';

// Screen A2: platform directory of every shop + "เข้าจัดการร้านนี้" (admin impersonation).
// The admin session is untouched; the scope lives in the signed jq_impersonate cookie.
export const dynamic = 'force-dynamic';

async function enterShop(formData: FormData) {
  'use server';
  const admin = await requireUser(['ADMIN']);
  const shopId = String(formData.get('shopId'));
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop || shop.status !== 'APPROVED') redirect('/admin/shops?error=1');

  startImpersonation(admin.id, shopId);
  await prisma.adminLog.create({ data: { adminId: admin.id, shopId, action: 'IMPERSONATE_START' } });
  revalidatePath('/admin/shops');
  redirect(`/merchant/${shop.branchCode}/board`);
}

async function exitShop() {
  'use server';
  const admin = await requireUser(['ADMIN']);
  const imp = getImpersonation();
  if (!imp) redirect('/admin/shops');

  await prisma.adminLog.create({ data: { adminId: admin.id, shopId: imp.shopId, action: 'IMPERSONATE_STOP' } });
  stopImpersonation();
  revalidatePath('/admin/shops');
  redirect('/admin/shops');
}

const STATUS_LABEL: Record<ShopStatus, string> = {
  APPROVED: 'อนุมัติแล้ว',
  PENDING: 'รออนุมัติ',
  REJECTED: 'ไม่อนุมัติ',
};

const STATUS_CHIP: Record<ShopStatus, string> = {
  APPROVED: 'bg-riso-teal text-white',
  PENDING: 'bg-riso-yellow',
  REJECTED: 'bg-riso-pink text-white',
};

const FILTERS: { value: ShopStatus | null; label: string }[] = [
  { value: null, label: 'ทั้งหมด' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
  { value: 'PENDING', label: 'รออนุมัติ' },
  { value: 'REJECTED', label: 'ไม่อนุมัติ' },
];

export default async function AdminShopsPage({ searchParams }: { searchParams: { status?: string; q?: string; error?: string } }) {
  const admin = await requireUser(['ADMIN']);
  const today = getBangkokDate(0);
  const impersonation = getImpersonation();
  const inShopMode = isImpersonating(impersonation, admin);

  const q = searchParams.q?.trim();
  const raw = searchParams.status;
  const status = raw === 'APPROVED' || raw === 'PENDING' || raw === 'REJECTED' ? raw : undefined;

  const [shops, grouped, scoped] = await Promise.all([
    prisma.shop.findMany({
      where: {
        ...(status && { status }),
        ...(q && { OR: [{ name: { contains: q, mode: 'insensitive' } }, { address: { contains: q, mode: 'insensitive' } }] }),
      },
      // One row per shop: owner for the directory, today's waiting count for the pulse column.
      include: { owner: true, _count: { select: { tickets: { where: { date: today, status: 'WAITING' } } } } },
      orderBy: { name: 'asc' },
    }),
    prisma.shop.groupBy({ by: ['status'], _count: true }),
    impersonation ? prisma.shop.findUnique({ where: { id: impersonation.shopId }, select: { name: true, branchCode: true } }) : null,
  ]);
  const total = grouped.reduce((sum, g) => sum + g._count, 0);
  const countOf = (s: ShopStatus) => grouped.find((g) => g.status === s)?._count ?? 0;

  return (
    <>
      {inShopMode && scoped && <ImpersonationBanner shopName={scoped.name} />}
      <main className="mx-auto max-w-5xl p-6 font-sans text-base">
        <Link href="/admin" className="text-sm font-semibold">‹ หน้าอนุมัติร้าน</Link>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">แอดมิน: ร้านทั้งหมด</h1>
            <p className="text-sm text-riso-muted">ทั้งระบบ {total} ร้าน · เข้าจัดการแทนร้านได้เฉพาะร้านที่อนุมัติแล้ว ({today})</p>
          </div>
        </header>

        {/* The banner only links back here, so the cookie is cleared by this explicit exit button. */}
        {inShopMode && scoped && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-riso-lg bg-canvas-card p-4 riso-border">
            <p className="text-sm">
              โหมดแอดมิน: <span className="font-bold">{scoped.name}</span> ({scoped.branchCode}) — ทุกการกระทำบันทึกลงประวัติของแอดมิน ไม่ใช่ของร้าน
            </p>
            <form action={exitShop}>
              <button className="rounded-riso bg-riso-indigo px-4 py-2 font-semibold text-white riso-btn">ออกจากโหมดร้าน</button>
            </form>
          </div>
        )}

        {searchParams.error && (
          <p className="mt-4 rounded-riso bg-riso-pink p-3 font-semibold text-white riso-border">
            เข้าจัดการร้านนี้ไม่ได้ ร้านอาจถูกลบหรือยังไม่ได้รับอนุมัติ
          </p>
        )}

        <form className="mt-6 flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1">
            <span className="text-xs text-riso-muted">ค้นหาชื่อร้านหรือที่อยู่</span>
            <input name="q" defaultValue={q} placeholder="เช่น ร้านกาแฟ, ถนน…" className="w-full rounded-riso bg-white px-4 py-3 riso-border" />
          </label>
          {status && <input type="hidden" name="status" value={status} />}
          <button className="rounded-riso bg-riso-orange px-5 py-3 font-bold text-white riso-btn">ค้นหา</button>
          {(q || status) && (
            <Link href="/admin/shops" className="rounded-riso bg-white px-4 py-3 font-semibold riso-btn">ล้างตัวกรอง</Link>
          )}
        </form>

        <nav className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const on = f.value === null ? !status : status === f.value;
            const href = { pathname: '/admin/shops', query: { ...(q && { q }), ...(f.value && { status: f.value }) } };
            const n = f.value ? countOf(f.value) : total;
            return (
              <Link key={f.label} href={href} className={`rounded-full px-4 py-2 font-semibold riso-border ${on ? 'bg-riso-indigo text-white' : 'bg-white'}`}>
                {f.label} ({n})
              </Link>
            );
          })}
        </nav>

        {shops.length === 0 ? (
          <p className="mt-10 text-center text-riso-muted">ไม่พบร้าน{q || status ? 'ตามที่ค้นหา' : 'ในระบบ'}</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-riso-lg bg-canvas-card riso-border riso-shadow">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-canvas-muted">
                  <th className="p-3 text-left font-bold">รหัสร้าน</th>
                  <th className="p-3 text-left font-bold">ชื่อร้าน / หมวด</th>
                  <th className="p-3 text-left font-bold">ที่อยู่</th>
                  <th className="p-3 text-left font-bold">สถานะ</th>
                  <th className="p-3 text-left font-bold">เปิดรับคิว</th>
                  <th className="p-3 text-right font-bold">คิวรอวันนี้</th>
                  <th className="p-3 text-right font-bold">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((s) => {
                  const here = inShopMode && impersonation?.shopId === s.id;
                  return (
                    <tr key={s.id} className={`border-t border-riso-indigo/20 align-middle ${here ? 'bg-riso-yellow/40' : ''}`}>
                      <td className="p-3 font-mono font-bold whitespace-nowrap">{s.branchCode}</td>
                      <td className="p-3">
                        <div className="font-bold">{s.name}</div>
                        <div className="text-riso-muted">{s.category}</div>
                        <div className="text-xs text-riso-muted">เจ้าของ: {s.owner.name}</div>
                      </td>
                      <td className="p-3">
                        {s.address}
                        {s.landmark ? <div className="text-xs text-riso-muted">จุดสังเกต: {s.landmark}</div> : null}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${STATUS_CHIP[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {s.status === 'APPROVED' ? (
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.isOpen ? 'bg-riso-teal text-white' : 'bg-canvas-muted'}`}>
                            {s.isOpen ? '● เปิด' : '○ ปิดร้าน'}
                          </span>
                        ) : (
                          <span className="text-riso-muted">–</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-mono text-xl font-bold ${s._count.tickets > 0 ? 'text-riso-orange' : 'text-riso-muted'}`}>
                          {s._count.tickets}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {s.status === 'APPROVED' ? (
                          <form action={enterShop} className="inline-block">
                            <input type="hidden" name="shopId" value={s.id} />
                            <button className="whitespace-nowrap rounded-riso bg-riso-orange px-4 py-2 font-bold text-white riso-btn">เข้าจัดการร้านนี้</button>
                          </form>
                        ) : (
                          <span className="text-xs text-riso-muted">รออนุมัติก่อน</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}