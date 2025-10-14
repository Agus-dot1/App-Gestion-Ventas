'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Tag, 
  Calendar, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  FileText,
  Edit,
  X,
  Loader2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Customer, Sale } from '@/lib/database-operations';
import { cn } from '@/lib/utils';
import { Toast } from '@radix-ui/react-toast';
import { toast, Toaster } from 'sonner';

interface CustomerProfileProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onClose: () => void;
}

interface CustomerStats {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastPurchaseDate: string | null;
  firstPurchaseDate: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function CustomerProfile({ customer, onEdit, onClose }: CustomerProfileProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success("Copiado!", {
                    description: `Se copió el texto en el portapapeles`,
                    position: "top-center",
                    duration: 1000,
                  })
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  useEffect(() => {
    const fetchCustomerData = async () => {
      setIsLoading(true);
      try {
        // Fetch all sales for this customer
        const allSales = await window.electronAPI.database.sales.getAll();
        const customerSales = allSales.filter(sale => sale.customer_id === customer.id);
        setSales(customerSales);

        // Calculate statistics
        if (customerSales.length > 0) {
          const totalRevenue = customerSales.reduce((sum, sale) => sum + sale.total_amount, 0);
          const averageOrderValue = totalRevenue / customerSales.length;
          const sortedSales = customerSales.sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
          
          setStats({
            totalSales: customerSales.length,
            totalRevenue,
            averageOrderValue,
            firstPurchaseDate: sortedSales[0]?.created_at || null,
            lastPurchaseDate: sortedSales[sortedSales.length - 1]?.created_at || null
          });
        } else {
          setStats({
            totalSales: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
            firstPurchaseDate: null,
            lastPurchaseDate: null
          });
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerData();
  }, [customer.id]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-300">
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-9" />
            </div>
          </CardHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <CardContent className="space-y-6">
              {/* Contact Information Skeletons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <Skeleton className="h-4 w-32" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-4 w-28" />
                  </CardContent>
                </Card>
              </div>

              {/* Address and Tags Skeletons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-4 w-40" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Skeleton className="h-px w-full" />

              {/* Statistics Skeletons */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Sales History Skeleton */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Table Header */}
                    <div className="grid grid-cols-4 gap-4 pb-2 border-b">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    {/* Table Rows */}
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="grid grid-cols-4 gap-4 py-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-300">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{customer.name}</CardTitle>
              <CardDescription>
                Cliente desde {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'Fecha desconocida'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => onEdit(customer)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <CardContent className="space-y-6">
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors duration-200 animate-in slide-in-from-left-2 duration-500"
                onClick={() => customer.email && copyToClipboard(customer.email, 'email')}
              >
                <Toaster theme="dark" />
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm font-medium">Email</span>
                    {copiedField === 'email' && (
                      <span className="text-xs text-green-600 font-medium">¡Copiado!</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm">
                    {customer.email || 'No especificado'}
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors duration-200 animate-in slide-in-from-right-2 duration-500"
                onClick={() => customer.phone && copyToClipboard(customer.phone, 'phone')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm font-medium">Teléfono</span>
                    {copiedField === 'phone' && (
                      <span className="text-xs text-green-600 font-medium">¡Copiado!</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm">
                    {customer.phone || 'No especificado'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Address and Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors duration-200 animate-in slide-in-from-left-2 duration-700"
                onClick={() => customer.address && copyToClipboard(customer.address, 'address')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">Dirección</span>
                    {copiedField === 'address' && (
                      <span className="text-xs text-green-600 font-medium">¡Copiado!</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm">
                    {customer.address || 'No especificada'}
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors duration-200 animate-in slide-in-from-right-2 duration-700"
                onClick={() => customer.tags && customer.tags.length > 0 && copyToClipboard(customer.tags, 'tags')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4" />
                    <span className="text-sm font-medium">Etiquetas</span>
                    {copiedField === 'tags' && (
                      <span className="text-xs text-green-600 font-medium">¡Copiado!</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {customer.tags && customer.tags.length > 0 ? (() => {
                      const tagsArray = customer.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                      return tagsArray.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ));
                    })() : (
                      <span className="text-sm text-muted-foreground">Sin etiquetas</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            {customer.notes && (
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors duration-200 animate-in slide-in-from-bottom-2 duration-900"
                onClick={() => copyToClipboard(customer.notes || '', 'notes')}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">Notas</span>
                    {copiedField === 'notes' && (
                      <span className="text-xs text-green-600 font-medium">¡Copiado!</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-wrap">
                    {customer.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="animate-in slide-in-from-left-2 duration-1000">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Total de Ventas</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{stats.totalSales}</p>
                  </CardContent>
                </Card>

                <Card className="animate-in slide-in-from-left-2 duration-1100">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Ingresos Totales</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                  </CardContent>
                </Card>

                <Card className="animate-in slide-in-from-right-2 duration-1100">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Valor Promedio</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(stats.averageOrderValue)}</p>
                  </CardContent>
                </Card>

                <Card className="animate-in slide-in-from-right-2 duration-1000">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Última Compra</span>
                    </div>
                    <p className="mt-2 text-sm font-medium">
                      {stats.lastPurchaseDate 
                        ? new Date(stats.lastPurchaseDate).toLocaleDateString()
                        : 'Nunca'
                      }
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Sales History */}
            <Card className="animate-in slide-in-from-bottom-2 duration-1200">
              <CardHeader>
                <CardTitle>Historial de Ventas</CardTitle>
                <CardDescription>
                  {sales.length > 0 
                    ? `${sales.length} venta${sales.length !== 1 ? 's' : ''} registrada${sales.length !== 1 ? 's' : ''}`
                    : 'No hay ventas registradas'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sales.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número de Venta</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">
                            #{sale.sale_number}
                          </TableCell>
                          <TableCell>
                            {sale.created_at ? new Date(sale.created_at).toLocaleDateString() : 'Fecha desconocida'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(sale.total_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              Completada
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Este cliente aún no ha realizado ninguna compra.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}