'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  DollarSign, 
  Calendar, 
  Phone, 
  Mail, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  CreditCard
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

interface InstallmentSummaryCardProps {
  customer: CustomerWithInstallments;
  onViewDetails: () => void;
  onContactCustomer: (method: 'phone' | 'email') => void;
}

export function InstallmentSummaryCard({ 
  customer, 
  onViewDetails, 
  onContactCustomer 
}: InstallmentSummaryCardProps) {
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

  const getPaymentProgress = () => {
    const totalAmount = Math.round(customer.installments.reduce((sum, inst) => sum + inst.amount, 0));
    const paidAmount = Math.round(customer.installments.reduce((sum, inst) => sum + inst.paid_amount, 0));
    return totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  };

  const getStatusCounts = () => {
    const pending = customer.installments.filter(i => i.status === 'pending').length;
    const paid = customer.installments.filter(i => i.status === 'paid').length;
    const overdue = customer.installments.filter(i => {
      const isOverdue = new Date(i.due_date) < new Date() && i.status !== 'paid';
      return isOverdue || i.status === 'overdue';
    }).length;
    
    return { pending, paid, overdue };
  };

  const statusCounts = getStatusCounts();
  const paymentProgress = getPaymentProgress();

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-lg",
      customer.overdueAmount > 0 && "border-l-4 border-l-red-500"
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{customer.name}</CardTitle>
              <CardDescription className="flex items-center gap-4 mt-1">
                {customer.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {customer.email}
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {customer.phone}
                  </div>
                )}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {customer.overdueAmount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {statusCounts.overdue} vencidas
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              Ver Detalles
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Payment Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso de Pagos</span>
            <span className="font-medium">{Math.round(paymentProgress)}%</span>
          </div>
          <Progress value={paymentProgress} className="h-2" />
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total Adeudado</div>
            <div className="text-lg font-bold">{formatCurrency(customer.totalOwed)}</div>
          </div>
          {customer.overdueAmount > 0 && (
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Monto Vencido</div>
              <div className="text-lg font-bold text-red-600">{formatCurrency(customer.overdueAmount)}</div>
            </div>
          )}
        </div>

        {/* Status Summary */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>{statusCounts.paid} pagadas</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-blue-600" />
            <span>{statusCounts.pending} pendientes</span>
          </div>
          {statusCounts.overdue > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>{statusCounts.overdue} vencidas</span>
            </div>
          )}
        </div>

        {/* Next Payment */}
        {customer.nextPaymentDate && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Próximo vencimiento:</span>
            </div>
            <span className="text-sm font-medium">{formatDate(customer.nextPaymentDate)}</span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          {customer.phone && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onContactCustomer('phone')}
              className="flex-1"
            >
              <Phone className="h-4 w-4 mr-1" />
              Llamar
            </Button>
          )}
          {customer.email && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onContactCustomer('email')}
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-1" />
              Email
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}