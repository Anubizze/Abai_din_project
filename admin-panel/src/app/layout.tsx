import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Abai Bot Admin Panel',
  description: 'Admin panel for managing Telegram bot content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
