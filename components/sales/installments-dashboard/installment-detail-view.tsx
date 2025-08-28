'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Edit,
  Trash2,
  Plus,
  CreditCard,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer, Sale, Installment } from '@/lib/database-operations';

interface CustomerWithInstallments extends Customer {
  sales: Sale[];
  installments: Installment[];
  totalOwed: number;
  overdueAmount: number;
  nextPaymentDate: string | null;
}

interface InstallmentDetailViewProps {
  customer: CustomerWithInstallments;
  onBack: () => void;
  onMarkAsPaid: (installment: Installment) => void;
  onRecordPayment: (installment: Installment) => void;
  onEditInstallment: (installment: Installment) => void;
  onDeleteInstallment: (installment: Installment) => void;
}

export function InstallmentDetailView({
  customer,
  onBack,
  onMarkAsPaid,
  onRecordPayment,
  onEditInstallment,
  onDeleteInstallment
}: InstallmentDetailViewProps) {
  const [selectedSale, setSelectedSale] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInstallmentStatusBadge = (installment: Installment) => {
    const isOverdue = new Date(installment.due_date) < new Date() && installment.status !== 'paid';
    
    if (installment.status === 'paid') {
      return <Badge className="bg-green-100 text-green-800">Pagada</Badge>;
    } else if (isOverdue || installment.status === 'overdue') {
      return <Badge className="bg-red-100 text-red-800">Vencida</Badge>;
    } else if (installment.status === 'partial') {
      return <Badge className="bg-yellow-100 text-yellow-800">Parcial</Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-800">Pendiente</Badge>;
    }
  };

  const getStatusIcon = (installment: Installment) => {
    const isOverdue = new Date(installment.due_date) < new Date() && installment.status !== 'paid';
    
    if (installment.status === 'paid') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (isOverdue || installment.status === 'overdue') {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    } else {
      return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const filteredInstallments = selectedSale 
    ? customer.installments.filter(inst => inst.sale_id === selectedSale)
    : customer.installments;

  const salesWithInstallments = customer.sales.map(sale => ({
    ...sale,
    installments: customer.installments.filter(inst => inst.sale_id === sale.id)
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{customer.name}</h2>
          <p className="text-muted-foreground">Gestión de cuotas y pagos</p>
        </div>
      </div>

      {/* Customer Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{customer.address}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total Adeudado:</span>
                <span className="font-bold">{formatCurrency(customer.totalOwed)}</span>
              </div>
              {customer.overdueAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Monto Vencido:</span>
                  <span className="font-bold text-red-600">{formatCurrency(customer.overdueAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total de Cuotas:</span>
                <span>{customer.installments.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Venta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedSale === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSale(null)}
            >
              Todas las Ventas
            </Button>
            {salesWithInstallments.map((sale) => (
              <Button
                key={sale.id}
                variant={selectedSale === sale.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSale(sale.id!)}
              >
                {sale.sale_number} ({sale.installments.length} cuotas)
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Installments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Cuotas {selectedSale && `- Venta ${salesWithInstallments.find(s => s.id === selectedSale)?.sale_number}`}
          </CardTitle>
          <CardDescription>
            {filteredInstallments.length} cuota{filteredInstallments.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Cuota</TableHead>
                <TableHead>Venta</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Fecha de Pago</TableHead>
                <TableHead className="w-[150px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstallments
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                .map((installment) => {
                  const sale = customer.sales.find(s => s.id === installment.sale_id);
                  const isOverdue = new Date(installment.due_date) < new Date() && installment.status !== 'paid';
                  
                  return (
                    <TableRow 
                      key={installment.id}
                      className={cn(
                        isOverdue && "bg-red-50",
                        installment.status === 'paid' && "bg-green-50"
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(installment)}
                          {getInstallmentStatusBadge(installment)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        #{installment.installment_number}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{sale?.sale_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "text-sm",
                          isOverdue && "text-red-600 font-medium"
                        )}>
                          {formatDate(installment.due_date)}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(installment.amount)}</TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">
                          {formatCurrency(installment.paid_amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-medium",
                          installment.balance > 0 ? "text-red-600" : "text-green-600"
                        )}>
                          {formatCurrency(installment.balance)}
                        </span>
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
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {installment.status !== 'paid' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onMarkAsPaid(installment)}
                                className="h-7 px-2 text-xs"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Pagada
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onRecordPayment(installment)}
                                className="h-7 px-2 text-xs"
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                Pago
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditInstallment(installment)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteInstallment(installment)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}