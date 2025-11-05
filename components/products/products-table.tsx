'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, MoreHorizontal, Edit, Trash2, Eye, EyeOff, Package, Download, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Product } from '@/lib/database-operations';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ButtonGroup } from '../ui/button-group';
import { ProductsColumnToggle, ColumnVisibility as ProductColumnVisibility } from './products-column-toggle';
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
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ProductColumnVisibility>({
    name: true,
    category: true,
    price: true,
    cost: true,
    stock: true,
    description: true,
    status: true,
  });

  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'category' | 'price' | 'cost_price' | 'stock' | 'is_active' | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc'
  });

  const handleSort = (key: 'name' | 'category' | 'price' | 'cost_price' | 'stock' | 'is_active') => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: 'name' | 'category' | 'price' | 'cost_price' | 'stock' | 'is_active') => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-1 h-4 w-4" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
  };

  // Use external state for server-side pagination, internal state for client-side
  const searchTerm = serverSidePagination ? (externalSearchTerm || '') : internalSearchTerm;
  const setSearchTerm = serverSidePagination ? (onSearchChange || (() => {})) : setInternalSearchTerm;

  const filteredProducts = serverSidePagination ? products : products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const sortedProducts = (() => {
    // Always sort the currently visible dataset. When server-side pagination is on,
    // the parent provides the current page's array in `products`, and `filteredProducts`
    // equals `products`. We sort that array to reflect header clicks.
    const base = filteredProducts;
    if (!sortConfig.key) return base;
    const sorted = [...base].sort((a, b) => {
      const key = sortConfig.key!;
      let aVal: any = (a as any)[key];
      let bVal: any = (b as any)[key];
      if (key === 'name' || key === 'category') {
        aVal = (aVal ?? '').toString().toLowerCase();
        bVal = (bVal ?? '').toString().toLowerCase();
        const cmp = aVal.localeCompare(bVal);
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      } else if (key === 'is_active') {
        const aBool = !!aVal;
        const bBool = !!bVal;
        const cmp = (aBool === bBool) ? 0 : (aBool ? 1 : -1);
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      } else {
        // price or stock
        aVal = Number(aVal ?? 0);
        bVal = Number(bVal ?? 0);
        const cmp = aVal - bVal;
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      }
    });
    return sorted;
  })();

  // Inline editing state per product
  const [editing, setEditing] = useState<Record<number, { price?: number; cost_price?: number; stock?: number; saving?: boolean }>>({});

  const setEditingField = (id: number, field: 'price' | 'cost_price' | 'stock', value: number | undefined) => {
    setEditing(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      }
    }));
  };

  const saveEditingField = async (id: number, field: 'price' | 'cost_price' | 'stock', value: number | undefined) => {
    // Basic validation: ensure value is a finite number for updates
    const num = value;
    if (num === undefined || Number.isNaN(num)) return;
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], saving: true } }));
    try {
      await window.electronAPI?.database?.products?.update(id, { [field]: num } as any);
    } catch (e) {
      console.error('Failed to update product', id, field, e);
    } finally {
      setEditing(prev => ({ ...prev, [id]: { ...prev[id], saving: false } }));
    }
  };

  // Persist preferences in localStorage
  const PRODUCTS_PERSIST_KEY = 'productsTablePrefs';

  // Load persisted preferences on mount
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(PRODUCTS_PERSIST_KEY) : null;
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
      console.warn('Failed to load products table prefs:', e);
    }
  }, [serverSidePagination]);

  // Persist preferences when they change
  useEffect(() => {
    try {
      const prefs = {
        columnVisibility,
        sortConfig,
        searchTerm: serverSidePagination ? undefined : internalSearchTerm,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(PRODUCTS_PERSIST_KEY, JSON.stringify(prefs));
      }
    } catch (e) {
      console.warn('Failed to save products table prefs:', e);
    }
  }, [columnVisibility, sortConfig, internalSearchTerm, serverSidePagination]);

  // Pagination (10 items per page)
  const PAGE_SIZE = 10;
  const currentPage = serverSidePagination ? (externalCurrentPage || 1) : internalCurrentPage;
  const clientTotal = sortedProducts.length;
  const totalPages = serverSidePagination
    ? (paginationInfo?.totalPages || 1)
    : Math.max(1, Math.ceil(clientTotal / PAGE_SIZE));
  const visibleProducts = serverSidePagination
    ? sortedProducts // parent provides current page data server-side
    : sortedProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const changePage = (page: number) => {
    if (serverSidePagination) {
      onPageChange && onPageChange(page);
    } else {
      setInternalCurrentPage(page);
    }
  };

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

  const handleSelectAll = async (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      if (serverSidePagination) {
        try {
          const allProducts = await window.electronAPI?.database?.products?.getAll();
          const ids = (allProducts || []).map(p => p.id).filter(id => id !== undefined) as number[];
          setSelectedProducts(new Set(ids));
        } catch (e) {
          console.error('Error cargando todos los IDs de productos para seleccionar todo:', e);
          const allProductIds = new Set(filteredProducts.map(p => p.id!).filter(Boolean));
          setSelectedProducts(allProductIds);
        }
      } else {
        const allProductIds = new Set(sortedProducts.map(p => p.id!).filter(Boolean));
        setSelectedProducts(allProductIds);
      }
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
    }
    setSelectedProducts(newSelected);
    
    // Actualizar estado de "seleccionar todo"
    if (serverSidePagination) {
      const total = paginationInfo?.total || 0;
      setSelectAll(total > 0 && newSelected.size === total);
    } else {
      setSelectAll(filteredProducts.length > 0 && newSelected.size === filteredProducts.length);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '-';
    try {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value));
    } catch {
      return `$${Number(value).toFixed(2)}`;
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return date;
    }
  };

  const exportProductsPDF = async () => {
    let selectedProductsData: Product[] = [];
    if (serverSidePagination) {
      try {
        const allProducts = await window.electronAPI?.database?.products?.getAll();
        selectedProductsData = (allProducts || []).filter(p => p.id && selectedProducts.has(p.id));
      } catch (e) {
        console.error('Error exportando productos seleccionados (fallback a página actual):', e);
        selectedProductsData = products.filter(p => selectedProducts.has(p.id!));
      }
    } else {
      selectedProductsData = products.filter(p => selectedProducts.has(p.id!));
    }

    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(18);
    doc.text('Listado de Productos', 14, 18);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 26);
    doc.text(`Seleccionados: ${selectedProductsData.length}`, 14, 32);

    const tableData = selectedProductsData.map(p => [
      p.id ?? '-',
      p.name,
      formatCurrency(p.price),
      formatCurrency(p.cost_price ?? undefined),
      p.stock ?? 0,
      p.description || '-'
    ]);

    autoTable(doc, {
      head: [[
        'ID', 'Nombre', 'Precio', 'Costo', 'Stock', 'Descripción'
      ]],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        9: { cellWidth: 60 } // Descripción más ancha
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

    doc.save(`productos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportProductsExcel = async () => {
    let selectedProductsData: Product[] = [];
    if (serverSidePagination) {
      try {
        const allProducts = await window.electronAPI?.database?.products?.getAll();
        selectedProductsData = (allProducts || []).filter(p => p.id && selectedProducts.has(p.id));
      } catch (e) {
        console.error('Error exportando productos seleccionados a Excel (fallback a página actual):', e);
        selectedProductsData = products.filter(p => selectedProducts.has(p.id!));
      }
    } else {
      selectedProductsData = products.filter(p => selectedProducts.has(p.id!));
    }

    const XLSX = await import('xlsx');
    const rows = selectedProductsData.map(p => ({
      ID: p.id ?? '',
      Nombre: p.name,
      Precio: typeof p.price === 'number' ? Number(p.price) : '',
      Costo: p.cost_price != null ? Number(p.cost_price) : '',
      Stock: p.stock ?? 0,
      Descripción: p.description || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Tamaños de columnas más agradables
    ws['!cols'] = [
      { wch: 6 },  // ID
      { wch: 30 }, // Nombre
      { wch: 12 }, // Precio
      { wch: 12 }, // Costo
      { wch: 8 },  // Stock
      { wch: 40 }, // Descripción
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, `productos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Derive "select all" state from current selection vs filtered dataset,
  // so it stays accurate across pagination and filtering changes.
  const isAllSelected = serverSidePagination
    ? ((paginationInfo?.total || 0) > 0 && selectedProducts.size === (paginationInfo?.total || 0))
    : (filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length);


  // No additional filters; search bar only.

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!serverSidePagination) setInternalCurrentPage(1);
                      }}
                      className="pl-8 w-64 transition-all duration-200 focus:w-72"
                      disabled={isLoading}
                    />
                  </div>
                  <ProductsColumnToggle
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={setColumnVisibility}
                  />
                  {selectedProducts.size > 0 && (
                  <div className="flex items-center gap-2 mr-4 animate-in fade-in">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportProductsPDF}
                      className="h-8"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportProductsExcel}
                      className="h-8"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Excel
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
                                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {selectedProducts.size} seleccionado{selectedProducts.size !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
                 </div>
              </div>
          </div>
        </CardHeader>
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
                    <TableHead>Costo</TableHead>
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
                        checked={isAllSelected}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        aria-label="Seleccionar todos los productos"
                        disabled={isLoading}
                      />
                    </TableHead>
                    {columnVisibility.name && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          className="h-auto p-0 font-semibold hover:bg-transparent" 
                          onClick={() => handleSort('name')}
                        >
                          Nombre {getSortIcon('name')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.category && (<TableHead>Categoría</TableHead>)}
                    {columnVisibility.price && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          className="h-auto p-0 font-semibold hover:bg-transparent" 
                          onClick={() => handleSort('price')}
                        >
                          Precio {getSortIcon('price')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.cost && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          className="h-auto p-0 font-semibold hover:bg-transparent" 
                          onClick={() => handleSort('cost_price')}
                        >
                          Costo {getSortIcon('cost_price')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.stock && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          className="h-auto p-0 font-semibold hover:bg-transparent" 
                          onClick={() => handleSort('stock')}
                        >
                          Stock {getSortIcon('stock')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.description && <TableHead>Descripción</TableHead>}
                    {columnVisibility.status && (
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          className="h-auto p-0 font-semibold hover:bg-transparent" 
                          onClick={() => handleSort('is_active')}
                        >
                          Estado {getSortIcon('is_active')}
                        </Button>
                      </TableHead>
                    )}
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProducts.map((product, index) => (
                    <TableRow 
                      key={product.id} 
                      id={`product-${product.id}`}
                      className={cn(
                        "transition-all duration-200 hover:bg-muted/50 ",
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
                      {columnVisibility.name && (
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
                      )}
                      {columnVisibility.category && (
                        <TableCell>
                          {product.category && product.category !== 'sin-categoria' ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {product.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic text-sm">Sin categoría</span>
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.price && (
                        <TableCell>
                          <div className="flex items-center">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={(editing[product.id!]?.price ?? product.price)?.toString()}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEditingField(product.id!, 'price', v === '' ? undefined : Number(v));
                              }}
                              onBlur={() => saveEditingField(product.id!, 'price', editing[product.id!]?.price ?? product.price)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setEditingField(product.id!, 'price', product.price);
                                }
                              }}
                              disabled={editing[product.id!]?.saving}
                              className="w-28 h-8"
                            />
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.cost && (
                        <TableCell>
                          <div className="flex items-center">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={(editing[product.id!]?.cost_price ?? (typeof product.cost_price === 'number' ? product.cost_price : 0))?.toString()}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEditingField(product.id!, 'cost_price', v === '' ? undefined : Number(v));
                              }}
                              onBlur={() => saveEditingField(product.id!, 'cost_price', editing[product.id!]?.cost_price ?? (typeof product.cost_price === 'number' ? product.cost_price : 0))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setEditingField(product.id!, 'cost_price', typeof product.cost_price === 'number' ? product.cost_price : 0);
                                }
                              }}
                              disabled={editing[product.id!]?.saving}
                              className="w-28 h-8"
                            />
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.stock && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={(editing[product.id!]?.stock ?? (typeof product.stock === 'number' ? product.stock : 0))?.toString()}
                              onChange={(e) => {
                                const v = e.target.value;
                                const num = v === '' ? undefined : Number(v);
                                setEditingField(product.id!, 'stock', num);
                              }}
                              onBlur={() => saveEditingField(product.id!, 'stock', editing[product.id!]?.stock ?? (typeof product.stock === 'number' ? product.stock : 0))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setEditingField(product.id!, 'stock', typeof product.stock === 'number' ? product.stock : 0);
                                }
                              }}
                              disabled={editing[product.id!]?.saving}
                              className="w-20 h-8"
                            />
                            <span className="text-muted-foreground text-sm">unidades</span>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.description && (
                        <TableCell className="max-w-[300px]">
                          <div className="truncate text-sm">
                            {product.description || (
                              <span className="text-muted-foreground italic">Sin descripción</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.status && (
                        <TableCell>
                          {product.is_active ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Activo</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Inactivo</Badge>
                          )}
                        </TableCell>
                      )}
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
          {!serverSidePagination && totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1} a {Math.min(currentPage * PAGE_SIZE, clientTotal)} de {clientTotal} productos
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const showPage = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
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
                        onClick={() => changePage(page)}
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
                  onClick={() => changePage(currentPage + 1)}
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