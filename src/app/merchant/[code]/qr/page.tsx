import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { canAccessShop, getImpersonation, isImpersonating } from '@/lib/impersonation';
import PrintButton from '@/components/PrintButton';
import ImpersonationBanner from '@/components/ImpersonationBanner';

// Screen M4 Section 3: print-ready QR standee (A4/A5). The QR points to the shop page
// where a customer can walk-in or book a 2-day slot — no LINE app download needed.
export const dynamic = 'force-dynamic';

async function loadShop(code: string) {
  const user = await requireUser(['MERCHANT', 'ADMIN']);
  const shop = await prisma.shop.findUnique({ where: { branchCode: code } });
  if (!shop || shop.status !== 'APPROVED') notFound();
  const impersonation = getImpersonation();
  if (!canAccessShop(user, shop, impersonation)) redirect('/merchant');
  return { user, shop, impersonation };
}

function Standee({ name, code, qr }: { name: string; code: string; qr: string }) {
  return (
    <div className="flex min-h-[210mm] flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="font-mono text-xs uppercase tracking-widest">Jong-Q จองคิว</div>
      <h1 className="font-zine text-4xl font-bold leading-tight">{name}</h1>
      <img src={qr} alt={`QR code ของร้าน ${name}`} className="h-48 w-48 riso-border" />
      <div className="font-mono text-[10px] text-riso-muted">{code}</div>
      <p className="text-sm font-semibold">สแกนเพื่อรับคิว / จองคิวผ่าน LINE ได้ทันที</p>
      <p className="text-xs text-riso-muted">ไม่ต้องโหลดแอป ไม่ต้องยืนรอที่หน้าร้าน</p>
    </div>
  );
}

export default async function QRPage({ params }: { params: { code: string } }) {
  const { user, shop, impersonation } = await loadShop(params.code);
  const adminMode = isImpersonating(impersonation, user);
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_APP_URL is not set — set it to your production URL before printing QR standees');
    }
  }
  const qrUrl = `${base ?? 'http://localhost:3000'}/shop/${shop.branchCode}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    margin: 1,
    width: 480,
    color: { dark: '#162032', light: '#FFFFFF' },
  });

  return (
    <>
      {adminMode && <ImpersonationBanner shopName={shop.name} />}
      {/* On-screen controls (hidden when printing) */}
      <main className="mx-auto max-w-2xl p-4 text-base print:hidden">
        <Link href={`/merchant/${shop.branchCode}/settings`} className="text-sm font-semibold">‹ กลับไปตั้งค่า</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">ป้าย QR หน้าร้าน</h1>
            <p className="text-sm text-riso-muted">กดพิมพ์ แล้วเลือกขนาดกระดาษ A4 หรือ A5 ในหน้าต่างพิมพ์</p>
          </div>
          <PrintButton>
            <span className="inline-block rounded-riso bg-riso-orange px-5 py-3 font-bold text-white riso-btn">พิมพ์ป้าย 🖨</span>
          </PrintButton>
        </div>

        <div className="mt-6 overflow-x-auto rounded-riso bg-canvas-card p-3 riso-border">
          <div className="mx-auto w-[148mm] rounded-[4mm] riso-border-thick shadow-[0_0_0_1px_rgba(22,32,50,0.15)]">
            <Standee name={shop.name} code={shop.branchCode} qr={qrDataUrl} />
          </div>
          <p className="mt-2 text-center text-xs text-riso-muted">ตัวอย่างสัดส่วน A5 (148×210 มม.)</p>
        </div>
      </main>

      {/* Print sheet only */}
      <div className="hidden print:block">
        <Standee name={shop.name} code={shop.branchCode} qr={qrDataUrl} />
      </div>
    </>
  );
}
