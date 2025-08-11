'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Edit, Trash2, Eye, CreditCard, Calendar, DollarSign } from 'lucide-react';
import type { Sale } from '@/lib/database-operations';
import { cn } from '@/lib/utils';

interface SalesTableProps {
  sales: Sale[];
  highlightId?: string | null;
  onEdit: (sale: Sale) => void;
  onDelete: (saleId: number) => void;
}

export function SalesTable({ sales, highlightId, onEdit, onDelete }: SalesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteSale, setDeleteSale] = useState<Sale | null>(null);

  const filteredSales = sales.filter(sale =>
    sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (deleteSale?.id) {
      await onDelete(deleteSale.id);
      setDeleteSale(null);
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

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      paid: 'default',
      partial: 'secondary',
      unpaid: 'destructive',
      overdue: 'destructive'
    } as const;

    const colors = {
      paid: 'bg-green-100 text-green-800 hover:bg-green-200',
      partial: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      unpaid: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      overdue: 'bg-red-100 text-red-800 hover:bg-red-200'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]} className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentTypeBadge = (type: string) => {
    const colors = {
      cash: 'bg-blue-100 text-blue-800',
      installments: 'bg-purple-100 text-purple-800',
      credit: 'bg-orange-100 text-orange-800',
      mixed: 'bg-gray-100 text-gray-800'
    } as const;

    return (
      <Badge variant="outline" className={colors[type as keyof typeof colors]}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Ventas
              </CardTitle>
              <CardDescription>
                Lista de todas las ventas registradas. Puedes buscar por número de venta, cliente o notas.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar venta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron ventas</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No se encontraron ventas con esos criterios.' : '¡Crea tu primera venta!'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venta #</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Método de pago</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado del pago</TableHead>
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow 
                      key={sale.id} 
                      id={`venta-${sale.id}`}
                      className={cn(
                        highlightId === sale.id?.toString() && 'bg-muted/50'
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-primary" />
                          </div>
                          {sale.sale_number}
                          {highlightId === sale.id?.toString() && (
                            <Badge variant="outline" className="bg-primary/10 text-primary">
                              Econtrado
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {sale.customer_name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {sale.customer_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {formatDate(sale.date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getPaymentTypeBadge(sale.payment_type)}
                        {sale.payment_type === 'installments' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {sale.number_of_installments} pagos
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-medium">{formatCurrency(sale.total_amount)}</span>
                        </div>
                        {sale.payment_type === 'installments' && sale.down_payment > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Seña: {formatCurrency(sale.down_payment)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(sale.payment_status)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => console.log('View sale details', sale.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(sale)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteSale(sale)}
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
      <AlertDialog open={!!deleteSale} onOpenChange={() => setDeleteSale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar venta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la venta <strong>{deleteSale?.sale_number}</strong>? Esta acción no se puede deshacer.
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