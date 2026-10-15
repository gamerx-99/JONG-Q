'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Re-fetches server data every `seconds` without a full page reload, so a tap or form submit
 * in progress is never cut off (a <meta refresh> reload did that on the call board).
 * ponytail: polling; replace with SSE when real-time matters.
 */
export default function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
