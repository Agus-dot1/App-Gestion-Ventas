'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus,
  Edit,
  Trash2,
  Filter,
  X,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InstallmentForm } from './installment-form';
import { PaymentForm } from './payment-form';
import type { Customer, Sale, Installment } from '@/lib/database-operations';

interface CustomerWithInstallments extends Customer {
  sales: Sale[];
  installments: Installment[];
  totalOwed: number;
  overdueAmount: number;
  nextPaymentDate: string | null;
}

interface InstallmentDashboardProps {
  highlightId?: string | null;
  onRefresh?: () => void;
}

type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue' | 'partial';
type SortBy = 'customer' | 'amount' | 'dueDate' | 'status';

export function InstallmentDashboard({ highlightId, onRefresh }: InstallmentDashboardProps) {
  const [customers, setCustomers] = useState<CustomerWithInstallments[]>([]);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('customer');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [isInstallmentFormOpen, setIsInstallmentFormOpen] = useState(false);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [deleteInstallment, setDeleteInstallment] = useState<Installment | null>(null);
  
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);

  useEffect(() => {
    if (isElectron) {
      loadInstallmentData();
    }
  }, [isElectron]);

  useEffect(() => {
    if (highlightId) {
      const customerId = parseInt(highlightId);
      if (!isNaN(customerId)) {
        setExpandedCustomers(prev => new Set([...prev, customerId]));
      }
    }
  }, [highlightId]);

  const loadInstallmentData = async () => {
    setIsLoading(true);
    try {
      const [allCustomers, allSales] = await Promise.all([
        window.electronAPI.database.customers.getAll(),
        window.electronAPI.database.sales.getAll()
      ]);

      const customersWithInstallments: CustomerWithInstallments[] = [];

      for (const customer of allCustomers) {
        const customerSales = allSales.filter(sale => sale.customer_id === customer.id);
        const installmentSales = customerSales.filter(sale => sale.payment_type === 'installments');
        
        if (installmentSales.length === 0) continue;

        let allInstallments: Installment[] = [];
        for (const sale of installmentSales) {
          const saleInstallments = await window.electronAPI.database.installments.getBySale(sale.id!);
          allInstallments = [...allInstallments, ...saleInstallments];
        }

        const totalOwed = allInstallments
          .filter(inst => inst.status !== 'paid')
          .reduce((sum, inst) => sum + inst.balance, 0);

        const overdueAmount = allInstallments
          .filter(inst => inst.status === 'overdue' || (inst.status === 'pending' && new Date(inst.due_date) < new Date()))
          .reduce((sum, inst) => sum + inst.balance, 0);

        const nextPayment = allInstallments
          .filter(inst => inst.status === 'pending')
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

        customersWithInstallments.push({
          ...customer,
          sales: installmentSales,
          installments: allInstallments,
          totalOwed,
          overdueAmount,
          nextPaymentDate: nextPayment?.due_date || null
        });
      }

      setCustomers(customersWithInstallments);
    } catch (error) {
      console.error('Error loading installment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCustomerExpansion = (customerId: number) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const handleMarkAsPaid = async (installment: Installment) => {
    try {
      await window.electronAPI.database.installments.markAsPaid(installment.id!);
      await loadInstallmentData();
      onRefresh?.();
    } catch (error) {
      console.error('Error marking installment as paid:', error);
    }
  };

  const handleRecordPayment = (installment: Installment) => {
    setSelectedInstallment(installment);
    setIsPaymentFormOpen(true);
  };

  const handleEditInstallment = (installment: Installment) => {
    setSelectedInstallment(installment);
    setIsInstallmentFormOpen(true);
  };

  const handleDeleteInstallment = (installment: Installment) => {
    setDeleteInstallment(installment);
  };

  const confirmDelete = async () => {
    if (!deleteInstallment?.id) return;
    
    try {
      // Note: This would need to be implemented in the database operations
      // await window.electronAPI.database.installments.delete(deleteInstallment.id);
      console.log('Delete installment:', deleteInstallment.id);
      await loadInstallmentData();
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting installment:', error);
    } finally {
      setDeleteInstallment(null);
    }
  };

  const handlePaymentSave = async (paymentData: any) => {
    try {
      await window.electronAPI.database.installments.recordPayment(
        selectedInstallment!.id!,
        paymentData.amount,
        paymentData.paymentMethod,
        paymentData.reference
      );
      await loadInstallmentData();
      onRefresh?.();
      setIsPaymentFormOpen(false);
      setSelectedInstallment(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  };

  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;

      const hasMatchingInstallments = customer.installments.some(installment => {
        const isOverdue = new Date(installment.due_date) < new Date() && installment.status !== 'paid';
        
        switch (statusFilter) {
          case 'pending':
            return installment.status === 'pending';
          case 'paid':
            return installment.status === 'paid';
          case 'overdue':
            return isOverdue || installment.status === 'overdue';
          case 'partial':
            return installment.status === 'partial';
          default:
            return true;
        }
      });

      return hasMatchingInstallments;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'customer':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'amount':
          aValue = a.totalOwed;
          bValue = b.totalOwed;
          break;
        case 'dueDate':
          aValue = a.nextPaymentDate ? new Date(a.nextPaymentDate) : new Date('9999-12-31');
          bValue = b.nextPaymentDate ? new Date(b.nextPaymentDate) : new Date('9999-12-31');
          break;
        case 'status':
          aValue = a.overdueAmount > 0 ? 0 : 1;
          bValue = b.overdueAmount > 0 ? 0 : 1;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [customers, searchTerm, statusFilter, sortBy, sortOrder]);

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

  const getCustomerStatusIndicator = (customer: CustomerWithInstallments) => {
    if (customer.overdueAmount > 0) {
      return <div className="w-3 h-3 bg-red-500 rounded-full" title="Tiene pagos vencidos" />;
    } else if (customer.totalOwed > 0) {
      return <div className="w-3 h-3 bg-yellow-500 rounded-full" title="Tiene pagos pendientes" />;
    } else {
      return <div className="w-3 h-3 bg-green-500 rounded-full" title="Al día con los pagos" />;
    }
  };

  const stats = useMemo(() => {
    const allInstallments = customers.flatMap(c => c.installments);
    return {
      totalCustomers: customers.length,
      totalInstallments: allInstallments.length,
      pendingInstallments: allInstallments.filter(i => i.status === 'pending').length,
      overdueInstallments: allInstallments.filter(i => {
        const isOverdue = new Date(i.due_date) < new Date() && i.status !== 'paid';
        return isOverdue || i.status === 'overdue';
      }).length,
      totalOwed: allInstallments.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.balance, 0),
      overdueAmount: customers.reduce((sum, c) => sum + c.overdueAmount, 0)
    };
  }, [customers]);

  if (!isElectron) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Electron Requerido</h3>
            <p className="text-muted-foreground">
              La gestión de cuotas solo está disponible en la aplicación de escritorio.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Cuotas</h1>
          <p className="text-muted-foreground">
            Administra los planes de pago y cuotas de tus clientes
          </p>
        </div>
        <Button onClick={() => setIsInstallmentFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cuota
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Clientes con Cuotas</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <User className="h-3 w-3 mr-1 text-blue-500" />
              Clientes con planes de pago activos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Adeudado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalOwed)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3 mr-1 text-green-500" />
              Monto total pendiente de cobro
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Cuotas Vencidas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueInstallments}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
              {formatCurrency(stats.overdueAmount)} vencido
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Cuotas Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInstallments}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1 text-blue-500" />
              Cuotas por vencer próximamente
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Clientes y Cuotas</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="overdue">Vencidas</SelectItem>
                  <SelectItem value="partial">Parciales</SelectItem>
                  <SelectItem value="paid">Pagadas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="amount">Monto</SelectItem>
                  <SelectItem value="dueDate">Próximo vencimiento</SelectItem>
                  <SelectItem value="status">Estado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedCustomers.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron clientes</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No hay clientes que coincidan con la búsqueda.' : 'No hay clientes con planes de cuotas activos.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedCustomers.map((customer) => (
                <Collapsible
                  key={customer.id}
                  open={expandedCustomers.has(customer.id!)}
                  onOpenChange={() => toggleCustomerExpansion(customer.id!)}
                >
                  <Card className={cn(
                    "transition-all duration-200 hover:shadow-md",
                    customer.overdueAmount > 0 && "border-l-4 border-l-red-500",
                    highlightId === customer.id?.toString() && "ring-2 ring-primary"
                  )}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {expandedCustomers.has(customer.id!) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              {getCustomerStatusIndicator(customer)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">{customer.name}</CardTitle>
                                {customer.overdueAmount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {customer.installments.filter(i => {
                                      const isOverdue = new Date(i.due_date) < new Date() && i.status !== 'paid';
                                      return isOverdue || i.status === 'overdue';
                                    }).length} vencidas
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
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
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-right">
                            <div>
                              <div className="text-sm font-medium">Total Adeudado</div>
                              <div className="text-lg font-bold">{formatCurrency(customer.totalOwed)}</div>
                            </div>
                            {customer.nextPaymentDate && (
                              <div>
                                <div className="text-sm font-medium">Próximo Vencimiento</div>
                                <div className="text-sm text-muted-foreground">{formatDate(customer.nextPaymentDate)}</div>
                              </div>
                            )}
                            <div className="text-sm text-muted-foreground">
                              {customer.installments.length} cuotas
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="border-t pt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cuota</TableHead>
                                <TableHead>Venta</TableHead>
                                <TableHead>Vencimiento</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Pagado</TableHead>
                                <TableHead>Balance</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="w-[100px]">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {customer.installments
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
                                      <TableCell className="font-medium">
                                        #{installment.installment_number}
                                      </TableCell>
                                      <TableCell>
                                        <div className="text-sm">
                                          {sale?.sale_number}
                                        </div>
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
                                      <TableCell>{formatCurrency(installment.paid_amount)}</TableCell>
                                      <TableCell>
                                        <span className={cn(
                                          "font-medium",
                                          installment.balance > 0 ? "text-red-600" : "text-green-600"
                                        )}>
                                          {formatCurrency(installment.balance)}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        {getInstallmentStatusBadge(installment)}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1">
                                          {installment.status !== 'paid' && (
                                            <>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleMarkAsPaid(installment)}
                                                className="h-7 px-2 text-xs"
                                              >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Marcar Pagada
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRecordPayment(installment)}
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
                                            onClick={() => handleEditInstallment(installment)}
                                            className="h-7 w-7 p-0"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteInstallment(installment)}
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
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installment Form */}
      <InstallmentForm
        installment={selectedInstallment}
        open={isInstallmentFormOpen}
        onOpenChange={(open) => {
          setIsInstallmentFormOpen(open);
          if (!open) setSelectedInstallment(null);
        }}
        onSave={async () => {
          await loadInstallmentData();
          onRefresh?.();
          setIsInstallmentFormOpen(false);
          setSelectedInstallment(null);
        }}
      />

      {/* Payment Form */}
      <PaymentForm
        installment={selectedInstallment}
        open={isPaymentFormOpen}
        onOpenChange={(open) => {
          setIsPaymentFormOpen(open);
          if (!open) setSelectedInstallment(null);
        }}
        onSave={handlePaymentSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteInstallment} onOpenChange={() => setDeleteInstallment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Cuota</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la cuota #{deleteInstallment?.installment_number}?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}