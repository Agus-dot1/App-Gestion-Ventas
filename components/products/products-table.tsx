'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MoreHorizontal, Edit, Trash2, Eye, EyeOff, Package, Download, FileText, Filter, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Product } from '@/lib/database-operations';
import { cn } from '@/lib/utils';
import { DropdownMenuSeparator } from '@radix-ui/react-dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ButtonGroup } from '../ui/button-group';
import { Toggle } from '../ui/toggle';

interface ProductsTableProps {
  products: Product[];
  highlightId?: string | null;
  onEdit: (product: Product) => void;
  onDelete: (productId: number) => void;
  onBulkDelete: (productIds: number[]) => void;
  onToggleStatus: (productId: number, isActive: boolean) => void;
  isLoading?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  paginationInfo?: { total: number; totalPages: number; currentPage: number; pageSize: number };
  serverSidePagination?: boolean;
}

export function ProductsTable({ 
  products, 
  highlightId, 
  onEdit, 
  onDelete, 
  onBulkDelete,
  onToggleStatus, 
  isLoading = false,
  searchTerm: externalSearchTerm,
  onSearchChange,
  currentPage: externalCurrentPage,
  onPageChange,
  paginationInfo,
  serverSidePagination = false
}: ProductsTableProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Use external state for server-side pagination, internal state for client-side
  const searchTerm = serverSidePagination ? (externalSearchTerm || '') : internalSearchTerm;
  const setSearchTerm = serverSidePagination ? (onSearchChange || (() => {})) : setInternalSearchTerm;

  const filteredProducts = serverSidePagination ? products : products.filter(product => {
    // Text search filter
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && product.is_active) ||
      (statusFilter === 'inactive' && !product.is_active);
    
    // Price filter
    let matchesPrice = true;
    if (priceFilter !== 'all') {
      const price = product.price;
      switch (priceFilter) {
        case 'low':
          matchesPrice = price < 50000;
          break;
        case 'medium':
          matchesPrice = price >= 50000 && price < 150000;
          break;
        case 'high':
          matchesPrice = price >= 150000;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPrice;
  });

  const handleDelete = async () => {
    if (deleteProduct?.id) {
      await onDelete(deleteProduct.id);
      setDeleteProduct(null);
    }
  };

  const handleBulkDelete = async () => {
    const productIds = Array.from(selectedProducts);
    if (productIds.length > 0) {
      await onBulkDelete(productIds);
      setSelectedProducts(new Set());
      setSelectAll(false);
      setShowBulkDeleteDialog(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const allProductIds = new Set(filteredProducts.map(p => p.id!));
      setSelectedProducts(allProductIds);
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId: number, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
      setSelectAll(false);
    }
    setSelectedProducts(newSelected);
    
    // Update select all state
    if (newSelected.size === filteredProducts.length) {
      setSelectAll(true);
    }
  };

  const exportSelectedProducts = () => {
    const selectedProductsData = products.filter(p => selectedProducts.has(p.id!));
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Productos Seleccionados', 14, 22);
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Total de productos: ${selectedProductsData.length}`, 14, 40);
    
    // Prepare data for table
    const tableData = selectedProductsData.map(product => [
      product.name,
      product.category,
      `$${product.price.toFixed(2)}`,
      product.stock?.toString() ?? '0',
      product.description || '-'
    ]);
    
    // Add table
    autoTable(doc, {
      head: [['Nombre', 'Categoría', 'Precio', 'Stock', 'Descripción']],
      body: tableData,
      startY: 60,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`productos_seleccionados_${new Date().toISOString().split('T')[0]}.pdf`);
  };


  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriceFilter('all');
    setShowFilters(false);
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || priceFilter !== 'all';

  return (
    <>
      <Card className="animate-in fade-in-0 duration-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos
              </CardTitle>
              <CardDescription>
                Acá podés ver y gestionar todos tus productos.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                {selectedProducts.size > 0 && (
                  <div className="flex items-center gap-2 mr-4">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {selectedProducts.size} seleccionado{selectedProducts.size !== 1 ? 's' : ''}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportSelectedProducts}
                      className="h-8"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Exportar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBulkDeleteDialog(true)}
                      className="h-8"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64 transition-all duration-200 focus:w-72"
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "h-10 transition-all duration-200",
                      showFilters && "bg-primary/10 text-primary"
                    )}
                    disabled={isLoading}
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    Filtros
                  </Button>
                  {hasActiveFilters && (
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={clearFilters}
                       className="h-10 text-muted-foreground hover:text-foreground"
                     >
                       <X className="h-4 w-4 mr-1" />
                       Limpiar
                     </Button>
                   )}
                 </div>
              </div>
          </div>
        </CardHeader>
          {showFilters && (
            <div className="px-6 pb-4 border-b animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Estado:</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Precio:</label>
                  <Select value={priceFilter} onValueChange={setPriceFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los precios</SelectItem>
                      <SelectItem value="low">Menos de $50,000</SelectItem>
                      <SelectItem value="medium">$50,000 - $150,000</SelectItem>
                      <SelectItem value="high">Más de $150,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}
          <CardContent>
          {isLoading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Skeleton className="h-4 w-4" />
                    </TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se han encontrado productos</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No se encontraron productos con ese nombre.' : 'No hay productos registrados, empezá añadiendo algunos.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                        aria-label="Seleccionar todos los productos"
                        disabled={isLoading}
                      />
                    </TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product, index) => (
                    <TableRow 
                      key={product.id} 
                      id={`product-${product.id}`}
                      className={cn(
                        "transition-all duration-200 hover:bg-muted/50 animate-in slide-in-from-bottom-2",
                        highlightId === product.id?.toString() && 'bg-muted/50 ring-2 ring-primary/20',
                        `animation-delay-${Math.min(index * 100, 500)}ms`
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.has(product.id!)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id!, checked as boolean)}
                          aria-label={`Seleccionar ${product.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{product.name}</span>
                            {highlightId === product.id?.toString() && (
                              <Badge variant="outline" className="bg-primary/10 text-primary w-fit mt-1">
                                Coincidencia
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.category && product.category !== 'sin-categoria' ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {product.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Sin categoría</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-lg text-white">
                          {formatPrice(product.price)}
                        </span>
                      </TableCell>
                      <TableCell>
                         {typeof product.stock === 'number' ? (
                           <div className="flex items-center gap-1">
                             <span className="font-medium">{product.stock}</span>
                             <span className="text-muted-foreground text-sm">unidades</span>
                           </div>
                         ) : (
                           <span className="text-muted-foreground italic text-sm">No especificado</span>
                         )}
                       </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate text-sm">
                          {product.description || (
                            <span className="text-muted-foreground italic">Sin descripción</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                          <ButtonGroup>
                            <Toggle
                              variant="outline"
                              size="sm"
                              pressed={product.is_active}
                              onPressedChange={(pressed) => onToggleStatus(product.id!, pressed)}
                              aria-label={product.is_active ? 'Desactivar producto' : 'Activar producto'}
                              className="w-[120px]"
                            >
                              <span className="flex items-center gap-1">
                                {product.is_active ? (
                                  <>
                                    <EyeOff className="h-4 w-4" />
                                    <span>Desactivar</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    <span>Activar</span>
                                  </>
                                )}
                              </span>
                            </Toggle>
                            <Button variant="secondary" size="sm" onClick={() => onEdit(product)}>Editar</Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteProduct(product)}>Eliminar</Button>
                          </ButtonGroup>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {serverSidePagination && paginationInfo && paginationInfo.totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {((paginationInfo.currentPage - 1) * paginationInfo.pageSize) + 1} a {Math.min(paginationInfo.currentPage * paginationInfo.pageSize, paginationInfo.total)} de {paginationInfo.total} productos
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange && onPageChange(paginationInfo.currentPage - 1)}
                  disabled={paginationInfo.currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = page === 1 || page === paginationInfo.totalPages || 
                                   (page >= paginationInfo.currentPage - 1 && page <= paginationInfo.currentPage + 1);
                    
                    if (!showPage) {
                      // Show ellipsis for gaps
                      if (page === paginationInfo.currentPage - 2 || page === paginationInfo.currentPage + 2) {
                        return <span key={page} className="px-2 text-muted-foreground">...</span>;
                      }
                      return null;
                    }
                    
                    return (
                      <Button
                        key={page}
                        variant={paginationInfo.currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange && onPageChange(page)}
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
                  onClick={() => onPageChange && onPageChange(paginationInfo.currentPage + 1)}
                  disabled={paginationInfo.currentPage === paginationInfo.totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de eliminar &quot;{deleteProduct?.name}&quot;? Esta accion no se puede deshacer.
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
            <AlertDialogTitle>Eliminar productos seleccionados</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de eliminar {selectedProducts.size} producto{selectedProducts.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-slate-50">
              Eliminar {selectedProducts.size} producto{selectedProducts.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}