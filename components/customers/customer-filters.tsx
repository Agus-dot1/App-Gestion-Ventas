'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Filter, SortAsc, SortDesc, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import type { Customer } from '@/lib/database-operations';
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const updateFilters = (updated: Partial<CustomerFilters>) => {
    onFiltersChange({ ...filters, ...updated });
  };

  const selectedFiltersCount = [
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

        {/* Sort Order Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
        >
          {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
        </Button>

        {/* Filters Popover */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {selectedFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">{selectedFiltersCount}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(90vw,640px)]">
            <div className="space-y-4">
              {/* Tags */}
              <div className="space-y-2">
                <Label>Etiquetas</Label>
                <Input
                  value={filters.tags.join(', ')}
                  onChange={(e) => updateFilters({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  placeholder="Etiquetas (separadas por coma)"
                />
              </div>

              {/* Other filters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tiene email</Label>
                  <Select value={String(filters.hasEmail)} onValueChange={(value) => updateFilters({ hasEmail: value === 'true' ? true : value === 'false' ? false : null })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Cualquiera</SelectItem>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tiene teléfono</Label>
                  <Select value={String(filters.hasPhone)} onValueChange={(value) => updateFilters({ hasPhone: value === 'true' ? true : value === 'false' ? false : null })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Cualquiera</SelectItem>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tiene empresa</Label>
                  <Select value={String(filters.hasCompany)} onValueChange={(value) => updateFilters({ hasCompany: value === 'true' ? true : value === 'false' ? false : null })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Cualquiera</SelectItem>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date range */}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Creado después de</Label>
                  <Input
                    type="date"
                    value={filters.createdAfter ? format(filters.createdAfter, 'yyyy-MM-dd') : ''}
                    onChange={(e) => updateFilters({ createdAfter: e.target.value ? new Date(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label>Creado antes de</Label>
                  <Input
                    type="date"
                    value={filters.createdBefore ? format(filters.createdBefore, 'yyyy-MM-dd') : ''}
                    onChange={(e) => updateFilters({ createdBefore: e.target.value ? new Date(e.target.value) : null })}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <Button variant="outline" className="gap-2" onClick={() => {
                  updateFilters({
                    search: '',
                    sortBy: 'name',
                    sortOrder: 'asc',
                    tags: [],
                    hasEmail: null,
                    hasPhone: null,
                    hasCompany: null,
                    createdAfter: null,
                    createdBefore: null,
                  });
                  setIsFilterOpen(false);
                }}>
                  <RotateCcw className="h-4 w-4" />
                  Restablecer
                </Button>
                <Button onClick={() => setIsFilterOpen(false)}>Aplicar</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function applyCustomerFilters(customers: Customer[], filters: CustomerFilters): Customer[] {
  let filtered = [...customers];

  // Advanced fuzzy search
  if (filters.search) {
    filtered = searchCustomersWithFuzzy(filtered, filters.search);
  }
  
  // hasEmail filter
  if (filters.hasEmail !== null) {
    filtered = filtered.filter(c => (filters.hasEmail ? !!c.email : !c.email));
  }

  // hasPhone filter
  if (filters.hasPhone !== null) {
    filtered = filtered.filter(c => (filters.hasPhone ? !!c.phone : !c.phone));
  }

  // hasCompany filter
  if (filters.hasCompany !== null) {
    filtered = filtered.filter(c => (filters.hasCompany ? !!c.company : !c.company));
  }

  // date range
  if (filters.createdAfter) {
    filtered = filtered.filter(c => {
      if (!c.created_at) return false;
      const created = new Date(c.created_at);
      return created >= filters.createdAfter!;
    });
  }
  if (filters.createdBefore) {
    filtered = filtered.filter(c => {
      if (!c.created_at) return false;
      const created = new Date(c.created_at);
      return created <= filters.createdBefore!;
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