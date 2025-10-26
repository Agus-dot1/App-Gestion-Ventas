'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProductForm } from '@/components/products/product-form';
import { ProductsTable } from '@/components/products/products-table';
import { ProductsSkeleton } from '@/components/skeletons/products-skeleton';
import { Plus, Package, TrendingUp, DollarSign, Eye } from 'lucide-react';
import { Database } from 'lucide-react';
import type { Product } from '@/lib/database-operations';
import { useDataCache, usePrefetch } from '@/hooks/use-data-cache';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [products, setProducts] = useState<Product[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [isElectron, setIsElectron] = useState(false);
    const dataCache = useDataCache();
  const { prefetchCustomers, prefetchSales } = usePrefetch();

  // Check for Electron after component mounts to avoid hydration mismatch
  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);
  const [isLoading, setIsLoading] = useState(false); // Start with false for optimistic navigation
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });
  const pageSize = 10; // Load 10 products per page for easier browsing

  // Initial data load - optimistic approach
  useEffect(() => {
    if (isElectron) {
      loadProducts();
    }
  }, [isElectron]);
  
  // Optimistic data loading on mount
  useEffect(() => {
    if (isElectron && dataCache) {
      // Check if we have cached data first
      const cachedData = dataCache.getCachedProducts(currentPage, pageSize, searchTerm);
      if (cachedData) {
        // Show cached data immediately
        setProducts(cachedData.items);
        setPaginationInfo({
          total: cachedData.total,
          totalPages: cachedData.totalPages,
          currentPage: cachedData.currentPage,
          pageSize: cachedData.pageSize
        });
      } else {
        // No cache, show loading only if no data exists
        if (products.length === 0) {
          setIsLoading(true);
        }
      }
    }
  }, [isElectron, dataCache]);

  // Reload products when search term or page changes
  useEffect(() => {
    if (isElectron && products.length > 0) {
      // Only reload if we already have data loaded
      setTimeout(() => {
        loadProducts();
      }, 0);
    }
  }, [searchTerm, currentPage]);

  // Highlight product if specified in URL
  const highlightedProduct = useMemo(() => {
    if (!highlightId) return null;
    return products.find(product => product.id?.toString() === highlightId);
  }, [products, highlightId]);

  useEffect(() => {
    if (highlightedProduct) {
      // Scroll to highlighted product after a short delay
      setTimeout(() => {
        const element = document.getElementById(`producto-${highlightedProduct.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 100);
    }
  }, [highlightedProduct]);


  const loadProducts = async (forceRefresh = false) => {
    try {
      // Check cache first and display immediately if available
      const cachedData = dataCache.getCachedProducts(currentPage, pageSize, searchTerm);
      const isCacheExpired = dataCache.isProductsCacheExpired(currentPage, pageSize, searchTerm);
      
      if (cachedData && !forceRefresh) {
        // Show cached data immediately
        setProducts(cachedData.items);
        setPaginationInfo({
          total: cachedData.total,
          totalPages: cachedData.totalPages,
          currentPage: cachedData.currentPage,
          pageSize: cachedData.pageSize
        });
        setIsLoading(false);
        
        // If cache is not expired, we're done
        if (!isCacheExpired) {
          // Prefetch other pages in background
          setTimeout(() => {
            prefetchCustomers();
            prefetchSales();
          }, 100);
          return;
        }
        // If expired, continue to refresh in background
      } else {
        // No cache or forcing refresh, show loading only if no data exists
        if (products.length === 0) {
          setIsLoading(true);
        }
      }
      
      const result = await window.electronAPI.database.products.getPaginated(
        currentPage,
        pageSize,
        searchTerm
      );
      
      setProducts(result.products);
      setPaginationInfo({
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize
      });
      
      // Cache the result
      dataCache.setCachedProducts(currentPage, pageSize, searchTerm, {
        items: result.products,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize,
        searchTerm,
        timestamp: Date.now()
      });
      
      // Prefetch other pages in background
      setTimeout(() => {
        prefetchCustomers();
        prefetchSales();
      }, 100);
      
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      if (editingProduct?.id) {
        // Update existing product
        await window.electronAPI.database.products.update(editingProduct.id, productData);
      } else {
        // Create new product
        await window.electronAPI.database.products.create(productData);
      }
      
      // Clear cache and force refresh to ensure fresh data is loaded
      dataCache.invalidateCache('products');
      await loadProducts(true);
      
      // Close form and reset editing state after successful save and reload
      setEditingProduct(undefined);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error añadiendo producto:', error);
      throw error; // Re-throw to let the form handle the error
    }
  };

  const addMockProducts = async () => {
    const mockProducts = [
      {
        name: 'Auriculares Bluetooth Pro',
        price: 159990,
        cost_price: 105000,
        description: 'Cancelación activa de ruido, 24h batería',
        category: 'Audio',
        stock: 25,
        is_active: true
      },
      {
        name: 'Parlante Portátil 20W',
        price: 179990,
        cost_price: 120000,
        description: 'Resistente al agua, sonido 360°',
        category: 'Audio',
        stock: 12,
        is_active: true
      },
      {
        name: 'Mouse Inalámbrico Ergonómico',
        price: 59990,
        cost_price: 35000,
        description: '7000 DPI, silencioso',
        category: 'Computación',
        stock: 40,
        is_active: true
      },
      {
        name: 'Teclado Mecánico RGB',
        price: 259990,
        cost_price: 180000,
        description: 'Switches rojos, anti-ghosting',
        category: 'Computación',
        stock: 8,
        is_active: false
      },
      {
        name: 'Webcam Full HD 1080p',
        price: 119990,
        cost_price: 80000,
        description: 'Micrófono integrado, auto foco',
        category: 'Computación',
        stock: 20,
        is_active: true
      },
      {
        name: 'Cable USB-C 2m Trenzado',
        price: 25990,
        cost_price: 12000,
        description: 'Carga rápida, 60W',
        category: 'Accesorios',
        stock: 100,
        is_active: true
      },
      {
        name: 'Power Bank 20,000mAh',
        price: 91990,
        cost_price: 60000,
        description: 'LCD, doble USB',
        category: 'Accesorios',
        stock: 30,
        is_active: true
      },
      {
        name: 'Funda Premium para Smartphone',
        price: 49990,
        cost_price: 25000,
        description: 'Antigolpes, compatible multi-modelos',
        category: 'Accesorios',
        stock: 50,
        is_active: true
      },
      {
        name: 'Protector de Pantalla Vidrio',
        price: 19990,
        cost_price: 8000,
        description: 'Anti-huellas, alta transparencia',
        category: 'Accesorios',
        stock: 200,
        is_active: true
      },
      {
        name: 'Soporte de Auto Magnético',
        price: 39990,
        cost_price: 18000,
        description: 'Rotación 360°, agarre firme',
        category: 'Accesorios',
        stock: 60,
        is_active: true
      },
      {
        name: 'Smartwatch Deportivo',
        price: 229990,
        cost_price: 160000,
        description: 'GPS, resistencia al agua, notificaciones',
        category: 'Wearables',
        stock: 15,
        is_active: true
      },
      {
        name: 'Cargador GaN 65W',
        price: 84990,
        cost_price: 50000,
        description: 'USB-C + USB-A, compacto',
        category: 'Accesorios',
        stock: 35,
        is_active: true
      }
    ];

    try {
      for (const product of mockProducts) {
        window.electronAPI.database.products.create(product);
      }
      await loadProducts();
      console.log('Productos de prueba añadidos correctamente');
    } catch (error) {
      console.error('Error añadiendo productos:', error);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await window.electronAPI.database.products.delete(productId);
      // Clear cache to ensure fresh data is loaded
        setProducts(prev => prev.filter(p => p.id !== productId));
        dataCache.invalidateCache('products');
    } catch (error: any) {
      console.error('Error eliminando product:', error);
      // Display error message to user
      alert(error.message || 'Error deleting product. Please try again.');
    }
  };

  const handleBulkDeleteProducts = async (productIds: number[]) => {
    try {
      // Delete products one by one
      for (const productId of productIds) {
        await window.electronAPI.database.products.delete(productId);
      }
      // Clear cache to ensure fresh data is loaded
      dataCache.invalidateCache('products');
      await loadProducts();
    } catch (error: any) {
      console.error('Error eliminando productos:', error);
      // Display error message to user
      alert(error.message || 'Error deleting products. Please try again.');
    }
  };

  const handleToggleStatus = async (productId: number, isActive: boolean) => {
    // Optimistic UI update: reflect change immediately
    setProducts(prev => prev.map(p => (
      p.id === productId ? { ...p, is_active: isActive } : p
    )));

    try {
      await window.electronAPI.database.products.update(productId, { is_active: isActive });
      // Clear cache to ensure fresh data is loaded
      dataCache.invalidateCache('products');
      await loadProducts(true);
    } catch (error) {
      console.error('Error actualizando producto:', error);
      // Revert change on failure
      setProducts(prev => prev.map(p => (
        p.id === productId ? { ...p, is_active: !isActive } : p
      )));
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(undefined);
    setIsFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingProduct(undefined);
    }
  };

  // Calculate statistics
  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    inactive: products.filter(p => !p.is_active).length,
    averagePrice: products.length > 0 
      ? products.reduce((sum, p) => sum + p.price, 0) / products.length 
      : 0
  };

  const totals = {
    totalCost: products.reduce((sum, p) => sum + (p.cost_price || 0), 0),
    totalGain: products.reduce((sum, p) => sum + ((p.price || 0) - (p.cost_price || 0)), 0),
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
              <p className="text-muted-foreground">
                Gestioná tu inventario de productos, añadir nuevos, editar o eliminar existentes.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={addMockProducts} 
                disabled={!isElectron}
              >
                <Database className="mr-2 h-4 w-4" />
                Añadir Productos de Prueba
              </Button>
              <Button onClick={handleAddProduct} disabled={!isElectron}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir Producto
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Costos totales</CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'ARS' }).format(totals.totalCost)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                Costos acumulados de todos los productos
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Ganancia potencial</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'ARS' }).format(totals.totalGain)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                Suma de (precio - costo) por producto
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Productos activos</CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Eye className="h-4 w-4 text-purple-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                Activos sobre un total de {stats.total}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Precio promedio</CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="h-4 w-4 text-orange-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'ARS' }).format(stats.averagePrice || 0)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                Promedio de precios cargados
              </div>
            </CardContent>
          </Card>
        </div>

      

        {/* Products Table */}
        {isElectron ? (
          isLoading && products.length === 0 ? (
            <ProductsSkeleton />
          ) : (
          <ProductsTable
            products={products}
            highlightId={highlightId}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onBulkDelete={handleBulkDeleteProducts}
            onToggleStatus={handleToggleStatus}
            searchTerm={searchTerm}
            onSearchChange={(value) => setSearchTerm(value)}
            currentPage={currentPage}
            onPageChange={(page) => setCurrentPage(page)}
            paginationInfo={paginationInfo}
            serverSidePagination={true}
          />
          )
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Electron Required</h3>
                <p className="text-muted-foreground">
                  Products management is only available in the Electron desktop app.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Form Dialog */}
        <ProductForm
          product={editingProduct}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSave={handleSaveProduct}
        />
      </div>
    </DashboardLayout>
  );
}