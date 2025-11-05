'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Package, DollarSign, Tag, Hash } from 'lucide-react';
import type { Product } from '@/lib/database-operations';

interface ProductFormProps {
  product?: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (product: Omit<Product, 'id'>) => void;
}

export function ProductForm({ product, open, onOpenChange, onSave }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    price: product?.price?.toString() || '',
    cost_price: product?.cost_price?.toString() || '',
    description: product?.description || '',
    category: product?.category || '',
    stock: product?.stock?.toString() || '',
    is_active: product?.is_active ?? true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del producto es obligatorio';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'El precio del producto es obligatorio';
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        newErrors.price = 'El precio debe ser un número positivo';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
        description: formData.description.trim() || undefined,
        category: formData.category.trim() || undefined,
        stock: formData.stock ? parseInt(formData.stock) : undefined,
        is_active: formData.is_active
      });
      
      // Reset form - parent component will handle closing
      setFormData({
        name: '',
        price: '',
        cost_price: '',
        description: '',
        category: '',
        stock: '',
        is_active: true
      });
      setErrors({});
    } catch (error) {
      console.error('Error añadiendo producto:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

    useEffect(() => {
    setFormData({
      name: product?.name || '',
      price: product?.price?.toString() || '',
      cost_price: product?.cost_price?.toString() || '',
      description: product?.description || '',
      category: product?.category || '',
      stock: product?.stock?.toString() || '',
      is_active: product?.is_active ?? true
    });
  }, [product]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product ? 'Editar Producto' : 'Añadir nuevo producto'}
          </DialogTitle>
          <DialogDescription>
            {product ? 'Actualizar informacion' : 'Crear un nuevo producto para tu inventario.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nombre del producto"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </div>
              )}
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Precio *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="0.00"
                  className={`pl-10 ${errors.price ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.price && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.price}
                </div>
              )}
            </div>

            {/* Cost */}
            <div className="space-y-2">
              <Label htmlFor="cost_price">Costo</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => handleInputChange('cost_price', e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Costo del producto (opcional)</p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Seleccionar categoría (opcional)" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="sin-categoria">Sin categoría</SelectItem>
                   <SelectItem value="Electrónicos">Electrónicos</SelectItem>
                   <SelectItem value="Accesorios">Accesorios</SelectItem>
                   <SelectItem value="Audio">Audio</SelectItem>
                   <SelectItem value="Hogar">Hogar</SelectItem>
                   <SelectItem value="Juguetes">Juguetes</SelectItem>
                   <SelectItem value="Computación">Computación</SelectItem>
                   <SelectItem value="Automóvil">Automóvil</SelectItem>
                   <SelectItem value="Herramientas">Herramientas</SelectItem>
                   <SelectItem value="Otros">Otros</SelectItem>
                 </SelectContent>
              </Select>
            </div>

            {/* Stock */}
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', e.target.value)}
                  placeholder="Cantidad disponible (opcional)"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detalla informacion de importancia (opcional)"
                rows={3}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Producto activo</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.is_active ? 'El producto está disponible para la venta.' : 'El producto no está disponible para la venta.'}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Añadiendo...' : product ? 'Actualizar producto' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}