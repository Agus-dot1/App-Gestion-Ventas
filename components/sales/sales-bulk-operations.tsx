'use client';

import { useState } from 'react';
// Defer heavy PDF/Excel libraries until export is triggered
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Trash2, MoreHorizontal, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Sale } from '@/lib/database-operations';

interface SalesBulkOperationsProps {
  selectedSales: Set<number>;
  sales: Sale[];
  onBulkDelete: (saleIds: number[]) => Promise<void>;
  onBulkStatusUpdate: (saleIds: number[], status: Sale['payment_status']) => Promise<void>;
  onClearSelection: () => void;
  isLoading?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getPaymentStatusBadge(status: Sale['payment_status']) {
  const statusConfig = {
    paid: { label: 'Pagado', variant: 'default' as const, icon: CheckCircle },
    partial: { label: 'Parcial', variant: 'secondary' as const, icon: Clock },
    unpaid: { label: 'Pendiente', variant: 'outline' as const, icon: XCircle },
    overdue: { label: 'Vencido', variant: 'destructive' as const, icon: XCircle }
  };
  return statusConfig[status] || statusConfig.unpaid;
}

export function SalesBulkOperations({
  selectedSales,
  sales,
  onBulkDelete,
  onBulkStatusUpdate,
  onClearSelection,
  isLoading = false
}: SalesBulkOperationsProps) {
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<Sale['payment_status'] | ''>('');

  const selectedSalesData = sales.filter(sale => sale.id && selectedSales.has(sale.id));

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedSales);
    await onBulkDelete(selectedIds);
    onClearSelection();
    setShowBulkDeleteDialog(false);
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus) return;
    
    const selectedIds = Array.from(selectedSales);
    await onBulkStatusUpdate(selectedIds, bulkStatus);
    onClearSelection();
    setBulkStatus('');
  };

  const exportToPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Reporte de Ventas Seleccionadas', 14, 22);
    
    // Add summary
    const totalAmount = selectedSalesData.reduce((sum, sale) => sum + sale.total_amount, 0);
    doc.setFontSize(12);
    doc.text(`Total de ventas: ${selectedSalesData.length}`, 14, 35);
    doc.text(`Monto total: ${formatCurrency(totalAmount)}`, 14, 42);
    
    // Prepare data for table
    const tableData = selectedSalesData.map(sale => [
      sale.sale_number,
      sale.customer_name || 'N/A',
      formatDate(sale.date),
      getPaymentStatusBadge(sale.payment_status).label,
      formatCurrency(sale.total_amount)
    ]);
    
    // Add table
    autoTable(doc, {
      head: [['N° Venta', 'Cliente', 'Fecha', 'Estado', 'Total']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save('ventas_seleccionadas.pdf');
  };

  const exportToExcel = async () => {
    const worksheetData = selectedSalesData.map(sale => ({
      'N° Venta': sale.sale_number,
      'Cliente': sale.customer_name || 'N/A',
      'Fecha': formatDate(sale.date),
      'Fecha Vencimiento': sale.due_date ? formatDate(sale.due_date) : '',
      'Subtotal': sale.subtotal,
      'Total': sale.total_amount,
      'Tipo de Pago': sale.payment_type === 'cash' ? 'Efectivo' : 
                     sale.payment_type === 'installments' ? 'Cuotas' :
                     sale.payment_type === 'credit' ? 'Crédito' : 'Mixto',
      'Estado de Pago': getPaymentStatusBadge(sale.payment_status).label,
      'Cuotas': sale.number_of_installments || '',
      'Monto Cuota': sale.installment_amount ? Math.round(sale.installment_amount) : '',
      'Estado': sale.status === 'pending' ? 'Pendiente' :
               sale.status === 'completed' ? 'Completada' :
               sale.status === 'cancelled' ? 'Cancelada' : 'Reembolsada',
      'Notas': sale.notes || ''
    }));
    
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');
    
    XLSX.writeFile(workbook, 'ventas_seleccionadas.xlsx');
  };

  if (selectedSales.size === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 animate-in fade-in">
        
        <Button
          variant="outline"
          size="sm"
          onClick={exportToPDF}
          className="h-8"
          disabled={isLoading}
        >
          <FileText className="h-4 w-4 mr-1" />
          PDF
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={exportToExcel}
          className="h-8"
          disabled={isLoading}
        >
          <Download className="h-4 w-4 mr-1" />
          Excel
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8"
          disabled={isLoading}
        >
          Limpiar selección
        </Button>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
          {selectedSales.size} seleccionada{selectedSales.size !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ventas seleccionadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente {selectedSales.size} venta{selectedSales.size !== 1 ? 's' : ''} seleccionada{selectedSales.size !== 1 ? 's' : ''}.
              También se eliminarán todas las cuotas y elementos relacionados.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-red-600 hover:bg-red-700 text-slate-50"
              disabled={isLoading}
            >
              Eliminar {selectedSales.size} venta{selectedSales.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}