import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DataCacheProvider } from '@/hooks/use-data-cache';

export const metadata: Metadata = {
  title: 'Gestion de ventas',
  description: 'Aplicación para la gestión de ventas y clientes',
};

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