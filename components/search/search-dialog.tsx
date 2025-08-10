'use client';

import { useState, useEffect, useMemo } from 'react';
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
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer, Sale, Product } from '@/lib/database-operations';

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isElectron, setIsElectron] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
    if (open && typeof window !== 'undefined' && window.electronAPI) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

    const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const loadData = async () => {
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
    } catch (error) {
      console.error('Error loading search data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    // Search customers
    customers.forEach(customer => {
      if (
        customer.name.toLowerCase().includes(searchTerm) ||
        customer.contact_info?.toLowerCase().includes(searchTerm)
      ) {
        const customerSales = sales.filter(sale => sale.customer_id === customer.id);
        const totalSpent = customerSales.reduce((sum, sale) => sum + sale.total_amount, 0);
        const overdueSales = customerSales.filter(sale => sale.payment_status === 'overdue');

        results.push({
          id: `customer-${customer.id}`,
          type: 'customer',
          title: customer.name,
          subtitle: `${customerSales.length} sales • $${totalSpent.toLocaleString()}`,
          description: customer.contact_info || 'No contact information',
          metadata: {
            customer,
            salesCount: customerSales.length,
            totalSpent,
            overdueCount: overdueSales.length
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
            title: `Sale ${sale.sale_number}`,
            subtitle: `${customer.name} • ${formatCurrency(sale.total_amount)}`,
            description: `${sale.payment_type} • ${sale.payment_status}`,
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
            title: `Sale ${sale.sale_number}`,
            subtitle: `${sale.customer_name} • ${formatCurrency(sale.total_amount)}`,
            description: `${formatDate(sale.date)} • ${sale.payment_status}`,
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
          subtitle: `${formatCurrency(product.price)} • ${productSales.length} sales`,
          description: product.description || 'No description',
          metadata: { product, salesCount: productSales.length },
          action: () => {
            router.push(`/products?highlight=${product.id}`);
            onOpenChange(false);
          }
        });
      }
    });

    // Search installments for overdue payments
    if (searchTerm.includes('overdue') || searchTerm.includes('payment')) {
      const overdueSales = sales.filter(sale => sale.payment_status === 'overdue');
      overdueSales.forEach(sale => {
        if (!results.find(r => r.id === `overdue-${sale.id}`)) {
          results.push({
            id: `overdue-${sale.id}`,
            type: 'installment',
            title: `Overdue Payment - ${sale.customer_name}`,
            subtitle: `Sale ${sale.sale_number} • ${formatCurrency(sale.total_amount)}`,
            description: `Due since ${formatDate(sale.date)}`,
            metadata: { sale, isOverdue: true },
            action: () => {
              router.push(`/sales?tab=installments&highlight=${sale.id}`);
              onOpenChange(false);
            }
          });
        }
      });
    }

    return results.slice(0, 20); // Limit results
  }, [query, customers, sales, products, router, onOpenChange]);

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


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
            Search Everything
          </DialogTitle>
          <DialogDescription>
            Search customers, sales, products, and payments. Use ↑↓ to navigate, Enter to select.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers, sales, products..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="max-h-[50vh] px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Search className="w-4 h-4 animate-pulse" />
                <span>Loading...</span>
              </div>
            </div>
          ) : !isElectron ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Electron Required</h3>
              <p className="text-muted-foreground">
                Search functionality is only available in the Electron desktop app.
              </p>
            </div>
          ) : query.trim() === '' ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Start Searching</h3>
                <p className="text-muted-foreground">
                  Type to search customers, sales, products, and payments
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Quick Actions</h4>
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
                      <div className="font-medium">View All Customers</div>
                      <div className="text-sm text-muted-foreground">Manage customer database</div>
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
                      <div className="font-medium">View All Sales</div>
                      <div className="text-sm text-muted-foreground">Track transactions</div>
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
                      <div className="font-medium">Overdue Payments</div>
                      <div className="text-sm text-muted-foreground">Check payment status</div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground text-sm">
                Try searching for customer names, sale numbers, or product names
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Customers Section */}
              {groupedResults.customers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customers ({groupedResults.customers.length})
                  </h4>
                  <div className="space-y-1">
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
                    Sales ({groupedResults.sales.length})
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
                    Products ({groupedResults.products.length})
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
                    Overdue Payments ({groupedResults.installments.length})
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
              <span>{searchResults.length} results found</span>
              <div className="flex items-center gap-4">
                <span>↑↓ Navigate</span>
                <span>Enter Select</span>
                <span>Esc Close</span>
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
                      <span>{result.metadata.salesCount} sales</span>
                    </div>
                  )}
                  {result.metadata.overdueCount > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{result.metadata.overdueCount} overdue</span>
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
                      result.metadata.sale.payment_status === 'paid' && 'bg-green-100 text-green-800',
                      result.metadata.sale.payment_status === 'overdue' && 'bg-red-100 text-red-800',
                      result.metadata.sale.payment_status === 'partial' && 'bg-yellow-100 text-yellow-800'
                    )}
                  >
                    {result.metadata.sale.payment_status}
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