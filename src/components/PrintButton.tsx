'use client';

export default function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className="print:hidden">
      {children}
    </button>
  );
}
