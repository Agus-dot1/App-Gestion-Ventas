'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SaleForm } from '@/components/sales/sale-form';
import { SalesTable } from '@/components/sales/sales-table';
import { InstallmentDashboard } from '@/components/sales/installment-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, CreditCard, TrendingUp, DollarSign, Calendar, Database, AlertTriangle } from 'lucide-react';
import type { Sale } from '@/lib/database-operations';

export default function SalesPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const tabParam = searchParams.get('tab');
  const [sales, setSales] = useState<Sale[]>([]);
  const [overdueSales, setOverdueSales] = useState<Sale[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | undefined>();
  const [isElectron, setIsElectron] = useState(false);
  const [activeTab, setActiveTab] = useState(tabParam || 'sales');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState<{ total: number; totalPages: number; currentPage: number; pageSize: number } | undefined>(undefined);
  const pageSize = 25;

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
    if (typeof window !== 'undefined' && window.electronAPI) {
      loadSales();
      loadOverdueSales();
    }
  }, []);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (isElectron) {
      loadSales();
    }
  }, [searchTerm, currentPage, isElectron]);

  // Highlight sale if specified in URL
  const highlightedSale = useMemo(() => {
    if (!highlightId) return null;
    return sales.find(sale => sale.id?.toString() === highlightId);
  }, [sales, highlightId]);

  useEffect(() => {
    if (highlightedSale) {
      // Scroll to highlighted sale after a short delay
      setTimeout(() => {
        const element = document.getElementById(`venta-${highlightedSale.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 100);
    }
  }, [highlightedSale]);
  const loadSales = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.database.sales.getPaginated(currentPage, pageSize, searchTerm);
      setSales(result.sales);
      setPaginationInfo({
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize
      });
    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOverdueSales = async () => {
    try {
      const overdue = await window.electronAPI.database.sales.getOverdueSales();
      setOverdueSales(overdue);
    } catch (error) {
      console.error('Error cargando pagos atrasados:', error);
    }
  };

  const handleSaveSale = async (saleData: any) => {
    try {
      if (editingSale?.id) {
        // Update existing sale
        await window.electronAPI.database.sales.update(editingSale.id, saleData);
      } else {
        // Create new sale
        await window.electronAPI.database.sales.create(saleData);
      }
      
      await loadSales();
      await loadOverdueSales();
      setEditingSale(undefined);
    } catch (error) {
      console.error('Error guardando venta:', error);
    }
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setIsFormOpen(true);
  };

  const handleDeleteSale = async (saleId: number) => {
    try {
      await window.electronAPI.database.sales.delete(saleId);
      await loadSales();
      await loadOverdueSales();
    } catch (error) {
      console.error('Error eliminando venta:', error);
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
    }
  };

  // Calculate statistics
  const stats = {
    totalSales: sales.length,
    totalRevenue: sales.reduce((sum, sale) => sum + sale.total_amount, 0),
    installmentSales: sales.filter(sale => sale.payment_type === 'installments').length,
    overdueSales: overdueSales.length,
    paidSales: sales.filter(sale => sale.payment_status === 'paid').length,
    pendingSales: sales.filter(sale => sale.payment_status === 'unpaid' || sale.payment_status === 'partial').length
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
              <p className="text-muted-foreground">
                Acá podes gestionar todas tus ventas, crear nuevas, editar o eliminar las existentes. Ademas de seguir el estado de los pagos y planes de cuotas.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddSale} disabled={!isElectron}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva venta
              </Button>
            </div>
          </div>
        </div>

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

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="sales">Todas las ventas</TabsTrigger>
            <TabsTrigger value="installments">Cuotas</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            {isElectron ? (
              <SalesTable
                sales={sales}
                highlightId={highlightId}
                onEdit={handleEditSale}
                onDelete={handleDeleteSale}
                isLoading={isLoading}
                searchTerm={searchTerm}
                onSearchChange={(value) => setSearchTerm(value)}
                currentPage={currentPage}
                onPageChange={(page) => setCurrentPage(page)}
                paginationInfo={paginationInfo}
                serverSidePagination={true}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Electron Required</h3>
                    <p className="text-muted-foreground">
                      Sales management is only available in the Electron desktop app.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="installments">
            {isElectron ? (
              <InstallmentDashboard 
                highlightId={highlightId}
                onRefresh={() => { loadSales(); loadOverdueSales(); }} 
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Electron Required</h3>
                    <p className="text-muted-foreground">
                      Installment management is only available in the Electron desktop app.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
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