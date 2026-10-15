/**
 * Telegram Bot Alert Service for Merchants
 * Free, instant notification mechanism bypassing Web Push complexity & costs.
 */

export interface TelegramAlertPayload {
  shopName: string;
  ticketNumber: string;
  categoryName: string;
  customerName: string;
  bookingTime?: string;
  type: 'NEW_BOOKING' | 'CANCELLED';
}

export async function sendMerchantTelegramAlert(
  chatId: string,
  payload: TelegramAlertPayload
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token === 'mock_telegram_bot_token') {
    console.log(
      `[Telegram Mock Alert] Sent to chatId: ${chatId} | Ticket: ${payload.ticketNumber} (${payload.shopName})`
    );
    return true;
  }

  const emoji = payload.type === 'NEW_BOOKING' ? '🔔 คิวใหม่เข้าระบบ!' : '❌ ลูกค้ายกเลิกคิว';
  // HTML mode + escaping: user-supplied names may contain _ * [ which break Telegram Markdown (HTTP 400).
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // A wrong link is better than no alert: log loudly, still send the message.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl && process.env.NODE_ENV === 'production') {
    console.error('[Telegram] NEXT_PUBLIC_APP_URL is not set — the board link below is unreachable');
  }
  const text = `
${emoji}
🏬 <b>ร้าน:</b> ${esc(payload.shopName)}
🎫 <b>หมายเลขคิว:</b> ${esc(payload.ticketNumber)}
📋 <b>บริการ:</b> ${esc(payload.categoryName)}
👤 <b>ลูกค้า:</b> ${esc(payload.customerName)}
⏰ <b>เวลานัดหมาย:</b> ${esc(payload.bookingTime || 'รับคิวสดหน้าร้าน (Walk-in)')}

  👉 เข้าจัดการคิวหน้าร้าน: ${appUrl ?? 'http://localhost:3000'}/merchant
  `.trim();

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Telegram Send Error]:', err);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram Network Error]:', error);
    return false;
  }
}
