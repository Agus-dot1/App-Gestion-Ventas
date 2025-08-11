'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Edit, Trash2, Eye, EyeOff, Package } from 'lucide-react';
import type { Product } from '@/lib/database-operations';
import { cn } from '@/lib/utils';

interface ProductsTableProps {
  products: Product[];
  highlightId?: string | null;
  onEdit: (product: Product) => void;
  onDelete: (productId: number) => void;
  onToggleStatus: (productId: number, isActive: boolean) => void;
}

export function ProductsTable({ products, highlightId, onEdit, onDelete, onToggleStatus }: ProductsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (deleteProduct?.id) {
      await onDelete(deleteProduct.id);
      setDeleteProduct(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

  return (
    <>
      <Card>
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
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
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
                    <TableHead>Nombre</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow 
                      key={product.id} 
                      id={`product-${product.id}`}
                      className={cn(
                        highlightId === product.id?.toString() && 'bg-muted/50'
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {product.name}
                          {highlightId === product.id?.toString() && (
                            <Badge variant="outline" className="bg-primary/10 text-primary">
                              Found
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatPrice(product.price)}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate">
                          {product.description || (
                            <span className="text-muted-foreground italic">Sin descripción</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={product.is_active ? 'default' : 'secondary'}
                          className={product.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                        >
                          {product.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(product)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onToggleStatus(product.id!, !product.is_active)}
                            >
                              {product.is_active ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteProduct(product)}
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
    </>
  );
}