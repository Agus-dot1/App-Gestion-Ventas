'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProductForm } from '@/components/products/product-form';
import { ProductsTable } from '@/components/products/products-table';
import { Plus, Package, TrendingUp, DollarSign, Eye } from 'lucide-react';
import { Database } from 'lucide-react';
import type { Product } from '@/lib/database-operations';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [products, setProducts] = useState<Product[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
    if (typeof window !== 'undefined' && window.electronAPI) {
      loadProducts();
    }
  }, []);

  // Highlight product if specified in URL
  const highlightedProduct = useMemo(() => {
    if (!highlightId) return null;
    return products.find(product => product.id?.toString() === highlightId);
  }, [products, highlightId]);

  useEffect(() => {
    if (highlightedProduct) {
      // Scroll to highlighted product after a short delay
      setTimeout(() => {
        const element = document.getElementById(`product-${highlightedProduct.id}`);
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
  const loadProducts = async () => {
    try {
      const allProducts = await window.electronAPI.database.products.getAll();
      setProducts(allProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      if (editingProduct?.id) {
        // Update existing product
        window.electronAPI.database.products.update(editingProduct.id, productData);
      } else {
        // Create new product
        window.electronAPI.database.products.create(productData);
      }
      
      await loadProducts();
      setEditingProduct(undefined);
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const addMockProducts = async () => {
    const mockProducts = [
      {
        name: 'Wireless Bluetooth Headphones',
        price: 79.99,
        description: 'High-quality wireless headphones with noise cancellation and 20-hour battery life',
        is_active: true
      },
      {
        name: 'Smartphone Case',
        price: 24.99,
        description: 'Durable protective case compatible with most smartphone models',
        is_active: true
      },
      {
        name: 'USB-C Charging Cable',
        price: 12.99,
        description: '6ft fast-charging USB-C cable with braided design',
        is_active: true
      },
      {
        name: 'Portable Power Bank',
        price: 45.99,
        description: '10,000mAh portable charger with dual USB ports and LED display',
        is_active: true
      },
      {
        name: 'Wireless Mouse',
        price: 29.99,
        description: 'Ergonomic wireless mouse with precision tracking and long battery life',
        is_active: true
      },
      {
        name: 'Bluetooth Speaker',
        price: 89.99,
        description: 'Waterproof portable speaker with 360-degree sound and 12-hour playtime',
        is_active: true
      },
      {
        name: 'Screen Protector',
        price: 9.99,
        description: 'Tempered glass screen protector with anti-fingerprint coating',
        is_active: true
      },
      {
        name: 'Car Phone Mount',
        price: 19.99,
        description: 'Adjustable car mount with secure grip and 360-degree rotation',
        is_active: true
      },
      {
        name: 'Gaming Keyboard',
        price: 129.99,
        description: 'Mechanical gaming keyboard with RGB backlighting and programmable keys',
        is_active: false
      },
      {
        name: 'Webcam HD',
        price: 59.99,
        description: '1080p HD webcam with auto-focus and built-in microphone',
        is_active: true
      }
    ];

    try {
      for (const product of mockProducts) {
        window.electronAPI.database.products.create(product);
      }
      await loadProducts();
      console.log('Mock products added successfully');
    } catch (error) {
      console.error('Error adding mock products:', error);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      window.electronAPI.database.products.delete(productId);
      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleToggleStatus = async (productId: number, isActive: boolean) => {
    try {
      window.electronAPI.database.products.update(productId, { is_active: isActive });
      await loadProducts();
    } catch (error) {
      console.error('Error updating product status:', error);
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
              <h1 className="text-3xl font-bold tracking-tight">Products</h1>
              <p className="text-muted-foreground">
                Manage your product inventory and pricing
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
                Add Product
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Package className="h-3 w-3 mr-1 text-blue-500" />
                Products in inventory
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Active Products</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                Available for sale
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Inactive Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inactive}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Package className="h-3 w-3 mr-1 text-gray-500" />
                Not available for sale
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Average Price</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.averagePrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3 mr-1 text-green-500" />
                Average product price
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        {isElectron ? (
          <ProductsTable
            products={products}
            highlightId={highlightId}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onToggleStatus={handleToggleStatus}
          />
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