'use client';

import { useState } from 'react';
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

function getPaymentTypeLabel(type: Sale['payment_type']) {
  const types = {
    cash: 'Efectivo',
    installments: 'Cuotas',
  } as const;
  return types[type] || 'N/A';
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
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const now = new Date();
    const currencyTotal = selectedSalesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const unpaidTotal = selectedSalesData.filter(s => s.payment_status === 'unpaid').reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const paidTotal = selectedSalesData.filter(s => s.payment_status === 'paid').reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const overdueTotal = selectedSalesData.filter(s => s.payment_status === 'overdue').reduce((sum, s) => sum + (s.total_amount || 0), 0);

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Reporte de Ventas', 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generado: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 14, 22);
    doc.text(`Total de registros: ${selectedSalesData.length}`, 14, 28);

    // Summary block
    doc.setFontSize(10);
    doc.text(`Total general: ${formatCurrency(currencyTotal)}`, 120, 16);
    doc.text(`Pendiente: ${formatCurrency(unpaidTotal)}`, 120, 22);
    doc.text(`Pagado: ${formatCurrency(paidTotal)}`, 120, 28);
    doc.text(`Vencido: ${formatCurrency(overdueTotal)}`, 120, 34);

    // Table data
    const tableData = selectedSalesData.map(sale => [
      sale.sale_number,
      formatDate(sale.date),
      sale.customer_name || 'N/A',
      getPaymentTypeLabel(sale.payment_type) ?? 'N/A',
      getPaymentStatusBadge(sale.payment_status).label,
      formatCurrency(sale.total_amount),
      sale.partner_name ?? '—'
    ]);

    autoTable(doc, {
      head: [['N° Venta', 'Fecha', 'Cliente', 'Método', 'Estado', 'Total', 'Responsable']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 24 },
        2: { cellWidth: 45 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 28 }
      },
      didDrawPage: (data: any) => {
        const str = `Página ${(doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : (doc as any).internal?.pages?.length || 1}`;
        doc.setFontSize(9);
        doc.text(str, data.settings.margin.left, (doc as any).internal.pageSize.getHeight() - 8);
      },
      foot: [[
        '', '', '', '', 'Total general', formatCurrency(currencyTotal), ''
      ]],
      footStyles: { fillColor: [245, 245, 245], textColor: 20, fontStyle: 'bold' }
    });

    doc.save(`ventas_${now.toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    // Keep numbers as numbers so Excel can sum/filter properly
    const rows = selectedSalesData.map(sale => ({
      'N° Venta': sale.sale_number,
      'Fecha': XLSX.SSF.format('yyyy-mm-dd', new Date(sale.date)),
      'Cliente': sale.customer_name || 'N/A',
      'Método de Pago': getPaymentTypeLabel(sale.payment_type) ?? 'N/A',
      'Estado de Pago': getPaymentStatusBadge(sale.payment_status).label,
      'Subtotal': sale.subtotal ?? 0,
      'Total': sale.total_amount ?? 0,
      'Cuotas': sale.number_of_installments ?? '',
      'Monto Cuota': sale.installment_amount ?? '',
      'Responsable': sale.partner_name ?? '',
      'Notas': sale.notes ?? ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    // Header info
    const headers = Object.keys(rows[0] || {});

    // Column widths
    (worksheet as any)['!cols'] = [
      { wch: 10 }, // N° Venta
      { wch: 12 }, // Fecha
      { wch: 24 }, // Cliente
      { wch: 16 }, // Método
      { wch: 16 }, // Estado
      { wch: 12 }, // Subtotal
      { wch: 12 }, // Total
      { wch: 8 },  // Cuotas
      { wch: 12 }, // Monto Cuota
      { wch: 16 }, // Responsable
      { wch: 40 }, // Notas
    ];

    // AutoFilter over header row
    (worksheet as any)['!autofilter'] = { ref: `A1:${String.fromCharCode(64 + headers.length)}1` };

    // Append and write
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');

    // Summary sheet
    const total = selectedSalesData.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const unpaid = selectedSalesData.filter(s => s.payment_status === 'unpaid').reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const paid = selectedSalesData.filter(s => s.payment_status === 'paid').reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const overdue = selectedSalesData.filter(s => s.payment_status === 'overdue').reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['Resumen'],
      ['Total general', total],
      ['Pendiente', unpaid],
      ['Pagado', paid],
      ['Vencido', overdue],
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    XLSX.writeFile(workbook, `ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
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