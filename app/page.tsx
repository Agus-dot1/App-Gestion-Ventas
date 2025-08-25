'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/dashboard-layout";
import { 
  Activity, 
  CreditCard, 
  DollarSign, 
  Users,
  TrendingUp,
  Database
} from "lucide-react";

export default function Home() {
  const [isElectron, setIsElectron] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    // Check if we're running in Electron
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
    
    // Load initial stats if in Electron
    if (typeof window !== 'undefined' && window.electronAPI) {
      loadStats();
    }
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const customers = await window.electronAPI.database.customers.getAll();
      const products = await window.electronAPI.database.products.getAll();
      const sales = await window.electronAPI.database.sales.getAll();
      
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
      
      setStats({
        totalCustomers: customers.length,
        totalProducts: products.length,
        totalSales: sales.length,
        totalRevenue
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido a tu panel de control. Acá podes ver un resumen de tus ventas, clientes y productos.
          </p>
          {isElectron && (
            <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
              <Database className="h-4 w-4" />
              <span>Base de datos conectada!</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Ganancia total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    ${stats.totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 mr-2 text-green-500" />
                    Ganancias totales de todas las ventas
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Users className="h-3 w-3 mr-1 text-blue-500" />
                    Total de clientes registrados
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Ventas</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-36" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalSales}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    Total de ventas realizadas
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Productos</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-44" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalProducts}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Activity className="h-3 w-3 mr-1 text-purple-500" />
                    Total de productos en inventario
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Actividad reciente</CardTitle>
              <CardDescription>
                Últimas acciones realizadas en el sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Base de datos inicializada</p>
                    <p className="text-xs text-muted-foreground">Lista para operar</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Seguimiento de ventas</p>
                    <p className="text-xs text-muted-foreground">Listo para registrar pagos</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Seguimiento de cuotas listo</p>
                    <p className="text-xs text-muted-foreground">Calendario de cuotas disponible</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Acciones rapidas</CardTitle>
              <CardDescription>
                Acciones rápidas para gestionar ventas y clientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <p className="text-sm font-medium">Añadir cliente</p>
                  <p className="text-xs text-muted-foreground">Registrar un nuevo cliente</p>
                </div>
                <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <p className="text-sm font-medium">Crear una venta</p>
                  <p className="text-xs text-muted-foreground">Registra una nueva venta</p>
                </div>
                <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <p className="text-sm font-medium">Añadir producto</p>
                  <p className="text-xs text-muted-foreground">Actualiza tu inventario</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}