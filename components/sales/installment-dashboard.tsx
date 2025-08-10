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

interface InstallmentDashboardProps {
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

export function InstallmentDashboard({ onRefresh }: InstallmentDashboardProps) {
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
      setError('Failed to load installment data. Please try again.');
      console.error('Error loading installment data:', err);
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
      console.error('Error loading installments:', error);
      throw error;
    }
  };

  const loadOverdueInstallments = async () => {
    try {
      const overdue = await window.electronAPI.database.installments.getOverdue();
      setOverdueInstallments(overdue);
    } catch (error) {
      console.error('Error loading overdue installments:', error);
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
      
      // Setup autopay if requested
      if (paymentForm.setup_autopay) {
        // This would integrate with a payment processor
        console.log('Setting up autopay for customer:', paymentDialog.installment.customer_name);
      }
      
      setPaymentDialog({ open: false, installment: null });
      resetPaymentForm();
      
      await loadInstallmentData();
      onRefresh();
    } catch (error) {
      console.error('Error recording payment:', error);
      setError('Failed to record payment. Please try again.');
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
      amount: installment.balance,
      apply_early_payment_discount: isEarlyPayment(installment)
    }));
  };

  const isEarlyPayment = (installment: ExtendedInstallment) => {
    const dueDate = new Date(installment.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue > 7; // Early if more than 7 days before due
  };

  const getEarlyPaymentDiscount = (installment: ExtendedInstallment) => {
    if (!isEarlyPayment(installment)) return 0;
    return installment.balance * 0.05; // 5% discount
  };

  const sendPaymentReminder = async (installments: ExtendedInstallment[]) => {
    try {
      // This would integrate with email/SMS service
      console.log('Sending reminders to:', installments.map(i => i.customer_name));
      setReminderDialog({ open: false, installments: [] });
    } catch (error) {
      console.error('Error sending reminders:', error);
    }
  };

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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (installment: ExtendedInstallment) => {
    const today = new Date();
    const dueDate = new Date(installment.due_date);
    
    if (installment.status === 'paid') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Paid
      </Badge>;
    } else if (installment.status === 'partial') {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        Partial
      </Badge>;
    } else if (dueDate < today) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Overdue
      </Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
        <Calendar className="w-3 h-3 mr-1" />
        Pending
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
          <span>Loading installment data...</span>
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
            <h3 className="text-lg font-semibold mb-2 text-red-700">Error Loading Data</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadInstallmentData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
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
          <h2 className="text-2xl font-bold tracking-tight">Installment Management</h2>
          <p className="text-muted-foreground">
            Track payments, manage schedules, and optimize collections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadInstallmentData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            onClick={() => setReminderDialog({ 
              open: true, 
              installments: overdueInstallments 
            })}
            disabled={overdueInstallments.length === 0}
          >
            <Bell className="w-4 h-4 mr-2" />
            Send Reminders ({overdueInstallments.length})
          </Button>
        </div>
      </div>

      {/* Enhanced Statistics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalOutstanding)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-orange-500" />
              {stats.totalInstallments} active installments
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collectionRate.toFixed(1)}%</div>
            <Progress value={stats.collectionRate} className="mt-2" />
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              {stats.paidInstallments} of {stats.totalInstallments} paid
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOverdue)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
              {stats.overdueInstallments} overdue payments
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcomingDue}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1 text-blue-500" />
              Payments due within 7 days
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers or sales..."
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
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.dateRange}
              onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
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
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Installments Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="all">All ({stats.totalInstallments})</TabsTrigger>
          <TabsTrigger value="overdue" className="text-red-600">
            Overdue ({stats.overdueInstallments})
          </TabsTrigger>
          <TabsTrigger value="upcoming">Due Soon ({stats.upcomingDue})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payment Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      Paid
                    </span>
                    <span>{stats.paidInstallments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      Partial
                    </span>
                    <span>{stats.partialInstallments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      Overdue
                    </span>
                    <span>{stats.overdueInstallments}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Collected</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(stats.totalCollected)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Outstanding Balance</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(stats.totalOutstanding)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average Payment</span>
                    <span className="font-medium">
                      {formatCurrency(stats.averagePaymentAmount)}
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
            onPayment={openPaymentDialog}
            onScheduleChange={(installment) => setScheduleDialog({ open: true, installment })}
            title="All Installments"
            description="Complete list of all installment payments"
          />
        </TabsContent>

        <TabsContent value="overdue">
          <InstallmentTable 
            installments={overdueInstallments} 
            onPayment={openPaymentDialog}
            onScheduleChange={(installment) => setScheduleDialog({ open: true, installment })}
            title="Overdue Installments"
            description="Payments that are past their due date and require immediate attention"
            showOverdueDays
            showContactActions
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
            onPayment={openPaymentDialog}
            onScheduleChange={(installment) => setScheduleDialog({ open: true, installment })}
            title="Due Soon"
            description="Payments due within the next 7 days"
            showEarlyPaymentIncentive
          />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Collection Performance</CardTitle>
                <CardDescription>
                  Track payment collection trends and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                  <p>Advanced analytics coming soon...</p>
                  <p className="text-sm">Charts and trends will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Payment Dialog */}
      <Dialog open={paymentDialog.open} onOpenChange={(open) => setPaymentDialog({ open, installment: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              Process payment for installment #{paymentDialog.installment?.installment_number} 
              from {paymentDialog.installment?.customer_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-sm text-muted-foreground">Due Amount</Label>
                <div className="font-medium">{formatCurrency(paymentDialog.installment?.amount || 0)}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Outstanding Balance</Label>
                <div className="font-medium text-red-600">{formatCurrency(paymentDialog.installment?.balance || 0)}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Progress</Label>
                <div className="font-medium">{paymentDialog.installment?.progress_percentage || 0}%</div>
              </div>
            </div>

            {/* Early Payment Incentive */}
            {paymentDialog.installment && isEarlyPayment(paymentDialog.installment) && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <Gift className="h-4 w-4" />
                    <span className="font-medium">Early Payment Discount Available!</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Pay now and save {formatCurrency(getEarlyPaymentDiscount(paymentDialog.installment))} (5% discount)
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={paymentDialog.installment?.balance || 0}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(value: any) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Payment Reference</Label>
              <Input
                id="reference"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Check number, transaction ID, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this payment..."
                rows={3}
              />
            </div>

            {/* Payment Options */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium">Payment Options</h4>
              
              {paymentDialog.installment && isEarlyPayment(paymentDialog.installment) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-green-600" />
                    <Label htmlFor="early_discount">Apply early payment discount (5%)</Label>
                  </div>
                  <Switch
                    id="early_discount"
                    checked={paymentForm.apply_early_payment_discount}
                    onCheckedChange={(checked) => setPaymentForm(prev => ({ ...prev, apply_early_payment_discount: checked }))}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <Label htmlFor="autopay">Setup automatic payments</Label>
                </div>
                <Switch
                  id="autopay"
                  checked={paymentForm.setup_autopay}
                  onCheckedChange={(checked) => setPaymentForm(prev => ({ ...prev, setup_autopay: checked }))}
                />
              </div>
            </div>

            {/* Final Amount Display */}
            {paymentForm.apply_early_payment_discount && paymentDialog.installment && isEarlyPayment(paymentDialog.installment) && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <span>Original Amount:</span>
                  <span className="line-through text-muted-foreground">{formatCurrency(paymentForm.amount)}</span>
                </div>
                <div className="flex justify-between items-center font-medium text-green-700">
                  <span>Final Amount (with discount):</span>
                  <span>{formatCurrency(paymentForm.amount * 0.95)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog({ open: false, installment: null })}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={paymentForm.amount <= 0}>
              <CreditCard className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Reminder Dialog */}
      <Dialog open={reminderDialog.open} onOpenChange={(open) => setReminderDialog({ open, installments: [] })}>
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
      </Dialog>
    </div>
  );
}

interface InstallmentTableProps {
  installments: ExtendedInstallment[];
  onPayment: (installment: ExtendedInstallment) => void;
  onScheduleChange: (installment: ExtendedInstallment) => void;
  title: string;
  description: string;
  showOverdueDays?: boolean;
  showContactActions?: boolean;
  showEarlyPaymentIncentive?: boolean;
}

function InstallmentTable({ 
  installments, 
  onPayment, 
  onScheduleChange,
  title, 
  description, 
  showOverdueDays,
  showContactActions,
  showEarlyPaymentIncentive
}: InstallmentTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (installment: ExtendedInstallment) => {
    const today = new Date();
    const dueDate = new Date(installment.due_date);
    
    if (installment.status === 'paid') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Paid
      </Badge>;
    } else if (installment.status === 'partial') {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        Partial
      </Badge>;
    } else if (dueDate < today) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Overdue
      </Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
        <Calendar className="w-3 h-3 mr-1" />
        Pending
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

  const isEarlyPayment = (installment: ExtendedInstallment) => {
    const dueDate = new Date(installment.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue > 7;
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
            <h3 className="text-lg font-semibold mb-2">No installments found</h3>
            <p className="text-muted-foreground">
              No installments match the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Sale #</TableHead>
                  <TableHead>Installment</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  {showOverdueDays && <TableHead>Days Overdue</TableHead>}
                  {showEarlyPaymentIncentive && <TableHead>Incentive</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {installment.customer_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{installment.customer_name}</div>
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
                        <div className="font-medium">{formatCurrency(installment.amount)}</div>
                        <div className="text-sm text-muted-foreground">
                          Balance: {formatCurrency(installment.balance)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={installment.progress_percentage || 0} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {installment.progress_percentage || 0}% paid
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(installment)}</TableCell>
                    {showOverdueDays && (
                      <TableCell>
                        <Badge variant="destructive">
                          {getDaysOverdue(installment.due_date)} days
                        </Badge>
                      </TableCell>
                    )}
                    {showEarlyPaymentIncentive && (
                      <TableCell>
                        {isEarlyPayment(installment) && (
                          <Badge className="bg-green-100 text-green-800">
                            <Gift className="w-3 h-3 mr-1" />
                            5% off
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {installment.status !== 'paid' && (
                          <Button
                            size="sm"
                            onClick={() => onPayment(installment)}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Pay
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onScheduleChange(installment)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
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