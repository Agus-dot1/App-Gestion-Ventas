import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { DataCacheProvider } from "@/hooks/use-data-cache";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Electro Gestión - Sistema de Gestión de Ventas",
  description: "Sistema completo de gestión de ventas, clientes y productos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        <DataCacheProvider>
          <Suspense fallback={<div>Loading...</div>}>
            {children}
          </Suspense>
        </DataCacheProvider>
        <Toaster />
      </body>
    </html>
  );
}