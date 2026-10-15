// Phase 6 A2 checks — impersonation WRITE path: tampered cookies are inert, and the real
// enterShop action sets a signed httpOnly cookie and records IMPERSONATE_START against the admin.
// Requires a dev server on :3000. Run: npx tsx scripts/check-impersonation-actions.ts
import { createHmac } from 'crypto';
import { get, request } from 'http';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const AUTH = process.env.AUTH_SECRET!;

function sessionCookie(userId: string) {
  return `jq_session=${userId}.${createHmac('sha256', AUTH).update(userId).digest('base64url')}`;
}
function imp(adminId: string, shopId: string, tamper = false) {
  const payload = `${adminId}.${shopId}`;
  const mac = createHmac('sha256', AUTH).update(tamper ? 'x' : payload).digest('base64url');
  return `jq_impersonate=${payload}.${mac}`;
}
function fetchWith(path: string, cookie: string) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    get({ host: 'localhost', port: 3000, path, headers: { Cookie: cookie } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
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
  const shop = await p.shop.findFirstOrThrow({ where: { status: 'APPROVED' } });
  const base = sessionCookie(admin.id);
  const page = await fetchWith('/admin/shops', base);

  // --- Garbage / tampered cookies must be inert, not crash, not show the banner ---
  for (const [label, cookie] of [
    ['garbage cookie', `${base}; jq_impersonate=not-a-valid-impersonation-value`],
    ['empty parts', `${base}; jq_impersonate=..`],
    ['wrong HMAC', `${base}; ${imp(admin.id, shop.id, true)}`],
    ['shopId swapped, old HMAC', `${base}; jq_impersonate=${admin.id}.other-shop.${createHmac('sha256', AUTH).update(`${admin.id}.${shop.id}`).digest('base64url')}`],
  ] as const) {
    const r = await fetchWith(`/merchant/${shop.branchCode}/board`, cookie);
    check(`rejects ${label}`, r.status === 200 && !r.body.includes('คุณกำลังจัดการแทนร้าน'), `status=${r.status}`);
  }

  // --- The real enterShop action: POST it and confirm the cookie + audit row ---
  // Scope the extraction to each <form>...</form> block so we cannot pick up exitShop's id.
  // Array.from, not spread: tsconfig has no target (defaults to ES5) so matchAll is not iterable.
  const formBlocks = Array.from(page.body.matchAll(/<form[\s\S]*?<\/form>/g)).map((m) => m[0]);
  const enterForm = formBlocks.find((f) => f.includes('name="shopId"') && f.includes('เข้าจัดการร้านนี้'));
  const actionId = enterForm?.match(/\$ACTION_ID_([a-f0-9]+)/)?.[0];
  check('found enterShop action id', !!actionId, `${actionId?.slice(0, 24)} (${formBlocks.length} forms on page)`);

  if (actionId) {
    const before = await p.adminLog.count({ where: { shopId: shop.id, action: 'IMPERSONATE_START' } });
    const boundary = '----jq' + Math.random().toString(16).slice(2);
    const fields: Record<string, string> = { [actionId]: '', shopId: shop.id };
    const parts: string[] = [];
    for (const [k, v] of Object.entries(fields)) {
      parts.push(`--${boundary}`, `Content-Disposition: form-data; name="${k}"`, '', v);
    }
    parts.push(`--${boundary}--`, '');
    const buf = Buffer.from(parts.join('\r\n'), 'utf8');

    const res = await new Promise<{ status: number; headers: Record<string, unknown> }>((resolve, reject) => {
      const req = request(
        { host: 'localhost', port: 3000, path: '/admin/shops', method: 'POST',
          headers: { Cookie: base, 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': buf.length } },
        (r) => { r.resume(); r.on('end', () => resolve({ status: r.statusCode ?? 0, headers: r.headers as Record<string, unknown> })); },
      );
      req.on('error', reject);
      req.write(buf);
      req.end();
    });

    check('enterShop redirects to the shop board', res.status === 303 && String(res.headers.location ?? '').includes(`/merchant/${shop.branchCode}/board`), `status=${res.status} loc=${res.headers.location}`);
    const setCookie = String(res.headers['set-cookie'] ?? '');
    check('enterShop sets the signed jq_impersonate cookie', setCookie.includes('jq_impersonate='), setCookie.slice(0, 60));
    check('impersonation cookie is httpOnly', /HttpOnly/i.test(setCookie));

    const after = await p.adminLog.count({ where: { shopId: shop.id, action: 'IMPERSONATE_START' } });
    check('enterShop wrote IMPERSONATE_START', after === before + 1, `${before} -> ${after}`);
    const row = await p.adminLog.findFirstOrThrow({ where: { shopId: shop.id, action: 'IMPERSONATE_START' }, orderBy: { createdAt: 'desc' } });
    check('audit row records the ADMIN, not the merchant', row.adminId === admin.id);

    // Clean up the audit row this test created.
    await p.adminLog.deleteMany({ where: { shopId: shop.id, action: 'IMPERSONATE_START' } });
  }

  console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join('; ')}` : '\nAll tamper + enterShop checks passed.');
  await p.$disconnect();
  process.exit(fails.length ? 1 : 0);
})();
