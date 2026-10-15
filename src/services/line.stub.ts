/**
 * LINE customer flow: reply-only (webhook replyToken), never the paid Push API.
 * With no LINE_CHANNEL_ACCESS_TOKEN (or the mock value) replies are logged instead of sent.
 */

export type LineReplyMessage = { type: 'text'; text: string };

export async function replyToLine(replyToken: string, messages: LineReplyMessage[]): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token || token.startsWith('mock')) {
    console.log(`[LINE Mock Reply] replyToken=${replyToken}`, messages.map((m) => m.text));
    return true;
  }

  // [EXTENSION_POINT]: real LINE Messaging API reply call.
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages }),
  });
  return res.ok;
}

/**
 * Owner decision 2026-10-15: right after a customer locks a queue, the bot replies ONCE (reply token, free)
 * with a confirmation and a link to the live ticket page. No message is sent when the queue is called;
 * the customer follows the live page instead. Reply tokens are single-use and short-lived, so never store them.
 */
export function bookingConfirmedReply(t: {
  id: string;
  ticketNumber: string;
  shopName: string;
  categoryName: string;
  bookingTime?: string | null;
}): LineReplyMessage[] {
  // A wrong link is better than no ticket: the booking already succeeded, so log loudly and still send.
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base && process.env.NODE_ENV === 'production') {
    console.error('[LINE] NEXT_PUBLIC_APP_URL is not set — the confirmation link below is unreachable');
  }
  const appUrl = `${base ?? 'http://localhost:3000'}/t/${t.id}`;
  return [
    {
      type: 'text',
      text: [
        `✅ จองคิวให้เรียบร้อยแล้ว`,
        `ร้าน: ${t.shopName}`,
        `คิวของคุณ: ${t.ticketNumber} (${t.categoryName})`,
        `เวลา: ${t.bookingTime || 'รับคิวสดหน้าร้าน (Walk-in)'}`,
        ``,
        `ตรวจสอบสถานะคิวได้ที่ลิงก์ >> ${appUrl}`,
      ].join('\n'),
    },
  ];
}

// [EXTENSION_POINT]: verify the x-line-signature header (HMAC-SHA256 with LINE_CHANNEL_SECRET)
// before trusting a webhook body. Local stub accepts everything.
export function verifyLineSignature(_rawBody: string, _signature: string | null): boolean {
  return true;
}
