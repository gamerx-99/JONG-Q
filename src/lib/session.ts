import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Role, User } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Minimal signed-cookie session: value = "<userId>.<hmac>".
 * [EXTENSION_POINT]: LINE LIFF / LINE Login will call setSession(user.id) after verifying the ID token.
 * Until then users sign in through /dev-login (development only).
 */
const COOKIE = 'jq_session';

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return s;
}

function sign(userId: string): string {
  return createHmac('sha256', secret()).update(userId).digest('base64url');
}

export function setSession(userId: string) {
  cookies().set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSession() {
  cookies().delete(COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot < 1) return null;
  const userId = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(userId));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

/** Server-side RBAC guard for pages, layouts and server actions. */
export async function requireUser(roles?: Role[]): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect('/dev-login');
  if (roles && !roles.includes(user.role)) redirect('/?denied=1');
  return user;
}
