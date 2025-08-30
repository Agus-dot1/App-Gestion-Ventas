'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  User, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  FileText, 
  Package, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Printer,
  Download,
  Copy,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Sale, Customer, SaleItem, Installment } from '@/lib/database-operations';
import { cn } from '@/lib/utils';

interface SaleDetailModalProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (sale: Sale) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getPaymentStatusBadge(status: Sale['payment_status']) {
  const variants = {
    paid: { variant: 'default' as const, label: 'Pagado', icon: CheckCircle, color: 'text-green-600' },
    partial: { variant: 'secondary' as const, label: 'Parcial', icon: Clock, color: 'text-yellow-600' },
    unpaid: { variant: 'destructive' as const, label: 'Pendiente', icon: XCircle, color: 'text-red-600' },
    overdue: { variant: 'destructive' as const, label: 'Vencido', icon: AlertTriangle, color: 'text-red-700' }
  };
  return variants[status] || variants.unpaid;
}

function getPaymentTypeBadge(type: Sale['payment_type']) {
  const variants = {
    cash: { variant: 'outline' as const, label: 'Efectivo' },
    credit: { variant: 'secondary' as const, label: 'Crédito' },
    installments: { variant: 'default' as const, label: 'Cuotas' },
    mixed: { variant: 'secondary' as const, label: 'Mixto' }
  };
  return variants[type] || variants.cash;
}

function getStatusBadge(status: Sale['status']) {
  const variants = {
    pending: { variant: 'secondary' as const, label: 'Pendiente', color: 'text-yellow-600' },
    completed: { variant: 'default' as const, label: 'Completada', color: 'text-green-600' },
    cancelled: { variant: 'destructive' as const, label: 'Cancelada', color: 'text-red-600' },
    refunded: { variant: 'outline' as const, label: 'Reembolsada', color: 'text-blue-600' }
  };
  return variants[status] || variants.pending;
}

