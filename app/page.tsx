'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { Sale as DatabaseSale } from "@/lib/database-operations";
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
  const [isElectron, setIsElectron] = useState(false);
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
  const [chartData, setChartData] = useState<Array<{date: string, sales: number, revenue: number}>>([]);
  const [statsComparison, setStatsComparison] = useState<{
    sales: {current: number, previous: number, percentage: number},
    revenue: {current: number, previous: number, percentage: number},
    customers: {current: number, previous: number, percentage: number},
    products: {current: number, previous: number, percentage: number}
  } | null>(null);

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
      if (window.electronAPI) {
         // Use optimized count methods and get recent data
         const [totalCustomers, totalProducts, totalSales, totalRevenue, recentSalesData, recentCustomersData, salesChartData, salesComparison, customersComparison, productsComparison] = await Promise.all([
           window.electronAPI.database.customers.getCount(),
           window.electronAPI.database.products.getCount(),
           window.electronAPI.database.sales.getCount(),
           window.electronAPI.database.sales.getTotalRevenue(),
           window.electronAPI.database.sales.getRecent(5),
           window.electronAPI.database.customers.getRecent(5),
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

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-customer':
        router.push('/customers');
        break;
      case 'create-sale':
        router.push('/sales');
        break;
      case 'add-product':
        router.push('/products');
        break;
      case 'calendar':
        router.push('/calendar');
        break;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
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
            <div className="flex items-center gap-2 mt-3 text-sm text-green-600">
              <Database className="h-4 w-4" />
              <span>Base de datos conectada!</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8 animate-in fade-in-50 duration-500">
          <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 ease-in-out">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Ganancia total</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-4 w-4 text-green-600" />
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
                    {statsComparison && (
                      <div className={`flex items-center text-xs font-medium ${
                        statsComparison.revenue.percentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {statsComparison.revenue.percentage >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(statsComparison.revenue.percentage)}%
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 ease-in-out">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
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
                    {statsComparison && (
                      <div className={`flex items-center text-xs font-medium ${
                        statsComparison.customers.percentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {statsComparison.customers.percentage >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(statsComparison.customers.percentage)}%
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 ease-in-out">
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
                    {statsComparison && (
                      <div className={`flex items-center text-xs font-medium ${
                        statsComparison.sales.percentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {statsComparison.sales.percentage >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(statsComparison.sales.percentage)}%
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 ease-in-out">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Productos</CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="h-4 w-4 text-purple-600" />
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
                    {statsComparison && (
                      <div className={`flex items-center text-xs font-medium ${
                        statsComparison.products.percentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {statsComparison.products.percentage >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(statsComparison.products.percentage)}%
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sales Chart */}
        <div className="grid gap-4 animate-in slide-in-from-bottom-4 duration-700">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Tendencia de Ventas</CardTitle>
              <CardDescription>
                Ventas y ingresos de los últimos 30 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="space-y-4 w-full">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-[250px] w-full" />
                  </div>
                </div>
              ) : chartData.length > 0 ? (
                <ChartContainer
                  config={{
                    sales: {
                      label: "Ventas",
                      color: "hsl(var(--chart-1))",
                    },
                    revenue: {
                      label: "Ingresos",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        });
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="sales"
                      stackId="1"
                      stroke="var(--color-sales)"
                      fill="var(--color-sales)"
                      fillOpacity={0.6}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stackId="2"
                      stroke="var(--color-revenue)"
                      fill="var(--color-revenue)"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay datos de ventas disponibles</p>
                    <p className="text-sm">Las ventas aparecerán aquí una vez que se registren</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 animate-in slide-in-from-left-4 duration-700">
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
                    recentSales.slice(0, 3).map((sale, index) => (
                      <div 
                        key={sale.id} 
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] animate-in fade-in-50 slide-in-from-left-4"
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
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay ventas recientes</p>
                    </div>
                  )}
                  {recentCustomers.length > 0 && (
                    recentCustomers.slice(0, 2).map((customer, index) => (
                      <div 
                        key={customer.id || `customer-${index}`} 
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02] animate-in fade-in-50 slide-in-from-left-4"
                        style={{ animationDelay: `${(index + 3) * 100}ms` }}
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Nuevo cliente: {customer.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {customer.email || 'Sin contacto'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {customer.created_at ? new Date(customer.created_at).toLocaleDateString('es-ES') : 'Fecha no disponible'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-full lg:col-span-3 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
              <CardDescription>
                Accesos directos a las funciones más utilizadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Button 
                  onClick={() => handleQuickAction('add-customer')}
                  variant="outline" 
                  className="w-full justify-start gap-3 h-auto p-4 hover:scale-105 hover:shadow-md transition-all duration-200 ease-in-out"
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Añadir cliente</p>
                    <p className="text-xs text-muted-foreground">Registrar un nuevo cliente</p>
                  </div>
                </Button>
                
                <Button 
                  onClick={() => handleQuickAction('create-sale')}
                  variant="outline" 
                  className="w-full justify-start gap-3 h-auto p-4 hover:scale-105 hover:shadow-md transition-all duration-200 ease-in-out"
                >
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ShoppingCart className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Crear una venta</p>
                    <p className="text-xs text-muted-foreground">Registra una nueva venta</p>
                  </div>
                </Button>
                
                <Button 
                  onClick={() => handleQuickAction('add-product')}
                  variant="outline" 
                  className="w-full justify-start gap-3 h-auto p-4 hover:scale-105 hover:shadow-md transition-all duration-200 ease-in-out"
                >
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Package className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Añadir producto</p>
                    <p className="text-xs text-muted-foreground">Actualiza tu inventario</p>
                  </div>
                </Button>
                
                <Button 
                  onClick={() => handleQuickAction('calendar')}
                  variant="outline" 
                  className="w-full justify-start gap-3 h-auto p-4 hover:scale-105 hover:shadow-md transition-all duration-200 ease-in-out"
                >
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Ver calendario</p>
                    <p className="text-xs text-muted-foreground">Gestionar cuotas y eventos</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}