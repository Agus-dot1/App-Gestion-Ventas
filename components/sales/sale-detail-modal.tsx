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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  const str = String(dateString);
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(str);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    return dt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  const dt = new Date(str);
  return dt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
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
    unpaid: { variant: 'destructive' as const, label: 'Pendiente', icon: XCircle, color: 'text-red-600' },
    overdue: { variant: 'destructive' as const, label: 'Vencido', icon: AlertTriangle, color: 'text-orange-600' }
  };
  return variants[status] || variants.unpaid;
}

function getPaymentTypeBadge(type: Sale['payment_type']) {
  const variants = {
    cash: { variant: 'outline' as const, label: 'Al Contado' },
    installments: { variant: 'default' as const, label: 'Cuotas' },
  };
  return variants[type] || variants.cash;
}

function getPaymentMethodLabel(method: Sale['payment_method'] | string | undefined) {
  if (method === 'bank_transfer') return 'Transferencia';
  if (method === 'cash') return 'Efectivo';
  if (method === 'credit_card') return 'Tarjeta de Crédito';
  if (method === 'debit_card') return 'Tarjeta de Débito';
  if (method === 'check') return 'Cheque';
  return 'N/A';
}

function getStatusBadge(status: Sale['status']) {
  const variants = {
    pending: { variant: 'secondary' as const, label: 'Pendiente', color: 'text-yellow-600' },
    completed: { variant: 'default' as const, label: 'Completada', color: 'text-green-600' }
  };
  return variants[status] || variants.pending;
}



function getInstallmentStatusLabel(status: Installment['status']): string {
  if (status === 'paid') return 'Pagada';
  if (status === 'overdue') return 'Vencida';
  return 'Pendiente';
}

