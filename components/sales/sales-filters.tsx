'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';


const Calendar = dynamic(() => import('@/components/ui/calendar').then(m => m.Calendar), {
  ssr: false,
});
import { Separator } from '@/components/ui/separator';
import { Filter, X, Calendar as CalendarIcon, SortAsc, SortDesc, RotateCcw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Sale } from '@/lib/database-operations';
import { cn } from '@/lib/utils';

export interface SalesFilters {
  search: string;
  sortBy: 'sale_number' | 'customer_name' | 'date' | 'total_amount' | 'payment_status' | 'payment_type' | 'reference_code';
  sortOrder: 'asc' | 'desc';
  paymentStatus: string[];
  paymentType: string[];
  minAmount: number | null;
  maxAmount: number | null;
  dateAfter: Date | null;
  dateBefore: Date | null;
}

interface SalesFiltersProps {
  filters: SalesFilters;
  onFiltersChange: (filters: SalesFilters) => void;
  sales: Sale[];
  onSaleSelect?: (sale: Sale) => void;
}

export function SalesFiltersComponent({
  filters,
  onFiltersChange,
  sales,
  onSaleSelect
}: SalesFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  const updateFilters = (updates: Partial<SalesFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const resetFilters = () => {
    onFiltersChange({
      search: '',
      sortBy: 'date',
      sortOrder: 'desc',
      paymentStatus: [],
      paymentType: [],
      minAmount: null,
      maxAmount: null,
      dateAfter: null,
      dateBefore: null
    });
    setDateRange({});
  };

  const togglePaymentStatus = (status: string) => {
    const newStatuses = filters.paymentStatus.includes(status)
      ? filters.paymentStatus.filter(s => s !== status)
      : [...filters.paymentStatus, status];
    updateFilters({ paymentStatus: newStatuses });
  };

  const togglePaymentType = (type: string) => {
    const newTypes = filters.paymentType.includes(type)
      ? filters.paymentType.filter(t => t !== type)
      : [...filters.paymentType, type];
    updateFilters({ paymentType: newTypes });
  };

  const activeFiltersCount = [
    filters.search,
    filters.paymentStatus.length > 0,
    filters.paymentType.length > 0,
    filters.minAmount !== null,
    filters.maxAmount !== null,
    filters.dateAfter,
    filters.dateBefore
  ].filter(Boolean).length;

  const paymentStatuses = [
    { value: 'paid', label: 'Pagado' },
    { value: 'partial', label: 'Parcial' },
    { value: 'unpaid', label: 'Sin pagar' },
    { value: 'overdue', label: 'Vencido' }
  ];

  const paymentTypes = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'installments', label: 'Cuotas' },
  ];

  return (
    <div className="space-y-4">
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ventas..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-8"
          />
        </div>

      {/* Advanced Filters */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-6 w-6 p-3 text-xs flex align-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          sideOffset={8}
          align="start"
          collisionPadding={8}
          className="w-[min(90vw,32rem)] max-h-[calc(100vh-120px)] short:max-h-[calc(100vh-88px)] overflow-y-auto"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtros avanzados</h4>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            </div>

            <Separator />

            {/* Payment Status Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Estado de pago</Label>
              <div className="flex flex-wrap gap-2">
                {paymentStatuses.map((status) => (
                  <Button
                    key={status.value}
                    variant={filters.paymentStatus.includes(status.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePaymentStatus(status.value)}
                    className="h-8"
                  >
                    {status.label}
                    {filters.paymentStatus.includes(status.value) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Payment Type Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tipo de pago</Label>
              <div className="flex flex-wrap gap-2">
                {paymentTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={filters.paymentType.includes(type.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePaymentType(type.value)}
                    className="h-8"
                  >
                    {type.label}
                    {filters.paymentType.includes(type.value) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Amount Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Rango de monto</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Mínimo</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minAmount || ''}
                    onChange={(e) => updateFilters({ minAmount: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Máximo</Label>
                  <Input
                    type="number"
                    placeholder="Sin límite"
                    value={filters.maxAmount || ''}
                    onChange={(e) => updateFilters({ maxAmount: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Rango de fechas</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Desde</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-ellipsis",
                          !filters.dateAfter && "text-muted-foreground text-ellipsis"
                        )}
                      >
                        <CalendarIcon className="mr-1 h-4 w-4" />
                        {filters.dateAfter ? (
                          format(filters.dateAfter, "PPP", { locale: es })
                        ) : (
                          <span>Seleccionar</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        locale={es}
                        mode="single"
                        selected={filters.dateAfter || undefined}
                        onSelect={(date) => updateFilters({ dateAfter: date || null })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Hasta</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateBefore && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateBefore ? (
                          format(filters.dateBefore, "PPP", { locale: es })
                        ) : (
                          <span>Seleccionar</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" collisionPadding={8} sideOffset={6}>
                      <Calendar
                        locale={es}
                        mode="single"
                        selected={filters.dateBefore || undefined}
                        onSelect={(date) => updateFilters({ dateBefore: date || null })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      </div>
    </div>
  );
}



export function applySalesFilters(sales: Sale[], filters: SalesFilters): Sale[] {
  let filtered = [...sales];



  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(sale =>
      sale.sale_number.toLowerCase().includes(searchTerm) ||
      (sale.reference_code ? sale.reference_code.toLowerCase().includes(searchTerm) : false) ||
      sale.customer_name?.toLowerCase().includes(searchTerm) ||
      sale.notes?.toLowerCase().includes(searchTerm)
    );
  }



  if (filters.paymentStatus.length > 0) {
    filtered = filtered.filter(sale => 
      filters.paymentStatus.includes(sale.payment_status)
    );
  }



  if (filters.paymentType.length > 0) {
    filtered = filtered.filter(sale => 
      filters.paymentType.includes(sale.payment_type)
    );
  }



  if (filters.minAmount !== null) {
    filtered = filtered.filter(sale => sale.total_amount >= filters.minAmount!);
  }
  if (filters.maxAmount !== null) {
    filtered = filtered.filter(sale => sale.total_amount <= filters.maxAmount!);
  }



  if (filters.dateAfter) {
    filtered = filtered.filter(sale => {
      if (!sale.date) return false;
      return new Date(sale.date) >= filters.dateAfter!;
    });
  }
  if (filters.dateBefore) {
    filtered = filtered.filter(sale => {
      if (!sale.date) return false;
      return new Date(sale.date) <= filters.dateBefore!;
    });
  }



  filtered.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (filters.sortBy) {
      case 'sale_number':
        aValue = a.sale_number;
        bValue = b.sale_number;
        break;
      case 'reference_code':
        aValue = a.reference_code || '';
        bValue = b.reference_code || '';
        break;
      case 'customer_name':
        aValue = a.customer_name || '';
        bValue = b.customer_name || '';
        break;
      case 'date':
        aValue = new Date(a.date || 0);
        bValue = new Date(b.date || 0);
        break;
      case 'total_amount':
        aValue = a.total_amount;
        bValue = b.total_amount;
        break;
      case 'payment_status':
        aValue = a.payment_status;
        bValue = b.payment_status;
        break;
      case 'payment_type':
        aValue = a.payment_type;
        bValue = b.payment_type;
        break;
      default:
        aValue = a.date;
        bValue = b.date;
    }

    if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return filtered;
}