'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  User, 
  CreditCard, 
  Package, 
  Calendar,
  ArrowRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer, Sale, Product } from '@/lib/database-operations';

// Translation functions
const translatePaymentType = (type: string) => {
  const translations: Record<string, string> = {
    'cash': 'Efectivo',
    'installments': 'Cuotas',
    'credit': 'Crédito',
    'mixed': 'Mixto'
  };
  return translations[type] || type;
};

const translatePaymentStatus = (status: string) => {
  const translations: Record<string, string> = {
    'paid': 'Pagado',
    'unpaid': 'Sin pagar',
    'partial': 'Parcial',
    'overdue': 'Vencido'
  };
  return translations[status] || status;
};

interface SearchResult {
  id: string;
  type: 'customer' | 'sale' | 'product' | 'installment';
  title: string;
  subtitle?: string;
  description?: string;
  metadata?: Record<string, any>;
  action: () => void;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isElectron, setIsElectron] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };


  
  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
    if (open && typeof window !== 'undefined' && window.electronAPI && !dataLoaded) {
      loadData();
    }
  }, [open, dataLoaded]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

    const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const loadData = useCallback(async () => {
    if (dataLoaded) return;
    
    setLoading(true);
    try {
      const [customersData, salesData, productsData] = await Promise.all([
        window.electronAPI.database.customers.getAll(),
        window.electronAPI.database.sales.getAll(),
        window.electronAPI.database.products.getAll()
      ]);
      
      setCustomers(customersData);
      setSales(salesData);
      setProducts(productsData);
      setDataLoaded(true);
    } catch (error) {
      console.error('Error loading search data:', error);
    } finally {
      setLoading(false);
    }
  }, [dataLoaded]);

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const results: SearchResult[] = [];
    const searchTerm = debouncedQuery.toLowerCase();

    // Check if search term looks like a DNI (7-8 digits)
    const isDNISearch = /^\d{7,8}$/.test(searchTerm);

    // Search customers
    customers.forEach(customer => {
      let matchScore = 0;
      let matchReason = '';

      // DNI search gets highest priority
      if (customer.dni?.toLowerCase().includes(searchTerm)) {
        matchScore = isDNISearch ? 100 : 80; // Exact DNI match gets highest score
        matchReason = customer.dni === searchTerm ? 'DNI exacto' : 'DNI parcial';
      }
      // Name search
      else if (customer.name.toLowerCase().includes(searchTerm)) {
        matchScore = customer.name.toLowerCase().startsWith(searchTerm) ? 70 : 50;
        matchReason = 'Nombre';
      }
      // Email search
      else if (customer.email?.toLowerCase().includes(searchTerm)) {
        matchScore = 40;
        matchReason = 'Email';
      }
      // Company search
      else if (customer.company?.toLowerCase().includes(searchTerm)) {
        matchScore = 30;
        matchReason = 'Empresa';
      }
      // Contact info search
      else if (customer.contact_info?.toLowerCase().includes(searchTerm)) {
        matchScore = 20;
        matchReason = 'Contacto';
      }

      if (matchScore > 0) {
        const customerSales = sales.filter(sale => sale.customer_id === customer.id);
        const totalSpent = customerSales.reduce((sum, sale) => sum + sale.total_amount, 0);
        const overdueSales = customerSales.filter(sale => sale.payment_status === 'overdue');

        // Enhanced subtitle to show DNI when available and relevant
        let subtitle = `${customerSales.length} ventas • $${totalSpent.toLocaleString()}`;
        if (customer.dni && (isDNISearch || matchReason.includes('DNI'))) {
          subtitle = `DNI: ${customer.dni} • ${subtitle}`;
        }

        results.push({
          id: `customer-${customer.id}`,
          type: 'customer',
          title: customer.name,
          subtitle,
          description: matchReason === 'DNI exacto' ? `✓ DNI encontrado: ${customer.dni}` : 
                      matchReason === 'DNI parcial' ? `DNI: ${customer.dni}` :
                      customer.contact_info || 'Sin información de contacto',
          metadata: {
            customer,
            salesCount: customerSales.length,
            totalSpent,
            overdueCount: overdueSales.length,
            matchScore,
            matchReason
          },
          action: () => {
            router.push(`/customers?highlight=${customer.id}`);
            onOpenChange(false);
          }
        });

        // Add customer's sales as separate results
        customerSales.slice(0, 3).forEach(sale => {
          results.push({
            id: `sale-${sale.id}`,
            type: 'sale',
            title: `Venta ${sale.sale_number}`,
            subtitle: `${customer.name} • ${formatCurrency(sale.total_amount)}`,
            description: `${translatePaymentType(sale.payment_type)} • ${translatePaymentStatus(sale.payment_status)}`,
            metadata: { sale, customer },
            action: () => {
              router.push(`/sales?highlight=${sale.id}`);
              onOpenChange(false);
            }
          });
        });
      }
    });

    // Search sales directly
    sales.forEach(sale => {
      if (
        sale.sale_number.toLowerCase().includes(searchTerm) ||
        sale.customer_name?.toLowerCase().includes(searchTerm) ||
        sale.notes?.toLowerCase().includes(searchTerm)
      ) {
        // Skip if already added through customer search
        if (!results.find(r => r.id === `sale-${sale.id}`)) {
          results.push({
            id: `sale-${sale.id}`,
            type: 'sale',
            title: `Venta ${sale.sale_number}`,
            subtitle: `${sale.customer_name} • ${formatCurrency(sale.total_amount)}`,
            description: `${formatDate(sale.date)} • ${translatePaymentStatus(sale.payment_status)}`,
            metadata: { sale },
            action: () => {
              router.push(`/sales?highlight=${sale.id}`);
              onOpenChange(false);
            }
          });
        }
      }
    });

    // Search products
    products.forEach(product => {
      if (
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
      ) {
        const productSales = sales.filter(sale => 
          sale.items?.some(item => item.product_id === product.id)
        );

        results.push({
          id: `product-${product.id}`,
          type: 'product',
          title: product.name,
          subtitle: `${formatCurrency(product.price)} • ${productSales.length} ventas`,
          description: product.description || 'Sin descripción',
          metadata: { product, salesCount: productSales.length },
          action: () => {
            router.push(`/products?highlight=${product.id}`);
            onOpenChange(false);
          }
        });
      }
    });

    // Search installments for overdue payments
    if (searchTerm.includes('vencido') || searchTerm.includes('pago') || searchTerm.includes('overdue') || searchTerm.includes('payment')) {
      const overdueSales = sales.filter(sale => sale.payment_status === 'overdue');
      overdueSales.forEach(sale => {
        if (!results.find(r => r.id === `overdue-${sale.id}`)) {
          results.push({
            id: `overdue-${sale.id}`,
            type: 'installment',
            title: `Pago Vencido - ${sale.customer_name}`,
            subtitle: `Venta ${sale.sale_number} • ${formatCurrency(sale.total_amount)}`,
            description: `Vencido desde ${formatDate(sale.date)}`,
            metadata: { sale, isOverdue: true },
            action: () => {
              router.push(`/sales?tab=installments&highlight=${sale.id}`);
              onOpenChange(false);
            }
          });
        }
      });
    }

    // Sort results by match score (highest first) and then by type priority
    results.sort((a, b) => {
      const scoreA = a.metadata?.matchScore || 0;
      const scoreB = b.metadata?.matchScore || 0;
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }
      
      // If scores are equal, prioritize by type
      const typePriority = { customer: 4, sale: 3, product: 2, installment: 1 };
      return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
    });

    return results.slice(0, 20); // Limit results
  }, [debouncedQuery, customers, sales, products, router, onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        searchResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };


  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer':
        return <User className="w-4 h-4" />;
      case 'sale':
        return <CreditCard className="w-4 h-4" />;
      case 'product':
        return <Package className="w-4 h-4" />;
      case 'installment':
        return <Clock className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getResultTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'sale':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'product':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'installment':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      customers: [],
      sales: [],
      products: [],
      installments: []
    };

    searchResults.forEach(result => {
      switch (result.type) {
        case 'customer':
          groups.customers.push(result);
          break;
        case 'sale':
          groups.sales.push(result);
          break;
        case 'product':
          groups.products.push(result);
          break;
        case 'installment':
          groups.installments.push(result);
          break;
      }
    });

    return groups;
  }, [searchResults]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
