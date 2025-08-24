'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, MoreHorizontal, Edit, Trash2, Users, Phone, Mail, Building, Tag, Eye, Calendar, Loader2, ArrowUpDown, Filter } from 'lucide-react';
import { CustomerProfile } from './customer-profile';
import type { Customer, Sale } from '@/lib/database-operations';
import { cn } from '@/lib/utils';

interface CustomersTableProps {
  customers: Customer[];
  highlightId?: string | null;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: number) => Promise<void>;
  isLoading?: boolean;
}

type SortField = 'name' | 'email' | 'company' | 'created_at';
type SortOrder = 'asc' | 'desc';

export function CustomersTable({ customers, onEdit, onDelete, highlightId, isLoading = false }: CustomersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [emailFilter, setEmailFilter] = useState<'all' | 'with' | 'without'>('all');
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'with' | 'without'>('all');
  const [companyFilter, setCompanyFilter] = useState<'all' | 'with' | 'without'>('all');

  // Filter and sort customers
  const filteredAndSortedCustomers = customers
    .filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.tags?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesEmailFilter = emailFilter === 'all' || 
        (emailFilter === 'with' && customer.email) ||
        (emailFilter === 'without' && !customer.email);
      
      const matchesPhoneFilter = phoneFilter === 'all' || 
        (phoneFilter === 'with' && customer.phone) ||
        (phoneFilter === 'without' && !customer.phone);
      
      const matchesCompanyFilter = companyFilter === 'all' || 
        (companyFilter === 'with' && customer.company) ||
        (companyFilter === 'without' && !customer.company);
      
      return matchesSearch && matchesEmailFilter && matchesPhoneFilter && matchesCompanyFilter;
    })
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'company':
          aValue = (a.company || '').toLowerCase();
          bValue = (b.company || '').toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const fetchRelatedSales = async (customerId: number) => {
    setIsLoadingSales(true);
    try {
      const sales = await window.electronAPI.database.sales.getAll();
      const related = sales.filter(sale => sale.customer_id === customerId);
      setCustomerSales(related);
    } catch (error) {
      console.error('Error fetching related sales:', error);
      setCustomerSales([]);
    } finally {
      setIsLoadingSales(false);
    }
  };

  const handleDeleteClick = async (customer: Customer) => {
    setDeleteCustomer(customer);
    await fetchRelatedSales(customer.id!);
  };

  const handleDelete = async () => {
    if (deleteCustomer?.id) {
      await onDelete(deleteCustomer.id);
      setDeleteCustomer(null);
      setCustomerSales([]);
      setSelectedCustomers(prev => {
        const newSet = new Set(prev);
        newSet.delete(deleteCustomer.id!);
        return newSet;
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(new Set(filteredAndSortedCustomers.map(c => c.id!)));
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleSelectCustomer = (customerId: number, checked: boolean) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(customerId);
      } else {
        newSet.delete(customerId);
      }
      return newSet;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

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

  const clearFilters = () => {
    setSearchTerm('');
    setEmailFilter('all');
    setPhoneFilter('all');
    setCompanyFilter('all');
    setSortField('name');
    setSortOrder('asc');
  };

  const hasActiveFilters = searchTerm || emailFilter !== 'all' || phoneFilter !== 'all' || companyFilter !== 'all';

  return (
    <>
      <div className="space-y-4">
        {/* Search and Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedCustomers.size > 0 && (
              <Badge variant="secondary">
                {selectedCustomers.size} seleccionados
              </Badge>
            )}
          </div>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-muted")}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>
          
          {/* Filters Panel */}
          {showFilters && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Select value={emailFilter} onValueChange={(value: 'all' | 'with' | 'without') => setEmailFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="with">Con email</SelectItem>
                      <SelectItem value="without">Sin email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Teléfono</label>
                  <Select value={phoneFilter} onValueChange={(value: 'all' | 'with' | 'without') => setPhoneFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="with">Con teléfono</SelectItem>
                      <SelectItem value="without">Sin teléfono</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Empresa</label>
                  <Select value={companyFilter} onValueChange={(value: 'all' | 'with' | 'without') => setCompanyFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="with">Con empresa</SelectItem>
                      <SelectItem value="without">Sin empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        
        {/* Table Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Cargando clientes...</span>
          </div>
        ) : filteredAndSortedCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron clientes</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters ? 'No hay clientes que coincidan con los filtros.' : 'Empezá añadiendo tu primer cliente.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedCustomers.size === filteredAndSortedCustomers.length && filteredAndSortedCustomers.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Nombre
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('email')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Email
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('company')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Empresa
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Etiquetas</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('created_at')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Fecha de creación
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedCustomers.map((customer) => (
                    <TableRow 
                      key={customer.id} 
                      id={`customer-${customer.id}`}
                      className={cn(
                        highlightId === customer.id?.toString() && 'bg-muted/50',
                        selectedCustomers.has(customer.id!) && 'bg-muted/30'
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedCustomers.has(customer.id!)}
                          onCheckedChange={(checked) => handleSelectCustomer(customer.id!, checked as boolean)}
                          aria-label={`Seleccionar ${customer.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {customer.name}
                          {highlightId === customer.id?.toString() && (
                            <Badge variant="outline" className="bg-primary/10 text-primary">
                              Encontrado
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.email ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {customer.email}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Sin email</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {customer.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Sin teléfono</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.company ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            {customer.company}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Sin empresa</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.tags && customer.tags.length > 0 ? (() => {
                          const tagsArray = customer.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                          return (
                            <div className="flex flex-wrap gap-1">
                              {tagsArray.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {tagsArray.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{tagsArray.length - 2}
                                </Badge>
                              )}
                            </div>
                          );
                        })() : (
                          <span className="text-muted-foreground italic text-sm">Sin etiquetas</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {customer.created_at ? formatDate(customer.created_at) : 'Desconocido'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(customer)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(customer)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </div>

      {/* Customer Profile Modal */}
      {selectedCustomer && (
        <CustomerProfile
          customer={selectedCustomer}
          onEdit={onEdit}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCustomer} onOpenChange={() => setDeleteCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar a &quot;{deleteCustomer?.name}&quot;?
              {isLoadingSales ? (
                <div className="flex items-center gap-2 mt-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verificando ventas relacionadas...</span>
                </div>
              ) : customerSales.length > 0 ? (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Atención:</strong> Este cliente tiene {customerSales.length} venta(s) asociada(s).
                    Al eliminar el cliente, estas ventas quedarán sin cliente asignado.
                  </p>
                  <div className="mt-2 space-y-1">
                    {customerSales.slice(0, 3).map((sale) => (
                      <div key={sale.id} className="text-xs text-yellow-700">
                        • Venta #{sale.id} - {formatCurrency(sale.total_amount)} ({formatDate(sale.created_at || '')})
                      </div>
                    ))}
                    {customerSales.length > 3 && (
                      <div className="text-xs text-yellow-700">• Y {customerSales.length - 3} venta(s) más...</div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-green-600">✓ No hay ventas asociadas a este cliente.</p>
              )}
              <p className="mt-2">Esta acción no se puede deshacer.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700 text-slate-50"
              disabled={isLoadingSales}
            >
              {isLoadingSales ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}