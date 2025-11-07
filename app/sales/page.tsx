'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SaleForm } from '@/components/sales/sale-form';
import { SalesTable } from '@/components/sales/sales-table';
import { InstallmentDashboard, InstallmentDashboardRef } from '@/components/sales/installments-dashboard/installment-dashboard';
import { SalesSkeleton } from '@/components/skeletons/sales-skeleton';


import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, CreditCard, TrendingUp, DollarSign, Calendar, Database, AlertTriangle } from 'lucide-react';
import type { Sale, Product, SaleFormData } from '@/lib/database-operations';
import { useDataCache, usePrefetch } from '@/hooks/use-data-cache';
import { toast } from 'sonner';
import { SHOW_MOCK_BUTTONS } from '@/lib/feature-flags';


export default function SalesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const highlightId = searchParams.get('highlight');
  const installmentDashboardRef = useRef<InstallmentDashboardRef>(null);
  const tabParam = searchParams.get('tab');
  const partnerParam = searchParams.get('partner');
  const actionParam = searchParams.get('action');
  const [sales, setSales] = useState<Sale[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number>(0);
  const [overdueSales, setOverdueSales] = useState<number>(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | undefined>();
  const [isElectron, setIsElectron] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
    try {
      setIsElectron(!!(window as any)?.electronAPI);
    } catch {
      setIsElectron(false);
    }
  }, []);
  const [activeTab, setActiveTab] = useState(() => tabParam || 'sales');
  const [isLoading, setIsLoading] = useState(false); // Start with false for optimistic navigation
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState<{ total: number; totalPages: number; currentPage: number; pageSize: number } | undefined>(undefined);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const pageSize = 25;



  useEffect(() => {
    if (isElectron) {


      const cachedData = dataCache.getCachedSales(currentPage, pageSize, searchTerm);
      if (cachedData) {


        setSales(cachedData.items);
        setPaginationInfo({
          total: cachedData.total,
          totalPages: cachedData.totalPages,
          currentPage: cachedData.currentPage,
          pageSize: cachedData.pageSize
        });
      } else {


        setIsLoading(true);
      }



      loadSales();
      loadOverdueSales();
      loadPartners();



      const onPartnersChanged = () => {
        loadPartners();
      };
      try {
        window.addEventListener('partners:changed', onPartnersChanged);
      } catch {}
      return () => {
        try {
          window.removeEventListener('partners:changed', onPartnersChanged);
        } catch {}
      };
    }
  }, [isElectron]);



  useEffect(() => {
    if (actionParam === 'new') {
      setEditingSale(undefined);
      setIsFormOpen(true);
    }
  }, [actionParam]);

  const loadPartners = async () => {
    try {
      if (!window.electronAPI?.database?.partners?.getAll) return;
      const list = await window.electronAPI.database.partners.getAll();
      setPartners(list || []);
    } catch (error) {
      console.error('Error cargando responsables:', error);
    }
  };

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);



  useEffect(() => {
    const id = Number(partnerParam || '0');
    setSelectedPartnerId(Number.isFinite(id) ? id : 0);
  }, [partnerParam]);



  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isElectron) {
        setCurrentPage(1);
        loadSales();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, isElectron]);



  useEffect(() => {
    if (isElectron && sales.length > 0) {


      setTimeout(() => {
        loadSales();
      }, 0);
    }
  }, [currentPage]);






  const highlightedSale = useMemo(() => {
    if (!highlightId) return null;
    return sales.find(sale => sale.id?.toString() === highlightId);
  }, [sales, highlightId]);

  useEffect(() => {
    if (highlightedSale) {


      setTimeout(() => {
        const element = document.getElementById(`venta-${highlightedSale.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });


          element.classList.add('bg-primary/10', 'animate-pulse');
          setTimeout(() => {
            element.classList.remove('bg-primary/10', 'animate-pulse');
          }, 1500);
        }
      }, 100);
    }
  }, [highlightedSale]);
  const dataCache = useDataCache();
  const { prefetchCustomers, prefetchProducts } = usePrefetch();

  const loadSales = async (forceRefresh = false) => {
    try {


      const cachedData = dataCache.getCachedSales(currentPage, pageSize, searchTerm);
      const isCacheExpired = dataCache.isSalesCacheExpired(currentPage, pageSize, searchTerm);

      if (cachedData && !forceRefresh) {


        setSales(cachedData.items);
        setPaginationInfo({
          total: cachedData.total,
          totalPages: cachedData.totalPages,
          currentPage: cachedData.currentPage,
          pageSize: cachedData.pageSize
        });
        setIsLoading(false);



        if (!isCacheExpired) {


          setTimeout(() => {
            prefetchCustomers();
            prefetchProducts();
          }, 100);
          return;
        }


      } else {


        if (sales.length === 0) {
          setIsLoading(true);
        }
      }
      console.time('loadSales_db');
      const result = await window.electronAPI.database.sales.getPaginated(currentPage, pageSize, searchTerm);
      console.timeEnd('loadSales_db');


      setSales(result.sales);
      setPaginationInfo({
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize
      });



      dataCache.setCachedSales(currentPage, pageSize, searchTerm, {
        items: result.sales,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize,
        searchTerm,
        timestamp: Date.now()
      });



      setTimeout(() => {
        prefetchCustomers();
        prefetchProducts();
      }, 100);

    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOverdueSales = async () => {
    try {
      if (!isElectron || !window.electronAPI?.database?.sales?.getOverdueSalesCount) {
        setOverdueSales(0);
        return;
      }
      const overdueCount = await window.electronAPI.database.sales.getOverdueSalesCount();
      setOverdueSales(overdueCount ?? 0);
    } catch (error) {
      console.error('Error cargando pagos atrasados:', error);
      setOverdueSales(0);
    }
  };

  const handleSaveSale = async (saleData: SaleFormData) => {
    try {
      if (editingSale?.id) {


        const updateData = {
          customer_id: saleData.customer_id,
          notes: saleData.notes
        };
        await window.electronAPI.database.sales.update(editingSale.id, updateData);
        toast.success('Venta actualizada correctamente');
      } else {


        await window.electronAPI.database.sales.create(saleData);
        toast.success('Venta creada correctamente');
        


      }



      dataCache.invalidateCache('sales');


      dataCache.invalidateCache('products');
      await loadSales(true);
      await loadOverdueSales();



      if (installmentDashboardRef.current) {
        installmentDashboardRef.current.refreshData();
      }



      setEditingSale(undefined);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error guardando venta:', error);
      toast.error('Error guardando la venta');
      throw error; // Re-throw to let the form handle the error
    }
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setIsFormOpen(true);
  };

  const handleDeleteSale = async (saleId: number) => {
    try {
      await window.electronAPI.database.sales.delete(saleId);


       setSales(prev => prev.filter(p => p.id !== saleId));
      dataCache.invalidateCache('sales');



      if (installmentDashboardRef.current) {
        installmentDashboardRef.current.refreshData();
      }
      toast.success('Venta eliminada correctamente');
    } catch (error) {
      console.error('Error eliminando venta:', error);
      toast.error('Error eliminando la venta');
    }
  };

  const handleBulkDeleteSales = async (saleIds: number[]) => {
    try {


      for (const saleId of saleIds) {
        await window.electronAPI.database.sales.delete(saleId);
        setSales(prev => prev.filter(p => p.id !== saleId));
      }


      dataCache.invalidateCache('sales');
      toast.success(`Ventas eliminadas: ${saleIds.length}`);
    } catch (error) {
      console.error('Error eliminando ventas:', error);
      toast.error('Error eliminando las ventas seleccionadas');
      throw error;
    }
  };

  const handleBulkStatusUpdate = async (saleIds: number[], status: Sale['payment_status']) => {
    try {


      for (const saleId of saleIds) {
        const sale = sales.find(s => s.id === saleId);
        if (sale) {
          await window.electronAPI.database.sales.update(saleId, {
            ...sale,
            payment_status: status
          });
        }
      }


      dataCache.invalidateCache('sales');
      await loadSales();
      await loadOverdueSales();
      const statusLabel = status === 'paid' ? 'Pagadas' : 'Pendientes';
      toast.success(`Estado actualizado a ${statusLabel}`);
    } catch (error) {
      console.error('Error actualizando estado de ventas:', error);
      toast.error('Error actualizando el estado de las ventas');
      throw error;
    }
  };

  const handleAddSale = () => {
    setEditingSale(undefined);
    setIsFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingSale(undefined);


      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.delete('action');
      const query = params.toString();
      router.replace(query ? `/sales?${query}` : '/sales');
    }
  };



  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleAddSale();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const addMockSales = async () => {
    try {


      const customers = await window.electronAPI.database.customers.getAll();
      const products = await window.electronAPI.database.products.getAll();

      if (customers.length === 0) {
        console.error('No customers found. Please add customers first.');
        return;
      }

      if (products.length === 0) {
        console.error('No products found. Please add products first.');
        return;
      }

      const mockSales: SaleFormData[] = [
        {
          customer_id: customers[0]?.id || 1,
          items: [
            {
              product_id: products[0]?.id || 1,
              quantity: 2,
              unit_price: products[0]?.price || 159990,
            },
            {
              product_id: products[1]?.id || 2,
              quantity: 1,
              unit_price: products[1]?.price || 49990,
            }
          ],
          payment_type: 'cash',
          notes: 'Venta de prueba - Cliente frecuente'
        },
        {
          customer_id: customers[1]?.id || 2,
          items: [
            {
              product_id: products[2]?.id || 3,
              quantity: 3,
              unit_price: products[2]?.price || 25990,
            }
          ],
          payment_type: 'installments',
          number_of_installments: 6,
          notes: 'Venta en cuotas - 6 meses'
        },
        {
          customer_id: customers[2]?.id || 3,
          items: [
            {
              product_id: products[3]?.id || 4,
              quantity: 1,
              unit_price: products[3]?.price || 91990,
            },
            {
              product_id: products[4]?.id || 5,
              quantity: 2,
              unit_price: products[4]?.price || 59990,
            }
          ],
          payment_type: 'cash',
          notes: 'Venta a crédito - Descuento por volumen'
        },
        {
          customer_id: customers[3]?.id || 4,
          items: [
            {
              product_id: products[5]?.id || 6,
              quantity: 1,
              unit_price: products[5]?.price || 179990,
            }
          ],
          payment_type: 'installments',
          number_of_installments: 12,
          notes: 'Plan de cuotas extendido - 12 meses'
        },
        {
          customer_id: customers[4]?.id || 5,
          items: [
            {
              product_id: products[0]?.id || 1,
              quantity: 1,
              unit_price: products[0]?.price || 159990,
            },
            {
              product_id: products[6]?.id || 7,
              quantity: 3,
              unit_price: products[6]?.price || 19990,
            }
          ],
          payment_type: "cash",
        },
        {
          customer_id: customers[5]?.id || 6,
          items: [
            {
              product_id: products[1]?.id || 2,
              quantity: 5,
              unit_price: products[1]?.price || 49990,
            }
          ],
          payment_type: 'cash',
          notes: 'Compra al por mayor - Descuento por cantidad'
        },
        {
          customer_id: customers[6]?.id || 7,
          items: [
            {
              product_id: products[2]?.id || 3,
              quantity: 2,
              unit_price: products[2]?.price || 25990,

            },
            {
              product_id: products[3]?.id || 4,
              quantity: 1,
              unit_price: products[3]?.price || 91990,

            }
          ],
          payment_type: 'installments',
          number_of_installments: 3,

          notes: 'Plan de cuotas corto - 3 meses'
        },
        {
          customer_id: customers[7]?.id || 8,
          items: [
            {
              product_id: products[4]?.id || 5,
              quantity: 1,
              unit_price: products[4]?.price || 59990,

            }
          ],
          payment_type: 'cash',
          notes: 'Venta rápida - Descuento por pronto pago'
        }
      ];



      for (const saleData of mockSales) {
        await window.electronAPI.database.sales.create(saleData);
      }



      dataCache.invalidateCache('sales');
      await loadSales(true);
      await loadOverdueSales();
      toast.success('Datos de prueba cargados correctamente');
    } catch (error) {
      console.error('Error adding mock sales:', error);
      toast.error('Error al cargar datos de prueba');
    }
  };



  const addOverdueInstallmentSale = async () => {
    try {
      if (!(window as any)?.electronAPI?.database) {
        toast.error('Entorno no soportado: APIs de Electron no disponibles');
        return;
      }
      const customers = await window.electronAPI.database.customers.getAll();
      const products = await window.electronAPI.database.products.getAll();

      if (customers.length === 0 || products.length === 0) {
        toast.error('Necesitas al menos un cliente y un producto');
        return;
      }

      const saleData: SaleFormData = {
        customer_id: customers[0]?.id!,
        items: [
          {
            product_id: products[0]?.id ?? null,
            quantity: 1,
            unit_price: Number(products[0]?.price) || 10000, // Coerción robusta
          }
        ],
        payment_type: 'installments',
        number_of_installments: 6,
        notes: 'Venta de prueba con primera cuota vencida'
      };

      const saleId = await window.electronAPI.database.sales.create(saleData);

      const installments = await window.electronAPI.database.installments.getBySale(saleId);
      if (installments && installments.length > 0) {
        const first = [...installments].sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0))[0];
        const now = new Date();
        const past = new Date(now);
        past.setMonth(now.getMonth() - 1);
        const pastDate = past.toISOString().split('T')[0];
        await window.electronAPI.database.installments.update(first.id!, { due_date: pastDate, status: 'overdue' });
      }

      dataCache.invalidateCache('sales');
      await loadSales(true);
      await loadOverdueSales();
      if (installmentDashboardRef.current) {
        installmentDashboardRef.current.refreshData();
      }
      toast.success('Venta en cuotas con primera cuota atrasada creada');
    } catch (error) {
      console.error('Error creando venta atrasada:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error creando la venta atrasada: ${message}`);
    }
  };



  const addCurrentMonthPendingInstallment = async () => {
    try {
      if (!(window as any)?.electronAPI?.database) {
        toast.error('Entorno no soportado: APIs de Electron no disponibles');
        return;
      }
      const customers = await window.electronAPI.database.customers.getAll();
      const products = await window.electronAPI.database.products.getAll();

      if (customers.length === 0 || products.length === 0) {
        toast.error('Necesitas al menos un cliente y un producto');
        return;
      }

      const firstCustomer = customers[0]!;
      const unitPrice = Number(products[0]?.price) || 10000;

      const saleData: SaleFormData = {
        customer_id: firstCustomer.id!,
        items: [
          { product_id: products[0]?.id ?? null, quantity: 1, unit_price: unitPrice }
        ],
        payment_type: 'installments',
        number_of_installments: 1,
        notes: 'Venta de prueba con cuota pendiente en el mes actual'
      };

      const saleId = await window.electronAPI.database.sales.create(saleData);

      const installments = await window.electronAPI.database.installments.getBySale(saleId);
      if (installments && installments.length > 0) {
        const inst = installments[0];

        const now = new Date();
        const targetYear = now.getFullYear();
        const targetMonth = now.getMonth();
        const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();

        const anchorDay = firstCustomer.payment_window === '1 to 10' ? 10
          : firstCustomer.payment_window === '20 to 30' ? 30
          : 30;

        const day = Math.min(anchorDay, lastDay);
        const dueDate = new Date(targetYear, targetMonth, day).toISOString().split('T')[0];

        await window.electronAPI.database.installments.update(inst.id!, { due_date: dueDate, status: 'pending' });
      }

      dataCache.invalidateCache('sales');
      await loadSales(true);
      await loadOverdueSales();
      if (installmentDashboardRef.current) {
        installmentDashboardRef.current.refreshData();
      }
      toast.success('Cuota pendiente de este mes creada');
    } catch (error) {
      console.error('Error creando cuota pendiente este mes:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error creando la cuota pendiente: ${message}`);
    }
  };



  const stats = {
    totalSales: sales.length,
    totalRevenue: sales.reduce((sum, sale) => sum + sale.total_amount, 0),
    installmentSales: sales.filter(sale => sale.payment_type === 'installments').length,
    overdueSales: overdueSales,
    paidSales: sales.filter(sale => sale.payment_status === 'paid').length,
    pendingSales: sales.filter(sale => sale.payment_status === 'unpaid').length
  };



  if (!hasHydrated) {
    return <SalesSkeleton />;
  }



  if (!isElectron) {
    return <SalesSkeleton />;
  }

  return (
    <DashboardLayout>
      <div className="p-8 short:p-4">
        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);


          if (value === 'sales') {
            dataCache.invalidateCache('sales');
            loadSales();
            loadOverdueSales();
            setRefreshCounter(prev => prev + 1);
          }
        }} className="space-y-6">
          <TabsList>
            <TabsTrigger value="sales">Todas las ventas</TabsTrigger>
            <TabsTrigger value="installments">Cuotas</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl short:text-2xl font-bold tracking-tight">Ventas</h1>
                  <p className="text-muted-foreground">
                    Acá podes gestionar todas tus ventas, crear nuevas, editar o eliminar las existentes.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddSale}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva venta
                  </Button>
                  {SHOW_MOCK_BUTTONS && (
                    <>
                    
                    <Button onClick={addMockSales} variant="outline" className="gap-2">
                      <Database className="h-4 w-4" />
                      Cargar ventas de prueba
                    </Button>
                    
                  <Button
                    onClick={addOverdueInstallmentSale}
                    variant="outline"
                    className="gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Crear venta en cuotas atrasada 1 mes
                  </Button>
                  <Button
                    onClick={addCurrentMonthPendingInstallment}
                    variant="outline"
                    className="gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Crear cuota impaga de este mes
                  </Button>
                  </>

                    
                  )}

                </div>
              </div>
            </div>

            {/* Removed in-page partner tabs; selection comes from sidebar */}

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Ventas</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSales}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />
                    Total de ventas registradas
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Ganancias totales</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${stats.totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3 mr-1 text-green-500" />
                    Ganancias totales de todas las ventas
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Ventas en cuotas</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.installmentSales}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1 text-purple-500" />
                    Ventas con planes de cuotas activas
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Cuotas atrasadas</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.overdueSales}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
                    Cuotas con pagos atrasados, revisar planes de cuotas
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
            <SalesTable
              key={refreshCounter}
              sales={(selectedPartnerId ? sales.filter(s => (s.partner_id || 0) === selectedPartnerId) : sales)}
              highlightId={highlightId}
              onEdit={handleEditSale}
              onDelete={handleDeleteSale}
              onBulkDelete={handleBulkDeleteSales}
              onBulkStatusUpdate={handleBulkStatusUpdate}
              isLoading={isLoading}
              currentPage={currentPage}
              onPageChange={(page) => setCurrentPage(page)}
              paginationInfo={paginationInfo}
              serverSidePagination={false}
            />
            </div>
          </TabsContent>

          <TabsContent value="installments" className="-m-8">
            <div className="px-8">
              <InstallmentDashboard
                ref={installmentDashboardRef}
                highlightId={highlightId}
                partnerId={selectedPartnerId}
                onRefresh={() => {
                  dataCache.invalidateCache('sales');
                  loadSales();
                  loadOverdueSales();
                  setRefreshCounter(prev => prev + 1);
                }}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Sale Form Dialog */}
        <SaleForm
          sale={editingSale}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSave={handleSaveSale}
        />
      </div>
    </DashboardLayout>
  );
}