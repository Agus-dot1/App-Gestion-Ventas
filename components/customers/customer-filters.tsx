'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Filter, X, Calendar as CalendarIcon, SortAsc, SortDesc, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Customer } from '@/lib/database-operations';
import { cn } from '@/lib/utils';
import { AdvancedSearch, searchCustomersWithFuzzy } from './advanced-search';

export interface CustomerFilters {
  search: string;
  sortBy: 'name' | 'email' | 'company' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  tags: string[];
  hasEmail: boolean | null;
  hasPhone: boolean | null;
  hasCompany: boolean | null;
  createdAfter: Date | null;
  createdBefore: Date | null;
}

interface CustomerFiltersProps {
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
  customers: Customer[];
  onCustomerSelect?: (customer: Customer) => void;
}

export function CustomerFiltersComponent({ filters, onFiltersChange, customers, onCustomerSelect }: CustomerFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Get unique tags from all customers
  const availableTags = Array.from(
    new Set(
      customers
        .flatMap(customer => customer.tags?.split(',').map(tag => tag.trim()) || [])
        .filter(tag => tag.length > 0)
    )
  ).sort();

  const updateFilters = (updates: Partial<CustomerFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const resetFilters = () => {
    onFiltersChange({
      search: '',
      sortBy: 'name',
      sortOrder: 'asc',
      tags: [],
      hasEmail: null,
      hasPhone: null,
      hasCompany: null,
      createdAfter: null,
      createdBefore: null
    });
    setDateRange({});
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    updateFilters({ tags: newTags });
  };

  const activeFiltersCount = [
    filters.search,
    filters.tags.length > 0,
    filters.hasEmail !== null,
    filters.hasPhone !== null,
    filters.hasCompany !== null,
    filters.createdAfter,
    filters.createdBefore
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Mobile Layout */}
      <div className="flex flex-col gap-3 md:hidden">
        {/* Advanced Search */}
        <div className="w-full">
          <AdvancedSearch
            customers={customers}
            onSearchChange={(query) => updateFilters({ search: query })}
            onCustomerSelect={onCustomerSelect}
            placeholder="Buscar clientes..."
          />
        </div>
        
        {/* Sort and Filter Controls */}
        <div className="flex items-center gap-2">
          <Select value={filters.sortBy} onValueChange={(value: any) => updateFilters({ sortBy: value })}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nombre</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="company">Empresa</SelectItem>
              <SelectItem value="created_at">Fecha creación</SelectItem>
              <SelectItem value="updated_at">Última actualización</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
          >
            {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden md:flex items-center gap-2">
        {/* Advanced Search */}
        <div className="flex-1 max-w-sm">
          <AdvancedSearch
            customers={customers}
            onSearchChange={(query) => updateFilters({ search: query })}
            onCustomerSelect={onCustomerSelect}
            placeholder="Buscar clientes..."
          />
        </div>

        {/* Sort Controls */}
        <Select value={filters.sortBy} onValueChange={(value: any) => updateFilters({ sortBy: value })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nombre</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="company">Empresa</SelectItem>
            <SelectItem value="created_at">Fecha creación</SelectItem>
            <SelectItem value="updated_at">Última actualización</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
        >
          {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
        </Button>
       </div>

       {/* Advanced Filters */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] md:w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtros avanzados</h4>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            </div>

            <Separator />

            {/* Contact Info Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Información de contacto</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tiene email</span>
                  <Select
                    value={filters.hasEmail === null ? 'all' : filters.hasEmail ? 'yes' : 'no'}
                    onValueChange={(value) => 
                      updateFilters({ 
                        hasEmail: value === 'all' ? null : value === 'yes' 
                      })
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tiene teléfono</span>
                  <Select
                    value={filters.hasPhone === null ? 'all' : filters.hasPhone ? 'yes' : 'no'}
                    onValueChange={(value) => 
                      updateFilters({ 
                        hasPhone: value === 'all' ? null : value === 'yes' 
                      })
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tiene empresa</span>
                  <Select
                    value={filters.hasCompany === null ? 'all' : filters.hasCompany ? 'yes' : 'no'}
                    onValueChange={(value) => 
                      updateFilters({ 
                        hasCompany: value === 'all' ? null : value === 'yes' 
                      })
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Etiquetas</Label>
                  <div className="flex flex-wrap gap-1">
                    {availableTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Date Range Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Fecha de creación</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !filters.createdAfter && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.createdAfter ? (
                        format(filters.createdAfter, "dd/MM/yyyy", { locale: es })
                      ) : (
                        "Desde"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.createdAfter || undefined}
                      onSelect={(date) => updateFilters({ createdAfter: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !filters.createdBefore && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.createdBefore ? (
                        format(filters.createdBefore, "dd/MM/yyyy", { locale: es })
                      ) : (
                        "Hasta"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.createdBefore || undefined}
                      onSelect={(date) => updateFilters({ createdBefore: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Helper function to apply filters to customers
export function applyCustomerFilters(customers: Customer[], filters: CustomerFilters): Customer[] {
  let filtered = [...customers];

  // Advanced fuzzy search
  if (filters.search) {
    filtered = searchCustomersWithFuzzy(filtered, filters.search);
  }

  // Contact info filters
  if (filters.hasEmail !== null) {
    filtered = filtered.filter(customer => 
      filters.hasEmail ? !!customer.email : !customer.email
    );
  }
  if (filters.hasPhone !== null) {
    filtered = filtered.filter(customer => 
      filters.hasPhone ? !!customer.phone : !customer.phone
    );
  }
  if (filters.hasCompany !== null) {
    filtered = filtered.filter(customer => 
      filters.hasCompany ? !!customer.company : !customer.company
    );
  }

  // Tags filter
  if (filters.tags.length > 0) {
    filtered = filtered.filter(customer => {
      const customerTags = customer.tags?.split(',').map(tag => tag.trim()) || [];
      return filters.tags.some(tag => customerTags.includes(tag));
    });
  }

  // Date range filter
  if (filters.createdAfter) {
    filtered = filtered.filter(customer => {
      if (!customer.created_at) return false;
      return new Date(customer.created_at) >= filters.createdAfter!;
    });
  }
  if (filters.createdBefore) {
    filtered = filtered.filter(customer => {
      if (!customer.created_at) return false;
      return new Date(customer.created_at) <= filters.createdBefore!;
    });
  }

  // Sorting
  filtered.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (filters.sortBy) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'company':
        aValue = a.company || '';
        bValue = b.company || '';
        break;
      case 'created_at':
        aValue = new Date(a.created_at || 0);
        bValue = new Date(b.created_at || 0);
        break;
      case 'updated_at':
        aValue = new Date(a.updated_at || 0);
        bValue = new Date(b.updated_at || 0);
        break;
      default:
        aValue = a.name || '';
        bValue = b.name || '';
    }

    if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return filtered;
}