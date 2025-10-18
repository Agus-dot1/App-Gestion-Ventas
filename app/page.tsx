'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { useRoutePrefetch } from "@/hooks/use-route-prefetch";
import { Installment } from "@/lib/database-operations";
import { 
  Activity, 
  CreditCard, 
  DollarSign, 
  Users,
  TrendingUp,
  Database,
  RefreshCw,
  Plus,
  ShoppingCart,
  UserPlus,
  Package,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

import type { Sale as DatabaseSale } from "@/lib/database-operations";
import Link from 'next/link';
// Types for the dashboard data
type Sale = DatabaseSale & {
  customer_name?: string;
  sale_number?: string;
  payment_status?: string;
  date?: string;
};

type Customer = {
  id?: number;
  name: string;
  email?: string;
  created_at?: string;
};

export default function Home() {
  const router = useRouter();
  const { prefetchAllRoutes } = useRoutePrefetch();
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [upcomingInstallments, setUpcomingInstallments] = useState<Array<Installment & { customer_name: string; sale_number: string; status: string; customer_id: number }>>([]);
  const [chartData, setChartData] = useState<Array<{date: string, sales: number, revenue: number}>>([]);
  const [statsComparison, setStatsComparison] = useState<{
    sales: {current: number, previous: number, percentage: number},
    revenue: {current: number, previous: number, percentage: number},
    customers: {current: number, previous: number, percentage: number},
    products: {current: number, previous: number, percentage: number}
  } | null>(null);

  // Initial data load
  useEffect(() => {
    if (isElectron) {
      loadStats();
      // Prefetch common lists early to make navigation instant
      setTimeout(() => {
        prefetchAllRoutes();
      }, 200);
    }
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
         // Use optimized count methods and get recent data
         const [totalCustomers, totalProducts, totalSales, totalRevenue, recentSalesData, recentCustomersData, upcomingInstallmentsData, salesChartData, salesComparison, customersComparison, productsComparison] = await Promise.all([
           window.electronAPI.database.customers.getCount(),
           window.electronAPI.database.products.getCount(),
           window.electronAPI.database.sales.getCount(),
           window.electronAPI.database.sales.getTotalRevenue(),
           window.electronAPI.database.sales.getRecent(5),
           window.electronAPI.database.customers.getRecent(5),
           // Fetch a larger set, we will dedupe by customer below
           window.electronAPI.database.installments.getUpcoming(50),
           window.electronAPI.database.sales.getSalesChartData(30),
           window.electronAPI.database.sales.getStatsComparison(),
           window.electronAPI.database.customers.getMonthlyComparison(),
           window.electronAPI.database.products.getMonthlyComparison()
         ]);
         
         setStats({
           totalCustomers,
           totalProducts,
           totalSales,
           totalRevenue
         });
         setRecentSales(recentSalesData);
         setRecentCustomers(recentCustomersData);
         // Keep only the next installment per customer (earliest by due_date)
         const seenCustomerIds = new Set<number>();
         const dedupedByCustomer = upcomingInstallmentsData.filter((inst) => {
           const cid = (inst as any).customer_id as number | undefined;
           if (!cid) return true; // keep if unknown
           if (seenCustomerIds.has(cid)) return false;
           seenCustomerIds.add(cid);
           return true;
         }).slice(0, 5);
         setUpcomingInstallments(dedupedByCustomer);
         setChartData(salesChartData);
         
         // Calculate percentage changes
         const calculatePercentage = (current: number, previous: number) => {
           if (previous === 0) return current > 0 ? 100 : 0;
           return Math.round(((current - previous) / previous) * 100);
         };
         
         // Calculate and set comparison statistics
         setStatsComparison({
           sales: {
             current: salesComparison.current,
             previous: salesComparison.previous,
             percentage: salesComparison.change
           },
           revenue: {
             current: salesComparison.current,
             previous: salesComparison.previous,
             percentage: salesComparison.change
           },
           customers: {
             current: customersComparison.current,
             previous: customersComparison.previous,
             percentage: customersComparison.change
           },
           products: {
             current: productsComparison.current,
             previous: productsComparison.previous,
             percentage: productsComparison.change
           }
         });
         
         // Prefetch other routes after dashboard loads
         setTimeout(() => {
           prefetchAllRoutes();
         }, 500);
         
       } else {
         // Non-Electron version - use API calls
         const response = await fetch('/api/dashboard');
         if (!response.ok) {
           throw new Error('Failed to fetch dashboard data');
         }
         
         const data = await response.json();
         
         setStats(data.stats);
         setRecentSales(data.recentSales);
         setRecentCustomers(data.recentCustomers);
         setChartData(data.chartData);
         setStatsComparison(data.statsComparison);
       }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await loadStats();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Panel de control</h1>
              <p className="text-muted-foreground">
                Bienvenido a tu panel de control. Acá podes ver un resumen de tus ventas, clientes y productos.
              </p>
            </div>
            {isElectron && (
              <Button 
                onClick={refreshData} 
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            )}
          </div>
          {isElectron && (
            <div className="flex items-center gap-2 mt-3 text-sm text-green-500">
              <Database className="h-4 w-4" />
              <span>Base de datos conectada!</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Ganancia total</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
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
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
                      Ganancias totales de todas las ventas
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
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
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Users className="h-3 w-3 mr-1 text-blue-500" />
                      Total de clientes registrados
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Ventas</CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CreditCard className="h-4 w-4 text-orange-600" />
                </div>
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
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                      Total de ventas realizadas
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Productos</CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="h-4 w-4 text-purple-500" />
                </div>
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
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Package className="h-3 w-3 mr-1 text-purple-500" />
                      Total de productos en inventario
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

      
        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-full lg:col-span-4 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Actividad reciente</CardTitle>
              <CardDescription>
                Últimas ventas y clientes registrados en el sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-2 h-2 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSales.length > 0 ? (
                    recentSales.slice(0, 4).map((sale, index) => (
                      <Link 
                        href={`/sales?highlight=${sale.id}`}
                        key={sale.id} 
                        className="flex items-center gap-4 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-all"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Venta #{sale.sale_number} - {sale.customer_name || 'Cliente no especificado'}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              ${sale.total_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </p>
                            <Badge variant={sale.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                              {sale.payment_status === 'paid' ? 'Pagado' : 
                               sale.payment_status === 'partial' ? 'Parcial' : 'Pendiente'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sale.created_at || sale.date).toLocaleDateString('es-ES')}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay ventas recientes</p>
                    </div>
                  )}
                  {recentCustomers.length > 0 && (
                    recentCustomers.slice(0, 2).map((customer, index) => (
                      <Link 
                        href={customer.id ? `/customers?highlight=${customer.id}` : '/customers'}
                        key={customer.id || `customer-${index}`} 
                        className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-all"
                        style={{ animationDelay: `${(index + 3) * 100}ms` }}
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            Nuevo cliente: {customer.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {customer.email || 'Sin contacto'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {customer.created_at ? new Date(customer.created_at).toLocaleDateString('es-ES') : 'Fecha no disponible'}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="col-span-full lg:col-span-3 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Próximas cuotas</CardTitle>
              <CardDescription>
                Cuotas pendientes que vencen próximamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-2 h-2 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingInstallments.length > 0 ? (
                    upcomingInstallments.map((installment, index) => (
                      <Link
                        href={`/sales?tab=installments&highlight=i-${installment.id}`}
                        key={installment.id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-all"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          new Date(installment.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
                            ? 'bg-orange-700' 
                            : 'bg-blue-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {installment.customer_name} - Venta #{installment.sale_number}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              ${installment.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </p>
                            <Badge variant={
                              new Date(installment.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
                                ? 'destructive' 
                                : 'secondary'
                            } className="text-xs">
                              {new Date(installment.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
                                ? 'Vence pronto' 
                                : 'Pendiente'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(installment.due_date).toLocaleDateString('es-ES')}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay cuotas próximas</p>
                    </div>
                  )}
                  {upcomingInstallments.length > 0 && (
                    <div className="pt-2 border-t">
                      <Button 
                        onClick={() => router.push('/sales')}
                        variant="ghost" 
                        size="sm"
                        className="w-full text-xs"
                      >
                        Ver todas las cuotas
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}