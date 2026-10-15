import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isWithinBookingWindow } from '@/lib/booking-window';
import { sendMerchantTelegramAlert } from '@/lib/telegram';
import { bookingConfirmedReply, replyToLine } from '@/services/line.stub';

export class BookingError extends Error {}

const LIVE = ['WAITING', 'CALLED', 'SERVING'] as const;

/** Customer's unfinished ticket inside the booking window (one live ticket per customer). */
export function findActiveTicket(customerId: string) {
  return prisma.ticket.findFirst({
    where: { customerId, status: { in: [...LIVE] } },
    include: { shop: true },
    orderBy: { createdAt: 'desc' },
  });
}

type IssueInput = {
  shopId: string;
  categoryId: string;
  customerId: string;
  date: string;
  slotId?: string;
  lineReplyToken?: string; // only when the booking came from a LINE webhook; used once, never stored
};

/**
 * Issues the next ticket number for (shop, date, category prefix).
 * Slot capacity is claimed with a conditional update so two customers cannot take the last seat.
 * Numbering is serialized per category with a row lock (FOR UPDATE); the unique
 * (shopId, date, ticketNumber) index stays as the backstop and a rare collision is retried.
 */
export async function issueTicket(input: IssueInput) {
  if (!isWithinBookingWindow(input.date)) throw new BookingError('จองได้เฉพาะวันนี้และพรุ่งนี้เท่านั้น');

  for (let attempt = 0; ; attempt++) {
    try {
      const ticket = await prisma.$transaction(async (tx) => {
        const shop = await tx.shop.findUnique({ where: { id: input.shopId } });
        if (!shop || shop.status !== 'APPROVED') throw new BookingError('ไม่พบร้านนี้');
        if (!shop.isOpen) throw new BookingError('ขณะนี้ร้านปิดให้บริการรับคิวชั่วคราว');

        const category = await tx.queueCategory.findFirst({ where: { id: input.categoryId, shopId: shop.id } });
        if (!category) throw new BookingError('ไม่พบบริการนี้');

        if (await tx.ticket.findFirst({ where: { customerId: input.customerId, status: { in: [...LIVE] } } })) {
          throw new BookingError('คุณมีคิวที่ยังไม่เสร็จอยู่แล้ว');
        }

        if (input.slotId) {
          const claimed = await tx.timeSlot.updateMany({
            where: { id: input.slotId, shopId: shop.id, date: input.date, enabled: true, currentBooked: { lt: tx.timeSlot.fields.maxSlots } },
            data: { currentBooked: { increment: 1 } },
          });
          if (claimed.count === 0) throw new BookingError('รอบเวลานี้เต็มแล้ว');
        }

        // Under READ COMMITTED, count() alone lets concurrent bookings read the same number.
        // Holding the category row lock until commit makes the next booking count after us.
        await tx.$queryRaw`SELECT id FROM "QueueCategory" WHERE id = ${category.id} FOR UPDATE`;
        const issued = await tx.ticket.count({
          where: { shopId: shop.id, date: input.date, ticketNumber: { startsWith: `${category.prefix}-` } },
        });
        return tx.ticket.create({
          data: {
            shopId: shop.id,
            categoryId: category.id,
            customerId: input.customerId,
            date: input.date,
            slotId: input.slotId ?? null,
            ticketNumber: `${category.prefix}-${String(issued + 1).padStart(3, '0')}`,
          },
          include: { shop: true, category: true, customer: true, timeSlot: true },
        });
      });

      const bookingTime = ticket.timeSlot ? `${ticket.date} ${ticket.timeSlot.startTime}` : null;
      if (ticket.shop.telegramChatId) {
        await sendMerchantTelegramAlert(ticket.shop.telegramChatId, {
          shopName: ticket.shop.name,
          ticketNumber: ticket.ticketNumber,
          categoryName: ticket.category.name,
          customerName: ticket.customer.name,
          bookingTime: bookingTime ?? undefined,
          type: 'NEW_BOOKING',
        });
      }
      if (input.lineReplyToken) {
        await replyToLine(input.lineReplyToken, bookingConfirmedReply({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          shopName: ticket.shop.name,
          categoryName: ticket.category.name,
          bookingTime,
        }));
      }
      return ticket;
    } catch (e) {
      const collision = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
      if (!collision) throw e;
      if (attempt >= 4) throw new BookingError('ระบบกำลังยุ่ง กรุณากดรับคิวอีกครั้ง');
    }
  }
}
