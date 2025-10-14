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
    pageSize: 25
  });
  const pageSize = 25; // Load 25 products per page for better performance

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
      name: 'Auriculares Inalámbricos Bluetooth',
      price: 159990,
      description: 'Auriculares inalámbricos de alta calidad con cancelación de ruido y batería de 20 horas',
      is_active: true
    },
    {
      name: 'Funda para Smartphone',
      price: 49990,
      description: 'Funda protectora resistente compatible con la mayoría de modelos de smartphones',
      is_active: true
    },
    {
      name: 'Cable de Carga USB-C',
      price: 25990,
      description: 'Cable USB-C de carga rápida de 1.8m con diseño trenzado',
      is_active: true
    },
    {
      name: 'Batería Portátil Power Bank',
      price: 91990,
      description: 'Cargador portátil de 10,000mAh con puertos USB duales y pantalla LED',
      is_active: true
    },
    {
      name: 'Mouse Inalámbrico',
      price: 59990,
      description: 'Mouse inalámbrico ergonómico con seguimiento de precisión y larga duración de batería',
      is_active: true
    },
    {
      name: 'Parlante Bluetooth',
      price: 179990,
      description: 'Parlante portátil resistente al agua con sonido 360 grados y 12 horas de reproducción',
      is_active: true
    },
    {
      name: 'Protector de Pantalla',
      price: 19990,
      description: 'Protector de pantalla de vidrio templado con revestimiento anti-huellas',
      is_active: true
    },
    {
      name: 'Soporte de Auto para Celular',
      price: 39990,
      description: 'Soporte de auto ajustable con agarre seguro y rotación de 360 grados',
      is_active: true
    },
    {
      name: 'Teclado Gamer',
      price: 259990,
      description: 'Teclado mecánico gaming con retroiluminación RGB y teclas programables',
      is_active: false
    },
    {
      name: 'Cámara Web HD',
      price: 119990,
      description: 'Cámara web HD 1080p con enfoque automático y micrófono integrado',
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
      dataCache.invalidateCache('products');
      await loadProducts();
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
                Add Mock Data
              </Button>
              <Button onClick={handleAddProduct} disabled={!isElectron}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir Producto
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="animate-in slide-in-from-left-5 duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Productos totales</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Package className="h-3 w-3 mr-1 text-blue-500" />
                Total de productos en inventario
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in slide-in-from-left-5 duration-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Productos activos</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                Productos disponibles para la venta
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in slide-in-from-left-5 duration-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Productos inactivos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inactive}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Package className="h-3 w-3 mr-1 text-gray-500" />
                Productos no disponibles
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in slide-in-from-left-5 duration-1000">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Valor de inventario</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(products.reduce((sum, p) => sum + p.price, 0)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Package className="h-3 w-3 mr-1 text-blue-500" />
                Valor total de todos los productos
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