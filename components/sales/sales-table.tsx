'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, MoreHorizontal, Edit, Trash2, Eye, CreditCard, Calendar, DollarSign, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Sale } from '@/lib/database-operations';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SalesBulkOperations } from './sales-bulk-operations';
import { SalesColumnToggle, type ColumnVisibility } from './sales-column-toggle';
import { SaleDetailModal } from './sale-detail-modal';

interface SalesTableProps {
  sales: Sale[];
  highlightId?: string | null;
  onEdit: (sale: Sale) => void;
  onDelete: (saleId: number) => void;
  onBulkDelete?: (saleIds: number[]) => Promise<void>;
  onBulkStatusUpdate?: (saleIds: number[], status: Sale['payment_status']) => Promise<void>;
  isLoading?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  paginationInfo?: { total: number; totalPages: number; currentPage: number; pageSize: number };
  serverSidePagination?: boolean;
}

export function SalesTable({ 
  sales, 
  highlightId, 
  onEdit, 
  onDelete,
  onBulkDelete,
  onBulkStatusUpdate, 
  isLoading = false,
  searchTerm: externalSearchTerm,
  onSearchChange,
  currentPage,
  onPageChange,
  paginationInfo,
  serverSidePagination = false
}: SalesTableProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const searchTerm = serverSidePagination ? (externalSearchTerm || '') : internalSearchTerm;
  const [deleteSale, setDeleteSale] = useState<Sale | null>(null);
  const [selectedSales, setSelectedSales] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof Sale; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    sale_number: true,
    customer_name: true,
    date: true,
    payment_type: true,
    total_amount: true,
    payment_status: true
  });
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const filteredSales = serverSidePagination ? sales : sales.filter(sale =>
    sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort sales (only for client-side)
  const sortedSales = useMemo(() => {
    if (serverSidePagination) return filteredSales;
    
    const sorted = [...filteredSales];
    sorted.sort((a, b) => {
      let aValue, bValue;
      
      // Map sort keys to actual object properties
      switch (sortConfig.key) {
        case 'date':
          aValue = a.date;
          bValue = b.date;
          break;
        default:
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
      }
      
      // Handle different data types
      if (sortConfig.key === 'total_amount' || sortConfig.key === 'advance_installments') {
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      if (sortConfig.key === 'date') {
        const aDate = new Date(aValue as string);
        const bDate = new Date(bValue as string);
        return sortConfig.direction === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
      }
      
      // String comparison for other fields
      const aStr = aValue.toString().toLowerCase();
      const bStr = bValue.toString().toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
    return sorted;
  }, [filteredSales, sortConfig, serverSidePagination]);

  const handleDelete = async () => {
    if (deleteSale?.id) {
      await onDelete(deleteSale.id);
      setDeleteSale(null);
      // Remove from selection if it was selected
      setSelectedSales(prev => {
        const newSet = new Set(prev);
        newSet.delete(deleteSale.id!);
        return newSet;
      });
    }
  };

  const handleSelectSale = (saleId: number | undefined, checked: boolean) => {
    if (saleId === undefined) return;
    
    const newSelected = new Set(selectedSales);
    if (checked) {
      newSelected.add(saleId);
    } else {
      newSelected.delete(saleId);
    }
    setSelectedSales(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSales(new Set(sortedSales.map(s => s.id).filter(id => id !== undefined) as number[]));
    } else {
      setSelectedSales(new Set());
    }
  };

  const isAllSelected = sortedSales.length > 0 && selectedSales.size === sortedSales.filter(s => s.id !== undefined).length;

  // Sort function
  const handleSort = (key: keyof Sale) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get sort icon
  const getSortIcon = (key: keyof Sale) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleBulkDelete = async (saleIds: number[]) => {
    if (onBulkDelete) {
      await onBulkDelete(saleIds);
    }
  };

  const handleBulkStatusUpdate = async (saleIds: number[], status: Sale['payment_status']) => {
    if (onBulkStatusUpdate) {
      await onBulkStatusUpdate(saleIds, status);
    }
  };

  const clearSelection = () => {
    setSelectedSales(new Set());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      paid: 'default',
      partial: 'secondary',
      unpaid: 'destructive',
      overdue: 'destructive'
    } as const;

    const colors = {
      paid: 'bg-green-100 text-green-800 hover:bg-green-200',
      partial: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      unpaid: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      overdue: 'bg-red-100 text-red-800 hover:bg-red-200'
    } as const;

    const statusLabels = {
      paid: 'Pagado',
      partial: 'Parcial',
      unpaid: 'Sin pagar',
      overdue: 'Vencido'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]} className={colors[status as keyof typeof colors]}>
        {statusLabels[status as keyof typeof statusLabels] || status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentTypeBadge = (type: string) => {
    const colors = {
      cash: 'bg-blue-100 text-blue-800',
      installments: 'bg-purple-100 text-purple-800',
      credit: 'bg-orange-100 text-orange-800',
    } as const;

    const typeLabels = {
      cash: 'Efectivo',
      installments: 'Cuotas',
      credit: 'Crédito',
    } as const;

    return (
      <Badge variant="outline" className={colors[type as keyof typeof colors]}>
        {typeLabels[type as keyof typeof typeLabels] || type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Ventas
              </CardTitle>
              <CardDescription>
                Lista de todas las ventas registradas.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <SalesColumnToggle
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
              />
              {selectedSales.size > 0 && onBulkDelete && onBulkStatusUpdate && (
                <SalesBulkOperations
                  selectedSales={selectedSales}
                  sales={sales}
                  onBulkDelete={handleBulkDelete}
                  onBulkStatusUpdate={handleBulkStatusUpdate}
                  onClearSelection={clearSelection}
                  isLoading={isLoading}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {onBulkDelete && onBulkStatusUpdate && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Seleccionar todas"
                          disabled={isLoading}
                        />
                      </TableHead>
                    )}
                    {columnVisibility.sale_number && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('sale_number')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Venta #
                          {getSortIcon('sale_number')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.customer_name && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('customer_name')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Cliente
                          {getSortIcon('customer_name')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.date && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('date')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Fecha
                          {getSortIcon('date')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.payment_type && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('payment_type')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Método de pago
                          {getSortIcon('payment_type')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.total_amount && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('total_amount')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Total
                          {getSortIcon('total_amount')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.payment_status && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('payment_status')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Estado del pago
                          {getSortIcon('payment_status')}
                        </Button>
                      </TableHead>
                    )}
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {onBulkDelete && onBulkStatusUpdate && (
                        <TableCell>
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                      )}
                      {columnVisibility.sale_number && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.customer_name && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-6 h-6 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.date && (
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                      )}
                      {columnVisibility.payment_type && (
                        <TableCell>
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </TableCell>
                      )}
                      {columnVisibility.total_amount && (
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                      )}
                      {columnVisibility.payment_status && (
                        <TableCell>
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </TableCell>
                      )}
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : sortedSales.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron ventas</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No se encontraron ventas con esos criterios.' : '¡Crea tu primera venta!'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {onBulkDelete && onBulkStatusUpdate && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Seleccionar todas"
                          disabled={isLoading}
                        />
                      </TableHead>
                    )}
                    {columnVisibility.sale_number && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('sale_number')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Venta #
                          {getSortIcon('sale_number')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.customer_name && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('customer_name')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Cliente
                          {getSortIcon('customer_name')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.date && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('date')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Fecha
                          {getSortIcon('date')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.payment_type && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('payment_type')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Método de pago
                          {getSortIcon('payment_type')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.total_amount && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('total_amount')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Total
                          {getSortIcon('total_amount')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.payment_status && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleSort('payment_status')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Estado del pago
                          {getSortIcon('payment_status')}
                        </Button>
                      </TableHead>
                    )}
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSales.map((sale) => (
                    <TableRow 
                      key={sale.id} 
                      id={`venta-${sale.id}`}
                      className={cn(
                        highlightId === sale.id?.toString() && 'bg-primary/5'
                      )}
                    >
                      {onBulkDelete && onBulkStatusUpdate && (
                        <TableCell>
                          <Checkbox
                            checked={sale.id ? selectedSales.has(sale.id) : false}
                            onCheckedChange={(checked) => handleSelectSale(sale.id, checked as boolean)}
                            aria-label={`Seleccionar venta ${sale.sale_number}`}
                            disabled={isLoading}
                          />
                        </TableCell>
                      )}
                      {columnVisibility.sale_number && (
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <CreditCard className="w-4 h-4 text-primary" />
                            </div>
                            {sale.sale_number}
                            {highlightId === sale.id?.toString() && (
                              <Badge variant="outline" className="bg-primary/10 text-primary">
                                Econtrado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.customer_name && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {sale.customer_name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            {sale.customer_name}
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.date && (
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {formatDate(sale.date)}
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.payment_type && (
                        <TableCell>
                          {getPaymentTypeBadge(sale.payment_type)}
                          {sale.payment_type === 'installments' && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {sale.number_of_installments} pagos
                            </div>
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.total_amount && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-medium">{formatCurrency(sale.total_amount)}</span>
                          </div>
                          {sale.payment_type === 'installments' && sale.advance_installments > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Cuotas adelantadas: {sale.advance_installments}
                            </div>
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.payment_status && (
                        <TableCell>
                          {getPaymentStatusBadge(sale.payment_status)}
                        </TableCell>
                      )}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setDetailSale(sale);
                              setIsDetailModalOpen(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(sale)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteSale(sale)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {serverSidePagination && paginationInfo && paginationInfo.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex-1 text-sm text-muted-foreground">
            Mostrando {((paginationInfo.currentPage - 1) * paginationInfo.pageSize) + 1} a{' '}
            {Math.min(paginationInfo.currentPage * paginationInfo.pageSize, paginationInfo.total)} de{' '}
            {paginationInfo.total} ventas
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange && onPageChange(paginationInfo.currentPage - 1)}
                disabled={paginationInfo.currentPage <= 1}
              >
                <span className="sr-only">Ir a la página anterior</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Página {paginationInfo.currentPage} de {paginationInfo.totalPages}
              </div>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange && onPageChange(paginationInfo.currentPage + 1)}
                disabled={paginationInfo.currentPage >= paginationInfo.totalPages}
              >
                <span className="sr-only">Ir a la página siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSale} onOpenChange={() => setDeleteSale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar venta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la venta <strong>{deleteSale?.sale_number}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-slate-50">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sale Detail Modal */}
      <SaleDetailModal
        sale={detailSale}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onEdit={(sale) => {
          setIsDetailModalOpen(false);
          onEdit(sale);
        }}
      />
    </>
  );
}