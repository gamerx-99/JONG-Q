// Phase 6 A1 checks — province filter and the reject-reason rule on the admin approval board.
// Creates two throwaway PENDING shops, exercises both decisions, then deletes everything it made.
// Requires a dev server on :3000. Run: npx tsx scripts/check-admin-review.ts
import { createHmac } from 'crypto';
import { get, request } from 'http';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const AUTH = process.env.AUTH_SECRET!;

function sessionCookie(userId: string) {
  return `jq_session=${userId}.${createHmac('sha256', AUTH).update(userId).digest('base64url')}`;
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
function postForm(path: string, cookie: string, fields: Record<string, string>) {
  const boundary = '----jq' + Math.random().toString(16).slice(2);
  const parts: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(`--${boundary}`, `Content-Disposition: form-data; name="${k}"`, '', v);
  }
  parts.push(`--${boundary}--`, '');
  const buf = Buffer.from(parts.join('\r\n'), 'utf8');
  return new Promise<{ status: number; headers: Record<string, unknown> }>((resolve, reject) => {
    const req = request(
      { host: 'localhost', port: 3000, path, method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': buf.length } },
      (r) => { r.resume(); r.on('end', () => resolve({ status: r.statusCode ?? 0, headers: r.headers as Record<string, unknown> })); },
    );
    req.on('error', reject);
    req.write(buf);
    req.end();
  });
}

const fails: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails.push(name);
}

(async () => {
  const admin = await p.user.findFirstOrThrow({ where: { role: 'ADMIN' } });
  const base = sessionCookie(admin.id);

  // Temp PENDING shop to review, owned by a throwaway user.
  const owner = await p.user.create({ data: { name: 'tmp-owner-a1', phone: '0800000001', role: 'CUSTOMER' } });
  const mkShop = (name: string) =>
    p.shop.create({ data: { name, category: 'ร้านอาหาร/คาเฟ่', branchCode: `TMP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      address: '1 ถนนทดสอบ ตำบลทดสอบ จังหวัดแม่ฮ่องสอน', province: 'แม่ฮ่องสอน', status: 'PENDING', ownerId: owner.id } });
  const a = await mkShop('TMP ไม่อนุมัติ');
  const b = await mkShop('TMP อนุมัติ');

  const page = await fetchWith('/admin', base);
  // Array.from, not spread: tsconfig has no target (defaults to ES5) so matchAll is not iterable.
  const forms = Array.from(page.body.matchAll(/<form[\s\S]*?<\/form>/g)).map((m) => m[0]);
  const reviewForm = forms.find((f) => f.includes('name="shopId"') && f.includes('value="reject"'));
  const actionId = reviewForm?.match(/\$ACTION_ID_([a-f0-9]+)/)?.[0];
  check('found review action id', !!actionId, `${actionId?.slice(0, 24)} (${forms.length} forms)`);

  // Province filter must surface the temp shop.
  const filtered = await fetchWith('/admin?province=' + encodeURIComponent('แม่ฮ่องสอน'), base);
  check('province filter shows the temp shop', filtered.body.includes('TMP ไม่อนุมัติ'));
  const wrongProvince = await fetchWith('/admin?province=' + encodeURIComponent('กรุงเทพมหานคร'), base);
  check('province filter excludes other provinces', !wrongProvince.body.includes('TMP ไม่อนุมัติ'));
  check('province filter validated against the list', wrongProvince.body.includes('ไม่มีใบสมัครค้าง'));

  if (actionId) {
    // 1. Reject with NO reason must be refused and must not change the shop.
    const noReason = await postForm('/admin', base, { [actionId]: '', shopId: a.id, decision: 'reject' });
    check('reject without reason is refused', noReason.status === 303 && String(noReason.headers.location ?? '').includes('error=1'), `status=${noReason.status} loc=${noReason.headers.location}`);
    const stillPending = await p.shop.findUniqueOrThrow({ where: { id: a.id } });
    check('shop still PENDING after refused reject', stillPending.status === 'PENDING', stillPending.status);

    // 2. Reject WITH a reason must persist both the status and the reason.
    const withReason = await postForm('/admin', base, { [actionId]: '', shopId: a.id, decision: 'reject', reason: 'ที่อยู่ไม่อยู่ในเขตให้บริการ' });
    check('reject with reason accepted', [200,303].includes(withReason.status) && !String(withReason.headers.location ?? '').includes('error'), `status=${withReason.status}`);
    const rejected = await p.shop.findUniqueOrThrow({ where: { id: a.id } });
    check('shop is REJECTED', rejected.status === 'REJECTED', rejected.status);
    const log = await p.adminLog.findFirstOrThrow({ where: { shopId: a.id, action: 'REJECT_SHOP' }, orderBy: { createdAt: 'desc' } });
    check('reason landed in AdminLog.details', log.details === 'ที่อยู่ไม่อยู่ในเขตให้บริการ', String(log.details));

    // 3. Approve must still work in one click with no reason at all.
    const approve = await postForm('/admin', base, { [actionId]: '', shopId: b.id, decision: 'approve' });
    check('approve still works one click', [200,303].includes(approve.status) && !String(approve.headers.location ?? '').includes('error'), `status=${approve.status}`);
    const approved = await p.shop.findUniqueOrThrow({ where: { id: b.id } });
    check('shop is APPROVED', approved.status === 'APPROVED', approved.status);
    check('applicant promoted to MERCHANT', (await p.user.findUniqueOrThrow({ where: { id: owner.id } })).role === 'MERCHANT');
  }

  // Cleanup everything this test created.
  await p.adminLog.deleteMany({ where: { shopId: { in: [a.id, b.id] } } });
  await p.shop.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  await p.user.deleteMany({ where: { id: owner.id } });

  console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join('; ')}` : '\nAll A1 checks passed.');
  await p.$disconnect();
  process.exit(fails.length ? 1 : 0);
})();
