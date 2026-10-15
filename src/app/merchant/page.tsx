import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'รออนุมัติ', cls: 'bg-riso-yellow' },
  APPROVED: { label: 'อนุมัติแล้ว', cls: 'bg-riso-teal text-white' },
  REJECTED: { label: 'ไม่อนุมัติ', cls: 'bg-riso-orange text-white' },
};

export default async function MerchantHome({ searchParams }: { searchParams: { applied?: string } }) {
  const user = await requireUser();
  const shops = await prisma.shop.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: 'desc' } });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ร้านของฉัน</h1>
        <Link href="/apply" className="rounded-riso bg-white px-4 py-2 font-semibold riso-btn">+ สมัครร้านใหม่</Link>
      </div>
      {searchParams.applied && (
        <p className="mt-4 rounded-riso bg-riso-yellow/40 p-3 riso-border">ส่งใบสมัครแล้ว รอแอดมินตรวจสอบ</p>
      )}

      {shops.length === 0 ? (
        <p className="mt-8 text-riso-muted">ยังไม่มีร้าน กด “สมัครร้านใหม่” เพื่อเริ่ม</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {shops.map((s) => (
            <li key={s.id} className="rounded-riso-lg bg-canvas-card p-5 riso-border riso-shadow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-riso-muted">{s.branchCode}</div>
                  <div className="text-lg font-bold">{s.name}</div>
                  <div className="text-sm text-riso-muted">{s.category} · {s.address}</div>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold riso-border ${STATUS[s.status].cls}`}>
                  {STATUS[s.status].label}
                </span>
              </div>
              {s.status === 'APPROVED' && (
                <>
                  <Link href={`/merchant/${s.branchCode}/board`} className="mt-4 block rounded-riso bg-riso-teal py-3 text-center font-bold text-white riso-btn">
                    เปิดหน้าเรียกคิว {s.isOpen ? '' : '(ร้านปิดอยู่)'}
                  </Link>
                  <div className="mt-2 flex gap-2">
                    <Link href={`/merchant/${s.branchCode}/settings`} className="flex-1 rounded-riso bg-white py-2 text-center text-sm font-semibold riso-btn">ตั้งค่าร้าน</Link>
                    <Link href={`/merchant/${s.branchCode}/qr`} className="flex-1 rounded-riso bg-white py-2 text-center text-sm font-semibold riso-btn">ป้าย QR</Link>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