export function SaleDetailModal({ sale, open, onOpenChange, onEdit }: SaleDetailModalProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  useEffect(() => {
    if (sale && open && typeof window !== 'undefined' && window.electronAPI) {
      loadSaleDetails();
    }
  }, [sale, open]);

  const loadSaleDetails = async () => {
    if (!sale) return;
    
    setIsLoading(true);
    try {
      // Load customer details
      if (sale.customer_id) {
        const customerData = await window.electronAPI.database.customers.getById(sale.customer_id);
        setCustomer(customerData);
      }

      // Load sale items
      try {
        if (window.electronAPI.database.saleItems) {
          const items = await window.electronAPI.database.saleItems.getBySale(sale.id!);
          setSaleItems(items);
        }
      } catch (error) {
        console.warn('Sale items API not available:', error);
        setSaleItems([]);
      }

      // Load installments if payment type is installments
      if (sale.payment_type === 'installments') {
        const installmentData = await window.electronAPI.database.installments.getBySale(sale.id!);
        setInstallments(installmentData);
      }
    } catch (error) {
      console.error('Error loading sale details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportToPDF = () => {
    try {
      const doc = new jsPDF();
      let yPosition = 20;

      // Add title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalle de Venta', 14, yPosition);
      yPosition += 10;

      // Add sale info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Venta #${sale?.sale_number ?? 'N/A'}`, 14, yPosition);
      doc.text(`Fecha: ${sale?.date ? formatDate(sale.date) : 'N/A'}`, 120, yPosition);
      yPosition += 8;

      // Add customer info
      if (customer) {
        doc.text(`Cliente: ${customer.name}`, 14, yPosition);
        yPosition += 6;
        if (customer.email) {
          doc.text(`Email: ${customer.email}`, 14, yPosition);
          yPosition += 6;
        }
        if (customer.phone) {
          doc.text(`Teléfono: ${customer.phone}`, 14, yPosition);
          yPosition += 6;
        }
      }
      yPosition += 5;

      // Add financial summary
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen Financiero:', 14, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      
      const financialData = [
        ['Subtotal', formatCurrency(sale?.subtotal ?? 0)],
        ['Impuestos', formatCurrency(sale?.tax_amount ?? 0)],
        ['Descuento', formatCurrency(sale?.discount_amount ?? 0)],
        ['Total', formatCurrency(sale?.total_amount ?? 0)]
      ];

      autoTable(doc, {
        body: financialData,
        startY: yPosition,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40 },
          1: { halign: 'right', cellWidth: 40 }
        },
        margin: { left: 14 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Add payment info
      const paymentInfo = [
        ['Método de Pago', sale?.payment_type ? getPaymentTypeBadge(sale.payment_type).label : 'N/A'],
        ['Estado de Pago', sale?.payment_status ? getPaymentStatusBadge(sale.payment_status).label : 'N/A'],
        ['Estado', sale?.status ? getStatusBadge(sale.status).label : 'N/A']
      ];

      autoTable(doc, {
        body: paymentInfo,
        startY: yPosition,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40 },
          1: { cellWidth: 40 }
        },
        margin: { left: 14 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Add products table if available
      if (saleItems.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Productos:', 14, yPosition);
        yPosition += 5;

        const productsData = saleItems.map(item => [
          item.product_name || 'Producto',
          item.quantity.toString(),
          formatCurrency(item.unit_price),
          item.discount_per_item > 0 ? formatCurrency(item.discount_per_item) : '-',
          formatCurrency(item.line_total)
        ]);

         autoTable(doc, {
            head: [['Producto', 'Cant.', 'Precio Unit.', 'Descuento', 'Total']],
            body: productsData,
            startY: yPosition,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] },
            columnStyles: {
              0: { cellWidth: 60 },
              1: { halign: 'center', cellWidth: 20 },
              2: { halign: 'right', cellWidth: 35 },
              3: { halign: 'right', cellWidth: 35 },
              4: { halign: 'right', cellWidth: 35 }
            },
            margin: { left: 14, right: 14 }
          });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Add installments table if available
      if (installments.length > 0) {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text('Cuotas:', 14, yPosition);
        yPosition += 5;

        const installmentsData = installments.map(installment => [
          installment.installment_number.toString(),
          formatDate(installment.due_date),
          formatCurrency(installment.amount),
          formatCurrency(installment.paid_amount),
          formatCurrency(installment.balance),
          installment.status
        ]);

         autoTable(doc, {
            head: [['#', 'Vencimiento', 'Monto', 'Pagado', 'Balance', 'Estado']],
            body: installmentsData,
            startY: yPosition,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] },
            columnStyles: {
              0: { halign: 'center', cellWidth: 15 },
              1: { cellWidth: 35 },
              2: { halign: 'right', cellWidth: 30 },
              3: { halign: 'right', cellWidth: 30 },
              4: { halign: 'right', cellWidth: 30 },
              5: { cellWidth: 25 }
            },
            margin: { left: 14, right: 14 }
          });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Add notes if available
      if (sale?.notes) {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text('Notas:', 14, yPosition);
        yPosition += 8;
        doc.setFont('helvetica', 'normal');
        
        const splitNotes = doc.splitTextToSize(sale.notes, 180);
        doc.text(splitNotes, 14, yPosition);
      }

      // Save the PDF
      doc.save(`venta-${sale?.sale_number ?? 'unknown'}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar los datos de la venta');
    }
  };

  const handleExportToExcel = () => {
    try {
      // Prepare sale data for Excel
      const saleData = {
        'Número de Venta': sale?.sale_number ?? 'N/A',
        'Fecha': sale?.date ? formatDate(sale.date) : 'N/A',
        'Cliente': customer?.name || 'N/A',
        'Email': customer?.email || 'N/A',
        'Teléfono': customer?.phone || 'N/A',
        'Dirección': customer?.address || 'N/A',
        'Subtotal': formatCurrency(sale?.subtotal ?? 0),
        'Impuestos': formatCurrency(sale?.tax_amount ?? 0),
        'Descuento': formatCurrency(sale?.discount_amount ?? 0),
        'Total': formatCurrency(sale?.total_amount ?? 0),
        'Método de Pago': sale?.payment_type ? getPaymentTypeBadge(sale.payment_type).label : 'N/A',
        'Estado de Pago': sale?.payment_status ? getPaymentStatusBadge(sale.payment_status).label : 'N/A',
        'Estado': sale?.status ? getStatusBadge(sale.status).label : 'N/A',
        'Notas': sale?.notes || ''
      };

      const workbook = XLSX.utils.book_new();

      // Add sale details sheet
      const saleSheet = XLSX.utils.json_to_sheet([saleData]);
      XLSX.utils.book_append_sheet(workbook, saleSheet, 'Detalle de Venta');

      // Add products sheet if available
      if (saleItems.length > 0) {
        const productsData = saleItems.map(item => ({
          'Producto': item.product_name || 'Producto',
          'Cantidad': item.quantity,
          'Precio Unitario': item.unit_price,
          'Descuento': item.discount_per_item,
          'Total': item.line_total
        }));
        const productsSheet = XLSX.utils.json_to_sheet(productsData);
        XLSX.utils.book_append_sheet(workbook, productsSheet, 'Productos');
      }

      // Add installments sheet if available
      if (installments.length > 0) {
        const installmentsData = installments.map(installment => ({
          'Cuota': installment.installment_number,
          'Vencimiento': formatDate(installment.due_date),
          'Monto': installment.amount,
          'Pagado': installment.paid_amount,
          'Balance': installment.balance,
          'Estado': installment.status
        }));
        const installmentsSheet = XLSX.utils.json_to_sheet(installmentsData);
        XLSX.utils.book_append_sheet(workbook, installmentsSheet, 'Cuotas');
      }

      // Save the Excel file
      XLSX.writeFile(workbook, `venta-${sale?.sale_number ?? 'unknown'}-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al exportar los datos de la venta a Excel');
    }
  };

  if (!sale) return null;

  const paymentStatusBadge = getPaymentStatusBadge(sale.payment_status);
  const paymentTypeBadge = getPaymentTypeBadge(sale.payment_type);
  const statusBadge = getStatusBadge(sale.status);
  const StatusIcon = paymentStatusBadge.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Venta #{sale.sale_number}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(sale.date)}
                  {sale.due_date && (
                    <>
                      <span>•</span>
                      <span>Vence: {formatDate(sale.due_date)}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportToPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </div>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(sale)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-6">
            {/* Status and Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <StatusIcon className={cn("w-4 h-4", paymentStatusBadge.color)} />
                    Estado de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={paymentStatusBadge.variant}>
                    {paymentStatusBadge.label}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(sale.total_amount)}</div>
                  {sale.advance_installments > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Cuotas adelantadas: {sale.advance_installments}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Método de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={paymentTypeBadge.variant}>
                    {paymentTypeBadge.label}
                  </Badge>
                  {sale.payment_type === 'installments' && sale.number_of_installments && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {sale.number_of_installments} cuotas
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Detalles</TabsTrigger>
                <TabsTrigger value="customer">Cliente</TabsTrigger>
                <TabsTrigger value="items">Productos</TabsTrigger>
                {sale.payment_type === 'installments' && (
                  <TabsTrigger value="installments">Cuotas</TabsTrigger>
                )}
              </TabsList>

              {/* Sale Details Tab */}
              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Información de la Venta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Número de Venta:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{sale.sale_number}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(sale.sale_number, 'sale_number')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Fecha de Venta:</span>
                          <span className="text-sm">{formatDate(sale.date)}</span>
                        </div>
                        {sale.due_date && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Fecha de Vencimiento:</span>
                            <span className="text-sm">{formatDate(sale.due_date)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Estado:</span>
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Subtotal:</span>
                          <span className="text-sm">{formatCurrency(sale.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Impuestos:</span>
                          <span className="text-sm">{formatCurrency(sale.tax_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Descuento:</span>
                          <span className="text-sm">{formatCurrency(sale.discount_amount)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>{formatCurrency(sale.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                    {sale.notes && (
                      <div className="mt-4">
                        <span className="text-sm font-medium">Notas:</span>
                        <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-md">
                          {sale.notes}
                        </p>
                      </div>
                    )}
                    {(sale.created_at || sale.updated_at) && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="grid gap-2 text-xs text-muted-foreground">
                          {sale.created_at && (
                            <div>Creado: {formatDateTime(sale.created_at)}</div>
                          )}
                          {sale.updated_at && (
                            <div>Actualizado: {formatDateTime(sale.updated_at)}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Customer Tab */}
              <TabsContent value="customer" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Información del Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-4 w-52" />
                      </div>
                    ) : customer ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{customer.name}</h3>
                            {customer.company && (
                              <p className="text-sm text-muted-foreground">{customer.company}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-3">
                          {customer.email && (
                            <div className="flex items-center gap-3">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span 
                                className="text-sm cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors"
                                onClick={() => copyToClipboard(customer.email!, 'email')}
                                title="Clic para copiar"
                              >
                                {customer.email}
                              </span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span 
                                className="text-sm cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors"
                                onClick={() => copyToClipboard(customer.phone!, 'phone')}
                                title="Clic para copiar"
                              >
                                {customer.phone}
                              </span>
                            </div>
                          )}
                          {customer.address && (
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span 
                                className="text-sm cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors"
                                onClick={() => copyToClipboard(customer.address!, 'address')}
                                title="Clic para copiar"
                              >
                                {customer.address}
                              </span>
                            </div>
                          )}
                        </div>
                        {customer.notes && (
                          <div className="mt-4">
                            <span className="text-sm font-medium">Notas del Cliente:</span>
                            <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-md">
                              {customer.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No se encontró información del cliente</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Items Tab */}
              <TabsContent value="items" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Productos Vendidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex justify-between items-center">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        ))}
                      </div>
                    ) : saleItems.length > 0 ? (
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead className="text-center">Cantidad</TableHead>
                              <TableHead className="text-right">Precio Unit.</TableHead>
                              <TableHead className="text-right">Descuento</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {saleItems.map((item, index) => (
                              <TableRow key={item.id || index}>
                                <TableCell className="font-medium">
                                  {item.product_name || `Producto ID: ${item.product_id}`}
                                </TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.unit_price)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.discount_per_item || 0)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(item.line_total)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="flex justify-end pt-4 border-t">
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              Total de productos: {saleItems.reduce((sum, item) => sum + item.quantity, 0)}
                            </div>
                            <div className="text-lg font-semibold">
                              Subtotal: {formatCurrency(sale.subtotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No se encontraron productos en esta venta</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Installments Tab */}
              {sale.payment_type === 'installments' && (
                <TabsContent value="installments" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Plan de Cuotas
                      </CardTitle>
                      <CardDescription>
                        {sale.number_of_installments} cuotas de {formatCurrency(Math.round(sale.installment_amount || 0))}
                        {sale.advance_installments > 0 && (
                          <span> + {sale.advance_installments} cuotas adelantadas</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex justify-between items-center">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-6 w-16" />
                            </div>
                          ))}
                        </div>
                      ) : installments.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cuota</TableHead>
                              <TableHead>Fecha de Vencimiento</TableHead>
                              <TableHead className="text-right">Monto</TableHead>
                              <TableHead className="text-center">Estado</TableHead>
                              <TableHead>Fecha de Pago</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {installments.map((installment, index) => {
                              const isOverdue = installment.status === 'pending' && 
                                new Date(installment.due_date) < new Date();
                              
                              return (
                                <TableRow key={installment.id || index}>
                                  <TableCell className="font-medium">
                                    Cuota {installment.installment_number}
                                  </TableCell>
                                  <TableCell>
                                    <div className={cn(
                                      "text-sm",
                                      isOverdue && "text-red-600 font-medium"
                                    )}>
                                      {formatDate(installment.due_date)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(installment.amount)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge 
                                      variant={
                                        installment.status === 'paid' ? 'default' :
                                        isOverdue ? 'destructive' : 'secondary'
                                      }
                                    >
                                      {installment.status === 'paid' ? 'Pagada' :
                                       isOverdue ? 'Vencida' : 'Pendiente'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {installment.paid_date ? (
                                      <span className="text-sm text-green-600">
                                        {formatDate(installment.paid_date)}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8">
                          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No se encontraron cuotas para esta venta</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}