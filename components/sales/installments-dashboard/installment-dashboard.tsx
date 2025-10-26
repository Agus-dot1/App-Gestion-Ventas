'use client';

import { useState, useEffect, useMemo, useImperativeHandle, forwardRef, useRef } from 'react';
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
  MoreHorizontal,
  Copy,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InstallmentForm } from '../installment-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import type { Customer, Sale, Installment } from '@/lib/database-operations';
import { toast } from 'sonner';

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

export interface InstallmentDashboardRef {
  refreshData: () => Promise<void>;
}

type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue' | 'partial';
type SortBy = 'customer' | 'amount' | 'dueDate' | 'status';
type PaymentWindow = '1 to 10' | '20 to 30';
type WindowFilter = 'all' | PaymentWindow;

export const InstallmentDashboard = forwardRef<InstallmentDashboardRef, InstallmentDashboardProps>(({ highlightId, onRefresh }, ref) => {
  const [customers, setCustomers] = useState<CustomerWithInstallments[]>([]);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());
  const [expandedSales, setExpandedSales] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('customer');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [windowFilter, setWindowFilter] = useState<WindowFilter>('all');
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [isInstallmentFormOpen, setIsInstallmentFormOpen] = useState(false);
  const [deleteCustomer, setDeleteCustomer] = useState<CustomerWithInstallments | null>(null);
  const [deleteSale, setDeleteSale] = useState<Sale | null>(null);

  const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refreshData: loadInstallmentData
  }), []);

  useEffect(() => {
    if (isElectron) {
      loadInstallmentData();
    }
  }, [isElectron]);

  // Track whether we've already applied the highlight for the current deep link
  const highlightAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!highlightId) return;
    // Prevent re-running for the same highlightId (e.g., after state updates)
    if (highlightAppliedRef.current === highlightId) return;

    if (highlightId.startsWith('i-')) {
      const instId = parseInt(highlightId.slice(2), 10);
      if (!isNaN(instId) && customers.length > 0) {
        const targetCustomer = customers.find(c => c.installments.some(i => i.id === instId));
        if (targetCustomer?.id) {
          setExpandedCustomers(prev => {
            const next = new Set<number>(prev);
            next.add(targetCustomer.id!);
            return next;
          });
          highlightAppliedRef.current = highlightId;
          setTimeout(() => {
            const el = document.getElementById(`installment-${instId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('bg-muted/100');
              setTimeout(() => {
                el.classList.remove('bg-muted/50');
              }, 3000);
            }
          }, 200);
        }
      }
      return;
    }

    // Case 2: highlight customer by numeric id
    const customerId = parseInt(highlightId, 10);
    if (!isNaN(customerId)) {
      setExpandedCustomers(prev => {
        const newSet = new Set<number>();
        prev.forEach(id => newSet.add(id));
        newSet.add(customerId);
        return newSet;
      });
      // Mark as applied for this highlightId
      highlightAppliedRef.current = highlightId;
    }
  }, [highlightId, customers]);

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

        // Attach sale items to each installment sale for product display
        const salesWithItems = await Promise.all(
          installmentSales.map(async (sale) => {
            try {
              const items = await window.electronAPI.database.saleItems.getBySale(sale.id!);
              return { ...sale, items };
            } catch (e) {
              console.warn('No se pudieron obtener items para la venta', sale.id, e);
              return { ...sale, items: [] };
            }
          })
        );

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
          sales: salesWithItems,
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

      // Update the local state directly instead of reloading all data
      setCustomers(prevCustomers =>
        prevCustomers.map(customer => {
          if (customer.installments.some(inst => inst.id === installment.id)) {
            const updatedInstallments = customer.installments.map(inst =>
              inst.id === installment.id
                ? { ...inst, status: 'paid' as const, balance: 0, paid_amount: inst.amount }
                : inst
            );

            // Recalculate totals for this customer
            const totalOwed = updatedInstallments
              .filter(inst => inst.status !== 'paid')
              .reduce((sum, inst) => sum + inst.balance, 0);

            const overdueAmount = updatedInstallments
              .filter(inst => inst.status === 'overdue' || (inst.status === 'pending' && new Date(inst.due_date) < new Date()))
              .reduce((sum, inst) => sum + inst.balance, 0);

            const nextPayment = updatedInstallments
              .filter(inst => inst.status === 'pending')
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

            return {
              ...customer,
              installments: updatedInstallments,
              totalOwed,
              overdueAmount,
              nextPaymentDate: nextPayment?.due_date || null
            };
          }
          return customer;
        })
      );

      onRefresh?.();
      toast.success('Cuota marcada como pagada');
    } catch (error) {
      console.error('Error marking installment as paid:', error);
      toast.error('Error al marcar la cuota como pagada');
    }
  };



  const handleRevertPayment = async (installment: Installment) => {
    try {
      // Get the payment transactions for this installment to find the most recent completed one to revert
      const payments = await window.electronAPI.database.payments.getBySale(installment.sale_id);
      const installmentPayments = payments.filter(p => p.installment_id === installment.id && p.status === 'completed');

      if (installmentPayments.length === 0) {
        console.error('No completed payments found for this installment');
        toast.warning('No se encontraron pagos completados para revertir');
        return;
      }

      // Get the most recent completed payment transaction to revert
      const latestPayment = installmentPayments.sort((a, b) =>
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      )[0];

      // Use the proper revertPayment method with transaction ID
      await window.electronAPI.database.installments.revertPayment(
        installment.id!,
        latestPayment.id!
      );

      // Update the local state directly instead of reloading all data
      setCustomers(prevCustomers =>
        prevCustomers.map(customer => {
          if (customer.installments.some(inst => inst.id === installment.id)) {
            const updatedInstallments = customer.installments.map(inst => {
              if (inst.id === installment.id) {
                // Calculate the new status and balance after reverting the payment
                const newPaidAmount = inst.paid_amount - latestPayment.amount;
                const newBalance = inst.amount - newPaidAmount;
                let newStatus: 'pending' | 'partial' | 'paid' = 'pending';

                if (newPaidAmount > 0 && newBalance > 0) {
                  newStatus = 'partial';
                } else if (newBalance <= 0) {
                  newStatus = 'paid';
                }

                return {
                  ...inst,
                  status: newStatus,
                  balance: newBalance,
                  paid_amount: newPaidAmount
                };
              }
              return inst;
            });

            // Recalculate totals for this customer
            const totalOwed = updatedInstallments
              .filter(inst => inst.status !== 'paid')
              .reduce((sum, inst) => sum + inst.balance, 0);

            const overdueAmount = updatedInstallments
              .filter(inst => inst.status === 'overdue' || (inst.status === 'pending' && new Date(inst.due_date) < new Date()))
              .reduce((sum, inst) => sum + inst.balance, 0);

            const nextPayment = updatedInstallments
              .filter(inst => inst.status === 'pending')
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

            return {
              ...customer,
              installments: updatedInstallments,
              totalOwed,
              overdueAmount,
              nextPaymentDate: nextPayment?.due_date || null
            };
          }
          return customer;
        })
      );

      onRefresh?.();
      toast.success('Pago revertido correctamente');
    } catch (error) {
      console.error('Error reverting payment:', error);
      toast.error('Error revirtiendo el último pago');
    }
  };

  const handleDeleteCustomer = (customer: CustomerWithInstallments) => {
    setDeleteCustomer(customer);
  };

  const handleDeleteSale = (sale: Sale) => {
    setDeleteSale(sale);
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteCustomer?.id) return;

    try {
      // Delete all installments for this customer first
      for (const installment of deleteCustomer.installments) {
        if (installment.id) {
          await window.electronAPI.database.installments.delete(installment.id);
        }
      }

      // Delete all sales for this customer
      for (const sale of deleteCustomer.sales) {
        if (sale.id) {
          await window.electronAPI.database.sales.delete(sale.id);
        }
      }

      // Finally delete the customer
      await window.electronAPI.database.customers.delete(deleteCustomer.id);

      // Update local state by removing the deleted customer
      setCustomers(prevCustomers =>
        prevCustomers.filter(customer => customer.id !== deleteCustomer.id)
      );

      onRefresh?.();
      toast.success('Cliente eliminado correctamente');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Error eliminando el cliente');
    } finally {
      setDeleteCustomer(null);
    }
  };

  const confirmDeleteSale = async () => {
    if (!deleteSale?.id) return;

    try {
      const saleId = deleteSale.id;

      // Find the customer owning this sale
      const targetCustomer = customers.find(c => c.sales.some(s => s.id === saleId));

      // Delete installments for this sale first (to maintain integrity)
      if (targetCustomer) {
        const saleInstalls = targetCustomer.installments.filter(inst => inst.sale_id === saleId);
        for (const inst of saleInstalls) {
          if (inst.id) {
            await window.electronAPI.database.installments.delete(inst.id);
          }
        }
      }

      // Delete the sale
      await window.electronAPI.database.sales.delete(saleId);

      // Update local state: remove sale and its installments; recalc totals
      setCustomers(prevCustomers => prevCustomers
        .map(c => {
          if (c.sales.some(s => s.id === saleId)) {
            const updatedSales = c.sales.filter(s => s.id !== saleId);
            const updatedInstallments = c.installments.filter(inst => inst.sale_id !== saleId);

            const totalOwed = updatedInstallments
              .filter(inst => inst.status !== 'paid')
              .reduce((sum, inst) => sum + inst.balance, 0);

            const overdueAmount = updatedInstallments
              .filter(inst => inst.status === 'overdue' || (inst.status === 'pending' && new Date(inst.due_date) < new Date()))
              .reduce((sum, inst) => sum + inst.balance, 0);

            const nextPayment = updatedInstallments
              .filter(inst => inst.status === 'pending')
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

            return {
              ...c,
              sales: updatedSales,
              installments: updatedInstallments,
              totalOwed,
              overdueAmount,
              nextPaymentDate: nextPayment?.due_date || null
            };
          }
          return c;
        })
        // Remove customer card if no installments remain
        .filter(c => c.installments.length > 0)
      );

      onRefresh?.();
      toast.success('Venta eliminada correctamente');
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast.error('Error eliminando la venta');
    } finally {
      setDeleteSale(null);
    }
  };



  const handleCopyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado al portapapeles.`);
    } catch (err) {
      console.error('Error copying value:', err);
      toast.error(`No se pudo copiar ${label}.`);
    }
  };

  const formatPaymentPeriod = (win?: string | null, dueDate?: string) => {
    if (dueDate) {
      const day = new Date(dueDate).getDate();
      return day <= 10 ? '1 al 10' : '20 al 30';
    }
    if (win === '1 to 10') return '1 al 10';
    if (win === '20 to 30') return '20 al 30';
    return '1 al 10';
  };



  // Determine customer's effective payment window using fallbacks
  const getEffectivePaymentWindow = (c: CustomerWithInstallments): PaymentWindow | null => {
    if (c.payment_window === '1 to 10' || c.payment_window === '20 to 30') {
      return c.payment_window;
    }
    if (c.installments && c.installments.length > 0) {
      const earliest = [...c.installments].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
      const day = new Date(earliest.due_date).getDate();
      return day <= 15 ? '1 to 10' : '20 to 30';
    }
    return null;
  };

  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Filter by effective payment window if selected
      if (windowFilter !== 'all') {
        const effective = getEffectivePaymentWindow(customer);
        if (effective !== windowFilter) return false;
      }

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
  }, [customers, searchTerm, statusFilter, sortBy, sortOrder, windowFilter]);

  // Visual feedback helpers (client-only)
  const [clientDate, setClientDate] = useState<Date | null>(null);
  useEffect(() => {
    // Set on client after mount to avoid SSR/client mismatches
    setClientDate(new Date());
  }, []);

  const getActiveWindowForDate = (date: Date): PaymentWindow | null => {
    const day = date.getDate();
    if (day >= 1 && day <= 10) return '1 to 10';
    if (day > 20 && day <= 30) return '20 to 30';
    return null;
  };

  const activeWindow = useMemo(() => clientDate ? getActiveWindowForDate(clientDate) : null, [clientDate]);

  const isWindowActive = (win?: string | null) => {
    if (!win) return false;
    return activeWindow === win;
  };

  const getAnchorDay = (win?: string | null) => {
    if (win === '1 to 10') return 10;
    if (win === '20 to 30') return 30;
    return 30;
  };

  const windowCounts = useMemo(() => ({
    '1 to 10': customers.filter(c => c.payment_window === '1 to 10').length,
    '20 to 30': customers.filter(c => c.payment_window === '20 to 30').length,
  }), [customers]);

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
    <div className="space-y-6 overflow-y-visible">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Cuotas</h1>
          <p className="text-muted-foreground">
            Administra los planes de pago y cuotas de tus clientes
          </p>
        </div>
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
              <Select value={windowFilter} onValueChange={(value: WindowFilter) => setWindowFilter(value)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las ventanas</SelectItem>
                  <SelectItem value="1 to 10">Cobros del 1–10</SelectItem>
                  <SelectItem value="20 to 30">Cobros del 20–30</SelectItem>
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
                    customer.overdueAmount > 0 && "border-l-4 border-l-red-800",
                    customer.overdueAmount <= 0 && isWindowActive(customer.payment_window) && (
                      customer.payment_window === '1 to 10' ? "border-l-4 border-l-blue-600" : "border-l-4 border-l-purple-600"
                    ),
                    highlightId === customer.id?.toString() && "bg-muted/50"
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
                                {customer.payment_window && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs",
                                      customer.payment_window === '1 to 10' ? "text-white" : "text-white",
                                    )}
                                  >
                                    Ventana {customer.payment_window === '1 to 10' ? '1-10' : '20-30'} · vence el {getAnchorDay(customer.payment_window)}
                                  </Badge>
                                )}
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
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => { e.stopPropagation(); handleCopyValue(customer.email!, 'Email'); }}
                                      title="Copiar email"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                {customer.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {customer.phone}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => { e.stopPropagation(); handleCopyValue(customer.phone!, 'Teléfono'); }}
                                      title="Copiar teléfono"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-right">
                            <div>
                              <div className="text-sm font-medium">Total Adeudado</div>
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-bold">{formatCurrency(customer.totalOwed)}</div>
                              </div>
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCustomer(customer)}
                              className="h-12 w-12 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="border-t pt-4">
                          {/* Group installments by sale */}
                          {customer.sales.map((sale) => {
                            const saleInstallments = customer.installments
                              .filter(inst => inst.sale_id === sale.id)
                              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

                            return (
                              <Collapsible
                                key={sale.id}
                                open={expandedSales.has(sale.id!)}
                                onOpenChange={(open) => {
                                  setExpandedSales(prev => {
                                    const next = new Set(prev);
                                    if (open) next.add(sale.id!); else next.delete(sale.id!);
                                    return next;
                                  });
                                }}
                              >
                                <Card className="mb-3 bg-muted/20">
                                  <CollapsibleTrigger asChild>
                                    <div className="cursor-pointer p-3 hover:bg-muted/50 rounded-md flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {expandedSales.has(sale.id!) ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                        {(() => {
                                          const items = sale.items ?? [];
                                          if (items.length === 0) {
                                            return <span className="font-medium">Venta #{sale.sale_number}</span>;
                                          }
                                          const firstProduct = items[0];
                                          const hasMultipleItems = items.length > 1;
                                          return (
                                            <div className="flex items-center gap-2">
                                              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                                <Package className="w-3 h-3 text-primary" />
                                              </div>
                                              <span className="font-medium">{firstProduct.product_name}</span>
                                              {hasMultipleItems && (
                                                <Popover>
                                                  <PopoverTrigger asChild>
                                                    <Button onClick={(e) => e.stopPropagation()} variant="outline" size="sm" className="h-6 px-2 text-xs z-10">
                                                      +{items.length - 1} más
                                                    </Button>
                                                  </PopoverTrigger>
                                                  <PopoverContent className="w-80" align="start">
                                                    <div className="space-y-2">
                                                      <h4 className="font-medium text-sm">Productos en esta venta:</h4>
                                                      <div className="space-y-1 max-h-48 overflow-y-auto">
                                                        {items.map((item, index) => (
                                                          <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                                            <div className="flex items-center gap-2">
                                                              <Package className="w-3 h-3 text-muted-foreground" />
                                                              <span>{item.product_name}</span>
                                                            </div>
                                                            <div className="text-muted-foreground">x{item.quantity}</div>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  </PopoverContent>
                                                </Popover>
                                              )}
                                            </div>
                                          );
                                        })()}
                                        {saleInstallments.length > 0 && (
                                          <Badge variant="outline" className="text-xs">
                                            {saleInstallments.length} cuotas
                                          </Badge>
                                        )}
                                        {sale.payment_status === 'overdue' && (
                                          <Badge variant="destructive" className="text-xs">Pago Vencido</Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm text-muted-foreground">
                                          {sale.date ? formatDate(sale.date) : ''}
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                          onClick={(e) => { e.stopPropagation(); handleDeleteSale(sale); }}
                                          title="Eliminar venta"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Eliminar venta</span>
                                        </Button>
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="pt-2">
                                      {saleInstallments.length === 0 ? (
                                        <div className="text-sm text-muted-foreground p-2">Sin cuotas para esta venta.</div>
                                      ) : (
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Cuota</TableHead>
                                              <TableHead>Vencimiento</TableHead>
                                              <TableHead>Periodo de pago</TableHead>
                                              <TableHead>Monto</TableHead>
                                              <TableHead>Pagado</TableHead>
                                              <TableHead>Balance</TableHead>
                                              <TableHead>Estado</TableHead>
                                              <TableHead className="w-[100px]">Acciones</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {saleInstallments.map((installment) => {
                                              const isOverdue = new Date(installment.due_date) < new Date() && installment.status !== 'paid';
                                              return (
                                                <TableRow
                                                  key={installment.id}
                                                  id={`installment-${installment.id}`}
                                                  className={cn(
                                                    isOverdue && "bg-red-950",
                                                    installment.status === 'paid' && "bg-white/5"
                                                  )}
                                                >
                                                  <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                      #{installment.installment_number}
                                                      {installment.notes === 'Pago adelantado' && (
                                                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                                          Adelantado
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  </TableCell>
                                                  <TableCell>
                                                    <div className={cn(
                                                      "text-sm",
                                                      isOverdue && "text-red-600 font-medium"
                                                    )}>
                                                      {formatDate(installment.due_date)}
                                                      {(() => {
                                                        const due = new Date(installment.due_date);
                                                        const isSameMonth = clientDate && (due.getFullYear() === clientDate.getFullYear() && due.getMonth() === clientDate.getMonth());
                                                        const anchor = getAnchorDay(customer.payment_window);
                                                        const isAnchorThisMonth = !!isSameMonth && due.getDate() === anchor;
                                                        const isActive = isWindowActive(customer.payment_window);
                                                        return (isAnchorThisMonth && isActive && installment.status !== 'paid') ? (
                                                          <Badge className="ml-2 text-xs bg-amber-100 text-amber-800">Activa</Badge>
                                                        ) : null;
                                                      })()}
                                                    </div>
                                                  </TableCell>
                                                  <TableCell>
                                                    <div className="text-sm text-muted-foreground">
                                                      {formatPaymentPeriod(customer.payment_window, installment.due_date)}
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
                                                      {installment.status !== 'paid' ? (
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

                                                        </>
                                                      ) : (
                                                        <>
                                                          <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleRevertPayment(installment)}
                                                            className="h-7 px-2 text-xs text-white/80 hover:text-white border-white hover:border-white"
                                                          >
                                                            <X className="h-3 w-3 mr-1" />
                                                            Revertir
                                                          </Button>
                                                        </>
                                                      )}
                                                    </div>
                                                  </TableCell>
                                                </TableRow>
                                              )
                                            })}
                                          </TableBody>
                                        </Table>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </Card>
                              </Collapsible>
                            );
                          })
                          }
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



      {/* Delete Sale Confirmation */}
      <AlertDialog open={!!deleteSale} onOpenChange={() => setDeleteSale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Venta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la venta #{deleteSale?.sale_number}?
              Se eliminarán sus cuotas asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSale} className="bg-red-600 hover:bg-red-700">
              Eliminar Venta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Customer Confirmation */}
      <AlertDialog open={!!deleteCustomer} onOpenChange={() => setDeleteCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar al cliente "{deleteCustomer?.name}" y todas sus ventas e instalments?
            </AlertDialogDescription>
            <div className="mt-2">
              <p className="text-sm text-muted-foreground mb-2">Esta acción eliminará:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>{deleteCustomer?.sales.length} venta(s)</li>
                <li>{deleteCustomer?.installments.length} cuota(s)</li>
              </ul>
            </div>
            <AlertDialogDescription className="sr-only">
              Confirmación de eliminación de cliente
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCustomer} className="bg-red-600 hover:bg-red-700">
              Eliminar Cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

InstallmentDashboard.displayName = 'InstallmentDashboard';