Buscar Todo
          </DialogTitle>
          <DialogDescription id="search-instructions">
Buscar clientes por DNI, nombre, email, ventas, productos y pagos. Usa ↑↓ para navegar, Enter para seleccionar.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por DNI, nombre, email, productos..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="pl-10"
              aria-label="Campo de búsqueda"
              aria-describedby="search-instructions"
              role="combobox"
              aria-expanded={searchResults.length > 0}
              aria-activedescendant={searchResults[selectedIndex]?.id}
              autoComplete="off"
            />
          </div>
        </div>

        <ScrollArea className="max-h-[50vh] px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Search className="w-4 h-4 animate-pulse" />
                <span>Cargando...</span>
              </div>
            </div>
          ) : !isElectron ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Electron Requerido</h3>
              <p className="text-muted-foreground">
                La funcionalidad de búsqueda solo está disponible en la aplicación de escritorio Electron.
              </p>
            </div>
          ) : debouncedQuery.trim() === '' ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Comenzar Búsqueda</h3>
                <p className="text-muted-foreground">
                  Escribe para buscar clientes por DNI, nombre, email, ventas, productos y pagos
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Acciones Rápidas</h4>
                <div className="grid gap-2">
                  <Button
                    variant="ghost"
                    className="justify-start h-auto p-3"
                    onClick={() => {
                      router.push('/customers');
                      onOpenChange(false);
                    }}
                  >
                    <User className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Ver Todos los Clientes</div>
                      <div className="text-sm text-muted-foreground">Gestionar base de datos de clientes</div>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start h-auto p-3"
                    onClick={() => {
                      router.push('/sales');
                      onOpenChange(false);
                    }}
                  >
                    <CreditCard className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Ver Todas las Ventas</div>
                      <div className="text-sm text-muted-foreground">Rastrear transacciones</div>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start h-auto p-3"
                    onClick={() => {
                      router.push('/sales?tab=installments');
                      onOpenChange(false);
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Pagos Vencidos</div>
                      <div className="text-sm text-muted-foreground">Verificar estado de pagos</div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No se encontraron resultados</h3>
              <p className="text-muted-foreground text-sm">
                Intenta buscar DNI, nombres de clientes, números de venta o nombres de productos
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Customers Section */}
              {groupedResults.customers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Clientes ({groupedResults.customers.length})
                  </h4>
                  <div className="space-y-1" role="listbox" aria-label="Resultados de clientes">
                    {groupedResults.customers.map((result, index) => (
                      <SearchResultItem
                        key={result.id}
                        result={result}
                        isSelected={selectedIndex === searchResults.indexOf(result)}
                        onClick={result.action}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Sales Section */}
              {groupedResults.sales.length > 0 && (
                <div>
                  {groupedResults.customers.length > 0 && <Separator />}
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Ventas ({groupedResults.sales.length})
                  </h4>
                  <div className="space-y-1">
                    {groupedResults.sales.map((result, index) => (
                      <SearchResultItem
                        key={result.id}
                        result={result}
                        isSelected={selectedIndex === searchResults.indexOf(result)}
                        onClick={result.action}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Products Section */}
              {groupedResults.products.length > 0 && (
                <div>
                  {(groupedResults.customers.length > 0 || groupedResults.sales.length > 0) && <Separator />}
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Productos ({groupedResults.products.length})
                  </h4>
                  <div className="space-y-1">
                    {groupedResults.products.map((result, index) => (
                      <SearchResultItem
                        key={result.id}
                        result={result}
                        isSelected={selectedIndex === searchResults.indexOf(result)}
                        onClick={result.action}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Installments Section */}
              {groupedResults.installments.length > 0 && (
                <div>
                  {(groupedResults.customers.length > 0 || groupedResults.sales.length > 0 || groupedResults.products.length > 0) && <Separator />}
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Pagos Vencidos ({groupedResults.installments.length})
                  </h4>
                  <div className="space-y-1">
                    {groupedResults.installments.map((result, index) => (
                      <SearchResultItem
                        key={result.id}
                        result={result}
                        isSelected={selectedIndex === searchResults.indexOf(result)}
                        onClick={result.action}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {searchResults.length > 0 && (
          <div className="px-6 py-3 border-t bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{searchResults.length} resultados encontrados</span>
              <div className="flex items-center gap-4">
                <span>↑↓ Navegar</span>
                <span>Enter Seleccionar</span>
                <span>Esc Cerrar</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
}

function SearchResultItem({ result, isSelected, onClick }: SearchResultItemProps) {
  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer':
        return <User className="w-4 h-4" />;
      case 'sale':
        return <CreditCard className="w-4 h-4" />;
      case 'product':
        return <Package className="w-4 h-4" />;
      case 'installment':
        return <Clock className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getResultTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer':
        return 'bg-blue-100 text-blue-800';
      case 'sale':
        return 'bg-green-100 text-green-800';
      case 'product':
        return 'bg-purple-100 text-purple-800';
      case 'installment':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-sm border-l-4',
        isSelected && 'bg-muted/50',
        result.type === 'customer' && 'border-l-blue-500',
        result.type === 'sale' && 'border-l-green-500',
        result.type === 'product' && 'border-l-purple-500',
        result.type === 'installment' && 'border-l-red-500'
      )}
      onClick={onClick}
      role="option"
      aria-selected={isSelected}
      id={result.id}
      tabIndex={isSelected ? 0 : -1}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
              getResultTypeColor(result.type)
            )}>
              {getResultIcon(result.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">{result.title}</h4>
                <Badge variant="outline" className={cn('text-xs', getResultTypeColor(result.type))}>
                  {result.type}
                </Badge>
              </div>
              
              {result.subtitle && (
                <p className="text-sm text-muted-foreground mb-1">{result.subtitle}</p>
              )}
              
              {result.description && (
                <p className="text-xs text-muted-foreground truncate">{result.description}</p>
              )}

              {/* Customer-specific metadata */}
              {result.type === 'customer' && result.metadata && (
                <div className="flex items-center gap-4 mt-2 text-xs">
                  {result.metadata.salesCount > 0 && (
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      <span>{result.metadata.salesCount} ventas</span>
                    </div>
                  )}
                  {result.metadata.overdueCount > 0 && (
                    <div className="flex items-center gap-1 text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{result.metadata.overdueCount} vencidos</span>
                    </div>
                  )}
                </div>
              )}

              {/* Sale-specific metadata */}
              {result.type === 'sale' && result.metadata?.sale && (
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(result.metadata.sale.date).toLocaleDateString()}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-xs',
                      result.metadata.sale.payment_status === 'paid' && 'bg-green-500/10 text-green-400 border-green-500/20',
                      result.metadata.sale.payment_status === 'overdue' && 'bg-red-500/10 text-red-400 border-red-500/20',
                      result.metadata.sale.payment_status === 'partial' && 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    )}
                  >
                    {translatePaymentStatus(result.metadata.sale.payment_status)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}