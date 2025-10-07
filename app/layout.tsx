'use client';

import './globals.css';
import { Suspense } from 'react';
import { DataCacheProvider } from '@/hooks/use-data-cache';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased dark">
        <DataCacheProvider>
          <Suspense fallback={<div>Loading...</div>}>
            {children}
          </Suspense>
        </DataCacheProvider>
      </body>
    </html>
  );
}