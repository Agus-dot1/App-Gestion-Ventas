'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  Bell,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Zap,
  Gift,
  AlertCircle,
  Phone,
  Mail,
  MessageSquare
} from 'lucide-react';
import type { Installment } from '@/lib/database-operations';
import { cn } from '@/lib/utils';

interface InstallmentDashboardProps {
  highlightId?: string | null;
  onRefresh: () => void;
}

interface ExtendedInstallment extends Installment {
  sale_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  original_sale_amount?: number;
  progress_percentage?: number;
}

interface PaymentFormData {
  amount: number;
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'check';
  reference: string;
  notes: string;
  apply_early_payment_discount: boolean;
  setup_autopay: boolean;
}

interface FilterOptions {
  status: string;
  dateRange: string;
  customer: string;
  amountRange: { min: number; max: number };
}

export function InstallmentDashboard({ highlightId, onRefresh }: InstallmentDashboardProps) {
  // Helper function to check if payment is early
  const isEarlyPayment = (installment: ExtendedInstallment) => {
    const dueDate = new Date(installment.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue > 7;
  };

  const [installments, setInstallments] = useState<ExtendedInstallment[]>([]);
  const [overdueInstallments, setOverdueInstallments] = useState<ExtendedInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    installment: ExtendedInstallment | null;
  }>({ open: false, installment: null });
  
  const [scheduleDialog, setScheduleDialog] = useState<{
    open: boolean;
    installment: ExtendedInstallment | null;
  }>({ open: false, installment: null });

  const [reminderDialog, setReminderDialog] = useState<{
    open: boolean;
    installments: ExtendedInstallment[];
  }>({ open: false, installments: [] });

  // Form states
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    amount: 0,
    payment_method: 'cash',
    reference: '',
    notes: '',
    apply_early_payment_discount: false,
    setup_autopay: false
  });

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dateRange: 'all',
    customer: '',
    amountRange: { min: 0, max: 10000 }
  });

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadInstallmentData();
  }, []);

  const loadInstallmentData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadInstallments(),
        loadOverdueInstallments()
      ]);
    } catch (err) {
      setError('Falló la carga de datos de cuotas. Por favor, intente nuevamente.');
      console.error('Error cargando cuotas:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInstallments = async () => {
    try {
      const sales = await window.electronAPI.database.sales.getAll();
      const allInstallments: ExtendedInstallment[] = [];
      
      for (const sale of sales) {
        if (sale.payment_type === 'installments') {
          const saleInstallments = await window.electronAPI.database.installments.getBySale(sale.id!);
          saleInstallments.forEach(installment => {
            const progressPercentage = ((installment.amount - installment.balance) / installment.amount) * 100;
            allInstallments.push({
              ...installment,
              sale_number: sale.sale_number,
              customer_name: sale.customer_name,
              original_sale_amount: sale.total_amount,
              progress_percentage: Math.round(progressPercentage)
            });
          });
        }
      }
      
      setInstallments(allInstallments);
    } catch (error) {
      console.error('Error cargando cuotas:', error);
      throw error;
    }
  };

  const loadOverdueInstallments = async () => {
    try {
      const overdue = await window.electronAPI.database.installments.getOverdue();
      setOverdueInstallments(overdue);
    } catch (error) {
      console.error('Error cargando cuotas vencidas:', error);
      throw error;
    }
  };

  const handlePayment = async () => {
    if (!paymentDialog.installment) return;

    try {
      let finalAmount = paymentForm.amount;
      
      // Apply early payment discount if selected
      if (paymentForm.apply_early_payment_discount && isEarlyPayment(paymentDialog.installment)) {
        finalAmount = finalAmount * 0.95; // 5% discount
      }

      await window.electronAPI.database.installments.recordPayment(
        paymentDialog.installment.id!,
        finalAmount,
        paymentForm.payment_method,
        paymentForm.reference
      );
      
      setPaymentDialog({ open: false, installment: null });
      resetPaymentForm();
      
      await loadInstallmentData();
      onRefresh();
    } catch (error) {
      console.error('Error registrando pago:', error);
      setError('Fallo al intentar registrar pago. Porfavor intentar de nuevo.');
    }
  };

  const handleRevertPayment = async (installment: ExtendedInstallment) => {
    try {
      // Get the latest payment transaction for this installment
      const transactions = await window.electronAPI.database.payments.getBySale(installment.sale_id!);
      const installmentTransactions = transactions.filter(t => t.installment_id === installment.id);
      const latestTransaction = installmentTransactions[installmentTransactions.length - 1];
      
      if (!latestTransaction) {
        setError('No se encontró transacción de pago para revertir.');
        return;
      }
      
      await window.electronAPI.database.installments.revertPayment(
        installment.id!,
        latestTransaction.id!
      );
      
      await loadInstallmentData();
      onRefresh();
    } catch (error) {
      console.error('Error revirtiendo pago:', error);
      setError('Fallo al intentar revertir pago. Por favor intentar de nuevo.');
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: 0,
      payment_method: 'cash',
      reference: '',
      notes: '',
      apply_early_payment_discount: false,
      setup_autopay: false
    });
  };

  const openPaymentDialog = (installment: ExtendedInstallment) => {
    setPaymentDialog({ open: true, installment });
    setPaymentForm(prev => ({
      ...prev,
      amount: installment.balance
    }));
  };

  // const getEarlyPaymentDiscount = (installment: ExtendedInstallment) => {
  //   if (!isEarlyPayment(installment)) return 0;
  //   return installment.balance * 0.05; // 5% discount
  // };

  // const sendPaymentReminder = async (installments: ExtendedInstallment[]) => {
  //   try {
  //     // This would integrate with email/SMS service
  //     console.log('Sending reminders to:', installments.map(i => i.customer_name));
  //     setReminderDialog({ open: false, installments: [] });
  //   } catch (error) {
  //     console.error('Error sending reminders:', error);
  //   }
  // };

  const filteredInstallments = installments.filter(installment => {
    const matchesSearch = !searchTerm || 
      installment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      installment.sale_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || installment.status === filters.status;
    
    const matchesAmount = installment.amount >= filters.amountRange.min && 
                         installment.amount <= filters.amountRange.max;
    
    return matchesSearch && matchesStatus && matchesAmount;
  });

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

  const getStatusBadge = (installment: ExtendedInstallment) => {
    const today = new Date();
    const dueDate = new Date(installment.due_date);
    
    if (installment.status === 'paid') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Pagado
      </Badge>;
    } else if (installment.status === 'partial') {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        Parcial
      </Badge>;
    } else if (dueDate < today) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Vencida
      </Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
        <Calendar className="w-3 h-3 mr-1" />
        Pendiente
      </Badge>;
    }
  };

  const getDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Calculate comprehensive statistics
  const stats = {
    totalInstallments: installments.length,
    paidInstallments: installments.filter(i => i.status === 'paid').length,
    overdueInstallments: overdueInstallments.length,
    partialInstallments: installments.filter(i => i.status === 'partial').length,
    totalOutstanding: installments.reduce((sum, i) => sum + i.balance, 0),
    totalOverdue: overdueInstallments.reduce((sum, i) => sum + i.balance, 0),
    totalCollected: installments.reduce((sum, i) => sum + i.paid_amount, 0),
    averagePaymentAmount: installments.length > 0 
      ? installments.reduce((sum, i) => sum + i.amount, 0) / installments.length 
      : 0,
    collectionRate: installments.length > 0 
      ? (installments.filter(i => i.status === 'paid').length / installments.length) * 100 
      : 0,
    upcomingDue: installments.filter(i => {
      const dueDate = new Date(i.due_date);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return dueDate <= nextWeek && i.status !== 'paid';
    }).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Cargando cuotas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-red-700">Error al cargar datos</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadInstallmentData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Intenta nuevamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cuotas</h2>
          <p className="text-muted-foreground">
            Aquí puedes gestionar todas las cuotas de tus ventas a plazos. Puedes registrar pagos y más.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadInstallmentData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          {/* <Button 
            onClick={() => setReminderDialog({ 
              open: true, 
              installments: overdueInstallments 
            })}
            disabled={overdueInstallments.length === 0}
          >
            <Bell className="w-4 h-4 mr-2" />
            Send Reminders ({overdueInstallments.length})
          </Button> */}
        </div>
      </div>

      {/* Enhanced Statistics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total pendiente</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Math.round(stats.totalOutstanding))}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-orange-500" />
              {stats.totalInstallments} cuotas activas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Cuotas pagadas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.collectionRate)}%</div>
            <Progress value={stats.collectionRate} className="mt-2" />
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              {stats.paidInstallments} de {stats.totalInstallments} pagadas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Cuotas vencidas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(Math.round(stats.totalOverdue))}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
              {stats.overdueInstallments} pagos vencidos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Vencen esta semana</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcomingDue}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1 text-blue-500" />
              Cuotas por vencer en los próximos 7 días
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Buscar y filtrar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Busca clientes o ventas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="overdue">Vencidas</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.dateRange}
              onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="quarter">Este trimestre</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setFilters({
                status: 'all',
                dateRange: 'all',
                customer: '',
                amountRange: { min: 0, max: 10000 }
              });
            }}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Installments Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="all">Todos ({stats.totalInstallments})</TabsTrigger>
          <TabsTrigger value="overdue" className="text-red-600">
            Vencidas ({stats.overdueInstallments})
          </TabsTrigger>
          <TabsTrigger value="upcoming">Por vencer ({stats.upcomingDue})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Estado de pagos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      Pagado
                    </span>
                    <span>{stats.paidInstallments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      Parcial
                    </span>
                    <span>{stats.partialInstallments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      Vencidas
                    </span>
                    <span>{stats.overdueInstallments}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen financiero</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total cobrado</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(stats.totalCollected)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Balance pendiente</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(stats.totalOutstanding)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="all">
          <InstallmentTable 
            installments={filteredInstallments} 
            highlightId={highlightId}
            onPayment={openPaymentDialog}
            onScheduleChange={(installment) => setScheduleDialog({ open: true, installment })}
revertPayment={handleRevertPayment}
            title="Todas las cuotas"
            description="Lista completa de todas las cuotas generadas por ventas a plazos"
            isEarlyPayment={isEarlyPayment}
          />
        </TabsContent>

        <TabsContent value="overdue">
          <InstallmentTable 
            installments={overdueInstallments} 
            highlightId={highlightId}
            onPayment={openPaymentDialog}
revertPayment={handleRevertPayment}
            onScheduleChange={(installment) => setScheduleDialog({ open: true, installment })}
            title="Cuotas vencidas"
            description="Cuotas que están vencidas y requieren atención inmediata"
            showOverdueDays
            showContactActions
            isEarlyPayment={isEarlyPayment}
          />
        </TabsContent>

        <TabsContent value="upcoming">
          <InstallmentTable 
            installments={installments.filter(i => {
              const dueDate = new Date(i.due_date);
              const nextWeek = new Date();
              nextWeek.setDate(nextWeek.getDate() + 7);
              return dueDate <= nextWeek && i.status !== 'paid';
            })} 
            highlightId={highlightId}
            onPayment={openPaymentDialog}
revertPayment={handleRevertPayment}
            onScheduleChange={(installment) => setScheduleDialog({ open: true, installment })}
            title="Cuotas por vencer"
            description="Cuotas que vencerán en los próximos 7 días"
            showEarlyPaymentIncentive
            isEarlyPayment={isEarlyPayment}
          />
        </TabsContent>
      </Tabs>

      {/* Enhanced Payment Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ open, installment: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Registrar pago
            </DialogTitle>
            <DialogDescription>
              Registra un pago para la cuota de {paymentDialog.installment?.customer_name} - Venta #{paymentDialog.installment?.sale_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-sm text-muted-foreground">Cuota total</Label>
                <div className="font-medium">{formatCurrency(Math.round(paymentDialog.installment?.amount || 0))}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Balance pendiente</Label>
                <div className="font-medium text-red-600">{formatCurrency(Math.round(paymentDialog.installment?.balance || 0))}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Progreso</Label>
                <div className="font-medium">{paymentDialog.installment?.progress_percentage || 0}%</div>
              </div>
            </div>

            {/* Early Payment Incentive */}
            {/* {paymentDialog.installment && isEarlyPayment(paymentDialog.installment) && (
              <Card className="border-green-800 bg-green-900">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-50">
                    <Gift className="h-4 w-4" />
                    <span className="font-medium">Early Payment Discount Available!</span>
                  </div>
                  <p className="text-sm text-green-100 mt-1">
                    Pay now and save {formatCurrency(getEarlyPaymentDiscount(paymentDialog.installment))} (5% discount)
                  </p>
                </CardContent>
              </Card>
            )} */}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Pago total *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="1"
                  min="0"
                  max={paymentDialog.installment?.balance || 0}
                  value={Math.round(paymentForm.amount)}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de pago *</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(value: any) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                    <SelectItem value="debit_card">Tarjeta de Débito</SelectItem>
                    <SelectItem value="bank_transfer">Transferencia bancaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Referencia de pago</Label>
              <Input
                id="reference"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Número de comprobante, id de la transacción, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>

            {/* Payment Options */}
            {/* <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium">Opciones de pago</h4>
              
              {paymentDialog.installment && isEarlyPayment(paymentDialog.installment) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-green-600" />
                    <Label htmlFor="early_discount">Aplicar descuento de pago anticipado (5%)</Label>
                  </div>
                  <Switch
                    id="early_discount"
                    checked={paymentForm.apply_early_payment_discount}
                    onCheckedChange={(checked) => setPaymentForm(prev => ({ ...prev, apply_early_payment_discount: checked }))}
                  />
                </div>
              )}
            </div> */}

            {/* Final Amount Display */}
            {/* {paymentForm.apply_early_payment_discount && paymentDialog.installment && isEarlyPayment(paymentDialog.installment) && (
              <div className="p-4 bg-green-900 rounded-lg border border-green-800">
                <div className="flex justify-between items-center">
                  <span>Cantidad original:</span>
                  <span className="line-through text-muted-foreground">{formatCurrency(paymentForm.amount)}</span>
                </div>
                <div className="flex justify-between items-center font-medium text-green-50">
                  <span>Monto final (con descuento):</span>
                  <span>{formatCurrency(paymentForm.amount * 0.95)}</span>
                </div>
              </div>
            )} */}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog({ open: false, installment: null })}>
              Cancelar
            </Button>
            <Button onClick={handlePayment} disabled={paymentForm.amount <= 0}>
              <CreditCard className="w-4 h-4 mr-2" />
              Registrar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Reminder Dialog */}
      {/* <Dialog open={reminderDialog.open} onOpenChange={(open) => setReminderDialog({ open, installments: [] })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Send Payment Reminders
            </DialogTitle>
            <DialogDescription>
              Send payment reminders to {reminderDialog.installments.length} customers with overdue payments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Reminder will be sent to:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {reminderDialog.installments.map((installment, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{installment.customer_name}</span>
                    <span className="text-red-600">{formatCurrency(installment.balance)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                SMS
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Call
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderDialog({ open: false, installments: [] })}>
              Cancel
            </Button>
            <Button onClick={() => sendPaymentReminder(reminderDialog.installments)}>
              <Bell className="w-4 h-4 mr-2" />
              Send Reminders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </div>
  );
}

interface InstallmentTableProps {
  installments: ExtendedInstallment[];
  highlightId?: string | null;
  onPayment: (installment: ExtendedInstallment) => void;
  revertPayment?: (installment: ExtendedInstallment) => void;
  onScheduleChange: (installment: ExtendedInstallment) => void;
  title: string;
  description: string;
  showOverdueDays?: boolean;
  showContactActions?: boolean;
  showEarlyPaymentIncentive?: boolean;
  isEarlyPayment?: (installment: ExtendedInstallment) => boolean;
}

function InstallmentTable({ 
  installments, 
  highlightId,
  onPayment, 
  revertPayment,
  onScheduleChange,
  title, 
  description, 
  showOverdueDays,
  showContactActions,
  showEarlyPaymentIncentive,
  isEarlyPayment
}: InstallmentTableProps) {
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

  const getStatusBadge = (installment: ExtendedInstallment) => {
    const today = new Date();
    const dueDate = new Date(installment.due_date);
    
    if (installment.status === 'paid') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Pagado
      </Badge>;
    } else if (installment.status === 'partial') {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        Parcial
      </Badge>;
    } else if (dueDate < today) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Vencido
      </Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
        <Calendar className="w-3 h-3 mr-1" />
        Pendiente
      </Badge>;
    }
  };

  const getDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {installments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron cuotas</h3>
            <p className="text-muted-foreground">
              No hay pagos con cuotas registrados.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Ventas #</TableHead>
                  <TableHead>Cuotas</TableHead>
                  <TableHead>Dia de pago</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Estado</TableHead>
                  {showOverdueDays && <TableHead>Dias atrasados</TableHead>}
                  {showEarlyPaymentIncentive && <TableHead>Incentivo</TableHead>}
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow 
                    key={installment.id} 
                    id={`cuota-${installment.id}`}
                    className={cn(
                      highlightId === installment.sale_id?.toString() && 'bg-muted/50'
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {installment.customer_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{installment.customer_name}</div>
                          {highlightId === installment.sale_id?.toString() && (
                            <Badge variant="outline" className="bg-primary/10 text-primary text-xs mt-1">
                              Encontrado
                            </Badge>
                          )}
                          {showContactActions && (
                            <div className="flex items-center gap-1 mt-1">
                              <Button size="sm" variant="ghost" className="h-6 px-2">
                                <Phone className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 px-2">
                                <Mail className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {installment.sale_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">#{installment.installment_number}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(installment.due_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{formatCurrency(Math.round(installment.amount))}</div>
                        <div className="text-sm text-muted-foreground">
                          Balance: {formatCurrency(Math.round(installment.balance))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={installment.progress_percentage || 0} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {installment.progress_percentage || 0}% pagado
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(installment)}</TableCell>
                    {showOverdueDays && (
                      <TableCell>
                        <Badge variant="destructive">
                          {getDaysOverdue(installment.due_date)} dias
                        </Badge>
                      </TableCell>
                    )}
                    {showEarlyPaymentIncentive && (
                      <TableCell>
                        {isEarlyPayment && isEarlyPayment(installment) && (
                          <Badge className="bg-green-100 text-green-800">
                            <Gift className="w-3 h-3 mr-1" />
                            5% off
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                        <div className="flex items-center gap-1">
                          {installment.status !== 'paid' ? (
                            <Button
                              size="sm"
                              onClick={() => onPayment(installment)}
                            >
                              <CreditCard className="w-4 h-4 mr-1" />
                              Pagar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => revertPayment && revertPayment(installment)}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Revertir
                            </Button>
                          )}
                        </div>
                      </TableCell>

                    
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}