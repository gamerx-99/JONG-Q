import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { clearSession, getSessionUser, setSession } from '@/lib/session';

// Development-only sign-in until LINE Login exists. Disabled in production unless DEV_LOGIN=true.
const enabled = process.env.NODE_ENV !== 'production' || process.env.DEV_LOGIN === 'true';

async function loginAs(formData: FormData) {
  'use server';
  if (!enabled) notFound();
  const user = await prisma.user.findUnique({ where: { id: String(formData.get('userId')) } });
  if (!user) return;
  setSession(user.id);
  redirect(user.role === 'ADMIN' ? '/admin' : user.role === 'MERCHANT' ? '/merchant' : '/');
}

async function logout() {
  'use server';
  clearSession();
  redirect('/dev-login');
}

export default async function DevLoginPage() {
  if (!enabled) notFound();
  const [users, me] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ role: 'asc' }, { createdAt: 'asc' }] }),
    getSessionUser(),
  ]);

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">เข้าสู่ระบบ (โหมดทดสอบ)</h1>
      <p className="mt-1 text-sm text-riso-muted">
        ใช้แทน LINE Login ชั่วคราว เลือกผู้ใช้จากข้อมูลตัวอย่าง
      </p>

      {me && (
        <form action={logout} className="mt-4 flex items-center justify-between rounded-riso bg-canvas-card p-3 riso-border">
          <span className="text-sm">ตอนนี้: <b>{me.name}</b> ({me.role})</span>
          <button className="rounded-riso bg-white px-3 py-1 text-sm riso-btn">ออกจากระบบ</button>
        </form>
      )}

      <ul className="mt-6 space-y-3">
        {users.map((u) => (
          <li key={u.id}>
            <form action={loginAs} className="flex items-center justify-between rounded-riso bg-canvas-card p-4 riso-border riso-shadow">
              <input type="hidden" name="userId" value={u.id} />
              <div>
                <div className="font-semibold">{u.name}</div>
                <div className="font-mono text-xs text-riso-muted">{u.role}</div>
              </div>
              <button className="rounded-riso bg-riso-orange px-4 py-2 font-semibold text-white riso-btn">
                เข้าใช้
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
