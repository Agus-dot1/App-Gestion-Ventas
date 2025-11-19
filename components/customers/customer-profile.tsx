'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import type { Customer, Sale, Installment, SaleItem } from '@/lib/database-operations';
import { toast } from 'sonner';

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

export function CustomerProfile({ customer, onClose }: CustomerProfileProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeInstallments, setActiveInstallments] = useState<Array<Installment & { sale_number?: string }>>([]);
  const [saleItemsBySale, setSaleItemsBySale] = useState<Record<number, SaleItem[]>>({});
  const [salesStatusById, setSalesStatusById] = useState<Record<number, string>>({});

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


        const allSales = await window.electronAPI.database.sales.getAll();
        const customerSales = allSales.filter(sale => sale.customer_id === customer.id);
        setSales(customerSales);



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



        const installmentPromises = customerSales
          .filter(sale => sale.payment_type === 'installments')
          .map(sale => window.electronAPI.database.installments.getBySale(sale.id!));
        const installmentsBySale = await Promise.all(installmentPromises);
        const allInstallments = installmentsBySale.flat();
        const detailedInstallments = allInstallments.map(inst => ({
          ...inst,
          sale_number: customerSales.find(s => s.id === inst.sale_id)?.sale_number,
        }));
        const active = detailedInstallments
          .filter(inst => inst.status === 'pending' || inst.status === 'partial')
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        setActiveInstallments(active);

        // Calcular estado de cada venta en historial: Completada / Cuotas activas / Vencida
        const now = new Date();
        const statusMap: Record<number, string> = {};
        for (const sale of customerSales) {
          if (sale.payment_type === 'cash') {
            statusMap[sale.id!] = 'Completada';
            continue;
          }
          const saleInsts = allInstallments.filter(inst => inst.sale_id === sale.id);
          const hasOverdue = saleInsts.some(inst => inst.status === 'overdue' || (new Date(inst.due_date) < now && inst.status !== 'paid'));
          const hasActive = saleInsts.some(inst => inst.status === 'pending' || (inst as any).status === 'partial');
          statusMap[sale.id!] = hasOverdue ? 'Vencida' : (hasActive ? 'Cuotas activas' : 'Completada');
        }
        setSalesStatusById(statusMap);

        // Fetch sale items for each sale to show product (+quantity)
        if (customerSales.length > 0) {
          const saleItemsPromises = customerSales.map(sale => window.electronAPI.database.saleItems.getBySale(sale.id!));
          const saleItemsResults = await Promise.all(saleItemsPromises);
          const itemsMap: Record<number, SaleItem[]> = {};
          customerSales.forEach((sale, idx) => {
            itemsMap[sale.id!] = (saleItemsResults[idx] || []) as SaleItem[];
          });
          setSaleItemsBySale(itemsMap);
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
      <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-6xl max-h-[120vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="sr-only">Cargando perfil del cliente</DialogTitle>
            <DialogDescription className="sr-only">Preparando información del cliente</DialogDescription>
          </DialogHeader>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
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

          <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
            <div className="space-y-6">
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
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">{customer.name}</DialogTitle>
              <DialogDescription>
                Cliente desde {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'Fecha desconocida'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors "
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
              
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors "
                onClick={() => customer.secondary_phone && copyToClipboard(customer.secondary_phone, 'secondary_phone')}
              >
        {/* Sonner Toaster is mounted globally in app/layout.tsx */}
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm font-medium">Teléfono secundario</span>
                    {copiedField === 'secondary_phone' && (
                      <span className="text-xs text-green-600 font-medium">¡Copiado!</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm">
                    {customer.secondary_phone || 'No especificado'}
                  </p>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors "
                onClick={() => customer.email && copyToClipboard(customer.email, 'email')}
              >
        {/* Sonner Toaster is mounted globally in app/layout.tsx */}
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
                className="cursor-pointer hover:bg-muted/50 transition-colors "
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
            </div>


            {/* Notes */}
            {customer.notes && (
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors animate-in fade-in-from-bottom-2 duration-1000"
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
                <Card className="">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Total de Ventas</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{stats.totalSales}</p>
                  </CardContent>
                </Card>

                <Card className="">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Ingresos Totales</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                  </CardContent>
                </Card>

                <Card className="">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Valor Promedio</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(stats.averageOrderValue)}</p>
                  </CardContent>
                </Card>

                <Card className="">
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

            {/* Tabs for Active Installments and Sales History */}
            <Tabs defaultValue="active">
              <TabsList>
                <TabsTrigger value="active">Cuotas activas</TabsTrigger>
                <TabsTrigger value="history">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <Card className="animate-in fade-in-from-bottom-2 duration-1000">
                  <CardHeader>
                    <CardTitle>Cuotas activas</CardTitle>
                    <CardDescription>Cuotas pendientes o parcialmente pagadas de este cliente.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activeInstallments.length > 0 ? (
                      (() => {
                        const activeBySale: Record<number, Array<Installment & { sale_number?: string }>> = activeInstallments.reduce((acc, inst) => {
                          (acc[inst.sale_id] = acc[inst.sale_id] || []).push(inst);
                          return acc;
                        }, {} as Record<number, Array<Installment & { sale_number?: string }>>);

                        return (
                          <div className="space-y-6">
                            {Object.entries(activeBySale).map(([saleIdStr, insts]) => {
                              const saleId = Number(saleIdStr);
                              const firstItem = saleItemsBySale[saleId]?.[0];
                              const sale = sales.find(s => s.id === saleId);
                              const productLabel = firstItem ? `${firstItem.product_name}` : `#${sale?.sale_number ?? saleId}`;
                              const saleDate = sale?.created_at ? new Date(sale.created_at).toLocaleDateString() : 'Fecha desconocida';

                              return (
                                <Collapsible key={saleId} className="border rounded-md">
                                  <CollapsibleTrigger className="flex items-center justify-between px-4 py-3 bg-muted/50 w-full text-left">
                                    <div className="font-medium">{productLabel}</div>
                                    <div className="text-sm text-muted-foreground">{saleDate}</div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="p-0">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Cuota</TableHead>
                                          <TableHead>Vencimiento</TableHead>
                                          <TableHead>Monto</TableHead>
                                          <TableHead>Pagado</TableHead>
                                          <TableHead>Saldo</TableHead>
                                          <TableHead>Estado</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {insts.map((inst) => (
                                          <TableRow key={inst.id}>
                                            <TableCell>{inst.installment_number}</TableCell>
                                            <TableCell className={new Date(inst.due_date) < new Date() ? 'text-red-600 font-medium' : ''}>{new Date(inst.due_date).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-medium">{formatCurrency(inst.amount)}</TableCell>
                                            <TableCell>{formatCurrency(inst.paid_amount)}</TableCell>
                                            <TableCell>{formatCurrency(inst.balance)}</TableCell>
                                            <TableCell>
                                              <Badge variant={new Date(inst.due_date) < new Date() ? 'destructive' : (inst.status === 'overdue' ? 'destructive' : 'outline')}>
                                                {new Date(inst.due_date) < new Date() ? 'Vencida' : (inst.status === 'overdue' ? 'Vencida' : 'Pendiente')}
                                              </Badge>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </CollapsibleContent>
                                </Collapsible>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No hay cuotas activas para este cliente.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card className="animate-in fade-in-from-bottom-2 duration-1000">
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
                            <TableHead>Producto</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-medium">
                                {saleItemsBySale[sale.id!]?.length
                                  ? `${saleItemsBySale[sale.id!][0].product_name}`
                                  : `#${sale.sale_number}`
                                }
                              </TableCell>
                              <TableCell>{sale.created_at ? new Date(sale.created_at).toLocaleDateString() : 'Fecha desconocida'}</TableCell>
                              <TableCell className="font-medium">{formatCurrency(sale.total_amount)}</TableCell>
                              <TableCell>
                                {(() => {
                                  const status = salesStatusById[sale.id!] || 'Completada';
                                  const variant = status === 'Vencida' ? 'destructive' : (status === 'Completada' ? 'outline' : 'secondary');
                                  return <Badge variant={variant as any}>{status}</Badge>;
                                })()}
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
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}