import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jong-Q (จองคิว) | แพลตฟอร์มจองคิววิถีชุมชน แม่ฮ่องสอน',
  description: 'ระบบจองคิวร้านค้าชุมชน รองรับ LINE LIFF 0-cost และการแจ้งเตือน Telegram ทันใจ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600;700;800&family=Mali:wght@500;700&family=Prompt:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-canvas-paper text-riso-indigo font-sans antialiased selection:bg-riso-orange selection:text-white">
        {children}
      </body>
    </html>
  );
}
