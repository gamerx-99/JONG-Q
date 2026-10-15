import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { THAI_PROVINCES } from '@/lib/thai-provinces';

// Screen A1: admin shop approval board — pending list, province filter, reject reason.
export const dynamic = 'force-dynamic';

const RejectReason = z.object({ reason: z.string().trim().min(1, 'ต้องระบุเหตุผล').max(300) });

async function review(formData: FormData) {
  'use server';
  const admin = await requireUser(['ADMIN']);
  const shopId = String(formData.get('shopId'));
  const approve = formData.get('decision') === 'approve';
  const province = String(formData.get('province') ?? '');

  // Keep the admin's filter selection when the reason field is rejected.
  let reason: string | undefined;
  if (!approve) {
    const parsed = RejectReason.safeParse({ reason: formData.get('reason') });
    if (!parsed.success) redirect(`/admin?${province ? `province=${encodeURIComponent(province)}&` : ''}error=1`);
    reason = parsed.data.reason;
  }

  await prisma.$transaction(async (tx) => {
    const shop = await tx.shop.update({
      where: { id: shopId, status: 'PENDING' },
      data: { status: approve ? 'APPROVED' : 'REJECTED' },
    });
    if (approve) {
      // Customers who applied become merchants; admins keep their role.
      await tx.user.updateMany({ where: { id: shop.ownerId, role: 'CUSTOMER' }, data: { role: 'MERCHANT' } });
    }
    await tx.adminLog.create({
      data: {
        adminId: admin.id,
        shopId,
        action: approve ? 'APPROVE_SHOP' : 'REJECT_SHOP',
        details: reason,
      },
    });
  });
  revalidatePath('/admin');
}

export default async function AdminPage({ searchParams }: { searchParams: { province?: string; error?: string } }) {
  await requireUser(['ADMIN']);
  const raw = searchParams.province?.trim();
  const province = raw && (THAI_PROVINCES as readonly string[]).includes(raw) ? raw : undefined;
  const provinceFilter = province ? { province } : {};

  const [pending, counts] = await Promise.all([
    prisma.shop.findMany({
      where: { status: 'PENDING', ...provinceFilter },
      include: { owner: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.shop.groupBy({ by: ['status'], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const field = 'mt-1 w-full rounded-riso bg-white px-3 py-2 riso-border';

  return (
    <main className="mx-auto max-w-4xl p-6 font-sans text-base">
      <h1 className="text-2xl font-bold">แอดมิน: อนุมัติร้านค้า</h1>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[['รออนุมัติ', 'PENDING'], ['อนุมัติแล้ว', 'APPROVED'], ['ไม่อนุมัติ', 'REJECTED']].map(([label, s]) => (
          <div key={s} className="rounded-riso bg-canvas-card p-3 riso-border riso-shadow-sm">
            <div className="text-3xl font-bold">{count(s)}</div>
            <div className="text-sm text-riso-muted">{label}</div>
          </div>
        ))}
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1">
          <span className="text-xs text-riso-muted">กรองตามจังหวัด</span>
          <select name="province" defaultValue={province ?? ''} className={field}>
            <option value="">ทั้งหมด</option>
            {THAI_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <button className="rounded-riso bg-riso-orange px-5 py-3 font-bold text-white riso-btn">กรอง</button>
        {province && <Link href="/admin" className="rounded-riso bg-white px-4 py-3 font-semibold riso-btn">ล้างตัวกรอง</Link>}
      </form>

      {searchParams.error && (
        <p className="mt-4 rounded-riso bg-riso-orange/10 p-3 text-sm text-riso-orange riso-border">
          ไม่อนุมัติต้องระบุเหตุผล (ไม่เกิน 300 ตัวอักษร) ลองอีกครั้ง
        </p>
      )}

      <h2 className="mt-8 text-lg font-bold">ใบสมัครที่รอตรวจ</h2>
      {pending.length === 0 ? (
        <p className="mt-3 text-riso-muted">ไม่มีใบสมัครค้าง{province ? ` ในจังหวัด${province}` : ''}</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {pending.map((s) => (
            <li key={s.id} className="rounded-riso-lg bg-canvas-card p-5 riso-border riso-shadow">
              <div className="font-mono text-xs text-riso-muted">{s.branchCode}</div>
              <div className="text-lg font-bold">{s.name}</div>
              <div className="text-sm">{s.category} · {s.address}{s.landmark ? ` (${s.landmark})` : ''}</div>
              <div className="text-sm">จังหวัด: {s.province ?? 'ไม่ระบุ'}</div>
              <div className="mt-1 text-sm text-riso-muted">ผู้สมัคร: {s.owner.name} {s.owner.phone ?? ''}</div>
              <form action={review} className="mt-4">
                <input type="hidden" name="shopId" value={s.id} />
                {province && <input type="hidden" name="province" value={province} />}
                <div className="flex flex-wrap gap-3">
                  <button name="decision" value="approve" className="rounded-riso bg-riso-teal px-4 py-2 font-semibold text-white riso-btn">อนุมัติ</button>
                  <button name="decision" value="reject" className="rounded-riso bg-white px-4 py-2 font-semibold riso-btn">ไม่อนุมัติ</button>
                </div>
                {/* Server component cannot hide a field without client JS; a disclosure keeps approve one click. */}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-riso-muted">ระบุเหตุผลที่ไม่อนุมัติ (บันทึกลงประวัติ)</summary>
                  <textarea
                    name="reason"
                    rows={2}
                    maxLength={300}
                    placeholder="เช่น ที่อยู่ไม่ชัดเจน ต้องส่งรูปหน้าร้านเพิ่ม"
                    className={`${field} mt-2`}
                  />
                </details>
              </form>
            </li>
          ))}
        </ul>
      )}

      <Link href="/admin/shops" className="mt-8 inline-block rounded-riso bg-riso-indigo px-4 py-3 font-semibold text-white riso-btn">
        ดูรายชื่อร้านทั้งหมด →
      </Link>
    </main>
  );
}