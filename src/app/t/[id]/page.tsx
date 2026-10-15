import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AutoRefresh from '@/components/AutoRefresh';

// Screen C4: live ticket. Linked from the LINE booking confirmation; the cuid in the URL is the access key.
// ponytail: polls every 15 s (AutoRefresh) instead of SSE; switch to SSE if shops need instant updates.
export const dynamic = 'force-dynamic';

const STATUS: Record<string, { label: string; cls: string }> = {
  WAITING: { label: 'กำลังรอคิว', cls: 'bg-white' },
  CALLED: { label: 'ถึงคิวของคุณแล้ว! กรุณาติดต่อหน้าร้าน', cls: 'bg-riso-orange text-white animate-pulse' },
  SERVING: { label: 'กำลังรับบริการ', cls: 'bg-riso-teal text-white' },
  COMPLETED: { label: 'เสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ', cls: 'bg-canvas-muted' },
  SKIPPED: { label: 'ข้ามคิว กรุณาติดต่อหน้าร้าน', cls: 'bg-riso-yellow' },
  CANCELLED: { label: 'ยกเลิกแล้ว', cls: 'bg-canvas-muted line-through' },
};

export default async function TicketPage({ params }: { params: { id: string } }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: { shop: true, category: true, timeSlot: true },
  });
  if (!ticket) notFound();

  const sameDay = { shopId: ticket.shopId, date: ticket.date };
  const [ahead, nowServing] = await Promise.all([
    ticket.status === 'WAITING'
      ? prisma.ticket.count({ where: { ...sameDay, categoryId: ticket.categoryId, status: 'WAITING', createdAt: { lt: ticket.createdAt } } })
      : Promise.resolve(0),
    prisma.ticket.findFirst({
      where: { ...sameDay, status: { in: ['CALLED', 'SERVING'] } },
      orderBy: { calledAt: 'desc' },
    }),
  ]);
  const s = STATUS[ticket.status];
  const live = ['WAITING', 'CALLED', 'SERVING'].includes(ticket.status);

  return (
    <main className="mx-auto max-w-md p-4">
      {live && <AutoRefresh seconds={15} />}
      <header className="mb-4">
        <h1 className="font-zine text-2xl font-bold">{ticket.shop.name}</h1>
        <p className="text-sm text-riso-muted">บัตรคิววันที่ {ticket.date}</p>
      </header>

      <section className="rounded-riso-xl bg-canvas-card p-6 text-center riso-border-thick riso-shadow-lg">
        <div className="text-sm text-riso-muted">คิวของคุณ</div>
        <div className="font-mono text-7xl font-bold text-riso-orange">{ticket.ticketNumber}</div>
        <div className="mt-1">{ticket.category.name}</div>
        {ticket.timeSlot && <div className="text-sm text-riso-muted">รอบ {ticket.timeSlot.startTime}–{ticket.timeSlot.endTime}</div>}
        <div className={`mt-4 rounded-riso px-3 py-2 font-bold riso-border ${s.cls}`}>{s.label}</div>
      </section>

      {live && (
        <section className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-riso bg-canvas-card p-3 riso-border riso-shadow-sm">
            <div className="text-3xl font-bold">{ahead}</div>
            <div className="text-sm text-riso-muted">คิวข้างหน้า</div>
          </div>
          <div className="rounded-riso bg-canvas-card p-3 riso-border riso-shadow-sm">
            <div className="font-mono text-3xl font-bold">{nowServing?.ticketNumber ?? '–'}</div>
            <div className="text-sm text-riso-muted">กำลังเรียก</div>
          </div>
        </section>
      )}

      {live && <p className="mt-4 text-center text-xs text-riso-muted">หน้านี้อัปเดตเองทุก 15 วินาที</p>}
      {/* [EXTENSION_POINT]: copy-link button, sound alert on CALLED, cancel ticket (Phase 4). */}
    </main>
  );
}
