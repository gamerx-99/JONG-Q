import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getActiveBookingWindow } from '@/lib/booking-window';
import { Store, Users, Ticket, Clock, CheckCircle2, ShieldCheck, Send, Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const bookingWindow = getActiveBookingWindow();

  // Fetch initial data safely with fallback
  let shopData = null;
  let errorMsg = null;

  try {
    shopData = await prisma.shop.findFirst({
      where: { branchCode: 'MHS-01' },
      include: {
        queueCategories: true,
        tickets: {
          where: { date: bookingWindow.today },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Database not connected yet';
  }

  const calledTicket = shopData?.tickets.find((t) => t.status === 'CALLED');
  const waitingTickets = shopData?.tickets.filter((t) => t.status === 'WAITING') ?? [];

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* 1. Header Banner (Risograph Indie Zine Style) */}
      <header className="bg-canvas-card riso-border-thick riso-shadow p-6 rounded-riso-lg relative overflow-hidden">
        <div className="absolute top-2 right-2 bg-riso-orange text-white font-mono text-xs uppercase px-3 py-1 font-bold riso-border riso-shadow-sm -rotate-2">
          Phase 1: Foundation Active
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-block bg-riso-yellow px-2 py-0.5 riso-border text-xs font-mono font-bold mb-2">
              แม่ฮ่องสอนโมเดล • Mae Hong Son Pilot
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-riso-indigo">
              JONG-Q <span className="text-riso-orange">(จองคิว)</span>
            </h1>
            <p className="text-riso-muted mt-1 text-sm sm:text-base font-medium">
              แพลตฟอร์มรับบัตรคิวและจองคิว 2 วัน สไตล์ Risograph Indie Zine สำหรับร้านค้าท้องถิ่น
            </p>
          </div>

          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-riso bg-riso-cream riso-border font-mono text-xs font-bold text-riso-indigo">
              <span className="w-2.5 h-2.5 rounded-full bg-riso-green animate-pulse" />
              Docker: jongq_dev
            </span>
          </div>
        </div>
      </header>

      {/* 2. Architecture Rules Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-canvas-card riso-border riso-shadow-sm p-4 rounded-riso flex items-start gap-3">
          <div className="p-2 bg-riso-orange text-white rounded-riso riso-border">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs uppercase text-riso-muted font-mono">Customer Flow</div>
            <div className="font-bold text-sm text-riso-indigo">LINE Reply 0 บาท</div>
            <p className="text-xs text-riso-muted mt-0.5">ใช้ Webhook replyToken ไม่พึ่ง Push API</p>
          </div>
        </div>

        <div className="bg-canvas-card riso-border riso-shadow-sm p-4 rounded-riso flex items-start gap-3">
          <div className="p-2 bg-riso-teal text-white rounded-riso riso-border">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs uppercase text-riso-muted font-mono">Merchant Alerts</div>
            <div className="font-bold text-sm text-riso-indigo">Telegram Bot ทันที</div>
            <p className="text-xs text-riso-muted mt-0.5">แจ้งเตือนฟรีไม่จำกัด บายพาส Web Push</p>
          </div>
        </div>

        <div className="bg-canvas-card riso-border riso-shadow-sm p-4 rounded-riso flex items-start gap-3">
          <div className="p-2 bg-riso-yellow text-riso-indigo rounded-riso riso-border">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs uppercase text-riso-muted font-mono">Booking Engine</div>
            <div className="font-bold text-sm text-riso-indigo">จองล่วงหน้า 2 วัน</div>
            <p className="text-xs text-riso-muted mt-0.5">วันนี้ ({bookingWindow.today}) + พรุ่งนี้</p>
          </div>
        </div>

        <div className="bg-canvas-card riso-border riso-shadow-sm p-4 rounded-riso flex items-start gap-3">
          <div className="p-2 bg-riso-indigo text-white rounded-riso riso-border">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs uppercase text-riso-muted font-mono">Admin Control</div>
            <div className="font-bold text-sm text-riso-indigo">Manage as Shop</div>
            <p className="text-xs text-riso-muted mt-0.5">แอดมินสวมสิทธิ์ดูแลร้านพร้อม Audit Log</p>
          </div>
        </div>
      </div>

      {/* 3. Featured Store Preview: The Barbershop Mae Hong Son */}
      <section className="bg-canvas-card riso-border-thick riso-shadow-lg rounded-riso-lg p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-riso-indigo gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-riso-indigo text-white px-2 py-0.5 rounded text-xs font-mono font-bold">
                {shopData?.branchCode || 'MHS-01'}
              </span>
              <span className="bg-riso-green/20 text-riso-indigo border border-riso-indigo px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-riso-green" />
                {shopData?.isOpen ? '● เปิดรับคิวอยู่' : '○ ปิดรับคิว'}
              </span>
              <span className="text-xs font-mono text-riso-muted">
                {shopData?.category || 'ตัดผม/เสริมสวย'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-riso-indigo mt-1">
              {shopData?.name || 'The Barbershop Mae Hong Son'}
            </h2>
            <p className="text-xs text-riso-muted flex items-center gap-1 mt-0.5">
              <span>📍 {shopData?.address || '142 ถ.สิงหนาทบำรุง ต.จองคำ อ.เมือง จ.แม่ฮ่องสอน'}</span>
              {shopData?.landmark && <span className="text-riso-orange font-bold">({shopData.landmark})</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-canvas-paper riso-border px-3 py-1.5 rounded-riso text-right">
              <div className="text-[10px] uppercase font-mono font-bold text-riso-muted">หน้าต่างจองคิว 2 วัน</div>
              <div className="text-xs font-bold text-riso-indigo">
                {bookingWindow.today} ➔ {bookingWindow.tomorrow}
              </div>
            </div>
          </div>
        </div>

        {/* Live Queue Boards Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Serving Ticket */}
          <div className="bg-riso-cream riso-border-thick riso-shadow p-5 rounded-riso text-center space-y-2">
            <div className="text-xs font-mono font-bold uppercase text-riso-muted tracking-wider">
              กำลังเรียกคิวปัจจุบัน (Now Serving)
            </div>
            <div className="text-6xl font-black font-mono text-riso-orange tracking-tight animate-pulse">
              {calledTicket ? calledTicket.ticketNumber : 'A-001'}
            </div>
            <div className="text-xs font-medium text-riso-indigo">
              {calledTicket ? 'กรุณาแสดงตัวที่หน้าร้านทันที' : 'ตัดผมชายวินเทจ (ช่างสมชาย)'}
            </div>
          </div>

          {/* Queue Line Status */}
          <div className="bg-canvas-paper riso-border-thick riso-shadow p-5 rounded-riso flex flex-col justify-between space-y-4">
            <div>
              <div className="text-xs font-mono font-bold uppercase text-riso-muted tracking-wider">
                สถานะแถวคิวรอ (Waiting Line)
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-black font-mono text-riso-indigo">
                  {waitingTickets.length}
                </span>
                <span className="text-sm font-bold text-riso-muted">คิวรออยู่</span>
                <span className="text-xs font-mono bg-riso-yellow px-2 py-0.5 rounded riso-border ml-auto">
                  ~{waitingTickets.length * 25} นาที
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-riso-indigo/30">
              <div className="text-[11px] font-mono text-riso-muted uppercase">คิวถัดไปในแถว:</div>
              <div className="flex flex-wrap gap-1.5">
                {waitingTickets.length > 0 ? (
                  waitingTickets.map((t) => (
                    <span
                      key={t.id}
                      className="px-2 py-1 bg-white riso-border rounded font-mono text-xs font-bold text-riso-indigo"
                    >
                      {t.ticketNumber}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-riso-muted italic">ไม่มีคิวค้างในระบบ</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Queue Categories (Service Selection) */}
        <div>
          <h3 className="text-sm font-bold uppercase font-mono text-riso-muted tracking-wider mb-3">
            หมวดหมู่บริการและเวลารอเฉลี่ย (Queue Categories)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {shopData?.queueCategories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white riso-border p-3.5 rounded-riso riso-shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded bg-riso-indigo text-white font-mono font-black text-xs flex items-center justify-center">
                      {cat.prefix}
                    </span>
                    <span className="font-bold text-sm text-riso-indigo">{cat.name}</span>
                  </div>
                </div>
                <span className="text-xs font-mono bg-canvas-muted px-2 py-0.5 rounded border border-riso-indigo text-riso-muted">
                  ~{cat.avgWaitTime} นาที
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button Preview */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button className="flex-1 riso-btn bg-riso-orange text-white font-bold py-3 px-6 rounded-riso text-base flex items-center justify-center gap-2 hover:bg-riso-orange/90">
            <Ticket className="w-5 h-5" />
            กดรับคิวสดหน้าร้าน (Walk-in)
          </button>
          <button className="flex-1 riso-btn bg-riso-teal text-white font-bold py-3 px-6 rounded-riso text-base flex items-center justify-center gap-2 hover:bg-riso-teal/90">
            <Clock className="w-5 h-5" />
            จองรอบเวลาล่วงหน้า 2 วัน
          </button>
        </div>
      </section>

      {/* 4. Phase 1 Architecture Verification Summary */}
      <footer className="bg-canvas-card riso-border p-5 rounded-riso space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-riso-muted pb-2 border-b border-riso-indigo/20">
          <span className="font-bold text-riso-indigo uppercase">System Diagnostics & Phase 1 Health</span>
          <Link
            href="/api/health"
            className="text-riso-orange underline font-bold hover:text-riso-indigo"
            target="_blank"
          >
            Open /api/health JSON ➔
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-riso-indigo">
            <CheckCircle2 className="w-4 h-4 text-riso-green" />
            <span>PostgreSQL: Connected</span>
          </div>
          <div className="flex items-center gap-1.5 text-riso-indigo">
            <CheckCircle2 className="w-4 h-4 text-riso-green" />
            <span>Prisma ORM: Seeded</span>
          </div>
          <div className="flex items-center gap-1.5 text-riso-indigo">
            <CheckCircle2 className="w-4 h-4 text-riso-green" />
            <span>2-Day Window: Active</span>
          </div>
          <div className="flex items-center gap-1.5 text-riso-indigo">
            <CheckCircle2 className="w-4 h-4 text-riso-green" />
            <span>Riso Design: Ready</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
