import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sales Management System',
  description: 'A comprehensive sales management system built with Electron and Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased dark">{children}</body>
    </html>
  );
}