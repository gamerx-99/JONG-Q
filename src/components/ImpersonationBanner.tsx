import Link from 'next/link';

/**
 * Full-bleed warning bar for the admin "Manage as Shop" scope (A2). Rendered outside the
 * merchant page's max-w-* container so it spans the viewport, and sticky so it stays visible
 * while the admin works inside the shop.
 */
export default function ImpersonationBanner({ shopName }: { shopName: string }) {
  return (
    <div className="sticky top-0 z-50 w-full bg-riso-indigo px-4 py-3 font-bold text-white riso-border riso-shadow print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-base">คุณกำลังจัดการแทนร้าน {shopName}</span>
        <Link
          href="/admin/shops"
          className="min-h-12 rounded-full bg-riso-yellow px-5 py-3 text-sm font-bold text-riso-indigo riso-btn"
        >
          กดเพื่อกลับหน้าแอดมิน
        </Link>
      </div>
    </div>
  );
}