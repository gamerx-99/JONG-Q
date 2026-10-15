import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { Shop, User } from '@prisma/client';

/**
 * Admin impersonation ("Manage as Shop").
 *
 * Design note: the admin's own session cookie is left untouched. Impersonation lives in a
 * second, short-lived signed cookie so that:
 *   - the admin keeps the ADMIN role (requireUser(['ADMIN']) still works),
 *   - AdminLog keeps recording the real admin, not the shop owner — swapping the session
 *     userId to the merchant would silently rewrite who did what,
 *   - the scope is exactly one shop, so an admin cannot drift into a second shop by accident.
 *
 * Cookie value = "<adminId>.<shopId>.<hmac>". The HMAC covers both ids, so neither can be
 * edited on its own.
 */
const COOKIE = 'jq_impersonate';

export interface Impersonation {
  adminId: string;
  shopId: string;
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

const options = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

/** Called by the admin only; the caller is responsible for writing the AdminLog entry. */
export function startImpersonation(adminId: string, shopId: string) {
  const payload = `${adminId}.${shopId}`;
  cookies().set(COOKIE, `${payload}.${sign(payload)}`, { ...options, maxAge: 60 * 60 });
}

export function stopImpersonation() {
  cookies().delete(COOKIE);
}

/** Returns the valid impersonation scope, or null when absent, tampered with, or expired. */
export function getImpersonation(): Impersonation | null {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [adminId, shopId, mac] = parts;
  const given = Buffer.from(mac);
  const expected = Buffer.from(sign(`${adminId}.${shopId}`));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { adminId, shopId };
}

/**
 * The single access rule for merchant-owned pages. Admins pass unconditionally (A2 lists every
 * shop); a merchant must own the shop; an impersonating admin must match both the admin id and
 * the shop id in the cookie.
 */
export function canAccessShop(user: User, shop: Pick<Shop, 'id' | 'ownerId'>, impersonation: Impersonation | null): boolean {
  if (user.role === 'ADMIN') return true;
  if (shop.ownerId === user.id) return true;
  return !!impersonation && impersonation.adminId === user.id && impersonation.shopId === shop.id;
}

/** True when this request is an admin acting inside a specific shop's pages. */
export function isImpersonating(impersonation: Impersonation | null, user: User): boolean {
  return user.role === 'ADMIN' && impersonation !== null;
}
