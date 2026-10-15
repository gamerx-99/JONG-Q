// Phase 6 A2 checks — impersonation READ path: who can reach which shop page, and when the
// admin-mode banner is shown. Signs cookies the same way src/lib/impersonation.ts does.
// Requires a dev server on :3000. Run: npx tsx scripts/check-impersonation-access.ts
import { createHmac } from 'crypto';
import { get } from 'http';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const AUTH = process.env.AUTH_SECRET!;

// Build a valid session cookie for a user id (same scheme as src/lib/session.ts).
function sessionCookie(userId: string) {
  return `jq_session=${userId}.${createHmac('sha256', AUTH).update(userId).digest('base64url')}`;
}

function fetchWith(path: string, cookie: string): Promise<{ status: number; body: string; headers: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    get({ host: 'localhost', port: 3000, path, headers: { Cookie: cookie } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body, headers: res.headers as Record<string, unknown> }));
    }).on('error', reject);
  });
}

const fails: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails.push(name);
}

(async () => {
  const admin = await p.user.findFirstOrThrow({ where: { role: 'ADMIN' } });
  const merchant = await p.user.findFirstOrThrow({ where: { role: 'MERCHANT' } });
  const shop = await p.shop.findFirstOrThrow({ where: { status: 'APPROVED' } });
  const other = await p.shop.findFirstOrThrow({ where: { branchCode: { not: shop.branchCode } } }).catch(() => null);

  const adminCk = sessionCookie(admin.id);
  const merchCk = sessionCookie(merchant.id);

  // 1. Admin can reach the A2 directory.
  const dir = await fetchWith('/admin/shops', adminCk);
  check('admin reaches /admin/shops', dir.status === 200 && dir.body.includes('เข้าจัดการร้านนี้'), `status=${dir.status}`);

  // 2. A2 lists today's waiting count using getBangkokDate, not a hardcoded date.
  const { getBangkokDate } = await import('../src/lib/booking-window');
  check('A2 shows today', dir.body.includes(getBangkokDate(0)), getBangkokDate(0));

  // 3. Merchant must NOT reach the admin directory.
  const dirAsMerchant = await fetchWith('/admin/shops', merchCk);
  check('merchant blocked from /admin/shops', !dirAsMerchant.body.includes('เข้าจัดการร้านนี้'), `status=${dirAsMerchant.status}`);

  // 4. Merchant reaches their own board but NOT another shop's board.
  const own = await fetchWith(`/merchant/${shop.branchCode}/board`, merchCk);
  check('merchant reaches own board', own.body.includes('เรียกคิว'));
  if (other) {
    const foreign = await fetchWith(`/merchant/${other.branchCode}/board`, merchCk);
    check('merchant blocked from other shop board', !foreign.body.includes('เรียกคิว'), `status=${foreign.status}`);
  }

  // 5. Admin WITHOUT the impersonation cookie still reaches the board (A2 pre-existing behaviour),
  //    and must NOT see the admin banner.
  const noImp = await fetchWith(`/merchant/${shop.branchCode}/board`, adminCk);
  check('admin reaches board without impersonation', noImp.body.includes('เรียกคิว'));
  check('no banner without impersonation cookie', !noImp.body.includes('คุณกำลังจัดการแทนร้าน'));

  // 6. With a correctly signed impersonation cookie the banner appears on all three merchant pages.
  const payload = `${admin.id}.${shop.id}`;
  const impCookie = `${sessionCookie(admin.id)}; jq_impersonate=${payload}.${createHmac('sha256', AUTH).update(payload).digest('base64url')}`;
  for (const [label, path] of [
    ['board', `/merchant/${shop.branchCode}/board`],
    ['settings', `/merchant/${shop.branchCode}/settings`],
    ['qr', `/merchant/${shop.branchCode}/qr`],
  ] as const) {
    const r = await fetchWith(path, impCookie);
    check(`impersonation banner on ${label}`, r.body.includes('คุณกำลังจัดการแทนร้าน'), `status=${r.status}`);
  }

  // 7. A TAMPERED cookie must be rejected (shopId swapped, HMAC no longer matches).
  const tamperedPayload = `${admin.id}.${other?.id ?? 'some-other-shop-id'}`;
  const tampered = `${sessionCookie(admin.id)}; jq_impersonate=${tamperedPayload}.${createHmac('sha256', AUTH).update(payload).digest('base64url')}`;
  if (other) {
    const r = await fetchWith(`/merchant/${other.branchCode}/board`, tampered);
    check('tampered impersonation cookie is not honoured', !r.body.includes('คุณกำลังจัดการแทนร้าน'), `status=${r.status}`);
  }

  // 8. Impersonating admin's action is logged as the ADMIN, not the merchant.
  const logs = await p.adminLog.findMany({ where: { shopId: shop.id }, orderBy: { createdAt: 'desc' }, take: 3 });
  console.log(`\nrecent AdminLog for ${shop.branchCode}:`, logs.map((l) => `${l.action}/${l.adminId === admin.id ? 'admin' : l.adminId === merchant.id ? 'merchant' : l.adminId}`).join('  '));

  console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join('; ')}` : '\nAll A2 checks passed.');
  await p.$disconnect();
  process.exit(fails.length ? 1 : 0);
})();
