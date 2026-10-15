import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  timestamp: string;
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function apiError(
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function handleApiError(error: unknown) {
  console.error('[API Error]:', error);

  if (error instanceof ZodError) {
    return apiError('Validation error', 422, error.flatten().fieldErrors);
  }

  // Never echo internal error text (Prisma/SQL details) to clients; it is in the server log above.
  return apiError('Internal Server Error', 500);
}
