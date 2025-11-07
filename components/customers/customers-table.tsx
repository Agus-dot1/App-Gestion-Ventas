'use client';

import { useState, useMemo, useEffect, useRef } from 'react';


import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, MoreHorizontal, Edit, Trash2, Users, Phone, Calendar, Loader2, Mail, Building, Tag, Eye, Download, X, ArrowUpDown, ArrowUp, ArrowDown, FileText, MoreHorizontalIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Customer, Sale } from '@/lib/database-operations';
import { cn } from '@/lib/utils';
import { ButtonGroup } from "@/components/ui/button-group";
import { DropdownMenuGroup } from '@radix-ui/react-dropdown-menu';
import { CustomersColumnToggle, ColumnVisibility as CustomerColumnVisibility } from '@/components/customers/customers-column-toggle';

interface EnhancedCustomersTableProps {
  customers: Customer[];
  highlightId?: string | null;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: number) => void;
  onView: (customer: Customer) => void;
  isLoading?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  paginationInfo?: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
  serverSidePagination?: boolean;
  onSelectAll?: (selectAll: boolean) => void;
  allCustomerIds?: number[];
  onGetCustomersByIds?: (ids: number[]) => Promise<Customer[]>;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function EnhancedCustomersTable({ 
  customers, 
  highlightId, 
  onEdit, 
  onDelete, 
  onView, 
  isLoading = false,
  searchTerm: externalSearchTerm,
  onSearchChange,
  currentPage: externalCurrentPage,
  onPageChange,
  paginationInfo,
  serverSidePagination = false,
  onSelectAll,
  allCustomerIds = [],
  onGetCustomersByIds
}: EnhancedCustomersTableProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');


  const [inputValue, setInputValue] = useState(externalSearchTerm || '');
  const debounceRef = useRef<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Customer; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<CustomerColumnVisibility>({
    name: true,
    dni: true,
    contact: true,
    address: true,
    created_at: true,
  });



  const CUSTOMERS_PERSIST_KEY = 'customersTablePrefs';



  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(CUSTOMERS_PERSIST_KEY) : null;
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs?.columnVisibility) {
          setColumnVisibility(prev => ({ ...prev, ...prefs.columnVisibility }));
        }
        if (prefs?.sortConfig) {
          setSortConfig(prev => ({ ...prev, ...prefs.sortConfig }));
        }
        if (!serverSidePagination && typeof prefs?.searchTerm === 'string') {
          setInternalSearchTerm(prefs.searchTerm);
        }
      }
    } catch (e) {
      console.warn('Failed to load customers table prefs:', e);
    }
  }, [serverSidePagination]);



  useEffect(() => {
    try {
      const prefs = {
        columnVisibility,
        sortConfig,
        searchTerm: serverSidePagination ? undefined : internalSearchTerm,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(CUSTOMERS_PERSIST_KEY, JSON.stringify(prefs));
      }
    } catch (e) {
      console.warn('Failed to save customers table prefs:', e);
    }
  }, [columnVisibility, sortConfig, internalSearchTerm, serverSidePagination]);



  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedCustomers);
    for (const customerId of selectedIds) {
      await onDelete(customerId);
    }
    setSelectedCustomers(new Set());
    setShowBulkDeleteDialog(false);
  };
  const itemsPerPage = 10;



  const searchTerm = serverSidePagination ? (externalSearchTerm || '') : internalSearchTerm;
  const currentPage = serverSidePagination ? (externalCurrentPage || 1) : internalCurrentPage;
  
  const handleSearchChange = (term: string) => {
    if (serverSidePagination && onSearchChange) {


      setInputValue(term);


      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        onSearchChange(term);
        if (onPageChange) onPageChange(1);
      }, 300);
    } else {
      setInternalSearchTerm(term);
      setInternalCurrentPage(1);
    }
  };



  useEffect(() => {
    if (serverSidePagination) {
      setInputValue(externalSearchTerm || '');
    }
  }, [externalSearchTerm, serverSidePagination]);
  
  const handlePageChange = (page: number) => {
    if (serverSidePagination && onPageChange) {
      onPageChange(page);
    } else {
      setInternalCurrentPage(page);
    }
  };



  const handleSort = (key: keyof Customer) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: keyof Customer) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-1 h-4 w-4" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
  };



  const filteredCustomers = serverSidePagination ? customers : customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );



  const sortedCustomers = useMemo(() => {
    const base = serverSidePagination ? customers : filteredCustomers;
    const sorted = [...base];
    sorted.sort((a, b) => {
      const key = sortConfig.key;
      let aValue: any = (a as any)[key];
      let bValue: any = (b as any)[key];



      if (key === 'created_at') {
        const aTime = aValue ? new Date(aValue).getTime() : 0;
        const bTime = bValue ? new Date(bValue).getTime() : 0;
        const cmp = aTime - bTime;
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      }



      aValue = (aValue ?? '').toString().toLowerCase();
      bValue = (bValue ?? '').toString().toLowerCase();
      const cmp = aValue.localeCompare(bValue);
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredCustomers, customers, sortConfig, serverSidePagination]);



  const totalPages = serverSidePagination ? (paginationInfo?.totalPages || 1) : Math.ceil(sortedCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = serverSidePagination ? sortedCustomers : sortedCustomers.slice(startIndex, endIndex);



  const handlePageChangeWithClear = (page: number) => {
    handlePageChange(page);
  };

  const handleSelectCustomer = (customerId: number | undefined, checked: boolean) => {
    if (customerId === undefined) return;
    
    const newSelected = new Set(selectedCustomers);
    if (checked) {
      newSelected.add(customerId);
    } else {
      newSelected.delete(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleDelete = async () => {
    if (deleteCustomer?.id) {
      await onDelete(deleteCustomer.id);
      setDeleteCustomer(null);
    }
  };

  const handleSelectAll = async (checked: boolean) => {
    if (serverSidePagination && onSelectAll) {


      onSelectAll(checked);
      if (checked) {
        if (allCustomerIds.length === 0 && typeof window !== 'undefined') {
          try {
            const all = await window.electronAPI?.database?.customers?.getAll();
            const ids = (all || []).map(c => c.id).filter(id => id !== undefined) as number[];
            setSelectedCustomers(new Set(ids));
          } catch (e) {
            console.error('Error al cargar todos los IDs de clientes para seleccionar todo:', e);
            setSelectedCustomers(new Set(sortedCustomers.map(c => c.id!).filter(id => id !== undefined) as number[]));
          }
        } else {
          setSelectedCustomers(new Set(allCustomerIds));
        }
      } else {
        setSelectedCustomers(new Set());
      }
    } else {


      if (checked) {
        setSelectedCustomers(new Set(sortedCustomers.map(c => c.id).filter(id => id !== undefined) as number[]));
      } else {
        setSelectedCustomers(new Set());
      }
    }
  };



  const isAllSelected = serverSidePagination 
    ? allCustomerIds.length > 0 && selectedCustomers.size === allCustomerIds.length
    : sortedCustomers.length > 0 && selectedCustomers.size === sortedCustomers.filter(c => c.id !== undefined).length;



  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('es-AR', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const exportToPDF = async () => {
    let selectedData: Customer[];
    if (serverSidePagination && onGetCustomersByIds && selectedCustomers.size > 0) {
      const selectedIds = Array.from(selectedCustomers);
      selectedData = await onGetCustomersByIds(selectedIds);
    } else {
      selectedData = customers.filter(c => c.id && selectedCustomers.has(c.id));
    }

    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;


    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.text('Listado de Clientes', 14, 18);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 26);
    doc.text(`Seleccionados: ${selectedData.length}`, 14, 32);

    const tableData = selectedData.map(c => [
      c.id ?? '-',
      c.name,
      c.dni || '-',
      c.phone || '-',
      c.secondary_phone || '-',
      c.address || '-',
      c.notes || '-',
      formatDate(c.created_at),
    ]);

    autoTable(doc, {
      head: [[
        'ID', 'Nombre', 'DNI', 'Teléfono', 'Teléfono 2', 'Dirección', 'Notas', 'Creado'
      ]],
      body: tableData,
      startY: 40,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2, halign: 'left' },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 10 },


      columnStyles: {
        0: { cellWidth: 10 }, // ID
        1: { cellWidth: 28 }, // Nombre
        2: { cellWidth: 18 }, // DNI
        3: { cellWidth: 22 }, // Teléfono
        4: { cellWidth: 22 }, // Teléfono 2
        5: { cellWidth: 30 }, // Dirección
        7: { cellWidth: 30 }, // Notas
        9: { cellWidth: 14 }, // Creado
      },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal?.getNumberOfPages
          ? (doc as any).internal.getNumberOfPages()
          : 1;
        const pageNum = (data as any)?.pageNumber ?? pageCount;
        const str = `Página ${pageNum} de ${pageCount}`;
        const width = (doc as any).internal?.pageSize?.getWidth
          ? (doc as any).internal.pageSize.getWidth()
          : (doc as any).internal?.pageSize?.width;
        const height = (doc as any).internal?.pageSize?.getHeight
          ? (doc as any).internal.pageSize.getHeight()
          : (doc as any).internal?.pageSize?.height;
        doc.setFontSize(9);
        doc.text(str, (width || 210) - 60, (height || 297) - 10);
      }
    });

    doc.save(`clientes_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = async () => {
    let selectedData: Customer[];
    if (serverSidePagination && onGetCustomersByIds && selectedCustomers.size > 0) {
      const selectedIds = Array.from(selectedCustomers);
      selectedData = await onGetCustomersByIds(selectedIds);
    } else {
      selectedData = customers.filter(c => c.id && selectedCustomers.has(c.id));
    }

    const XLSX = await import('xlsx');
    const rows = selectedData.map(c => ({
      ID: c.id ?? '',
      Nombre: c.name,
      DNI: c.dni || '',
      Teléfono: c.phone || '',
      'Teléfono 2': c.secondary_phone || '',
      Dirección: c.address || '',
      Notas: c.notes || '',
      Creado: formatDate(c.created_at),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 },  // ID
      { wch: 30 }, // Nombre
      { wch: 14 }, // DNI
      { wch: 28 }, // Teléfono
      { wch: 28 }, // Teléfono 2
      { wch: 40 }, // Dirección
      { wch: 40 }, // Notas
      { wch: 16 }, // Creado
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 short:[&_*]:text-sm short:[&>div_.rounded-md.border_table]:[&>table>thead>tr>th]:py-2 short:[&>div_.rounded-md.border_table]:[&>table>tbody>tr>td]:py-1">
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={serverSidePagination ? inputValue : searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
              <CustomersColumnToggle
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
              />
              {selectedCustomers.size > 0 && (
                <div className="flex items-center gap-2 mr-4 animate-in fade-in">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToPDF}
                    className="h-8"
                    disabled={isLoading}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToExcel}
                    className="h-8"
                    disabled={isLoading}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowBulkDeleteDialog(true)}
                    className="h-8"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {selectedCustomers.size} seleccionado{selectedCustomers.size !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
              <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        aria-label="Seleccionar todos"
                        disabled={isLoading}
                      />
                    </TableHead>
                    {columnVisibility.name && (
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('name')} className="h-auto p-0 font-semibold hover:bg-transparent" disabled={isLoading}>
                          Nombre
                          {getSortIcon('name')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.dni && (
                      <TableHead className="font-semibold">
                        DNI
                      </TableHead>
                    )}
                    {columnVisibility.contact && (
                      <TableHead className="font-semibold">
                        Contacto
                      </TableHead>
                    )}
                    {columnVisibility.address && (
                      <TableHead className="font-semibold">
                        Dirección
                      </TableHead>
                    )}
                    {columnVisibility.created_at && (
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('created_at')} className="h-auto p-0 font-semibold hover:bg-transparent" disabled={isLoading}>
                          Fecha de alta
                          {getSortIcon('created_at')}
                        </Button>
                      </TableHead>
                    )}
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-28" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginatedCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground w-full">
                        {sortedCustomers.length === 0 ? 'No se encontraron clientes' : 'No hay clientes en esta página'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCustomers.map((customer) => (
                      <TableRow 
                        key={customer.id}
                        className={cn(
                          highlightId === customer.id?.toString() && "bg-muted/50"
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={customer.id ? selectedCustomers.has(customer.id) : false}
                            onCheckedChange={(checked) => {
                              if (customer.id) {
                                handleSelectCustomer(customer.id, checked as boolean);
                              }
                            }}
                            aria-label={`Seleccionar ${customer.name}`}
                          />
                        </TableCell>
                        {columnVisibility.name && (
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {customer.name}
                              {highlightId === customer.id?.toString() && (
                                <Badge variant="outline" className="bg-primary/10 text-primary">
                                  Coincidencia
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.dni && (
                          <TableCell>
                            {customer.dni || '-'}
                          </TableCell>
                        )}
                        {columnVisibility.contact && (
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{customer.phone || '-'}</span>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.address && (
                          <TableCell>{customer.address || '-'}</TableCell>
                        )}
                        {columnVisibility.created_at && (
                          <TableCell>{customer.created_at ? formatDate(customer.created_at) : '-'}</TableCell>
                        )}
                        <TableCell className="flex p-2">
                          <ButtonGroup>
                            <Button variant="outline" size="sm"  onClick={() => onView(customer)}>Ver detalles</Button>
                            <Button variant="secondary" size="sm" onClick={() => onEdit(customer)}>Editar</Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteCustomer(customer)}>Eliminar</Button>
                          </ButtonGroup>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
          
          
          {/* Pagination Controls */}
          {!isLoading && (serverSidePagination ? (paginationInfo?.totalPages || 0) > 1 : sortedCustomers.length > itemsPerPage) && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                {serverSidePagination ? (
                  `Mostrando ${((currentPage - 1) * itemsPerPage) + 1} a ${Math.min(currentPage * itemsPerPage, paginationInfo?.total || 0)} de ${paginationInfo?.total || 0} clientes`
                ) : (
                  `Mostrando ${startIndex + 1} a ${Math.min(endIndex, sortedCustomers.length)} de ${sortedCustomers.length} clientes`
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChangeWithClear(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {


                    const showPage = page === 1 || page === totalPages || 
                                   (page >= currentPage - 1 && page <= currentPage + 1);
                    
                    if (!showPage) {


                      if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-2 text-muted-foreground">...</span>;
                      }
                      return null;
                    }
                    
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChangeWithClear(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChangeWithClear(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCustomer} onOpenChange={() => setDeleteCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar a "{deleteCustomer?.name}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-slate-50">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar clientes seleccionados</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar {selectedCustomers.size} cliente{selectedCustomers.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-slate-50">
              Eliminar {selectedCustomers.size} cliente{selectedCustomers.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}