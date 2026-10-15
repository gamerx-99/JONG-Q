import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

// Screen C2: one-time nickname + phone. [EXTENSION_POINT]: show LINE avatar/display name once LIFF is wired.
const Profile = z.object({
  name: z.string().trim().min(1).max(40),
  phone: z.string().regex(/^0\d{9}$/),
  next: z.string().startsWith('/').optional(),
});

async function saveProfile(formData: FormData) {
  'use server';
  const user = await requireUser();
  const parsed = Profile.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/profile?error=1&next=${encodeURIComponent(String(formData.get('next') || '/'))}`);
  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone } });
  redirect(parsed.data.next && !parsed.data.next.startsWith('//') ? parsed.data.next : '/');
}

export default async function ProfilePage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const user = await requireUser();
  const field = 'mt-1 w-full rounded-riso bg-white px-3 py-3 text-lg riso-border';

  return (
    <main className="mx-auto max-w-md p-4">
      <section className="mt-6 rounded-riso-xl bg-canvas-card p-6 riso-border-thick riso-shadow-lg">
        <h1 className="font-zine text-2xl font-bold">ข้อมูลสำหรับรับคิว</h1>
        <p className="mt-1 text-sm text-riso-muted">กรอกครั้งเดียว ใช้จองคิวได้ทุกร้าน</p>
        {searchParams.error && <p className="mt-3 text-sm text-riso-orange">กรุณากรอกชื่อ และเบอร์มือถือ 10 หลัก (ขึ้นต้นด้วย 0)</p>}
        <form action={saveProfile} className="mt-4 space-y-4">
          <input type="hidden" name="next" value={searchParams.next ?? '/'} />
          <label className="block">
            <span className="font-semibold">ชื่อเล่น / ชื่อเรียกหน้าร้าน</span>
            <input name="name" required maxLength={40} defaultValue={user.name} className={field} />
          </label>
          <label className="block">
            <span className="font-semibold">เบอร์มือถือ</span>
            <input name="phone" required inputMode="numeric" pattern="0[0-9]{9}" maxLength={10} defaultValue={user.phone ?? ''} className={field} />
          </label>
          <button className="w-full rounded-riso bg-riso-teal py-3 text-lg font-bold text-white riso-btn">ยืนยันข้อมูลและเริ่มจองคิว</button>
        </form>
      </section>
    </main>
  );
}