export function SaleDetailModal({ sale, open, onOpenChange, onEdit }: SaleDetailModalProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTransactions, setDetailTransactions] = useState<any[]>([]);
  const [detailInstallment, setDetailInstallment] = useState<Installment | null>(null);
  const [detailPopoverId, setDetailPopoverId] = useState<number | null>(null);

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


      if (sale.customer_id) {
        const customerData = await window.electronAPI.database.customers.getById(sale.customer_id);
        setCustomer(customerData);
      }



      try {
        if (window.electronAPI.database.saleItems) {
          const items = await window.electronAPI.database.saleItems.getBySale(sale.id!);
          setSaleItems(items);
        }
      } catch (error) {
        console.warn('Sale items API not available:', error);
        setSaleItems([]);
      }



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

  const openInstallmentDetails = async (inst: Installment) => {
    try {
      const tx = await window.electronAPI.database.payments.getBySale(inst.sale_id);
      const related = (tx || [])
        .filter((t: any) => t.installment_id === inst.id && t.status === 'completed')
        .sort((a: any, b: any) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      const dedup = [] as any[];
      const seen = new Set<string>();
      for (const t of related) {
        const key = `${t.transaction_date}|${t.amount}|${t.payment_method}|${t.payment_reference || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dedup.push(t);
      }
      setDetailTransactions(dedup.slice(0, 5));
      setDetailInstallment(inst);
      setDetailPopoverId(inst.id!);
    } catch {
      setDetailTransactions([]);
      setDetailInstallment(inst);
      setDetailPopoverId(inst.id!);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportToPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let yPosition = 16;
      const now = new Date();



      autoTable(doc, {
        body: [[
          {
            content: 'Factura',
            styles: { halign: 'left', fontSize: 18, textColor: '#ffffff' }
          },
        ]],
        theme: 'plain',
        styles: { fillColor: '#1e1e1e' },
        margin: { left: 14, right: 14 },
        startY: yPosition
      });
      yPosition = (doc as any).lastAutoTable.finalY + 6;



      const billedTo = (
        'Facturado a:' +
        `\n${customer?.name ?? 'N/A'}` +
        (customer?.address ? `\n${customer.address}` : '') +
        (customer?.phone ? `\nTel: ${customer.phone}` : '') +
        (customer?.secondary_phone ? `\nTel 2: ${customer.secondary_phone}` : '')
      );

      const referenceBlock = (
        `Referencia: #${sale?.reference_code ?? sale?.sale_number ?? 'N/A'}` +
        `\nFecha: ${sale?.date ? formatDate(sale.date) : 'N/A'}` +
        `\nNúmero de factura: ${sale?.sale_number ?? 'N/A'}`
      );

      autoTable(doc, {
        body: [[
          { content: billedTo, styles: { halign: 'left' } },
          { content: referenceBlock, styles: { halign: 'right' } }
        ]],
        theme: 'plain',
        startY: yPosition,
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 'auto' }
        }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 8;


      const paymentInfo = [
        ['Método de Pago', sale?.payment_type ? getPaymentTypeBadge(sale.payment_type).label : 'N/A'],
        ['Método de cobro', sale?.payment_method ? getPaymentMethodLabel(sale.payment_method) : 'N/A'],
        ['Estado de Pago', sale?.payment_status ? getPaymentStatusBadge(sale.payment_status).label : 'N/A']
      ];

      autoTable(doc, {
        body: [
          [
            {
              content: paymentInfo.map(row => `${row[0]}: ${row[1]}`).join('\n'),
              styles: { halign: 'left', fontSize: 10 }
            },
          ]
        ],
        theme: 'plain',
        startY: yPosition,
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 'auto' }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;



      if (saleItems.length > 0) {
        autoTable(doc, {
          body: [[{ content: 'Producto(s)', styles: { halign: 'left', fontSize: 12 } }]],
          theme: 'plain',
          startY: yPosition,
          margin: { left: 14, right: 14 }
        });
        yPosition = (doc as any).lastAutoTable.finalY + 4;

        const isInstallmentSale = sale?.payment_type === 'installments';
        const productsData = saleItems.map(item => (
          isInstallmentSale
            ? [
                item.product_name || 'Producto',
                item.quantity.toString()
              ]
            : [
                item.product_name || 'Producto',
                item.quantity.toString(),
                formatCurrency(item.unit_price),
                formatCurrency(item.line_total)
              ]
        ));

         autoTable(doc, {
            head: isInstallmentSale
              ? [['Descripción', 'Cantidad']]
              : [['Descripción', 'Cantidad', 'Precio Unit.', 'Importe']],
            body: productsData,
            startY: yPosition,
            styles: { fontSize: 9, lineColor: [220, 220, 220], lineWidth: 0.1 },
            headStyles: { fillColor: [232, 232, 232], textColor: [20, 20, 20], fontStyle: 'bold' },
            columnStyles: isInstallmentSale
              ? {
                  0: { cellWidth: 160 },
                  1: { halign: 'center', cellWidth: 20 }
                }
              : {
                  0: { cellWidth: 90 },
                  1: { halign: 'center', cellWidth: 20 },
                  2: { halign: 'right', cellWidth: 35 },
                  3: { halign: 'right', cellWidth: 35 }
                },
            margin: { left: 14, right: 14 }
          });

        yPosition = (doc as any).lastAutoTable.finalY + 8;



        const pageWidth = (doc as any).internal.pageSize.getWidth();
        const left = pageWidth - 100; // ancho del bloque
        const width = 84;
        const height = 10;
          


        doc.setFillColor(30, 30, 30);
        doc.rect(left, yPosition, width, height, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(`TOTAL A PAGAR:`, left + 4, yPosition + 7);
        const totalDisplay = isInstallmentSale
          ? `${sale?.number_of_installments ?? 0} cuotas de ${formatCurrency(sale?.installment_amount ?? 0)}`
          : `${formatCurrency(sale?.total_amount ?? 0)}`;
        doc.text(totalDisplay, left + width - 4, yPosition + 7, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yPosition += height + 12;
      }



      // Always fetch latest installments to avoid stale export data
      let latestInstallments: Installment[] = installments;
      if (sale?.payment_type === 'installments' && typeof window !== 'undefined' && (window as any).electronAPI?.database?.installments && sale.id) {
        try {
          latestInstallments = await (window as any).electronAPI.database.installments.getBySale(sale.id);
        } catch (e) {
          console.warn('No se pudieron obtener cuotas actualizadas, usando estado actual.', e);
        }
      }

      if (sale?.payment_type === 'installments' && latestInstallments.length > 0) {


        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text('Cuotas:', 14, yPosition);
        yPosition += 5;

        const installmentsData = latestInstallments.map(installment => {
          const displayDate = (installment.status === 'paid' && installment.paid_date)
            ? installment.paid_date
            : installment.due_date;
          return [
            installment.installment_number.toString(),
            formatDate(displayDate),
            formatCurrency(installment.amount),
            formatCurrency(installment.paid_amount),
            formatCurrency(installment.balance),
            getInstallmentStatusLabel(installment.status)
          ];
        });

         autoTable(doc, {
            head: [['#', 'Fecha', 'Monto', 'Pagado', 'Balance', 'Estado']],
            body: installmentsData,
            startY: yPosition,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [30, 30, 30] },
            columnStyles: {
              0: { halign: 'left', cellWidth: 15 },
              1: { halign: 'left', cellWidth: 40 },
              2: { halign: 'left', cellWidth: 35 },
              3: { halign: 'left', cellWidth: 35 },
              4: { halign: 'left', cellWidth: 30 },
              5: { cellWidth: 25 }
            },
            margin: { left: 14, right: 0 }
          });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }



      doc.save(`${sale?.sale_number ?? 'unknown'}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar los datos de la venta');
    }
  };

  const handleExportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');


      const periodLabel = sale?.payment_type === 'installments' ? (sale?.period_type === 'weekly' ? 'Semanal (1 y 15)' : 'Mensual') : 'N/A';
      const windowLabel = sale?.payment_type === 'installments'
        ? (sale?.payment_period
            ? (sale.payment_period === '1 to 10'
                ? '1 al 10'
                : sale.payment_period === '10 to 20'
                  ? '10 al 20'
                  : '20 al 30')
            : 'N/A')
        : 'N/A';
      const saleData = {
        'Referencia': sale?.reference_code ?? sale?.sale_number ?? 'N/A',
        'Número de Venta': sale?.sale_number ?? 'N/A',
        'Fecha': sale?.date ? formatDate(sale.date) : 'N/A',
        'Cliente': customer?.name || 'N/A',
        'Teléfono': customer?.phone || 'N/A',
        'Teléfono secundario': customer?.secondary_phone || 'N/A',
        'Dirección': customer?.address || 'N/A',
        'Subtotal': sale?.subtotal ?? 0,
        'Total': sale?.total_amount ?? 0,
        'Método de Pago': sale?.payment_type ? getPaymentTypeBadge(sale.payment_type).label : 'N/A',
        'Método de cobro': sale?.payment_method ? getPaymentMethodLabel(sale.payment_method) : 'N/A',
        'Responsable': sale?.partner_name || 'N/A',
        'Periodo': periodLabel,
        'Ventana de pago': windowLabel,
        'Estado de Pago': sale?.payment_status ? getPaymentStatusBadge(sale.payment_status).label : 'N/A',
        'Estado': sale?.status ? getStatusBadge(sale.status).label : 'N/A',
        'Notas': sale?.notes || ''
      };

      const workbook = XLSX.utils.book_new();



      const saleSheet = XLSX.utils.json_to_sheet([saleData]);


      saleSheet['!cols'] = [
        { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 12 }
      ];
      saleSheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }) };
      XLSX.utils.book_append_sheet(workbook, saleSheet, 'Detalle de Venta');



      if (saleItems.length > 0) {
        const productsData = saleItems.map(item => ({
          'Producto': item.product_name || 'Producto',
          'Cantidad': item.quantity,
          'Precio Unitario': item.unit_price,
          'Total': item.line_total
        }));
        const productsSheet = XLSX.utils.json_to_sheet(productsData);
        productsSheet['!cols'] = [
          { wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 14 }
        ];
        productsSheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }) };
        XLSX.utils.book_append_sheet(workbook, productsSheet, 'Productos');
      }



      // Fetch latest installments to ensure up-to-date Excel export
      let latestInstallments: Installment[] = installments;
      if (sale?.payment_type === 'installments' && typeof window !== 'undefined' && (window as any).electronAPI?.database?.installments && sale?.id) {
        try {
          latestInstallments = await (window as any).electronAPI.database.installments.getBySale(sale.id);
        } catch (e) {
          console.warn('No se pudieron obtener cuotas actualizadas para Excel, usando estado actual.', e);
        }
      }

      if (latestInstallments.length > 0) {
        const installmentsData = latestInstallments.map(installment => {
          const displayDate = (installment.status === 'paid' && installment.paid_date)
            ? installment.paid_date
            : installment.due_date;
          return ({
            'Cuota': installment.installment_number,
            'Fecha': formatDate(displayDate),
            'Monto': installment.amount,
            'Pagado': installment.paid_amount,
            'Balance': installment.balance,
            'Estado': installment.status
          });
        });
        const installmentsSheet = XLSX.utils.json_to_sheet(installmentsData);
        installmentsSheet['!cols'] = [
          { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
        ];
        installmentsSheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }) };
        XLSX.utils.book_append_sheet(workbook, installmentsSheet, 'Cuotas');
      }



      const productsTotal = saleItems.reduce((sum, i) => sum + (i.line_total || 0), 0);
      const installmentsTotal = installments.reduce((sum, i) => sum + (i.amount || 0), 0);
      const summaryRows = [
        { Concepto: 'Subtotal', Valor: sale?.subtotal ?? 0 },
        { Concepto: 'Total', Valor: sale?.total_amount ?? 0 },
        { Concepto: 'Productos (total $)', Valor: productsTotal },
        { Concepto: 'Cuotas (total $)', Valor: installmentsTotal },
        { Concepto: 'Productos (cantidad)', Valor: saleItems.length },
        { Concepto: 'Cuotas (cantidad)', Valor: installments.length }
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      summarySheet['!cols'] = [ { wch: 24 }, { wch: 16 } ];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');



      XLSX.writeFile(workbook, `${sale?.sale_number ?? 'unknown'}-${new Date().toISOString().split('T')[0]}.xlsx`);
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
      <DialogContent className="max-w-4xl overflow-hidden p-0 pt-4 sm:max-w-[98vw] lg:max-w-[75vw] xl:max-w-[70vw]">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {saleItems[0]?.product_name || `Venta #${sale.sale_number}`}
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
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Método de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Badge variant={paymentTypeBadge.variant}>
                    {paymentTypeBadge.label}
                  </Badge>
                  {sale.payment_method && (
                      <Badge variant={paymentTypeBadge.variant}>{getPaymentMethodLabel(sale.payment_method)}</Badge>
                  )}
                  {sale.payment_type === 'installments' && sale.payment_period && (
                      <Badge variant="secondary">
                        {sale.payment_period === '1 to 10' ? '1 al 10' : sale.payment_period === '10 to 20' ? '10 al 20' : '20 al 30'}
                      </Badge>
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
                        {sale.partner_name && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Responsable:</span>
                            <span className="text-sm">{sale.partner_name}</span>
                          </div>
                        )}
                        {sale.payment_type === 'installments' && (
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Periodo:</span>
                              <span className="text-sm">{sale.period_type === 'weekly' ? 'Semanal' : sale.period_type === 'biweekly' ? 'Quincenal' : 'Mensual'}</span>
                            </div>
                            {sale.payment_period && (
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">Ventana de pago:</span>
                                <span className="text-sm">{sale.payment_period === '1 to 10' ? '1 al 10' : sale.payment_period === '10 to 20' ? '10 al 20' : '20 al 30'}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Subtotal:</span>
                          <span className="text-sm">{formatCurrency(sale.subtotal)}</span>
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
                          </div>
                        </div>
                        <div className="grid gap-3">
                          {customer.secondary_phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span 
                                className="text-sm cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors"
                                onClick={() => copyToClipboard(customer.secondary_phone!, 'secondary_phone')}
                                title="Clic para copiar"
                              >
                                {customer.secondary_phone}
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
                              <TableHead className="text-right">Acciones</TableHead>
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
                                  <TableCell className="text-right">
                                    <Popover
                                      open={detailPopoverId === (installment.id || 0)}
                                      onOpenChange={(open) => {
                                        if (open) {
                                          openInstallmentDetails(installment);
                                        } else {
                                          setDetailPopoverId(null);
                                        }
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button size="sm" variant="outline">Ver detalles</Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[260px] p-2" side="left" align="end">
                                        <div className="space-y-2">
                                          <div className="text-sm font-medium">Cuota #{detailInstallment?.installment_number}</div>
                                          {detailTransactions.length === 0 ? (
                                            <div className="text-xs text-muted-foreground">Sin transacciones</div>
                                          ) : (
                                            <div className="space-y-1">
                                              {detailTransactions.map((t, i) => (
                                                <div key={t.id || i} className="grid grid-cols-2 gap-1 text-xs">
                                                  <div className="text-muted-foreground">Método</div>
                                                  <div className="text-right">{getPaymentMethodLabel(t.payment_method)}</div>
                                                  <div className="text-muted-foreground">Fecha</div>
                                                  <div className="text-right">{formatDate(t.transaction_date)}</div>
                                                  <div className="text-muted-foreground">Monto</div>
                                                  <div className="text-right">{formatCurrency(t.amount)}</div>
                                                  <div className="text-muted-foreground">Nota</div>
                                                  <div className="text-right truncate" title={t.payment_reference || ''}>{t.payment_reference || '-'}</div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
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
        {detailOpen && detailInstallment && (
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Detalle de pago</DialogTitle>
                <DialogDescription>Cuota #{detailInstallment.installment_number}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {detailTransactions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No hay transacciones registradas para esta cuota.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Método</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Nota</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailTransactions.map((t, i) => (
                        <TableRow key={t.id || i}>
                          <TableCell>{t.payment_method}</TableCell>
                          <TableCell>{formatDate(t.transaction_date)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(t.amount)}</TableCell>
                          <TableCell>{t.payment_reference || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}