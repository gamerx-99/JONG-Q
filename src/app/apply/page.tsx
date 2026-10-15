import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { THAI_PROVINCES } from '@/lib/thai-provinces';

const CATEGORIES = ['ตัดผม/เสริมสวย', 'ร้านอาหาร/คาเฟ่', 'คลินิก/สุขภาพ', 'สปา/นวด', 'บริการอื่นๆ'];

const ShopInput = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  province: z.enum(THAI_PROVINCES),
  address: z.string().trim().min(5).max(300),
  landmark: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(20).optional(),
});

async function applyShop(formData: FormData) {
  'use server';
  const user = await requireUser();
  const parsed = ShopInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect('/apply?error=1');
  const { phone, landmark, ...shop } = parsed.data;

  // ponytail: branch code from row count; switch to a DB sequence if shops are ever deleted.
  const count = await prisma.shop.count();
  await prisma.shop.create({
    data: {
      ...shop,
      landmark: landmark || null,
      branchCode: `MHS-${String(count + 1).padStart(2, '0')}`,
      status: 'PENDING',
      ownerId: user.id,
    },
  });
  if (phone && !user.phone) await prisma.user.update({ where: { id: user.id }, data: { phone } });
  redirect('/merchant?applied=1');
}

export default async function ApplyPage({ searchParams }: { searchParams: { error?: string } }) {
  await requireUser();
  const field = 'mt-1 w-full rounded-riso bg-white px-3 py-2 riso-border';

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">สมัครเปิดร้านบน Jong-Q</h1>
      <p className="mt-1 text-sm text-riso-muted">ส่งข้อมูลแล้วรอแอดมินอนุมัติ (สถานะ PENDING)</p>
      {searchParams.error && (
        <p className="mt-4 rounded-riso bg-riso-orange/10 p-3 text-sm text-riso-orange riso-border">
          กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง ลองอีกครั้ง
        </p>
      )}

      <form action={applyShop} className="mt-6 space-y-4 rounded-riso-lg bg-canvas-card p-5 riso-border riso-shadow">
        <label className="block">
          <span className="font-semibold">ชื่อร้าน *</span>
          <input name="name" required minLength={2} maxLength={80} className={field} />
        </label>
        <label className="block">
          <span className="font-semibold">ประเภทร้าน *</span>
          <select name="category" required className={field}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="font-semibold">จังหวัด *</span>
          <select name="province" required className={field}>
            {THAI_PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="font-semibold">ที่อยู่ร้าน *</span>
          <textarea name="address" required minLength={5} rows={2} className={field} />
        </label>
        <label className="block">
          <span className="font-semibold">จุดสังเกต</span>
          <input name="landmark" placeholder="เช่น ตรงข้ามวัดจองคำ" className={field} />
        </label>
        <label className="block">
          <span className="font-semibold">เบอร์ติดต่อ</span>
          <input name="phone" inputMode="tel" className={field} />
        </label>
        <button className="w-full rounded-riso bg-riso-orange py-3 text-lg font-bold text-white riso-btn">
          ส่งใบสมัคร
        </button>
      </form>
    </main>
  );
}
