import type { Metadata } from "next";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { DataCacheProvider } from "@/hooks/use-data-cache";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { NotificationsBell } from "@/components/notifications-bell";

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
      <body className="antialiased overflow-hidden">
        <DataCacheProvider>
          <div className="flex h-screen bg-background">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-muted/10">
              <Suspense fallback={<div>Loading...</div>}>
                {children}
              </Suspense>
            </main>
          </div>
          <NotificationsBell />
        </DataCacheProvider>

        <SonnerToaster position="bottom-right" />
      </body>
    </html>
  );
}